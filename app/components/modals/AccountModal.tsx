import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    API_BASE_URL,
    authenticatedFetch,
    deleteUserProfile,
    logout,
    resendPhoneOtp,
    sendEmailVerification,
    sendPhoneOtp,
    storeTokens,
    updateUserProfile,
    verifyEmail,
    verifyPhoneOtp
} from "../../../utils/auth";
import { useAlert } from "../../context/AlertContext";

const COLORS = {
    primary: "#113C9C",
    accent: "#EF4444",
    white: "#FFFFFF",
    black: "#1A1A1A",
    gray: "#6B7280",
    lightGray: "#F3F4F6",
    success: "#22C55E",
};

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout?: () => void;
}

const AccountModal: React.FC<AccountModalProps> = ({
    isOpen,
    onClose,
    onLogout
}) => {
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();

    const [profileNameInput, setProfileNameInput] = useState("");
    const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isPickingProfileImage, setIsPickingProfileImage] = useState(false);
    const [profileModalError, setProfileModalError] = useState<string | null>(null);
    const [verificationType, setVerificationType] = useState<'email' | 'phone' | null>(null);
    const [verificationStep, setVerificationStep] = useState<'input' | 'otp'>('input');
    const [verificationInput, setVerificationInput] = useState('');
    const [otpInput, setOtpInput] = useState('');
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchUserProfile();
        }
    }, [isOpen]);

    const normalizeAvatarUrl = (url: string | null) => {
        if (!url) return null;
        if (url.startsWith("http") || url.startsWith("file:") || url.startsWith("data:")) {
            return url;
        }
        const relative = url.startsWith("/") ? url : `/${url}`;
        return `${API_BASE_URL}${relative}`.replace("/api/uploads", "/uploads");
    };

    const fetchUserProfile = async () => {
        try {
            setIsLoading(true);
            const response = await authenticatedFetch(`${API_BASE_URL}/profile`);
            if (response.ok) {
                const data = await response.json();
                const user = data.data || data;
                setProfileNameInput(user.name || "");
                setEmail(user.email || "");
                setPhone(user.phoneNumber || "");
                if (user.avatar) {
                    const normalized = normalizeAvatarUrl(user.avatar);
                    if (normalized) {
                        setProfileAvatarPreview(`${normalized}${normalized.includes('?') ? '&' : '?'}t=${Date.now()}`);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch profile", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePickProfileImage = async () => {
        setIsPickingProfileImage(true);
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                showAlert({ title: "Permission denied", message: "We need access to your photos to set a profile picture.", type: 'warning' });
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setProfileAvatarPreview(asset.uri);
                await handleSaveProfile(asset);
            }
        } catch (error) {
            console.error("Error picking image:", error);
            showAlert({ title: "Error", message: "Failed to pick image.", type: 'error' });
        } finally {
            setIsPickingProfileImage(false);
        }
    };

    const handleSaveProfile = async (imageAsset?: any) => {
        setIsSavingProfile(true);
        setProfileModalError(null);
        try {
            const updateParams: any = {
                name: profileNameInput.trim(),
            };

            // Preserve existing email and phone
            if (email) updateParams.email = email;
            if (phone) updateParams.phoneNumber = phone;

            if (imageAsset) {
                const uri = imageAsset.uri;
                const fileName = uri.split('/').pop() || "profile.jpg";
                const match = /\.(\w+)$/.exec(fileName);
                const type = match ? `image/${match[1]}` : `image/jpeg`;

                updateParams.profileImage = {
                    uri: uri,
                    name: fileName,
                    type: type,
                };
            }

            await updateUserProfile(updateParams);
            await fetchUserProfile();
        } catch (error: any) {
            console.error("Error saving profile:", error);
            setProfileModalError(error.message || "Failed to save profile.");
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleStartVerification = (type: 'email' | 'phone') => {
        setVerificationType(type);
        setVerificationStep('input');
        setVerificationInput(type === 'email' ? email : phone);
        setOtpInput('');
        setVerificationError(null);
    };

    const handleSendVerificationCode = async () => {
        if (!verificationInput.trim()) {
            setVerificationError(`Please enter your ${verificationType === 'email' ? 'email address' : 'phone number'}.`);
            return;
        }

        setIsVerifying(true);
        setVerificationError(null);

        try {
            if (verificationType === 'phone') {
                await sendPhoneOtp(verificationInput, profileNameInput);
            } else {
                await sendEmailVerification(verificationInput);
            }
            setVerificationStep('otp');
        } catch (error: any) {
            setVerificationError(error.message || "Failed to send verification code.");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!otpInput.trim()) {
            setVerificationError("Please enter the verification code.");
            return;
        }

        setIsVerifying(true);
        setVerificationError(null);

        try {
            let result;
            if (verificationType === 'phone') {
                result = await verifyPhoneOtp(verificationInput, otpInput, profileNameInput);
            } else {
                result = await verifyEmail(verificationInput, otpInput);
            }

            if (result && result.token) {
                // Update profile with BOTH identifiers to ensure they are linked and preserved
                const updateParams: any = {
                    name: profileNameInput
                };

                if (verificationType === 'phone') {
                    updateParams.phoneNumber = verificationInput;
                    if (email) updateParams.email = email;
                } else {
                    updateParams.email = verificationInput;
                    if (phone) updateParams.phoneNumber = phone;
                }

                await updateUserProfile(updateParams);

                // Always store the latest token returned by the verification step
                await storeTokens(result.token, result.refreshToken);

                showAlert({
                    title: "Success",
                    message: `${verificationType === 'phone' ? 'Phone number' : 'Email address'} has been verified and added to your account.`,
                    type: 'success'
                });

                setVerificationType(null);
                await fetchUserProfile();
            } else {
                throw new Error("Verification failed. Please check the code.");
            }
        } catch (error: any) {
            setVerificationError(error.message || "Verification failed.");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResendCode = async () => {
        setIsResending(true);
        setVerificationError(null);
        try {
            if (verificationType === 'phone') {
                await resendPhoneOtp(verificationInput);
            } else {
                await sendEmailVerification(verificationInput);
            }
            showAlert({ title: "Code Sent", message: "A new verification code has been sent.", type: 'success' });
        } catch (error: any) {
            setVerificationError(error.message || "Failed to resend code.");
        } finally {
            setIsResending(false);
        }
    };

    const handleDeleteAccount = async () => {
        showAlert({
            title: "Delete Account",
            message: "Are you sure you want to delete your account? This action is permanent and cannot be undone.",
            type: 'confirmation',
            buttons: [
                { text: "Cancel", style: "cancel", onPress: () => { } },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setIsSavingProfile(true);
                            await deleteUserProfile();
                            await logout();
                            onClose();
                            showAlert({ title: "Account Deleted", message: "Your account has been successfully deleted.", type: 'success' });
                        } catch (error: any) {
                            showAlert({ title: "Error", message: error.message || "Failed to delete account.", type: 'error' });
                        } finally {
                            setIsSavingProfile(false);
                        }
                    }
                }
            ]
        });
    };

    const handleLogout = async () => {
        if (onLogout) {
            onLogout();
        } else {
            showAlert({
                title: "Log Out",
                message: "Are you sure you want to log out?",
                type: 'confirmation',
                buttons: [
                    { text: "Cancel", style: "cancel", onPress: () => { } },
                    {
                        text: "Log Out",
                        style: "destructive",
                        onPress: async () => {
                            await logout();
                            onClose();
                        }
                    }
                ]
            });
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
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color="#0052CC" />
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Account</Text>
                    <View style={{ width: 60 }} />
                </View>

                {isLoading ? (
                    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.profileHeader}>
                            <View style={styles.avatarContainer}>
                                <View style={[styles.avatarWrapper, { backgroundColor: '#00154D' }]}>
                                    {profileAvatarPreview ? (
                                        <Image source={{ uri: profileAvatarPreview }} style={styles.avatarImage} />
                                    ) : (
                                        <Text style={styles.avatarInitials}>
                                            {(profileNameInput || "User").substring(0, 2).toUpperCase()}
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={styles.cameraBadge}
                                    onPress={handlePickProfileImage}
                                    disabled={isSavingProfile || isPickingProfileImage}
                                >
                                    {isPickingProfileImage ? (
                                        <ActivityIndicator size="small" color="#555" />
                                    ) : (
                                        <Ionicons name="camera-outline" size={14} color="#555" />
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View style={styles.nameInputContainer}>
                                <TextInput
                                    style={styles.nameInput}
                                    value={profileNameInput}
                                    onChangeText={setProfileNameInput}
                                    placeholder="Your Name"
                                    placeholderTextColor="#A0A0A0"
                                    onEndEditing={() => handleSaveProfile()}
                                />
                            </View>
                        </View>

                        <View style={styles.bodyContent}>
                            <Text style={styles.sectionTitle}>Account Details</Text>
                            <View style={styles.detailsList}>
                                <View style={styles.detailItem}>
                                    <View style={styles.detailIconWrapper}>
                                        <Ionicons name="phone-portrait-outline" size={24} color="#00154D" />
                                    </View>
                                    <View style={styles.detailTextWrapper}>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Phone Number</Text>
                                            {phone ? (
                                                <Text style={[styles.statusBadge, { color: '#22C55E' }]}>Verified</Text>
                                            ) : (
                                                <TouchableOpacity onPress={() => handleStartVerification('phone')}>
                                                    <Text style={[styles.statusBadge, { color: '#0052CC' }]}>Set</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        <Text style={styles.detailValue}>{phone || "Not set"}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailItem}>
                                    <View style={styles.detailIconWrapper}>
                                        <MaterialCommunityIcons name="email-outline" size={24} color="#00154D" />
                                    </View>
                                    <View style={styles.detailTextWrapper}>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Email Address</Text>
                                            {email ? (
                                                <Text style={[styles.statusBadge, { color: '#22C55E' }]}>Verified</Text>
                                            ) : (
                                                <TouchableOpacity onPress={() => handleStartVerification('email')}>
                                                    <Text style={[styles.statusBadge, { color: '#0052CC' }]}>Set</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        <Text style={styles.detailValue}>{email || "Not set"}</Text>
                                    </View>
                                    {!email && (
                                        <TouchableOpacity style={styles.alertIconWrapper} onPress={() => handleStartVerification('email')}>
                                            <Ionicons name="alert-circle" size={24} color="#FF3B30" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Account Management</Text>
                            <View style={styles.actionsList}>
                                <TouchableOpacity style={[styles.actionLink, { marginTop: 16 }]} onPress={handleLogout}>
                                    <Text style={styles.actionLinkText}>Log Out</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.actionLink, { marginTop: 12 }]} onPress={handleDeleteAccount}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.actionLinkText, { color: COLORS.accent }]}>Delete Account</Text>
                                    </View>
                                </TouchableOpacity>

                                {profileModalError ? (
                                    <Text style={styles.errorText}>{profileModalError}</Text>
                                ) : null}

                                {isSavingProfile && (
                                    <Text style={styles.savingText}>Saving changes...</Text>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* Verification Modal */}
            <Modal
                visible={verificationType !== null}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setVerificationType(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.verificationModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {verificationStep === 'input'
                                    ? `Set ${verificationType === 'email' ? 'Email' : 'Phone'}`
                                    : 'Verify Code'
                                }
                            </Text>
                            <TouchableOpacity onPress={() => setVerificationType(null)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {verificationStep === 'input' ? (
                            <View style={styles.modalBody}>
                                <Text style={styles.modalDescription}>
                                    Enter your {verificationType === 'email' ? 'email address' : 'phone number'}. We'll send you a verification code.
                                </Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={verificationInput}
                                    onChangeText={setVerificationInput}
                                    placeholder={verificationType === 'email' ? "email@example.com" : "+94771234567"}
                                    keyboardType={verificationType === 'email' ? "email-address" : "phone-pad"}
                                    autoCapitalize="none"
                                />
                                {verificationError && <Text style={styles.modalErrorText}>{verificationError}</Text>}
                                <TouchableOpacity
                                    style={[styles.modalButton, isVerifying && styles.modalButtonDisabled]}
                                    onPress={handleSendVerificationCode}
                                    disabled={isVerifying}
                                >
                                    {isVerifying ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.modalButtonText}>Send Code</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.modalBody}>
                                <Text style={styles.modalDescription}>
                                    Enter the code sent to {verificationInput}
                                </Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={otpInput}
                                    onChangeText={setOtpInput}
                                    placeholder="Enter 6-digit code"
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />
                                {verificationError && <Text style={styles.modalErrorText}>{verificationError}</Text>}
                                <TouchableOpacity
                                    style={[styles.modalButton, isVerifying && styles.modalButtonDisabled]}
                                    onPress={handleVerifyCode}
                                    disabled={isVerifying}
                                >
                                    {isVerifying ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.modalButtonText}>Verify & Save</Text>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.resendLink}
                                    onPress={handleResendCode}
                                    disabled={isResending}
                                >
                                    <Text style={styles.resendLinkText}>
                                        {isResending ? 'Resending...' : 'Didn\'t receive code? Resend'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.resendLink, { marginTop: 8 }]}
                                    onPress={() => setVerificationStep('input')}
                                >
                                    <Text style={[styles.resendLinkText, { color: COLORS.gray }]}>
                                        Change {verificationType === 'email' ? 'email' : 'phone'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    backButton: { flexDirection: "row", alignItems: "center" },
    backText: { fontSize: 17, color: "#0052CC", marginLeft: 4, fontWeight: '500' },
    headerTitle: { fontSize: 17, fontWeight: "600", color: "#111827" },
    content: { paddingBottom: 40 },
    profileHeader: {
        backgroundColor: "#E6F0FF",
        paddingVertical: 24,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
    },
    avatarContainer: { position: 'relative', marginRight: 16 },
    avatarWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarInitials: { color: "#fff", fontSize: 20, fontWeight: "bold" },
    avatarImage: { width: '100%', height: '100%' },
    cameraBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#EAEAEC',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E6F0FF',
    },
    nameInputContainer: { flex: 1 },
    nameInput: {
        fontSize: 18,
        fontWeight: '600',
        color: '#00154D',
        paddingVertical: 4,
    },
    bodyContent: { paddingHorizontal: 20, paddingTop: 32 },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7281',
        marginBottom: 16,
        textTransform: 'uppercase',
    },
    detailsList: { marginBottom: 24 },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    detailIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    detailTextWrapper: { flex: 1, justifyContent: 'center' },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    detailLabel: { fontSize: 12, color: '#6B7281', fontWeight: '500' },
    detailValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
    statusBadge: { fontSize: 12, fontWeight: '600' },
    alertIconWrapper: { marginLeft: 12 },
    actionsList: {},
    actionLink: { paddingVertical: 12 },
    actionLinkText: { fontSize: 16, color: '#0052CC', fontWeight: '500' },
    errorText: { marginTop: 12, color: "#DC2626", fontSize: 14, textAlign: 'center' },
    savingText: { textAlign: 'center', marginTop: 10, color: '#6B7280' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    verificationModalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    modalBody: {
        alignItems: 'center',
    },
    modalDescription: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    modalInput: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#111827',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalErrorText: {
        color: '#DC2626',
        fontSize: 13,
        marginBottom: 16,
        textAlign: 'center',
    },
    modalButton: {
        width: '100%',
        height: 50,
        backgroundColor: '#113C9C',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    resendLink: {
        padding: 8,
    },
    resendLinkText: {
        fontSize: 14,
        color: '#0052CC',
        fontWeight: '500',
    },
});

export default AccountModal;
