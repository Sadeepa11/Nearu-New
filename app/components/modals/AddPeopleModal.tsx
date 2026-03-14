import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Clipboard,
    Dimensions,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL, authenticatedFetch } from "../../../utils/auth";
import { useAlert } from "../../context/AlertContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface AddPeopleModalProps {
    isOpen: boolean;
    onClose: () => void;
    circleId?: string | number;
    circleName?: string;
}

const AddPeopleModal: React.FC<AddPeopleModalProps> = ({
    isOpen,
    onClose,
    circleId,
    circleName = "Circle",
}) => {
    const { showAlert } = useAlert();
    const [invitationCode, setInvitationCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && circleId) {
            fetchInvitationCode();
        }
    }, [isOpen, circleId]);

    const fetchInvitationCode = async () => {
        setLoading(true);
        setError(null);
        try {
            // Try to fetch existing invites first
            const response = await authenticatedFetch(`${API_BASE_URL}/circles/${circleId}/invites`, {
                headers: { accept: "application/json" }
            });

            if (response.ok) {
                const data = await response.json();
                const invites = data.data || data;
                if (Array.isArray(invites) && invites.length > 0) {
                    // Find a valid code
                    const validInvite = invites.find((inv: any) => inv.code && (!inv.codeExpiresAt || new Date(inv.codeExpiresAt) > new Date()));
                    if (validInvite) {
                        setInvitationCode(validInvite.code);
                        setLoading(false);
                        return;
                    }
                }
            }

            // If no valid code, generate one
            await generateNewCode();
        } catch (err) {
            console.error("Failed to fetch invitation code", err);
            setError("Failed to load invitation code");
            setLoading(false);
        }
    };

    const generateNewCode = async () => {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/circles/${circleId}/generate-invitation-code`, {
                method: "POST",
                headers: { accept: "application/json", "Content-Type": "application/json" }
            });

            const data = await response.json();
            if (response.ok) {
                // The API might return the circle or the invite code depending on implementation
                const code = data.invitationCode || data.code || (data.data && (data.data.invitationCode || data.data.code));
                if (code) {
                    setInvitationCode(code);
                } else {
                    // Fallback: fetch invites again
                    const invitesRes = await authenticatedFetch(`${API_BASE_URL}/circles/${circleId}/invites`);
                    const invitesData = await invitesRes.json();
                    const invites = invitesData.data || invitesData;
                    if (Array.isArray(invites) && invites.length > 0) {
                        setInvitationCode(invites[0].code);
                    }
                }
            } else {
                setError(data.message || "Failed to generate code");
            }
        } catch (err) {
            console.error("Error generating code", err);
            setError("Failed to generate code");
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!invitationCode) return;
        try {
            await Share.share({
                message: `Join my circle "${circleName}" on NearU using code: ${invitationCode}`,
            });
        } catch (error: any) {
            showAlert({ title: "Error", message: "Could not share code", type: 'error' });
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            visible={isOpen}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color="#113C9C" />
                        <Text style={styles.headerTitle}>Back</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>Invite members to the {circleName} Circle</Text>
                        <Text style={styles.subtitle}>
                            Share your code or send it in a message, email or in-App
                        </Text>
                    </View>

                    <View style={styles.codeContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#113C9C" />
                        ) : error ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                                <TouchableOpacity style={styles.retryButton} onPress={fetchInvitationCode}>
                                    <Text style={styles.retryButtonText}>Retry</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={styles.codeText}>{invitationCode}</Text>
                                    <TouchableOpacity
                                        style={styles.copyButton}
                                        onPress={() => {
                                            if (invitationCode) {
                                                Clipboard.setString(invitationCode);
                                                showAlert({ title: "Copied", message: "Code copied to clipboard", type: 'success' });
                                            }
                                        }}
                                    >
                                        <Ionicons name="copy-outline" size={24} color="#113C9C" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.codeExpiry}>This code will be active for 2 days</Text>
                            </>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.shareButton, !invitationCode && styles.disabledButton]}
                        onPress={handleShare}
                        disabled={!invitationCode}
                    >
                        <Text style={styles.shareButtonText}>Share Code</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: { flexDirection: "row", alignItems: "center" },
    headerTitle: {
        fontSize: 18,
        fontWeight: "500",
        color: "#113C9C",
        marginLeft: 8
    },
    content: { padding: 24, flexGrow: 1 },
    titleSection: { marginBottom: 32 },
    title: { fontSize: 24, fontWeight: "bold", color: "#1A1A1A", marginBottom: 12 },
    subtitle: { fontSize: 16, color: "#6B7281", lineHeight: 24 },
    codeContainer: {
        backgroundColor: "#F0F4FF",
        borderRadius: 20,
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 32,
    },
    codeText: {
        fontSize: 38,
        fontWeight: "800",
        color: "#113C9C",
        letterSpacing: 8,
    },
    copyButton: {
        marginLeft: 16,
        padding: 8,
        backgroundColor: "#fff",
        borderRadius: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    codeExpiry: { fontSize: 14, color: "#113C9C", opacity: 0.7, marginTop: 12 },
    shareButton: {
        backgroundColor: "#113C9C",
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    shareButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
    disabledButton: { backgroundColor: "#9CA3AF" },
    errorContainer: { alignItems: "center" },
    errorText: { color: "#EF4444", marginBottom: 16 },
    retryButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: "#113C9C",
        borderRadius: 8,
    },
    retryButtonText: { color: "#fff", fontWeight: "600" },
});

export default AddPeopleModal;
