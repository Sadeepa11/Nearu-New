import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

type AlertType = 'success' | 'warning' | 'error' | 'confirmation' | 'info';

interface AlertButton {
    text: string;
    onPress: () => void;
    style?: 'cancel' | 'destructive' | 'default';
}

interface AlertOptions {
    title: string;
    message?: string;
    type?: AlertType;
    buttons?: AlertButton[];
    buttonDirection?: 'row' | 'column'; // Default is row for 2 buttons
}

interface AlertContextType {
    showAlert: (options: AlertOptions) => void;
    hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

export const CustomAlert = ({
    visible,
    title,
    message,
    type = 'info',
    buttons = [],
    onClose,
}: AlertOptions & { visible: boolean; onClose: () => void }) => {
    if (!visible) return null;

    // Icons based on type
    const renderIcon = () => {
        switch (type) {
            case 'success':
                return (
                    <View style={[styles.iconContainer, { backgroundColor: '#22C55E' }]}>
                        <Ionicons name="checkmark" size={32} color="#FFF" />
                    </View>
                );
            case 'warning':
                return (
                    <View style={[styles.iconContainer, { backgroundColor: 'transparent' }]}>
                        <Ionicons name="warning" size={48} color="#EF4444" />
                    </View>
                );
            case 'error':
            case 'confirmation':
                // Confirmation often has no icon in the requested designs, or maybe a warning one?
                // The "Delete" examples provided don't show a top icon, just red text.
                // But "Turn on location" (warning) shows a red triangle.
                return null;
            default:
                return null;
        }
    };

    // Title Color
    const getTitleColor = () => {
        switch (type) {
            case 'error':
            case 'confirmation':
                // The provided images for "Delete" show Red title
                if (title.toLowerCase().includes('delete') || title.toLowerCase().includes('cancel')) return '#EF4444';
                return '#1F2937';
            case 'warning':
            case 'success':
                return '#1F2937'; // Dark text
            default:
                return '#1F2937';
        }
    };

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <BlurView intensity={30} tint="light" style={styles.blurBackdrop} />
                <BlurView intensity={20} tint="light" style={styles.blurContainer}>
                    <View style={styles.alertContainer}>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>

                        {renderIcon()}

                        <Text style={[styles.title, { color: getTitleColor(), marginTop: type === 'success' || type === 'warning' ? 16 : 0 }]}>
                            {title}
                        </Text>

                        {message ? <Text style={styles.message}>{message}</Text> : null}

                        <View style={styles.buttonContainer}>
                            {buttons.map((btn, index) => {
                                const isDestructive = btn.style === 'destructive';
                                const isCancel = btn.style === 'cancel';

                                // Custom styling based on the "No" (outline) vs "Yes" (filled red) pattern
                                // Or "Go to Settings" (filled blue)

                                let buttonStyle = styles.defaultButton;
                                let textStyle = styles.defaultButtonText;

                                if (isDestructive) {
                                    buttonStyle = styles.destructiveButton;
                                    textStyle = styles.destructiveButtonText;
                                } else if (isCancel) {
                                    buttonStyle = styles.cancelButton;
                                    textStyle = styles.cancelButtonText;
                                } else {
                                    // Check if it's a primary action like "Go to Settings"
                                    if (buttons.length === 1) {
                                        buttonStyle = styles.primaryButton;
                                        textStyle = styles.primaryButtonText;
                                    }
                                }

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[buttonStyle, buttons.length > 1 && { flex: 1, marginHorizontal: 6 }]}
                                        onPress={() => {
                                            btn.onPress();
                                            onClose();
                                        }}
                                    >
                                        <Text style={textStyle}>{btn.text}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Footer text for destructive actions if needed */}
                        {(type === 'confirmation' || type === 'error') && (
                            <Text style={styles.footerText}>If proceed this can't be undone.</Text>
                        )}
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
    const [alertState, setAlertState] = useState<AlertOptions & { visible: boolean }>({
        visible: false,
        title: '',
        message: '',
        buttons: [],
        type: 'info',
    });

    const showAlert = useCallback((options: AlertOptions) => {
        setAlertState({
            visible: true,
            title: options.title,
            message: options.message,
            type: options.type || 'info', // Default to info
            buttons: options.buttons || [{ text: 'OK', onPress: () => { } }],
        });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertState((prev) => ({ ...prev, visible: false }));
    }, []);

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            <CustomAlert {...alertState} onClose={hideAlert} />
        </AlertContext.Provider>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    blurBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    blurContainer: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    alertContainer: {
        width: Math.min(width - 40, 320),
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 19,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    message: {
        fontSize: 15,
        color: '#4B5563',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        gap: 12,
    },
    // Button Styles
    defaultButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    defaultButtonText: {
        color: '#374151',
        fontWeight: '700',
        fontSize: 15,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: 'white',
        borderWidth: 1.5,
        borderColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        color: '#EF4444',
        fontWeight: '700',
        fontSize: 15,
    },
    destructiveButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    destructiveButtonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
    },
    primaryButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        backgroundColor: '#113C9C',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    primaryButtonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
    },
    footerText: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 12,
        fontWeight: '500',
    },
});
