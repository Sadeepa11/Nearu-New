import { Ionicons } from "@expo/vector-icons";
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

interface CircleNotificationSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    circleId?: string | number;
    initialSettings?: any;
    onSettingsChanged?: (settings: any) => void;
}

const CircleNotificationSettingsModal: React.FC<CircleNotificationSettingsModalProps> = ({
    isOpen,
    onClose,
    circleId,
    initialSettings,
    onSettingsChanged
}) => {
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
                        <Text style={styles.headerTitle}>Notification Settings</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-outline" size={64} color="#9CA3AF" />
                        <Text style={styles.emptyTitle}>Notification Settings</Text>
                        <Text style={styles.emptyText}>
                            Notification preferences will appear here
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
    headerTitle: { fontSize: 18, fontWeight: "600", color: "#113C9C", marginLeft: 4 },
    content: { flex: 1, padding: 20 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
    emptyTitle: { fontSize: 20, fontWeight: '600', color: '#111827', marginTop: 16, marginBottom: 8 },
    emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});

export default CircleNotificationSettingsModal;
