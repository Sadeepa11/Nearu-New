import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
    primary: "#113C9C",
    white: "#FFFFFF",
    navy: "#001B4D",
    gray: "#4B5563",
    lightGray: "#F9FAFB",
    border: "#E5E7EB",
    infoBg: "#E8F0FE",
    infoText: "#1E3A8A",
    buttonBlue: "#113C9C",
};

interface EditCircleNameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newName: string) => Promise<void>;
    initialName: string;
}

const EditCircleNameModal: React.FC<EditCircleNameModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialName,
}) => {
    const [circleName, setCircleName] = useState(initialName);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        setCircleName(initialName);
    }, [initialName, isOpen]);

    const handleSave = async () => {
        if (!circleName.trim()) {
            setError("Please enter a circle name");
            return;
        }

        try {
            setLoading(true);
            setError("");
            await onSave(circleName.trim());
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to update circle name");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            visible={isOpen}
            transparent={false}
            animationType="slide"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.flex}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                            <Text style={styles.backButtonText}>Edit Circle Name</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={styles.title}>{initialName}</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Circle Name</Text>
                            <TextInput
                                style={styles.input}
                                value={circleName}
                                onChangeText={(text) => {
                                    setCircleName(text);
                                    setError("");
                                }}
                                placeholder="Circle Name"
                                placeholderTextColor="#9CA3AF"
                                maxLength={50}
                            />
                            {error ? <Text style={styles.errorText}>{error}</Text> : null}
                        </View>

                        <View style={styles.privacyBox}>
                            <Text style={styles.privacyTitle}>Privacy First:</Text>
                            <Text style={styles.privacyText}>
                                Your location is only shared with family members you invite. You can leave or remove members anytime.
                            </Text>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.saveButton, (!circleName.trim() || loading) && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={loading || !circleName.trim()}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} size="small" />
                            ) : (
                                <Text style={styles.saveButtonText}>Update</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    flex: {
        flex: 1,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 18,
        color: COLORS.primary,
        marginLeft: 4,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.navy,
        marginBottom: 32,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 18,
        color: "#374151",
        marginBottom: 12,
        fontWeight: '400',
    },
    input: {
        height: 64,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 18,
        color: "#374151",
        backgroundColor: COLORS.white,
    },
    errorText: {
        color: "#EF4444",
        marginTop: 8,
        fontSize: 14,
    },
    privacyBox: {
        backgroundColor: COLORS.infoBg,
        borderRadius: 12,
        padding: 20,
        marginTop: 8,
    },
    privacyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.infoText,
        marginBottom: 8,
    },
    privacyText: {
        fontSize: 15,
        color: COLORS.infoText,
        lineHeight: 22,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 12,
    },
    saveButton: {
        backgroundColor: COLORS.buttonBlue,
        height: 64,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default EditCircleNameModal;
