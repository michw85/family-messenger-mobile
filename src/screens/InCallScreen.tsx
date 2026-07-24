import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useCall } from '../context/CallContext';
import { useLanguage } from '../context/LanguageContext';

export default function InCallScreen() {
    const { state, remoteUser, roomName, localStream, remoteStream, muted, cameraEnabled, hangUp, toggleMute, toggleCamera } = useCall();
    const { t } = useLanguage();

    const statusLabel = state === 'outgoing_ringing' ? t('calling')
        : state === 'incoming_ringing' || state === 'connecting' ? t('calling')
        : state === 'active' ? null
        : t('call_ended');

    return (
        <View style={styles.container}>
            {remoteStream ? (
                <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
            ) : (
                <View style={styles.remotePlaceholder}>
                    <Text style={styles.name}>{remoteUser?.username}</Text>
                    {statusLabel && <Text style={styles.status}>{statusLabel}</Text>}
                    <Text style={styles.room}>{roomName}</Text>
                </View>
            )}

            {localStream && cameraEnabled && (
                <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" mirror />
            )}

            <View style={styles.controls}>
                <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
                    <Text style={styles.controlIcon}>{muted ? '🔇' : '🎙️'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlButton, styles.hangup]} onPress={hangUp}>
                    <Text style={styles.controlIcon}>📞</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
                    <Text style={styles.controlIcon}>{cameraEnabled ? '📷' : '🚫'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    remoteVideo: { flex: 1 },
    remotePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    name: { color: '#fff', fontSize: 26, fontWeight: '600' },
    status: { color: '#B0B0C0', fontSize: 16, marginTop: 8 },
    room: { color: '#8A8A9A', fontSize: 14, marginTop: 4 },
    localVideo: {
        position: 'absolute', top: 50, right: 16, width: 110, height: 150,
        borderRadius: 12, backgroundColor: '#222', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    controls: {
        position: 'absolute', bottom: 50, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
    },
    controlButton: {
        width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    hangup: { backgroundColor: '#FF4757', transform: [{ rotate: '135deg' }] },
    controlIcon: { fontSize: 26 },
});
