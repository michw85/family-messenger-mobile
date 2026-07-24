import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform } from 'react-native';
import { mediaDevices, RTCView, MediaStream } from 'react-native-webrtc';

/**
 * Временный экран для изолированной проверки react-native-webrtc после первой
 * сборки - getUserMedia + RTCView, без сигналинга и бэкенда. Убрать после
 * подтверждения, что нативный модуль собирается и показывает камеру.
 */
export default function WebRTCTestScreen() {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    const start = async () => {
        setError(null);
        try {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                ]);
                const ok = Object.values(granted).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
                if (!ok) {
                    setError('Camera/mic permission denied');
                    return;
                }
            }
            const s = await mediaDevices.getUserMedia({ audio: true, video: true });
            setStream(s as unknown as MediaStream);
        } catch (e: any) {
            setError(String(e?.message || e));
        }
    };

    const stop = () => {
        stream?.getTracks().forEach((t) => t.stop());
        setStream(null);
    };

    useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>WebRTC test</Text>
            {error && <Text style={styles.error}>{error}</Text>}
            {stream ? (
                <RTCView streamURL={stream.toURL()} style={styles.video} objectFit="cover" />
            ) : (
                <View style={styles.placeholder} />
            )}
            <TouchableOpacity style={styles.button} onPress={stream ? stop : start}>
                <Text style={styles.buttonText}>{stream ? 'Stop' : 'Start camera'}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20 },
    title: { color: '#fff', fontSize: 20, marginBottom: 16 },
    error: { color: '#FF7675', marginBottom: 16, textAlign: 'center' },
    video: { width: '100%', height: 400, backgroundColor: '#222', borderRadius: 12 },
    placeholder: { width: '100%', height: 400, backgroundColor: '#222', borderRadius: 12 },
    button: { marginTop: 20, backgroundColor: '#6C5CE7', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
