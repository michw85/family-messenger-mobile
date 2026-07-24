import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    mediaDevices,
    MediaStream,
} from 'react-native-webrtc';
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
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            }
        };

        (pc as any).onconnectionstatechange = () => {
            if (pc.connectionState === 'connected' && stateRef.current === 'connecting') {
                callStartedAtRef.current = Date.now();
                setCallState('active');
            } else if (['failed', 'closed', 'disconnected'].includes(pc.connectionState) && stateRef.current === 'active') {
                endCall('CANCELLED');
            }
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
                if (pcRef.current && stateRef.current === 'connecting') {
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription({ sdp: signal.sdp, type: 'answer' }));
                    remoteDescSetRef.current = true;
                    for (const c of pendingCandidatesRef.current) {
                        await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
                    }
                    pendingCandidatesRef.current = [];
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
        const removeLoggedIn = setAuthLoggedInHandler((token) => {
            acquireWebSocket(token)
                .then(() => subscribeToCallQueue(handleSignal))
                .catch((e) => console.warn('CallProvider: failed to acquire WebSocket', e));
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
