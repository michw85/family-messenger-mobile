import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    mediaDevices,
    MediaStream,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import { setAuthLoggedInHandler, setAuthExpiredHandler } from '../utils/authEvents';
import { acquireWebSocket, releaseWebSocket, subscribeToCallQueue, sendCallSignal } from '../services/websocket';
import { getTurnCredentials, logCall } from '../services/api';
import { navigationRef } from '../services/navigationRef';
import { useLanguage } from './LanguageContext';

type CallState = 'idle' | 'outgoing_ringing' | 'incoming_ringing' | 'connecting' | 'active' | 'ended';

interface RemoteUser {
    id: number;
    username: string;
    avatarUrl?: string;
}

interface CallContextType {
    state: CallState;
    roomName: string | null;
    remoteUser: RemoteUser | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    muted: boolean;
    cameraEnabled: boolean;
    speakerOn: boolean;
    startOutgoingCall: (roomId: string, roomName: string, remoteUser: RemoteUser) => Promise<void>;
    acceptIncomingCall: () => Promise<void>;
    declineIncomingCall: () => void;
    hangUp: () => void;
    toggleMute: () => void;
    toggleCamera: () => void;
    switchCamera: () => void;
    toggleSpeaker: () => void;
    // Тап по push-уведомлению может прийти с большой задержкой (уведомление
    // открыли из шторки спустя минуту) - к этому моменту звонок мог уже
    // истечь по таймауту или быть отменён. Без этой проверки App.tsx слепо
    // навигировал на IncomingCallScreen по данным из пуша, а не по реальному
    // состоянию - экран показывался, но кнопки ничего не делали, потому что
    // stateRef.current уже не 'incoming_ringing'.
    // A push notification tap can arrive with a large delay (opened from the
    // shade a minute later) - by then the call may have already timed out or
    // been cancelled. Without this check, App.tsx blindly navigated to
    // IncomingCallScreen based on the push payload rather than real state -
    // the screen would show, but the buttons did nothing because
    // stateRef.current was no longer 'incoming_ringing'.
    isCallActive: (callId: string) => boolean;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const RING_TIMEOUT_MS = 30000;
// Если после ANSWER/ACCEPT соединение не доходит до 'connected' за это время -
// считаем звонок несостоявшимся и разрываем сами. Без этого таймаута застрявший
// в 'connecting' звонок (ICE не смог соединиться, а явный HANGUP/CANCEL от
// собеседника потерялся или не пришёл) навсегда блокирует состояние - кнопки
// "позвонить/принять" перестают что-либо делать, потому что stateRef.current
// уже не 'idle'.
// If the connection doesn't reach 'connected' within this time after
// ANSWER/ACCEPT, treat the call as failed and tear it down ourselves. Without
// this timeout, a call stuck in 'connecting' (ICE never connected, and an
// explicit HANGUP/CANCEL from the peer got lost or never arrived) permanently
// blocks the state - the call/accept buttons stop doing anything because
// stateRef.current is no longer 'idle'.
const CONNECT_TIMEOUT_MS = 20000;

// Порядок ICE-серверов: STUN сначала, наш coturn (TURN) - fallback для relay,
// когда прямой P2P невозможен (частая ситуация в мобильных сетях с NAT).
// ICE server order: STUN first, our coturn (TURN) - fallback relay for when
// direct P2P isn't possible (common on mobile networks behind NAT).
async function buildIceServers(): Promise<RTCIceServer[]> {
    try {
        const { data } = await getTurnCredentials();
        const stunUrls = (data.urls as string[]).filter((u) => u.startsWith('stun:'));
        const turnUrls = (data.urls as string[]).filter((u) => u.startsWith('turn:'));
        const servers: RTCIceServer[] = [];
        if (stunUrls.length) servers.push({ urls: stunUrls });
        if (turnUrls.length) {
            servers.push({ urls: turnUrls, username: data.username, credential: data.credential });
        }
        return servers;
    } catch (e) {
        console.warn('Failed to fetch TURN credentials, falling back to public STUN', e);
        return [{ urls: ['stun:stun.l.google.com:19302'] }];
    }
}

interface RTCIceServer {
    urls: string | string[];
    username?: string;
    credential?: string;
}

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useLanguage();

    const [state, setState] = useState<CallState>('idle');
    const [roomName, setRoomName] = useState<string | null>(null);
    const [remoteUser, setRemoteUser] = useState<RemoteUser | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [muted, setMuted] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    // Громкая связь по умолчанию (видеозвонок обычно смотрят, а не прикладывают
    // к уху) - переключатель даёт вернуться к обычному "телефонному" режиму
    // Speakerphone by default (a video call is usually watched, not held to
    // the ear) - the toggle lets you switch back to a normal "phone call" mode
    const [speakerOn, setSpeakerOn] = useState(true);

    // Изменчивое состояние звонка, не завязанное на рендер - читается из
    // колбэков STOMP/WebRTC, которые не должны пересоздаваться при каждом рендере
    // Mutable call state not tied to rendering - read from STOMP/WebRTC
    // callbacks that shouldn't be recreated on every render
    const stateRef = useRef<CallState>('idle');
    const callIdRef = useRef<string | null>(null);
    const roomIdRef = useRef<string | null>(null);
    const pcRef = useRef<InstanceType<typeof RTCPeerConnection> | null>(null);
    const pendingCandidatesRef = useRef<any[]>([]);
    const remoteDescSetRef = useRef(false);
    // Синхронная блокировка от повторного входа - stateRef проверяется только
    // в начале acceptIncomingCall, но состояние на 'connecting' меняется лишь
    // в конце (после нескольких await), так что двойной тап по "Принять" до
    // этого момента проходит обе проверки и создаёт вторую PeerConnection
    // Synchronous re-entrancy lock - stateRef is only checked at the start of
    // acceptIncomingCall, but the state only becomes 'connecting' at the end
    // (after several awaits), so a double-tap on "Accept" before that point
    // passes both checks and creates a second PeerConnection
    const acceptingRef = useRef(false);
    const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const callStartedAtRef = useRef<number | null>(null);

    const setCallState = useCallback((s: CallState) => {
        stateRef.current = s;
        setState(s);
    }, []);

    const clearRingTimeout = useCallback(() => {
        if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
        }
    }, []);

    const clearConnectTimeout = useCallback(() => {
        if (connectTimeoutRef.current) {
            clearTimeout(connectTimeoutRef.current);
            connectTimeoutRef.current = null;
        }
    }, []);

    const requestPermissions = useCallback(async (): Promise<boolean> => {
        if (Platform.OS !== 'android') return true;
        const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        const ok = Object.values(granted).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
        if (!ok) {
            Alert.alert(t('error'), t('camera_permission_denied'));
        }
        return ok;
    }, [t]);

    const teardown = useCallback((nextState: CallState = 'idle') => {
        clearRingTimeout();
        clearConnectTimeout();
        InCallManager.setKeepScreenOn(false);
        InCallManager.stop();
        localStream?.getTracks().forEach((tr) => tr.stop());
        pcRef.current?.close();
        pcRef.current = null;
        pendingCandidatesRef.current = [];
        remoteDescSetRef.current = false;
        acceptingRef.current = false;
        callIdRef.current = null;
        roomIdRef.current = null;
        callStartedAtRef.current = null;
        setLocalStream(null);
        setRemoteStream(null);
        setRemoteUser(null);
        setRoomName(null);
        setMuted(false);
        setCameraEnabled(true);
        setSpeakerOn(true);
        setCallState(nextState);
        if (nextState === 'idle' && navigationRef.isReady()) {
            const routeNames = navigationRef.getState()?.routes.map((r) => r.name) || [];
            if (routeNames.includes('InCall') || routeNames.includes('IncomingCall')) {
                navigationRef.goBack();
            }
        }
        // localStream читается напрямую из замыкания в момент вызова teardown -
        // не добавляем его в deps, иначе teardown пересоздаётся при каждом кадре стрима
        // localStream is read directly from the closure at call time - not added
        // to deps, otherwise teardown would be recreated on every stream frame
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clearRingTimeout, clearConnectTimeout, setCallState]);

    const createPeerConnection = useCallback(async (roomId: string) => {
        const iceServers = await buildIceServers();
        const pc = new RTCPeerConnection({ iceServers });

        (pc as any).onicecandidate = (event: any) => {
            if (event.candidate) {
                // Раньше логировались только ВХОДЯЩИЕ кандидаты - без исходящих
                // не видно, гатерит ли это устройство свой relay-кандидат вообще
                // (типичная причина зависания на "checking" - только одна сторона
                // получает relay-кандидат, вторая только host/srflx, и через
                // строгий/симметричный NAT оператора пара не проходит)
                // Previously only INCOMING candidates were logged - without
                // outgoing ones there's no way to see whether this device
                // gathers its own relay candidate at all (a common cause of
                // getting stuck at "checking" - only one side gets a relay
                // candidate, the other only host/srflx, and the pair doesn't
                // work through a carrier's strict/symmetric NAT)
                console.log('📞 local candidate:', event.candidate.candidate);
                sendCallSignal(roomId, {
                    callId: callIdRef.current,
                    type: 'ICE_CANDIDATE',
                    candidate: event.candidate.candidate,
                    sdpMid: event.candidate.sdpMid,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                });
            }
        };

        (pc as any).onicecandidateerror = (event: any) => {
            console.warn('📞 icecandidateerror', event.errorCode, event.errorText, event.url);
        };

        (pc as any).ontrack = (event: any) => {
            console.log('📞 ontrack', event.track?.kind, 'streams:', event.streams?.length, 'stream tracks:', event.streams?.[0]?.getTracks()?.map((t: any) => t.kind));
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            }
        };

        (pc as any).onconnectionstatechange = () => {
            console.log('📞 connectionState:', pc.connectionState);
            if (pc.connectionState === 'connected' && stateRef.current === 'connecting') {
                clearConnectTimeout();
                callStartedAtRef.current = Date.now();
                setCallState('active');
            } else if (['failed', 'closed', 'disconnected'].includes(pc.connectionState) && stateRef.current === 'active') {
                endCall('CANCELLED');
            }
        };

        (pc as any).oniceconnectionstatechange = () => {
            console.log('📞 iceConnectionState:', pc.iceConnectionState);
        };

        return pc;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setCallState, clearConnectTimeout]);

    const endCall = useCallback((result: 'ANSWERED' | 'DECLINED' | 'MISSED' | 'CANCELLED') => {
        const roomId = roomIdRef.current;
        const wasActive = stateRef.current === 'active';
        const durationSeconds = wasActive && callStartedAtRef.current
            ? Math.round((Date.now() - callStartedAtRef.current) / 1000)
            : undefined;

        if (roomId) {
            logCall(roomId, wasActive ? 'ANSWERED' : result, durationSeconds).catch((e) =>
                console.warn('Failed to log call', e)
            );
        }
        teardown('idle');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teardown]);

    const handleSignal = useCallback(async (signal: any) => {
        switch (signal.type) {
            case 'OFFER': {
                if (stateRef.current !== 'idle') {
                    // Уже разговариваем/звоним - авто-занято (обработка одновременного звонка)
                    // Already on a call/calling - auto-busy (handles concurrent-call glare)
                    sendCallSignal(signal.roomId, { callId: signal.callId, type: 'BUSY' });
                    return;
                }
                callIdRef.current = signal.callId;
                roomIdRef.current = signal.roomId;
                setRoomName(signal.roomName || '');
                setRemoteUser({ id: signal.fromUserId, username: signal.fromUsername });
                pendingCandidatesRef.current = [{ sdp: signal.sdp, type: 'offer' }];
                setCallState('incoming_ringing');
                ringTimeoutRef.current = setTimeout(() => {
                    if (stateRef.current === 'incoming_ringing') {
                        sendCallSignal(signal.roomId, { callId: signal.callId, type: 'CANCEL' });
                        endCall('MISSED');
                    }
                }, RING_TIMEOUT_MS);
                if (navigationRef.isReady()) {
                    (navigationRef.navigate as any)('IncomingCall', {
                        callId: signal.callId,
                        roomId: signal.roomId,
                        roomName: signal.roomName,
                        callerUsername: signal.fromUsername,
                    });
                }
                break;
            }
            case 'ANSWER': {
                // ANSWER получает только звонящий, и в этот момент его состояние
                // 'outgoing_ringing' (не 'connecting' - в него переходит только
                // отвечающая сторона в acceptIncomingCall) - раньше проверка была
                // на 'connecting' и ответ звонящим полностью игнорировался.
                // Only the caller ever receives ANSWER, and at that point its
                // state is 'outgoing_ringing' (not 'connecting' - only the
                // answering side enters that in acceptIncomingCall) - the check
                // used to test for 'connecting' and the caller silently dropped
                // every answer.
                if (pcRef.current && stateRef.current === 'outgoing_ringing') {
                    clearRingTimeout();
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription({ sdp: signal.sdp, type: 'answer' }));
                    remoteDescSetRef.current = true;
                    for (const c of pendingCandidatesRef.current) {
                        await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
                    }
                    pendingCandidatesRef.current = [];
                    setCallState('connecting');
                    // callIdRef.current захватывается здесь, а не читается заново
                    // при срабатывании таймера - connectTimeoutRef общий на весь
                    // CallProvider, не привязан к конкретному звонку. Без этой
                    // проверки "осиротевший" таймер от уже завершившегося звонка
                    // (например, если новый звонок стартовал до того, как предыдущий
                    // успел вызвать clearConnectTimeout) мог сработать позже и
                    // оборвать совершенно другой, уже успешно соединившийся звонок -
                    // ровно это и произошло на практике: iceConnectionState дошёл до
                    // "completed", но таймер всё равно сработал и вызвал hangUp().
                    // callIdRef.current is captured here rather than re-read when the
                    // timer fires - connectTimeoutRef is shared across the whole
                    // CallProvider, not tied to a specific call. Without this check,
                    // an "orphaned" timer from an already-ended call (e.g. if a new
                    // call started before the previous one got to call
                    // clearConnectTimeout) could fire later and hang up a completely
                    // different, already-successfully-connected call - this is
                    // exactly what happened in practice: iceConnectionState reached
                    // "completed", but the timer still fired and called hangUp().
                    const answeredCallId = callIdRef.current;
                    connectTimeoutRef.current = setTimeout(() => {
                        if (stateRef.current === 'connecting' && callIdRef.current === answeredCallId) {
                            console.warn('📞 Call failed to connect within timeout, hanging up');
                            hangUp();
                        }
                    }, CONNECT_TIMEOUT_MS);
                }
                break;
            }
            case 'ICE_CANDIDATE': {
                const candidate = { candidate: signal.candidate, sdpMid: signal.sdpMid, sdpMLineIndex: signal.sdpMLineIndex };
                if (pcRef.current && remoteDescSetRef.current) {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } else {
                    pendingCandidatesRef.current.push(candidate);
                }
                break;
            }
            case 'CANCEL':
            case 'DECLINE':
            case 'HANGUP':
            case 'BUSY': {
                if (stateRef.current !== 'idle') {
                    endCall(signal.type === 'DECLINE' ? 'DECLINED' : signal.type === 'BUSY' ? 'CANCELLED' : 'CANCELLED');
                }
                break;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endCall, setCallState]);

    useEffect(() => {
        const removeLoggedIn = setAuthLoggedInHandler(() => {
            // acquireWebSocket() форсирует обновление токена сама (через
            // getCurrentUser() перед чтением токена) - см. websocket.ts.
            // acquireWebSocket() forces a token refresh itself (via
            // getCurrentUser() before reading the token) - see websocket.ts.
            (async () => {
                try {
                    await acquireWebSocket();
                    subscribeToCallQueue(handleSignal);
                } catch (e) {
                    console.warn('CallProvider: failed to acquire WebSocket', e);
                }
            })();
        });
        const removeExpired = setAuthExpiredHandler(() => {
            releaseWebSocket();
        });
        return () => {
            removeLoggedIn();
            removeExpired();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleSignal]);

    const startOutgoingCall = useCallback(async (roomId: string, name: string, remote: RemoteUser) => {
        if (stateRef.current !== 'idle') return;
        const ok = await requestPermissions();
        if (!ok) return;

        try {
            const stream = (await mediaDevices.getUserMedia({ audio: true, video: true })) as unknown as MediaStream;
            setLocalStream(stream);
            // react-native-webrtc не управляет маршрутизацией звука на Android -
            // start({media:'video'}) уже даёт громкую связь по умолчанию, когда
            // нет подключённой Bluetooth/проводной гарнитуры (InCallManager сам
            // расставляет приоритет Bluetooth > проводная гарнитура > динамик).
            // setForceSpeakerphoneOn(true) здесь НЕ вызываем - это принудительно
            // выбирает динамик и перебивает Bluetooth-гарнитуру, даже если она
            // подключена и активна.
            // react-native-webrtc doesn't manage Android audio routing itself -
            // start({media:'video'}) already defaults to loudspeaker when no
            // Bluetooth/wired headset is connected (InCallManager prioritizes
            // Bluetooth > wired headset > speaker on its own). We do NOT call
            // setForceSpeakerphoneOn(true) here - it force-selects the speaker
            // and overrides an active Bluetooth headset.
            InCallManager.start({ media: 'video' });
            // Без этого экран гаснет по обычному таймауту во время звонка - и
            // после включения нативная поверхность видео (RTCView) не всегда
            // восстанавливается корректно (пропадает локальный/удалённый превью)
            // Without this the screen times out normally during a call - and
            // after waking it, the native video surface (RTCView) doesn't
            // always recover correctly (local/remote preview disappears)
            InCallManager.setKeepScreenOn(true);

            callIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            roomIdRef.current = roomId;
            setRoomName(name);
            setRemoteUser(remote);

            const pc = await createPeerConnection(roomId);
            pcRef.current = pc;
            stream.getTracks().forEach((tr: any) => pc.addTrack(tr, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            sendCallSignal(roomId, { callId: callIdRef.current, type: 'OFFER', sdp: offer.sdp });
            setCallState('outgoing_ringing');

            ringTimeoutRef.current = setTimeout(() => {
                if (stateRef.current === 'outgoing_ringing') {
                    sendCallSignal(roomId, { callId: callIdRef.current, type: 'CANCEL' });
                    endCall('MISSED');
                }
            }, RING_TIMEOUT_MS);

            if (navigationRef.isReady()) {
                navigationRef.navigate('InCall' as never);
            }
        } catch (e) {
            console.error('Failed to start outgoing call', e);
            teardown('idle');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestPermissions, createPeerConnection, endCall, teardown, setCallState]);

    const acceptIncomingCall = useCallback(async () => {
        const roomId = roomIdRef.current;
        if (!roomId || stateRef.current !== 'incoming_ringing' || acceptingRef.current) return;
        acceptingRef.current = true;
        clearRingTimeout();

        const ok = await requestPermissions();
        if (!ok) {
            endCall('DECLINED');
            return;
        }

        try {
            const stream = (await mediaDevices.getUserMedia({ audio: true, video: true })) as unknown as MediaStream;
            setLocalStream(stream);
            // setForceSpeakerphoneOn(true) намеренно не вызывается - см. комментарий
            // в startOutgoingCall (перебивает активную Bluetooth-гарнитуру)
            // setForceSpeakerphoneOn(true) intentionally not called - see the
            // comment in startOutgoingCall (overrides an active Bluetooth headset)
            InCallManager.start({ media: 'video' });
            // Без этого экран гаснет по обычному таймауту во время звонка - и
            // после включения нативная поверхность видео (RTCView) не всегда
            // восстанавливается корректно (пропадает локальный/удалённый превью)
            // Without this the screen times out normally during a call - and
            // after waking it, the native video surface (RTCView) doesn't
            // always recover correctly (local/remote preview disappears)
            InCallManager.setKeepScreenOn(true);

            const pc = await createPeerConnection(roomId);
            pcRef.current = pc;
            stream.getTracks().forEach((tr: any) => pc.addTrack(tr, stream));

            const offerSignal = pendingCandidatesRef.current.find((c) => c.type === 'offer');
            pendingCandidatesRef.current = pendingCandidatesRef.current.filter((c) => c.type !== 'offer');

            if (offerSignal) {
                await pc.setRemoteDescription(new RTCSessionDescription({ sdp: offerSignal.sdp, type: 'offer' }));
                remoteDescSetRef.current = true;
                for (const c of pendingCandidatesRef.current) {
                    await pc.addIceCandidate(new RTCIceCandidate(c));
                }
                pendingCandidatesRef.current = [];
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendCallSignal(roomId, { callId: callIdRef.current, type: 'ANSWER', sdp: answer.sdp });

            setCallState('connecting');
            // См. комментарий в ANSWER-хендлере - connectTimeoutRef общий на
            // весь CallProvider, поэтому таймер привязывается к конкретному
            // callId, а не только к фазе 'connecting'.
            // See the comment in the ANSWER handler - connectTimeoutRef is
            // shared across the whole CallProvider, so the timer is tied to
            // a specific callId, not just the 'connecting' phase.
            const acceptedCallId = callIdRef.current;
            connectTimeoutRef.current = setTimeout(() => {
                if (stateRef.current === 'connecting' && callIdRef.current === acceptedCallId) {
                    console.warn('📞 Call failed to connect within timeout, hanging up');
                    hangUp();
                }
            }, CONNECT_TIMEOUT_MS);
            if (navigationRef.isReady()) {
                // reset, не navigate - IncomingCall уже есть в стеке (её туда
                // положил OFFER-хендлер), и push поверх нее означало бы, что
                // goBack() после звонка вернёт на экран "принять/отклонить"
                // reset, not navigate - IncomingCall is already in the stack
                // (the OFFER handler put it there), and pushing on top of it
                // would mean goBack() after the call lands back on the
                // accept/decline screen
                navigationRef.reset({
                    index: 1,
                    routes: [
                        { name: 'RoomSelect' },
                        { name: 'InCall' },
                    ],
                });
            }
        } catch (e) {
            console.error('Failed to accept incoming call', e);
            teardown('idle');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestPermissions, createPeerConnection, endCall, teardown, setCallState, clearRingTimeout]);

    const declineIncomingCall = useCallback(() => {
        const roomId = roomIdRef.current;
        if (roomId) {
            sendCallSignal(roomId, { callId: callIdRef.current, type: 'DECLINE' });
        }
        endCall('DECLINED');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endCall]);

    const hangUp = useCallback(() => {
        const roomId = roomIdRef.current;
        if (roomId) {
            sendCallSignal(roomId, { callId: callIdRef.current, type: 'HANGUP' });
        }
        endCall('CANCELLED');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endCall]);

    const toggleMute = useCallback(() => {
        localStream?.getAudioTracks().forEach((tr: any) => {
            tr.enabled = muted;
        });
        setMuted((m) => !m);
    }, [localStream, muted]);

    const toggleCamera = useCallback(() => {
        localStream?.getVideoTracks().forEach((tr: any) => {
            tr.enabled = !cameraEnabled;
        });
        setCameraEnabled((c) => !c);
    }, [localStream, cameraEnabled]);

    const switchCamera = useCallback(() => {
        localStream?.getVideoTracks().forEach((tr: any) => tr._switchCamera());
    }, [localStream]);

    const toggleSpeaker = useCallback(() => {
        InCallManager.setForceSpeakerphoneOn(!speakerOn);
        setSpeakerOn((s) => !s);
    }, [speakerOn]);

    const isCallActive = useCallback(
        (callId: string) => stateRef.current === 'incoming_ringing' && callIdRef.current === callId,
        []
    );

    const value = useMemo<CallContextType>(() => ({
        state,
        roomName,
        remoteUser,
        localStream,
        remoteStream,
        muted,
        cameraEnabled,
        speakerOn,
        startOutgoingCall,
        acceptIncomingCall,
        declineIncomingCall,
        hangUp,
        toggleMute,
        toggleCamera,
        switchCamera,
        toggleSpeaker,
        isCallActive,
    }), [state, roomName, remoteUser, localStream, remoteStream, muted, cameraEnabled, speakerOn,
        startOutgoingCall, acceptIncomingCall, declineIncomingCall, hangUp, toggleMute, toggleCamera, switchCamera, toggleSpeaker, isCallActive]);

    return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCall = (): CallContextType => {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error('useCall must be used within a CallProvider');
    return ctx;
};
