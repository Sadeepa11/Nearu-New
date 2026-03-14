import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CircleManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    circleId?: string | number;
    circleName?: string;
    userRole?: string;
    onOpenAdminManagement?: (type?: string) => void;
    onOpenEditCircle?: () => void;
    onAddPeople?: () => void;
    onLeaveCircle?: () => void;
}

const CircleManagementModal: React.FC<CircleManagementModalProps> = ({
    isOpen,
    onClose,
    circleId,
    circleName = "Selected Circle Name",
    userRole = "Member",
    onOpenAdminManagement,
    onOpenEditCircle,
    onAddPeople,
    onLeaveCircle
}) => {
    if (!isOpen) return null;

    const formattedRole = userRole.charAt(0).toUpperCase() + userRole.slice(1);

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
                        <Text style={styles.headerTitle}>{circleName}</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Hero Card */}
                    <View style={styles.heroCard}>
                        <View style={styles.heroGraphicContainer}>
                            <View style={styles.circleGraphic}>
                                <View style={[styles.memberIcon, { top: 0, left: '35%' }]}>
                                    <Ionicons name="person-outline" size={16} color="#1A1A1A" />
                                </View>
                                <View style={[styles.memberIcon, { bottom: 5, left: '35%' }]}>
                                    <Ionicons name="person-outline" size={16} color="#1A1A1A" />
                                </View>
                                <View style={[styles.memberIcon, { top: '35%', left: -5 }]}>
                                    <Ionicons name="person-outline" size={16} color="#1A1A1A" />
                                </View>
                                <View style={[styles.memberIcon, { top: '35%', right: -5 }]}>
                                    <Ionicons name="person-outline" size={16} color="#1A1A1A" />
                                </View>
                                <View style={styles.innerGraphicCircle} />
                            </View>
                        </View>
                        <View style={styles.heroTextContainer}>
                            <Text style={styles.heroTitle}>Expand your safety network</Text>
                            <Text style={styles.heroSubtitle}>
                                We recommend to invite 3 to 4 members to your emergency contacts in your circle.
                            </Text>
                        </View>
                    </View>

                    {/* Pagination Dots */}
                    <View style={styles.paginationContainer}>
                        <View style={[styles.dot, styles.activeDot]} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                    </View>

                    {/* Circle Details Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>{circleName} Circle details</Text>
                        </View>

                        <View style={styles.menuItem}>
                            <TouchableOpacity onPress={onOpenEditCircle}>
                                <Text style={styles.menuItemText}>Edit Circle Name</Text>
                            </TouchableOpacity>

                            <Text style={styles.roleText}>{circleName}</Text>
                        </View>


                    </View>

                    {/* Circle Management Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>{circleName} Circle Management</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                // We'll trigger a shared handler or state
                                if (onOpenAdminManagement) {
                                    // No longer hacky, properly typed!
                                    onOpenAdminManagement('my-role');
                                }
                            }}
                        >
                            <Text style={styles.menuItemText}>My Role</Text>
                            <Text style={styles.roleText}>{formattedRole}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => onOpenAdminManagement?.()}>
                            <Text style={styles.menuItemText}>Change Admin Status</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={onAddPeople}>
                            <Text style={styles.menuItemText}>Add people to Circle</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={onLeaveCircle}>
                            <Text style={styles.leaveCircleText}>Leave Circle</Text>
                        </TouchableOpacity>
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
    },
    backButton: { flexDirection: "row", alignItems: "center" },
    headerTitle: {
        fontSize: 18,
        fontWeight: "500",
        color: "#113C9C",
        marginLeft: 12
    },
    content: { paddingHorizontal: 20 },

    heroCard: {
        backgroundColor: "#0D389D",
        borderRadius: 16,
        padding: 24,
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
    },
    heroGraphicContainer: {
        width: 80,
        height: 80,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    circleGraphic: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
    },
    innerGraphicCircle: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        borderWidth: 1.5,
        borderColor: "#4ADE80",
        borderStyle: 'solid',
    },
    memberIcon: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        zIndex: 1,
    },
    heroTextContainer: {
        flex: 1,
    },
    heroTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 8,
    },
    heroSubtitle: {
        color: "rgba(255, 255, 255, 0.9)",
        fontSize: 13,
        lineHeight: 18,
    },

    paginationContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 16,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#DBEAFE",
        marginHorizontal: 3,
    },
    activeDot: {
        backgroundColor: "#3B82F6",
        width: 8, // Optional: slightly larger for active
    },

    section: {
        marginTop: 16,
        marginBottom: 8,
    },
    sectionHeader: {
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        paddingBottom: 8,
        marginBottom: 16,
    },
    sectionHeaderText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
    },

    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 16,
        // Optional: add a very subtle separator if needed, but image shows clean spacing
    },
    menuItemText: {
        fontSize: 16,
        color: "#113C9C",
        fontWeight: "500",
    },
    roleText: {
        fontSize: 16,
        color: "#3B82F6",
        fontWeight: "500",
    },
    leaveCircleText: {
        fontSize: 16,
        color: "#113C9C",
        fontWeight: "500",
    },
});

export default CircleManagementModal;
