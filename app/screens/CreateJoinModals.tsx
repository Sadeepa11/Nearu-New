import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  primary: "#113C9C",
  white: "#FFFFFF",
  black: "#1A1A1A",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
  border: "#E5E7EB",
  error: "#EF4444",
  navy: "#002B7F",
  infoBg: "#E8F0FE",
};

const CIRCLE_NAME_SUGGESTIONS = [
  "Family",
  "Friends",
  "Office",
  "Gym Buddies",
  "Cousins",
  "Travel Group",
];

const RELATION_OPTIONS = [
  { value: "Mom", label: "Mom" },
  { value: "Dad", label: "Dad" },
  { value: "Son/ Daughter/Child", label: "Son/ Daughter/Child" },
  { value: "Grandparent", label: "Grandparent" },
  { value: "Partner/Spouse", label: "Partner/Spouse" },
  { value: "Friend", label: "Friend" },
  { value: "Other", label: "Other" },
];

// ==================== CREATE CIRCLE MODAL ====================
interface CreateCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (circleName: string, relationship: string) => Promise<void>;
  title?: string;
  initialName?: string;
  buttonText?: string;
}

export const CreateCircleModal: React.FC<CreateCircleModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  title = "Create a New Circle",
  initialName = "",
  buttonText = "Continue",
}) => {
  const [circleName, setCircleName] = useState(initialName);
  const [relationship, setRelationship] = useState<string>("");

  // Sync initialName if it changes (e.g. when switching between create/edit)
  React.useEffect(() => {
    setCircleName(initialName);
    setRelationship(""); // Reset relationship when modal reopens/props change
  }, [initialName, isOpen]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (nameToUse?: string) => {
    const finalName = (nameToUse ?? circleName).trim();
    if (!finalName) {
      setError("Please enter a circle name");
      return;
    }

    if (!relationship) {
      setError("Please select your relationship to the circle creator");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await onCreate(finalName, relationship);
      setCircleName("");
      setRelationship("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create circle");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCircleName("");
    setRelationship("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent={false}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.fullScreenContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.fullScreenScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.invitationsHeaderRow}>
              <TouchableOpacity onPress={handleClose} style={styles.backButtonSimple}>
                <Ionicons name="chevron-back" size={24} color="#2563eb" />
                <Text style={styles.backButtonSimpleText}>Back</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.createTitle}>{title}</Text>

            <View style={styles.createFormSection}>
              <Text style={styles.inputLabelSimple}>Circle Name</Text>
              <TextInput
                style={styles.createInputSimple}
                placeholder="My Family"
                placeholderTextColor="#9CA3AF"
                value={circleName}
                onChangeText={(text) => {
                  setCircleName(text);
                  setError("");
                }}
                maxLength={50}
                autoFocus
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.privacyBox}>
                <Text style={styles.privacyTitle}>Privacy First:</Text>
                <Text style={styles.privacyText}>
                  Your location is only shared with family members you invite. You can leave or remove members anytime.
                </Text>
              </View>
            </View>

            <Text style={styles.inputLabelSimple}>Your Relationship (How others see you)</Text>
            <View style={styles.relationshipContainer}>
              {RELATION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.radioButtonRow,
                    relationship === option.value && styles.radioButtonRowSelected
                  ]}
                  onPress={() => {
                    setRelationship(option.value);
                    setError("");
                  }}
                >
                  <View style={[
                    styles.radioButtonCircle,
                    relationship === option.value && styles.radioButtonCircleSelected
                  ]}>
                    {relationship === option.value && <View style={styles.radioButtonInner} />}
                  </View>
                  <Text style={[
                    styles.radioButtonLabel,
                    relationship === option.value && styles.radioButtonLabelSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.suggestionLabel, { marginTop: 20 }]}>Suggestions:</Text>
            <View style={styles.suggestionRow}>
              {CIRCLE_NAME_SUGGESTIONS.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={styles.suggestionChip}
                  onPress={() => {
                    setCircleName(name);
                    setError("");
                  }}
                >
                  <Text style={styles.suggestionText}>+ {name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              style={[styles.continueButton, (loading || !circleName.trim()) && styles.buttonDisabled]}
              onPress={() => handleCreate()}
              disabled={loading || !circleName.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.continueButtonText}>{buttonText}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// ==================== JOIN CIRCLE MODAL ====================
interface JoinCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (pin: string) => Promise<void>;
}

export const JoinCircleModal: React.FC<JoinCircleModalProps> = ({
  isOpen,
  onClose,
  onJoin,
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const handleJoin = async () => {
    const pin = otp.join("");
    if (pin.length !== 6) {
      setError("Please enter a complete 6-digit PIN");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await onJoin(pin);
      setOtp(new Array(6).fill(""));
      onClose();
    } catch (err: any) {
      setError(err.message || "Invalid PIN or failed to join circle");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOtp(new Array(6).fill(""));
    setError("");
    onClose();
  };

  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    if (!/^\d*$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError("");

    // Move to next input if text is entered
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
      }
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButtonHeader}
              onPress={handleClose}
            >
              <View style={styles.backButtonContent}>
                <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                <Text style={styles.backButtonTextHeader}>Back</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Enter the Invite Code</Text>
          </View>

          {/* PIN Input */}
          <View style={styles.inputContainer}>
            <View style={styles.otpContainer}>
              {/* First group of 3 */}
              {otp.slice(0, 3).map((digit, index) => (
                <View key={index} style={styles.otpBox}>
                  <TextInput
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    style={styles.otpInput}
                    value={digit}
                    onChangeText={(text) => handleChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!loading}
                  />
                </View>
              ))}

              <Text style={styles.otpDash}>-</Text>

              {/* Second group of 3 */}
              {otp.slice(3, 6).map((digit, index) => {
                const realIndex = index + 3;
                return (
                  <View key={realIndex} style={styles.otpBox}>
                    <TextInput
                      ref={(ref) => {
                        inputRefs.current[realIndex] = ref;
                      }}
                      style={styles.otpInput}
                      value={digit}
                      onChangeText={(text) => handleChange(text, realIndex)}
                      onKeyPress={(e) => handleKeyPress(e, realIndex)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      editable={!loading}
                    />
                  </View>
                );
              })}
            </View>

            <Text style={styles.helperText}>
              Get the code from the{'\n'}person setting up circle
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          {/* Buttons */}
          <View style={styles.modalButtonsColumn}>
            <TouchableOpacity
              style={[styles.modalButton, styles.createButton]}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.createButtonText}>Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  flex: {
    flex: 1,
  },
  fullScreenScrollContent: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: COLORS.white,
  },
  invitationsHeaderRow: {
    marginBottom: 20,
  },
  backButtonSimple: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonSimpleText: {
    fontSize: 16,
    color: "#2563eb",
    marginLeft: 4,
  },
  createTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 24,
    marginTop: 10,
  },
  createFormSection: {
    marginBottom: 10,
  },
  inputLabelSimple: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 8,
    fontWeight: '500',
  },
  createInputSimple: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 24,
  },
  privacyBox: {
    backgroundColor: '#E8F0FE',
    borderRadius: 16,
    padding: 20,
  },
  privacyTitle: {
    color: '#1e3a8a',
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 6,
  },
  privacyText: {
    color: '#1e3a8a',
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.9,
  },
  suggestionLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  suggestionChip: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  suggestionText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Keep existing styles for JoinCircleModal...
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.black,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  otpBox: {
    width: 45,
    height: 55,
    borderRadius: 8,
    backgroundColor: "#E8F0FE",
    justifyContent: "center",
    alignItems: "center",
  },
  otpInput: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    width: "100%",
    height: "100%",
  },
  otpDash: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.gray,
    marginHorizontal: 4,
  },
  helperText: {
    textAlign: "center",
    color: COLORS.primary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
    marginLeft: 4,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButtonsColumn: {
    flexDirection: "column",
    gap: 16,
    width: "100%",
  },
  modalButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  createButton: {
    backgroundColor: COLORS.primary,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
  skipButton: {
    alignItems: 'center',
    padding: 8,
  },
  skipButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  cancelButton: {
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray,
  },
  backButtonHeader: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 10,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonTextHeader: {
    color: COLORS.primary,
    fontSize: 16,
    marginLeft: 4,
  },
  relationshipContainer: {
    marginBottom: 24,
  },
  radioButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radioButtonRowSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  radioButtonCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioButtonCircleSelected: {
    borderColor: '#2563eb',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  radioButtonLabel: {
    fontSize: 15,
    color: '#475569',
  },
  radioButtonLabelSelected: {
    color: '#1e293b',
    fontWeight: '500',
  },
});

export default { CreateCircleModal, JoinCircleModal };