import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL, authenticatedFetch } from "../../../utils/auth";

const STORAGE_KEY = "smart_notifications_enabled";

export enum NotificationType {
    LOCATION_REACHED = "location_reached",
    LOCATION_LEFT = "location_left",
    INVITE = "invite",
    MEMBERSHIP_ACCEPTED = "membership_accepted",
    MEMBERSHIP_REJECTED = "membership_rejected",
    MEMBER_REMOVED = "member_removed",
    ROLE_UPDATED = "role_updated",
    NICKNAME_UPDATED = "nickname_updated",
    LOCATION_ADDED = "location_added",
    LOCATION_REMOVED = "location_removed",
    LOCATION_ASSIGNED = "location_assigned",
    LOCATION_UNASSIGNED = "location_unassigned",
    CRASH_DETECTED = "crash_detected",
    SOS_ALERT = "sos_alert",
    LOW_BATTERY = "low_battery",
}

export enum NotificationRecipientType {
    ALL_MEMBERS = "all_members",
    CREATOR_AND_ADMINS = "creator_and_admins",
    TRIGGERING_USER_ONLY = "triggering_user_only",
    NONE = "none",
}

export interface CircleNotificationSettings {
    [key: string]: NotificationRecipientType;
}

interface SmartNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSettingsChanged?: (enabled: boolean) => void;
    userName?: string;
    userAvatarUrl?: string | null;
    circleId?: string;
    notificationSettings?: CircleNotificationSettings;
}

const SmartNotificationModal: React.FC<SmartNotificationModalProps> = ({
    isOpen,
    onClose,
    onSettingsChanged,
    userName = "User",
    userAvatarUrl = null,
    circleId,
    notificationSettings,
}) => {

    // Instead of a single isEnabled, we track detailed settings locally
    const [settings, setSettings] = useState<CircleNotificationSettings>({
        [NotificationType.LOCATION_REACHED]: NotificationRecipientType.ALL_MEMBERS,
        [NotificationType.LOCATION_LEFT]: NotificationRecipientType.CREATOR_AND_ADMINS,
        [NotificationType.SOS_ALERT]: NotificationRecipientType.ALL_MEMBERS,
        [NotificationType.LOW_BATTERY]: NotificationRecipientType.CREATOR_AND_ADMINS,
        [NotificationType.CRASH_DETECTED]: NotificationRecipientType.CREATOR_AND_ADMINS
    });

    // Track which section is expanded for editing audience
    const [expandedType, setExpandedType] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const AUDIENCE_OPTIONS = [
        { id: NotificationRecipientType.ALL_MEMBERS, label: "All members" },
        { id: NotificationRecipientType.CREATOR_AND_ADMINS, label: "Creator and admins" },
        { id: NotificationRecipientType.TRIGGERING_USER_ONLY, label: "Triggering user only" },
        { id: NotificationRecipientType.NONE, label: "None" },
    ];

    const NOTIFICATION_TYPES = [
        { id: NotificationType.LOW_BATTERY, label: "Low battery notifications" },
        { id: NotificationType.LOCATION_REACHED, label: "Place arrival (Check-in)" },
        { id: NotificationType.LOCATION_LEFT, label: "Place departure (Check-out)" },
        { id: NotificationType.SOS_ALERT, label: "SOS alerts" },
        { id: NotificationType.CRASH_DETECTED, label: "Crash detection" },
    ];

    useEffect(() => {
        if (isOpen) {
            initSettings();
        }
    }, [isOpen, notificationSettings]);

    const initSettings = async () => {
        if (notificationSettings) {
            // Merge valid settings
            setSettings((prev) => ({
                ...prev,
                ...notificationSettings
            }));
            setLoading(false);
        } else {
            setLoading(false);
        }
    };

    // Helper to send API request
    // Helper to send API request
    const saveSettings = async (newSettings: CircleNotificationSettings) => {
        if (!circleId) return;

        try {
            console.log("Updating notification settings:", JSON.stringify({ notificationSettings: newSettings }));

            const response = await authenticatedFetch(`${API_BASE_URL}/circles/${circleId}/notification-settings`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    accept: "application/json"
                },
                body: JSON.stringify({ notificationSettings: newSettings }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                const errorMessage = payload?.message || `Failed to update settings (Status: ${response.status})`;
                console.warn(`Failed to update notification settings:`, errorMessage);
                throw new Error(errorMessage);
            }

            if (Platform.OS === 'android') {
                ToastAndroid.show("Settings updated", ToastAndroid.SHORT);
            }

            if (onSettingsChanged) {
                onSettingsChanged(true); // Just signal a change
            }
        } catch (error: any) {
            console.error("Failed to update settings", error);
            Alert.alert("Error", error.message || "Failed to update settings.");
        }
    };

    const toggleType = async (typeId: string, currentValue: NotificationRecipientType) => {
        const isCurrentlyEnabled = currentValue !== NotificationRecipientType.NONE;

        let newValue = NotificationRecipientType.NONE;
        if (!isCurrentlyEnabled) {
            newValue = NotificationRecipientType.ALL_MEMBERS; // Default when turning on
        }

        const newSettings = { ...settings, [typeId]: newValue };
        setSettings(newSettings);
        await saveSettings(newSettings);
    };

    const changeAudience = async (typeId: string, audience: NotificationRecipientType) => {
        const newSettings = { ...settings, [typeId]: audience };
        setSettings(newSettings);
        setExpandedType(null); // Collapse after selection
        await saveSettings(newSettings);
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
                        <Text style={styles.headerTitle}>Smart Notification</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Premium Card */}
                    <View style={styles.permissionsCard}>
                        <View style={styles.permissionIconWrapper}>
                            <View style={styles.phoneIconCircle}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={styles.batteryContainer}>
                                        <View style={styles.batteryFill} />
                                    </View>
                                    <View style={styles.batteryTip} />
                                </View>
                            </View>
                        </View>
                        <View style={styles.permissionTextWrapper}>
                            <Text style={styles.permissionTitle}>Low battery notification</Text>
                            <Text style={styles.permissionSubtitle}>
                                Receive notification when a member phone battery drops below 10%
                            </Text>
                        </View>
                    </View>

                    {/* Carousel Dots */}
                    <View style={styles.dotsContainer}>
                        <View style={[styles.dot, styles.activeDot]} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                    </View>

                    {/* Detailed Options List */}
                    <View style={styles.optionsList}>
                        {NOTIFICATION_TYPES.map((type) => {
                            const value = settings[type.id] as NotificationRecipientType;
                            const isEnabled = value !== NotificationRecipientType.NONE && value !== undefined;
                            const audienceLabel = AUDIENCE_OPTIONS.find(o => o.id === value)?.label || "Custom";

                            return (
                                <View key={type.id} style={styles.optionContainer}>
                                    <View style={styles.optionHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.optionTitle}>{type.label}</Text>
                                            {isEnabled && (
                                                <TouchableOpacity onPress={() => setExpandedType(expandedType === type.id ? null : type.id)}>
                                                    <Text style={styles.audienceValueText}>
                                                        {audienceLabel} <Ionicons name="chevron-down" size={12} />
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        <Switch
                                            trackColor={{ false: "#D1D5DB", true: "#113C9C" }}
                                            thumbColor={"#fff"}
                                            ios_backgroundColor="#D1D5DB"
                                            onValueChange={() => toggleType(type.id, value)}
                                            value={isEnabled}
                                        />
                                    </View>

                                    {/* Audience Selection Dropdown */}
                                    {isEnabled && expandedType === type.id && (
                                        <View style={styles.audienceDropdown}>
                                            <Text style={styles.audienceDropdownTitle}>Who receives this?</Text>
                                            {AUDIENCE_OPTIONS.map((opt) => (
                                                <TouchableOpacity
                                                    key={opt.id}
                                                    style={styles.dropdownOption}
                                                    onPress={() => changeAudience(type.id, opt.id)}
                                                >
                                                    <View style={[
                                                        styles.radioSmall,
                                                        value === opt.id && styles.radioSmallSelected
                                                    ]}>
                                                        {value === opt.id && <View style={styles.radioSmallInner} />}
                                                    </View>
                                                    <Text style={styles.dropdownOptionText}>{opt.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>

                    {/* What happen if you turn off? section */}
                    <View style={styles.explanationSection}>
                        <Text style={styles.explanationTitle}>What happen if you turn off?</Text>
                        <Text style={styles.explanationSubtitle}>When this feature status is off</Text>

                        <View style={styles.bulletPoint}>
                            <View style={styles.bullet} />
                            <Text style={styles.bulletText}>Location status will be Disabled</Text>
                        </View>

                        <View style={styles.bulletPoint}>
                            <View style={styles.bullet} />
                            <Text style={styles.bulletText}>Device will not be show on Individual Driver Report or monthly Driving Summary</Text>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: {
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "500",
        color: "#113C9C",
        marginBottom: 12
    },
    content: {
        paddingTop: 10,
        paddingBottom: 40,
    },
    permissionsCard: {
        backgroundColor: '#113C9C',
        borderRadius: 20,
        marginHorizontal: 20,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
    },
    permissionIconWrapper: {
        marginRight: 16,
    },
    phoneIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    batteryContainer: {
        width: 44,
        height: 22,
        borderWidth: 2,
        borderColor: '#EF4444',
        borderRadius: 4,
        padding: 2,
        justifyContent: 'flex-start',
        flexDirection: 'row',
    },
    batteryFill: {
        backgroundColor: '#EF4444',
        height: '100%',
        width: '15%',
        borderRadius: 1,
    },
    batteryTip: {
        width: 3,
        height: 8,
        backgroundColor: '#EF4444',
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },
    permissionTextWrapper: {
        flex: 1,
    },
    permissionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    permissionSubtitle: {
        fontSize: 13,
        color: '#FFFFFF',
        lineHeight: 18,
        opacity: 0.9,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
        marginBottom: 24,
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#D1D5DB',
    },
    activeDot: {
        backgroundColor: '#113C9C',
    },
    optionsList: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    optionItem: {
        fontSize: 16,
        color: '#111827',
        marginBottom: 16,
        fontWeight: '400',
    },
    userToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F0FE',
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: 16,
    },
    avatarMain: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#001B4D',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 28,
    },
    onlineStatusDot: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#22C55E',
        borderWidth: 2,
        borderColor: '#E8F0FE',
    },
    userNameText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#113C9C',
    },
    explanationSection: {
        paddingHorizontal: 20,
    },
    explanationTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#113C9C',
        marginBottom: 12,
    },
    explanationSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
    },
    bulletPoint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        paddingRight: 10,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#113C9C',
        marginTop: 6,
        marginRight: 12,
    },
    bulletText: {
        fontSize: 14,
        color: '#113C9C',
        lineHeight: 20,
        flex: 1,
    },
    audienceSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    audienceTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#113C9C',
        marginBottom: 12,
    },
    audienceOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#9CA3AF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    radioButtonSelected: {
        borderColor: '#113C9C',
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#113C9C',
    },
    audienceLabel: {
        fontSize: 16,
        color: '#374151',
    },
    // New Styles for Granular Options
    optionContainer: {
        marginBottom: 20,
    },
    optionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    optionTitle: {
        fontSize: 16,
        color: '#111827',
        fontWeight: '500',
    },
    audienceValueText: {
        fontSize: 14,
        color: '#113C9C',
        marginTop: 4,
    },
    audienceDropdown: {
        marginTop: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 12,
    },
    audienceDropdownTitle: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 8,
        textTransform: 'uppercase',
        fontWeight: '700',
    },
    dropdownOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    dropdownOptionText: {
        fontSize: 14,
        color: '#374151',
    },
    radioSmall: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#9CA3AF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    radioSmallSelected: {
        borderColor: '#113C9C',
    },
    radioSmallInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#113C9C',
    },

});

export default SmartNotificationModal;
