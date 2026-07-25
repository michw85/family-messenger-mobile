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
import { getTurnCredentials, logCall, getCurrentUser } from '../services/api';
import { getToken } from '../services/authStorage';
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
    startOutgoingCall: (roomId: string, roomName: string, remoteUser: RemoteUser) => Promise<void>;
    acceptIncomingCall: () => Promise<void>;
    declineIncomingCall: () => void;
    hangUp: () => void;
    toggleMute: () => void;
    toggleCamera: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const RING_TIMEOUT_MS = 30000;

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
    const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        InCallManager.stop();
        localStream?.getTracks().forEach((tr) => tr.stop());
        pcRef.current?.close();
        pcRef.current = null;
        pendingCandidatesRef.current = [];
        remoteDescSetRef.current = false;
        callIdRef.current = null;
        roomIdRef.current = null;
        callStartedAtRef.current = null;
        setLocalStream(null);
        setRemoteStream(null);
        setRemoteUser(null);
        setRoomName(null);
        setMuted(false);
        setCameraEnabled(true);
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
    }, [clearRingTimeout, setCallState]);

    const createPeerConnection = useCallback(async (roomId: string) => {
        const iceServers = await buildIceServers();
        const pc = new RTCPeerConnection({ iceServers });

        (pc as any).onicecandidate = (event: any) => {
            if (event.candidate) {
                sendCallSignal(roomId, {
                    callId: callIdRef.current,
                    type: 'ICE_CANDIDATE',
                    candidate: event.candidate.candidate,
                    sdpMid: event.candidate.sdpMid,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                });
            }
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
    }, [setCallState]);

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
            // На холодном старте/логине токен из хранилища может быть уже
            // просроченным (access-токен живёт 15 минут) - в отличие от
            // ChatRoomScreen, здесь это первое, что происходит, без
            // предшествующего REST-запроса, который обычно успевает обновить
            // токен через перехватчик в api.ts. Дёргаем дешёвый
            // авторизованный запрос заранее, чтобы гарантировать свежий
            // токен, иначе STOMP получает "Invalid JWT token" и бесконечно
            // переподключается с тем же самым мёртвым токеном.
            // On cold start/login the stored token may already be expired
            // (access token lives 15 minutes) - unlike ChatRoomScreen, this
            // runs first, with no preceding REST call that would normally
            // have refreshed it via api.ts's interceptor. Fire a cheap
            // authenticated request first to guarantee a fresh token,
            // otherwise STOMP gets "Invalid JWT token" and reconnects
            // forever with that same dead token.
            (async () => {
                try {
                    await getCurrentUser();
                    const freshToken = await getToken();
                    if (!freshToken) return;
                    await acquireWebSocket(freshToken);
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
            // без этого звук может уходить в динамик у уха (еле слышно) вместо громкой связи
            // react-native-webrtc doesn't manage Android audio routing itself -
            // without this, audio can route to the earpiece (barely audible)
            // instead of the loudspeaker
            InCallManager.start({ media: 'video' });
            InCallManager.setForceSpeakerphoneOn(true);

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
        if (!roomId || stateRef.current !== 'incoming_ringing') return;
        clearRingTimeout();

        const ok = await requestPermissions();
        if (!ok) {
            endCall('DECLINED');
            return;
        }

        try {
            const stream = (await mediaDevices.getUserMedia({ audio: true, video: true })) as unknown as MediaStream;
            setLocalStream(stream);
            InCallManager.start({ media: 'video' });
            InCallManager.setForceSpeakerphoneOn(true);

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
            if (navigationRef.isReady()) {
                navigationRef.navigate('InCall' as never);
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

    const value = useMemo<CallContextType>(() => ({
        state,
        roomName,
        remoteUser,
        localStream,
        remoteStream,
        muted,
        cameraEnabled,
        startOutgoingCall,
        acceptIncomingCall,
        declineIncomingCall,
        hangUp,
        toggleMute,
        toggleCamera,
    }), [state, roomName, remoteUser, localStream, remoteStream, muted, cameraEnabled,
        startOutgoingCall, acceptIncomingCall, declineIncomingCall, hangUp, toggleMute, toggleCamera]);

    return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCall = (): CallContextType => {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error('useCall must be used within a CallProvider');
    return ctx;
};
