import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { useCall } from '../context/CallContext';
import { useLanguage } from '../context/LanguageContext';

const VIBRATION_PATTERN = [0, 800, 800];

export default function IncomingCallScreen() {
    const { remoteUser, roomName, acceptIncomingCall, declineIncomingCall, state } = useCall();
    const { t } = useLanguage();
    const startedVibrating = useRef(false);

    useEffect(() => {
        if (!startedVibrating.current) {
            startedVibrating.current = true;
            Vibration.vibrate(VIBRATION_PATTERN, true);
        }
        return () => Vibration.cancel();
    }, []);

    useEffect(() => {
        if (state === 'idle') {
            Vibration.cancel();
        }
    }, [state]);

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.label}>{t('incoming_call')}</Text>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(remoteUser?.username || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.name}>{remoteUser?.username}</Text>
                <Text style={styles.room}>{roomName}</Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity style={[styles.button, styles.decline]} onPress={declineIncomingCall}>
                    <Text style={styles.buttonIcon}>✕</Text>
                    <Text style={styles.buttonLabel}>{t('decline_call')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.accept]} onPress={acceptIncomingCall}>
                    <Text style={styles.buttonIcon}>✓</Text>
                    <Text style={styles.buttonLabel}>{t('accept_call')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'rgba(10,10,20,0.96)', justifyContent: 'space-between', paddingVertical: 60 },
    content: { alignItems: 'center', marginTop: 40 },
    label: { color: '#B0B0C0', fontSize: 16, marginBottom: 24 },
    avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#6C5CE7', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    avatarText: { color: '#fff', fontSize: 48, fontWeight: '600' },
    name: { color: '#fff', fontSize: 26, fontWeight: '600' },
    room: { color: '#B0B0C0', fontSize: 15, marginTop: 6 },
    actions: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 30 },
    button: { alignItems: 'center', justifyContent: 'center', width: 90, height: 90, borderRadius: 45 },
    decline: { backgroundColor: '#FF4757' },
    accept: { backgroundColor: '#2ED573' },
    buttonIcon: { color: '#fff', fontSize: 30, fontWeight: '700' },
    buttonLabel: { color: '#fff', fontSize: 12, marginTop: 4 },
});
