import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const STORAGE_KEYS = {
    driveDetectionEnabled: "user_drive_detection_enabled",
};

interface DriveDetectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSettingsChanged?: (enabled: boolean) => void;
}

const DriveDetectionModal: React.FC<DriveDetectionModalProps> = ({
    isOpen,
    onClose,
    onSettingsChanged
}) => {
    const [isEnabled, setIsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = async () => {
        try {
            const value = await AsyncStorage.getItem(STORAGE_KEYS.driveDetectionEnabled);
            setIsEnabled(value === "true");
        } catch (e) {
            console.warn("Failed to load drive detection settings", e);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (value: boolean) => {
        setIsEnabled(value);
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.driveDetectionEnabled, value ? "true" : "false");
            if (onSettingsChanged) {
                onSettingsChanged(value);
            }
        } catch (error) {
            console.error("Failed to save drive detection settings", error);
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
                        <Ionicons name="arrow-back" size={24} color="#113C9C" />
                        <Text style={styles.headerTitle}>Drive Detection</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.card}>
                        <View style={styles.cardIconContainer}>
                            <MaterialCommunityIcons name="car-side" size={40} color="#113C9C" />
                            <View style={styles.alertBadge}>
                                <Text style={styles.alertText}>!</Text>
                            </View>
                        </View>
                        <View style={styles.cardTextContainer}>
                            <Text style={styles.cardTitle}>Drive detection</Text>
                            <Text style={styles.cardDescription}>
                                This must be turned on to view real-time speed, browse driving history, and enable Crash Alerts.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.dotsContainer}>
                        <View style={[styles.dot, styles.activeDot]} />
                        <View style={styles.dot} />
                    </View>

                    <Text style={styles.sectionHeader}>Drive Detection</Text>

                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>
                            Drive Detection {isEnabled ? "ON" : "OFF"}
                        </Text>
                        {loading ? (
                            <ActivityIndicator color="#113C9C" />
                        ) : (
                            <Switch
                                trackColor={{ false: "#767577", true: "#113C9C" }}
                                thumbColor={"#fff"}
                                ios_backgroundColor="#3e3e3e"
                                onValueChange={handleToggle}
                                value={isEnabled}
                            />
                        )}
                    </View>

                    <Text style={styles.explainerText}>
                        Each Circle member must enable this feature for themselves for their drives to appear.
                    </Text>
                    <Text style={styles.explainerText}>
                        Please note, you may see increased battery usage during drives.
                    </Text>

                    <Text style={styles.warningTitle}>What happens if you turn off?</Text>
                    <Text style={styles.warningSubtitle}>When this feature is turned off:</Text>

                    <View style={styles.checkItem}>
                        <Ionicons name="checkmark" size={20} color="#111827" />
                        <Text style={styles.checkText}>Crash Alerts will be disabled</Text>
                    </View>
                    <View style={styles.checkItem}>
                        <Ionicons name="checkmark" size={20} color="#111827" />
                        <Text style={styles.checkText}>
                            Your drives will not show on Individual Driver Reports or Family Driving Summary
                        </Text>
                    </View>
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
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    backButton: { flexDirection: "row", alignItems: "center" },
    headerTitle: { fontSize: 18, fontWeight: "600", color: "#113C9C", marginLeft: 12 },
    content: { padding: 20 },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        alignItems: "flex-start",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#f3f4f6",
    },
    cardIconContainer: {
        marginRight: 16,
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        height: 60,
        backgroundColor: '#F3F4F6',
        borderRadius: 30,
        position: 'relative'
    },
    alertBadge: { position: 'absolute', top: -2, right: 0, width: 14, height: 14 },
    alertText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
    cardTextContainer: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
    cardDescription: { fontSize: 14, color: "#4B5563", lineHeight: 20 },
    dotsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
    activeDot: { backgroundColor: '#113C9C' },
    sectionHeader: { fontSize: 16, fontWeight: "700", color: "#9CA3AF", marginBottom: 12 },
    toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    toggleLabel: { fontSize: 18, fontWeight: "700", color: '#113C9C' },
    explainerText: { fontSize: 14, color: "#111827", marginBottom: 16, lineHeight: 22 },
    warningTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 8, marginBottom: 8 },
    warningSubtitle: { fontSize: 14, color: "#4B5563", marginBottom: 12 },
    checkItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    checkText: { fontSize: 14, color: "#111827", marginLeft: 12, flex: 1, lineHeight: 20 },
});

export default DriveDetectionModal;
