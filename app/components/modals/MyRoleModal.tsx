import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface MyRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    userRole?: string;
    userRelation?: string;
    onSaveRelation?: (newRelation: string) => Promise<void>;
}

const RELATION_OPTIONS = [
    { value: "Mom", label: "Mom" },
    { value: "Dad", label: "Dad" },
    { value: "Son/ Daughter/Child", label: "Son/ Daughter/Child" },
    { value: "Grandparent", label: "Grandparent" },
    { value: "Partner/Spouse", label: "Partner/Spouse" },
    { value: "Friend", label: "Friend" },
    { value: "Other", label: "Other" },
];

const COLORS = {
    primary: "#113C9C",
    primaryLight: "#EBF5FF",
    text: "#111827",
    textLight: "#6B7280",
    background: "#F9FAFB",
    white: "#FFFFFF",
    border: "#F3F4F6",
    success: "#10B981",
};

const MyRoleModal: React.FC<MyRoleModalProps> = ({
    isOpen,
    onClose,
    userRole = "member",
    userRelation = "Other",
    onSaveRelation
}) => {
    const [selectedRelation, setSelectedRelation] = useState(userRelation);
    const [isSaving, setIsSaving] = useState(false);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (isOpen) {
            setSelectedRelation(userRelation);
        }
    }, [isOpen, userRelation]);

    if (!isOpen) return null;

    const hasChanged = selectedRelation !== userRelation;

    const handleSave = async () => {
        if (!onSaveRelation || !hasChanged || isSaving) return;

        setIsSaving(true);
        try {
            await onSaveRelation(selectedRelation);
        } finally {
            setIsSaving(false);
        }
    };

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
                        <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Role</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.section}>
                        <Text style={styles.mainTitle}>What's your role in the{'\n'}Family Circle?</Text>

                        <View style={styles.optionsGrid}>
                            {RELATION_OPTIONS.map((option) => {
                                const isSelected = selectedRelation === option.value;
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.optionCard,
                                            isSelected && styles.optionCardSelected
                                        ]}
                                        onPress={() => setSelectedRelation(option.value)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[
                                            styles.radioButton,
                                            isSelected && styles.radioButtonSelected
                                        ]}>
                                            {isSelected && <View style={styles.radioButtonInner} />}
                                        </View>
                                        <Text style={[
                                            styles.optionLabel,
                                            isSelected && styles.optionLabelSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            (!hasChanged || isSaving) && styles.saveButtonDisabled
                        ]}
                        onPress={handleSave}
                        disabled={!hasChanged || isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                            <Text style={styles.saveButtonText}>Ok</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
    },
    content: { padding: 20 },
    section: {
        marginBottom: 32,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 32,
        marginTop: 20,
        textAlign: "center",
        lineHeight: 32,
    },








    optionsGrid: {
        gap: 12,
    },
    optionCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 18,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    optionCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: "#FAFBFF",
    },
    radioButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#D1D5DB",
        marginRight: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    radioButtonSelected: {
        borderColor: COLORS.primary,
    },
    radioButtonInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: "400",
        color: COLORS.text,
        flex: 1,
    },
    optionLabelSelected: {
        color: COLORS.text,
        fontWeight: "400",
    },
    footer: {
        padding: 20,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        height: 56,
        justifyContent: "center",
        alignItems: "center",
        ...Platform.select({
            ios: {
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    saveButtonDisabled: {
        backgroundColor: "#D1D5DB",
        shadowOpacity: 0,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.white,
    },
});

export default MyRoleModal;
