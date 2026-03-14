import { NotificationItem } from '@/services/NotificationService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NotificationToastProps {
    visible: boolean;
    notification: NotificationItem | null;
    onPress: () => void;
    onClose: () => void;
    duration?: number;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
    visible,
    notification,
    onPress,
    onClose,
    duration = 4000,
}) => {
    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(-150)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (visible && notification) {
            // Slide down
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                stiffness: 80,
                damping: 15,
            }).start();

            // Auto hide
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(onClose, duration);
        } else {
            // Slide up
            Animated.timing(translateY, {
                toValue: -150,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [visible, notification]);

    if (!notification) return null;

    // Helper to determine icon color based on background
    const getIconColor = (type: string) => {
        if (type === 'success') return '#111'; // Dark icon on bright lime green
        return '#FFF'; // White icon on purple/red
    };

    const iconColor = getIconColor(notification.type);

    return (
        <Animated.View style={[styles.container, { top: insets.top + 10, transform: [{ translateY }] }]}>
            <TouchableOpacity style={styles.content} onPress={onPress}>
                <View style={[styles.iconContainer,
                notification.type === 'alert' ? styles.alertIcon :
                    notification.type === 'success' ? styles.successIcon : styles.infoIcon
                ]}>
                    <Ionicons
                        name={notification.type === 'alert' ? 'warning' : notification.type === 'success' ? 'checkmark' : 'notifications'}
                        size={20} color={iconColor}
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title} numberOfLines={1}>{notification.metadata?.title || "Notification"}</Text>
                    <Text style={styles.message} numberOfLines={2}>{notification.message}</Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute', left: 16, right: 16,
        backgroundColor: '#FFF', borderRadius: 12,
        flexDirection: 'row', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
        zIndex: 9999, padding: 12,
    },
    content: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    iconContainer: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    infoIcon: { backgroundColor: '#7C3AED' }, // Main Violet
    alertIcon: { backgroundColor: '#EF4444' }, // Red
    successIcon: { backgroundColor: '#D4FF00' }, // Lime Green
    textContainer: { flex: 1, marginRight: 8 },
    title: { fontWeight: '600', fontSize: 14, color: '#111', marginBottom: 2 },
    message: { fontSize: 12, color: '#666' },
    closeButton: { padding: 4 },
});
