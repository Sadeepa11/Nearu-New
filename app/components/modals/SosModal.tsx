import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL, authenticatedFetch } from "../../../utils/auth";
import { useAlert } from "../../context/AlertContext";
// If CircleMember is not exported from types/models, I might need to import it or define a partial interface.
// Based on MapScreen.tsx it is exported.
import { CircleMember } from "../../types/models";

const { width } = Dimensions.get("window");

interface SosModalProps {
    isOpen: boolean;
    onClose: () => void;
    circleId?: string | number;
    circleName?: string;
    members?: CircleMember[]; // Optional, defaults to empty array
}

const SLIDE_WIDTH = width - 40;
const SLIDE_HEIGHT = 60;
const THRESHOLD = SLIDE_WIDTH * 0.7; // Drag past 70% to trigger cancel

const SosModal: React.FC<SosModalProps> = ({
    isOpen,
    onClose,
    circleId,
    circleName,
    members = [],
}) => {
    const { showAlert } = useAlert();
    const [status, setStatus] = useState<"IDLE" | "COUNTDOWN" | "SENT">("IDLE");
    const [countdown, setCountdown] = useState(10);
    // I will directly trigger 'SENT' on tap for now to match 'Tap to send'.

    // Slide Animation Values
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [isSliding, setIsSliding] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStatus("IDLE");
            setCountdown(10); // Reset
            slideAnim.setValue(0);
        }
    }, [isOpen]);

    useEffect(() => {
        let timer: any;
        if (status === "COUNTDOWN" && countdown > 0) {
            timer = setTimeout(() => {
                Vibration.vibrate(500);
                setCountdown((c) => c - 1);
            }, 1000);
        } else if (status === "COUNTDOWN" && countdown === 0) {
            handleSendSOS();
        }
        return () => clearTimeout(timer);
    }, [status, countdown]);

    const handleStartCountdown = () => {
        setStatus("COUNTDOWN");
        setCountdown(10);
    };

    const handleSendSOS = async () => {
        // Prevent multiple calls
        if (status === "SENT") return;

        setStatus("SENT");

        try {
            // 1. Get current location for the SOS alert
            let latitude = 0;
            let longitude = 0;
            const message = "SOS Emergency Alert!";

            try {
                const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
                if (locStatus === 'granted') {
                    const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High
                    });
                    latitude = location.coords.latitude;
                    longitude = location.coords.longitude;
                }
            } catch (locError) {
                console.warn("Failed to get location for SOS:", locError);
            }

            // 2. Call the SOS API endpoint
            const response = await authenticatedFetch(`${API_BASE_URL}/profile/sos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    latitude: latitude,
                    longitude: longitude
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.warn("SOS API call failed:", errorData.message || response.statusText);
            } else {
                const result = await response.json();
                console.log("SOS Alert sent successfully:", result);
            }
        } catch (error) {
            console.warn("Error in handleSendSOS process:", error);
        }

        // Keep the modal open for 2 seconds then automatically close
        setTimeout(() => {
            onClose();
        }, 2000);
    };

    const handleCancelSOS = () => {
        // API Call to cancel
        setStatus("IDLE");
        onClose();
        showAlert({ title: "SOS Cancelled", message: "The SOS alert was cancelled.", type: 'info' });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                setIsSliding(true);
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx > 0 && gestureState.dx <= SLIDE_WIDTH - SLIDE_HEIGHT) {
                    slideAnim.setValue(gestureState.dx);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                setIsSliding(false);
                if (gestureState.dx > THRESHOLD) {
                    Animated.timing(slideAnim, {
                        toValue: SLIDE_WIDTH - SLIDE_HEIGHT,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        handleCancelSOS();
                    });
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    if (!isOpen) return null;

    const renderAvatars = () => {
        // Show up to 3 avatars, plus a "+" button
        const displayMembers = members.slice(0, 3);
        return (
            <View style={styles.avatarContainer}>
                {displayMembers.map((member, index) => {
                    // Check for avatar URI or use initials
                    const avatarUri = member.avatar
                        ? (member.avatar.startsWith("http")
                            ? member.avatar
                            : `${API_BASE_URL.replace("/api", "")}/${member.avatar}`)
                        : null;

                    return (
                        <View key={index} style={[styles.avatarCircle, { zIndex: 3 - index, marginLeft: index === 0 ? 0 : -10 }]}>
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarInitials}>
                                    {member.name
                                        ? member.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .slice(0, 2)
                                            .join("")
                                            .toUpperCase()
                                        : "??"}
                                </Text>
                            )}
                        </View>
                    );
                })}
                <TouchableOpacity style={[styles.avatarCircle, styles.addAvatarButton, { zIndex: 0, marginLeft: -10 }]}>
                    <Ionicons name="add" size={24} color="#1E3A8A" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal
            visible={isOpen}
            animationType="slide"
            transparent={false} // Full screen modal as per image appearance
            onRequestClose={onClose}
        >
            <SafeAreaView style={[styles.container, status !== "IDLE" ? styles.containerRed : styles.containerBlue]}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeButton}
                        disabled={status === "SENT"}
                    >
                        <Ionicons name="close" size={28} color={status !== "IDLE" ? "#fff" : "#1E3A8A"} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, status !== "IDLE" ? styles.textWhite : styles.textBlue]}>SOS</Text>
                    <View style={{ width: 28 }} />
                </View>

                {status === "IDLE" ? (
                    // IDLE STATE (Image 3)
                    <View style={styles.content}>
                        <View style={styles.textContainer}>
                            <Text style={styles.idleTitle}>
                                Your SOS alert and location were sent to your Circle and emergency contacts
                            </Text>
                            <Text style={styles.idleDescription}>
                                Your SOS alert and location were sent to your Circle and emergency contacts
                            </Text>
                        </View>

                        <View style={styles.centerContainer}>
                            <TouchableOpacity
                                style={styles.sosButtonBlue}
                                onPress={handleStartCountdown}
                                onLongPress={handleStartCountdown}
                                delayLongPress={800}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.sosButtonTextBlue}>Tap to{"\n"}send SOS</Text>
                                <Text style={styles.sosButtonSubTextBlue}>(or press and hold)</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.bottomContainer}>
                            {renderAvatars()}
                            <Text style={styles.addContactText}>
                                Tap to add emergency contact{"\n"}your SOS will be sent to {members.length > 0 ? members.length : 1} person
                            </Text>
                        </View>
                    </View>
                ) : (
                    // COUNTDOWN & SENT STATE (Red Background)
                    <View style={styles.content}>
                        <Text style={styles.sentTitle}>
                            {status === "COUNTDOWN"
                                ? "Sending SOS to your Circle and\nemergency contacts in..."
                                : "Your SOS alert and location were sent to\nyour Circle and emergency contacts"}
                        </Text>

                        <View style={styles.centerContainer}>
                            {status === "COUNTDOWN" ? (
                                <View style={styles.countdownContainer}>
                                    <Text style={styles.countdownText}>{countdown}</Text>
                                </View>
                            ) : (
                                <>
                                    <View style={styles.iconContainerRed}>
                                        <MaterialCommunityIcons name="broadcast" size={80} color="#EF4444" />
                                        <View style={styles.alertIconOverlay}>
                                            <Ionicons name="alert" size={40} color="#EF4444" />
                                        </View>
                                    </View>
                                    <MaterialCommunityIcons
                                        name="alarm-light-outline"
                                        size={120}
                                        color="#fff"
                                        style={{ position: "absolute", opacity: 0.3 }}
                                    />
                                    <Text style={styles.sosTextRed}>S O S</Text>
                                </>
                            )}
                        </View>

                        {status === "SENT" && (
                            <View style={styles.infoContainerRed}>
                                <Text style={styles.infoTextRed}>
                                    Your Work place successfully saved to{"\n"}your circle
                                </Text>
                            </View>
                        )}

                        {/* Slide to Cancel */}
                        <View
                            style={styles.sliderContainer}
                            pointerEvents={status === "SENT" ? "none" : "auto"}
                        >
                            <View style={styles.sliderTrack}>
                                <Text style={styles.sliderText}>
                                    {status === "COUNTDOWN" ? "Slide to Cancel Sending" : "Slide to Cancel SOS"}
                                </Text>
                                <Animated.View
                                    style={[styles.sliderKnob, { transform: [{ translateX: slideAnim }] }]}
                                    {...panResponder.panHandlers}
                                >
                                    <Ionicons name="chevron-back" size={24} color="#EF4444" />
                                    <Ionicons name="chevron-back" size={24} color="#EF4444" style={{ marginLeft: -10 }} />
                                </Animated.View>
                            </View>
                        </View>
                    </View>
                )}

            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    containerBlue: {
        backgroundColor: "#EFF6FF", // Light Blue
    },
    containerRed: {
        backgroundColor: "#EF4444", // Red
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
    },
    closeButton: {
        padding: 5,
    },
    textBlue: {
        color: "#1E3A8A",
    },
    textWhite: {
        color: "#FFFFFF",
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    textContainer: {
        alignItems: "center",
    },
    idleTitle: {
        fontSize: 16,
        color: "#1E3A8A",
        textAlign: "center",
        marginBottom: 10,
        opacity: 0, // Hiding this for IDLE state as it might be confusing, user prompt was slightly ambiguous about text location.
        // But let's follow the visual of "Tap to send SOS" generally being clean.
        // Except the user said "1st image sos on model... Before show 1st SOS... show 3rd image".
        // I will hide the top text for IDLE if it's not in the 3rd image description.
        // Image 3 description: "Tap to send SOS" blue button.
        height: 0,
    },
    idleDescription: {
        fontSize: 16,
        color: "#1E3A8A",
        textAlign: "center",
        display: 'none',
    },

    // SOS Blue Button
    centerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    sosButtonBlue: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: "#1D4ED8", // Darker Blue
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#2563EB",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 8,
        borderColor: "rgba(255,255,255,0.3)",

    },
    sosButtonTextBlue: {
        fontSize: 24,
        fontWeight: "800",
        color: "#FFFFFF",
        textAlign: "center",
        lineHeight: 28,
    },
    sosButtonSubTextBlue: {
        fontSize: 14,
        color: "rgba(255,255,255,0.8)",
        marginTop: 8,
    },

    // Avatars
    bottomContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    avatarContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#1E40AF",
        borderWidth: 2,
        borderColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    avatarImage: {
        width: "100%",
        height: "100%",
    },
    avatarInitials: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
    addAvatarButton: {
        backgroundColor: "#DBEAFE",
        borderColor: "#EFF6FF",
        borderStyle: 'dashed',
        borderWidth: 2,
    },
    addContactText: {
        textAlign: 'center',
        color: "#1E3A8A",
        fontSize: 14,
        lineHeight: 20,
    },

    // SENT STATE STYLES
    sentTitle: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 26,
    },
    iconContainerRed: {
        width: 120,
        height: 120,
        backgroundColor: "#fff",
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    alertIconOverlay: {
        position: 'absolute',
        bottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sosTextRed: {
        fontSize: 48,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 4,
        marginTop: 20,
    },
    infoContainerRed: {
        marginBottom: 40,
    },
    infoTextRed: {
        color: "rgba(255,255,255,0.9)",
        textAlign: 'center',
        fontSize: 15,
        lineHeight: 22,
    },
    countdownContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    countdownText: {
        fontSize: 120,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Slider
    sliderContainer: {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        backgroundColor: "#450A0A", // Dark Red
        borderRadius: SLIDE_HEIGHT / 2,
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: 20,
    },
    sliderTrack: { // Renamed for clarity, logic is same
        flex: 1,
        justifyContent: 'center',
    },
    sliderText: {
        color: "#EF4444",
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        position: 'absolute',
        width: '100%',
        zIndex: 1,
    },
    sliderKnob: {
        width: SLIDE_HEIGHT - 6,
        height: SLIDE_HEIGHT - 6,
        borderRadius: (SLIDE_HEIGHT - 6) / 2,
        backgroundColor: "#FFFFFF",
        marginLeft: 3,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        zIndex: 2,
    },
});

export default SosModal;
