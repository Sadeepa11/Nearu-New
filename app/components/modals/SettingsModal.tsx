import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { logout } from "../../../utils/auth";
import { useAlert } from "../../context/AlertContext";

export type ThemeColors = {
    primary: string;
    accent: string;
    white: string;
    black: string;
    gray: string;
    lightGray: string;
    success: string;
};

const COLORS: ThemeColors = {
    primary: "#113C9C",
    accent: "#EF4444",
    white: "#FFFFFF",
    black: "#1A1A1A",
    gray: "#6B7280",
    lightGray: "#F3F4F6",
    success: "#22C55E",
};

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    circleId?: string | number;
    circleName?: string;
    onOpenSmartNotifications?: () => void;
    onOpenLocationSharing?: () => void;
    onOpenCircleManagement?: () => void;
    onOpenAddPeople?: () => void;
    onOpenAccount?: () => void;
    onOpenDriveDetection?: () => void;
    onOpenCreateCircle?: () => void;
    onLogout?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    circleId,
    circleName,
    onOpenSmartNotifications,
    onOpenLocationSharing,
    onOpenCircleManagement,
    onOpenAddPeople,
    onOpenAccount,
    onOpenDriveDetection,
    onOpenCreateCircle,
    onLogout
}) => {
    const { showAlert } = useAlert();

    const handleLogout = () => {
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

    const handleSmartNotifications = () => {
        if (onOpenSmartNotifications) {
            onOpenSmartNotifications();
        } else if (circleId) {
            showAlert({ title: "Coming Soon", message: "Smart notifications settings are coming soon.", type: 'info' });
        } else {
            showAlert({ title: "Error", message: "No circle selected.", type: 'error' });
        }
    };

    const handleLocationSharing = () => {
        if (onOpenLocationSharing) {
            onOpenLocationSharing();
        }
    };

    const handleCircleManagement = () => {
        if (onOpenCircleManagement) {
            onOpenCircleManagement();
        } else if (!circleId) {
            showAlert({ title: "Error", message: "No circle selected to manage.", type: 'error' });
        }
    };

    const handleAddPeople = () => {
        if (onOpenAddPeople) {
            onOpenAddPeople();
        }
    };

    const handleAccount = () => {
        if (onOpenAccount) {
            onOpenAccount();
        }
    };

    const handleDriveDetection = () => {
        if (onOpenDriveDetection) {
            onOpenDriveDetection();
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
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color="#113C9C" />
                        <Text style={styles.headerTitle}>Settings</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>

                    {/* Circle Settings Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>
                            {circleName ? `${circleName} Circle Settings` : "Circle Settings"}
                        </Text>

                        <SettingsItem
                            icon={<Ionicons name="people-outline" size={22} color="#113C9C" />}
                            label="Smart Notifications"
                            onPress={handleSmartNotifications}
                        />
                        <SettingsItem
                            icon={<MaterialCommunityIcons name="car-connected" size={22} color="#113C9C" />}
                            label="Location Sharing"
                            onPress={handleLocationSharing}
                        />
                        <SettingsItem
                            icon={<Ionicons name="add-circle-outline" size={24} color="#113C9C" />}
                            label="Create New Circle"
                            onPress={onOpenCreateCircle}
                        />
                        {circleId && (
                            <SettingsItem
                                icon={<Ionicons name="information-circle-outline" size={24} color="#113C9C" />}
                                label={circleName ? `${circleName} Circle Management` : "Circle Management"}
                                onPress={handleCircleManagement}
                            />
                        )}
                        <SettingsItem
                            icon={<Ionicons name="help-circle-outline" size={24} color="#113C9C" />}
                            label="Add People to Circle"
                            onPress={handleAddPeople}
                        />
                    </View>

                    {/* App Settings Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>App Settings</Text>

                        <SettingsItem
                            icon={<Ionicons name="person-outline" size={22} color="#113C9C" />}
                            label="Account"
                            onPress={handleAccount}
                        />
                        <SettingsItem
                            icon={<MaterialCommunityIcons name="car-traction-control" size={22} color="#113C9C" />}
                            label="Drive Detection"
                            onPress={handleDriveDetection}
                        />
                        <SettingsItem
                            icon={<Ionicons name="shield-checkmark-outline" size={22} color="#113C9C" />}
                            label="Privacy & Security"
                            onPress={() => showAlert({ title: "Coming Soon", message: "Privacy settings coming soon.", type: 'info' })}
                        />
                        <SettingsItem
                            icon={<Ionicons name="chatbubble-ellipses-outline" size={22} color="#113C9C" />}
                            label="Chat with support"
                            onPress={() => showAlert({ title: "Coming Soon", message: "Support chat coming soon.", type: 'info' })}
                        />
                        <SettingsItem
                            icon={<Ionicons name="information-circle-outline" size={24} color="#113C9C" />}
                            label="About"
                            onPress={() => showAlert({ title: "About", message: "NearU v1.0.0", type: 'info' })}
                        />
                        <SettingsItem
                            icon={<Ionicons name="log-out-outline" size={24} color="#113C9C" />}
                            label="Log out"
                            onPress={handleLogout}
                        />
                    </View>

                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const SettingsItem = ({ icon, label, onPress }: { icon: React.ReactNode, label: string, onPress?: () => void }) => (
    <TouchableOpacity style={styles.itemRow} onPress={onPress}>
        <View style={styles.iconContainer}>
            {icon}
        </View>
        <Text style={styles.itemLabel}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#113C9C",
        marginLeft: 4,
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        fontSize: 14,
        color: "#113C9C",
        fontWeight: "600",
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        paddingBottom: 8,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
    },
    iconContainer: {
        width: 30,
        alignItems: "center",
        marginRight: 16,
    },
    itemLabel: {
        fontSize: 16,
        color: "#4b5563",
        fontWeight: "400",
    },
});

export default SettingsModal;
