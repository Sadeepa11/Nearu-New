import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STORAGE_KEY = "location_sharing_enabled";

interface LocationSharingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSettingsChanged?: (enabled: boolean) => void;
    userName?: string;
    userAvatarUrl?: string | null;
    userRole?: string | null;
}

const LocationSharingModal: React.FC<LocationSharingModalProps> = ({
    isOpen,
    onClose,
    onSettingsChanged,
    userName = "User",
    userAvatarUrl = null,
    userRole = "None"
}) => {
    const [isEnabled, setIsEnabled] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = async () => {
        try {
            const value = await AsyncStorage.getItem(STORAGE_KEY);
            setIsEnabled(value !== "false"); // Default to true
        } catch (e) {
            console.warn("Failed to load location sharing settings", e);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (value: boolean) => {
        setIsEnabled(value);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, value ? "true" : "false");
            if (onSettingsChanged) {
                onSettingsChanged(value);
            }
        } catch (error) {
            console.error("Failed to save location sharing settings", error);
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
                        <Text style={styles.headerTitle}>Location Sharing</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Device Permissions Card (Simulated Carousel Item) */}
                    <View style={styles.permissionsCard}>
                        <View style={styles.permissionIconWrapper}>
                            <View style={styles.phoneIconCircle}>
                                <Ionicons name="phone-portrait-outline" size={40} color="#113C9C" />
                                <View style={styles.locationPinOverlap}>
                                    <Ionicons name="location" size={20} color="#EF4444" />
                                </View>
                            </View>
                        </View>
                        <View style={styles.permissionTextWrapper}>
                            <Text style={styles.permissionTitle}>Device Permissions</Text>
                            <Text style={styles.permissionSubtitle}>
                                NEARU requires your device’s location permission to be “on”. Allow this in your phone settings
                            </Text>
                        </View>
                    </View>

                    {/* Carousel Dots */}
                    <View style={styles.dotsContainer}>
                        <View style={[styles.dot, styles.activeDot]} />
                        <View style={styles.dot} />
                    </View>

                    {/* Your Location Sharing Section */}
                    <Text style={styles.sectionLabel}>Your Location Sharing</Text>

                    <View style={styles.userToggleRow}>
                        <View style={styles.avatarWrapper}>
                            <View style={styles.avatarMain}>
                                {userAvatarUrl ? (
                                    <Image source={{ uri: userAvatarUrl }} style={styles.avatarImage} />
                                ) : (
                                    <Text style={styles.avatarText}>
                                        {userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.onlineStatusDot} />
                        </View>

                        <Text style={styles.userNameText}>{userName}</Text>

                        {loading ? (
                            <ActivityIndicator color="#113C9C" />
                        ) : (
                            <Switch
                                trackColor={{ false: "#D1D5DB", true: "#113C9C" }}
                                thumbColor={"#fff"}
                                ios_backgroundColor="#D1D5DB"
                                onValueChange={handleToggle}
                                value={isEnabled}
                            />
                        )}
                    </View>

                    {/* Circle Member Status Section */}
                    <View style={styles.statusSection}>
                        <Text style={styles.sectionLabel}>Circle member status</Text>
                        <Text style={styles.statusValueText}>{userRole || "None"}</Text>
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
        marginLeft: 12
    },
    content: {
        paddingTop: 10,
    },
    permissionsCard: {
        backgroundColor: '#113C9C',
        borderRadius: 20,
        marginHorizontal: 20,
        padding: 20,
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
    locationPinOverlap: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 2,
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
        marginTop: 12,
        marginBottom: 30,
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D1D5DB',
    },
    activeDot: {
        backgroundColor: '#113C9C',
    },
    sectionLabel: {
        fontSize: 16,
        color: '#2563EB',
        fontWeight: '500',
        marginLeft: 20,
        marginBottom: 16,
    },
    userToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F0FE',
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 24,
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
        fontWeight: '700',
        color: '#113C9C',
    },
    statusSection: {
        paddingHorizontal: 0,
        marginTop: 8,
    },
    statusValueText: {
        fontSize: 15,
        color: '#6B7280',
        paddingHorizontal: 20,
        marginTop: 4,
    },
});

export default LocationSharingModal;
