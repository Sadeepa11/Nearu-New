import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemeColors } from "./SettingsModal";

interface AccountActionsModalProps {
  visible: boolean;
  onClose: () => void;
  topPadding: number;
  colors: ThemeColors;
  onPressProfile: () => void;
  onPressLocationHistory: () => void;
  onPressLogout: () => void;
  isCircleCreator: boolean;
  onPressDeleteCircle: () => void;
  onPressLeaveCircle: () => void;
  isDeletingCircle: boolean;
  isLeavingCircle: boolean;
  canDeleteCircle: boolean;
  canLeaveCircle: boolean;
}

const AccountActionsModal: React.FC<AccountActionsModalProps> = ({
  visible,
  onClose,
  topPadding,
  colors,
  onPressProfile,
  onPressLocationHistory,
  onPressLogout,
  isCircleCreator,
  onPressDeleteCircle,
  onPressLeaveCircle,
  isDeletingCircle,
  isLeavingCircle,
  canDeleteCircle,
  canLeaveCircle,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.container, { paddingTop: topPadding }]}>
          <View style={styles.card}>
            <Text style={styles.title}>Account</Text>

            <TouchableOpacity style={styles.optionRow} onPress={onPressProfile}>
              <Ionicons name="person-outline" size={20} color={colors.black} />
              <Text style={styles.optionLabel}>Update profile</Text>
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity style={styles.optionRow} onPress={onPressLocationHistory}>
              <MaterialCommunityIcons name="map-clock-outline" size={20} color={colors.black} />
              <Text style={styles.optionLabel}>Location history</Text>
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity style={styles.optionRow} onPress={onPressLogout}>
              <Ionicons name="exit-outline" size={20} color={colors.black} />
              <Text style={styles.optionLabel}>Logout</Text>
            </TouchableOpacity>
            <View style={styles.divider} />

            {isCircleCreator ? (
              <TouchableOpacity
                style={[styles.optionRow, (!canDeleteCircle || isDeletingCircle) && styles.optionDisabled]}
                onPress={onPressDeleteCircle}
                disabled={!canDeleteCircle || isDeletingCircle}
              >
                <Ionicons name="trash-outline" size={20} color={colors.accent} />
                {isDeletingCircle ? (
                  <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
                ) : (
                  <Text style={[styles.optionLabel, styles.optionLabelDanger]}>Delete circle</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.optionRow, (!canLeaveCircle || isLeavingCircle) && styles.optionDisabled]}
                onPress={onPressLeaveCircle}
                disabled={!canLeaveCircle || isLeavingCircle}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.accent} />
                {isLeavingCircle ? (
                  <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
                ) : (
                  <Text style={[styles.optionLabel, styles.optionLabelDanger]}>Leave circle</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "transparent",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    container: {
      flex: 1,
      alignItems: "flex-end",
      paddingRight: 16,
    },
    card: {
      width: 220,
      borderRadius: 18,
      backgroundColor: colors.white,
      paddingVertical: 12,
      paddingHorizontal: 16,
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    title: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.gray,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
    },
    optionLabel: {
      marginLeft: 12,
      fontSize: 15,
      fontWeight: "600",
      color: colors.black,
    },
    optionLabelDanger: {
      color: colors.accent,
    },
    optionDisabled: {
      opacity: 0.6,
    },
    spinner: {
      marginLeft: 12,
    },
    divider: {
      height: 1,
      backgroundColor: "#E5E7EB",
      marginVertical: 6,
    },
  });

export default AccountActionsModal;
