import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Dimensions, Image, StyleSheet, Text, View } from "react-native";

const { width, height } = Dimensions.get("window");

interface StartupLoadingProps {
    status: string;
    progress: number;
}

const StartupLoading: React.FC<StartupLoadingProps> = ({ status, progress }) => {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#FFFFFF", "#F0F7FF", "#E1EFFF"]}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
                <View style={styles.logoWrapper}>
                    <Image
                        source={require("../../assets/logo/image.png")}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.brandText}>NearU</Text>
                    <Text style={styles.statusText}>{status}</Text>
                </View>

                <View style={styles.progressWrapper}>
                    <View style={styles.progressBarContainer}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${Math.max(0.05, progress) * 100}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Securely connecting your family</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
    },
    logoWrapper: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 30,
        // Premium shadow
        shadowColor: "#113C9C",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    logo: {
        width: 100,
        height: 100,
    },
    textContainer: {
        alignItems: "center",
        marginBottom: 40,
    },
    brandText: {
        fontSize: 28,
        fontWeight: "800",
        color: "#113C9C",
        marginBottom: 8,
        letterSpacing: 1,
    },
    statusText: {
        fontSize: 16,
        color: "#64748B",
        fontWeight: "500",
    },
    progressWrapper: {
        width: "100%",
        alignItems: "center",
    },
    progressBarContainer: {
        width: "100%",
        height: 8,
        backgroundColor: "#E2E8F0",
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 12,
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#113C9C",
        borderRadius: 4,
    },
    progressPercent: {
        fontSize: 14,
        fontWeight: "700",
        color: "#113C9C",
    },
    footer: {
        paddingBottom: 40,
        alignItems: "center",
    },
    footerText: {
        fontSize: 12,
        color: "#94A3B8",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 1.5,
    },
});

export default StartupLoading;

