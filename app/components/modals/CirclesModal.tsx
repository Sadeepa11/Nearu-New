// CirclesModal.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL, authenticatedFetch } from "../../../utils/auth";
import { useAlert } from "../../context/AlertContext";
import { CircleData as BaseCircleData } from "../../types/models";

const { height: windowHeight } = Dimensions.get("window");

// --- Interfaces ---

type CircleUserWithMembership = {
    Membership?: {
        code?: string;
        codeExpiresAt?: string;
    };
};

interface CircleData extends BaseCircleData {
    invitationCodeExpiresAt?: string;
    joinCode?: string;
    users?: CircleUserWithMembership[];
}

interface InvitationData {
    id: string;
    userId?: string;
    circleId: string;
    role?: string;
    status?: string;
    circleName?: string;
    code?: string;
    user?: { email?: string; name?: string };
    Circle?: {
        id: string;
        name?: string;
        creator?: { id: string; name?: string };
    };
    inviterName?: string;
    circle_id?: string;
    expiresAt?: string;
    invitationCode?: string;
    codeExpiresAt?: string;
}

interface CirclesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => Promise<void> | void;
    circles: CircleData[];
    loadingCircles?: boolean;
    onSelectCircle?: (circleId: number | string) => void;
    shareTargetCircle?: CircleData | null;
    shareRequestId?: number;
    onShareHandled?: () => void;
    activeCircleId?: string | number | null;
}

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

const extractCirclePayload = (raw: any) => {
    if (!raw) return {};
    if (raw?.data?.circle) return raw.data.circle;
    if (raw?.circle) return raw.circle;
    if (
        raw?.data &&
        (raw.data.invitationCode || raw.data.users || raw.data.metadata)
    )
        return raw.data;
    if (raw?.data?.data) return extractCirclePayload(raw.data);
    return raw;
};

const resolveInvitationDetails = (circle: any) => {
    if (!circle) return {};
    if (circle.code || circle.invitationCode || circle.joinCode) {
        return {
            code: circle.code || circle.invitationCode || circle.joinCode,
            expiresAt:
                circle.codeExpiresAt ||
                circle.invitationCodeExpiresAt ||
                circle.invitationCode_expires_at ||
                circle.expiresAt ||
                undefined,
        };
    }

    const users = Array.isArray(circle.users) ? circle.users : [];
    for (const u of users) {
        if (u?.Membership?.code) {
            return {
                code: u.Membership.code,
                expiresAt: u.Membership.codeExpiresAt,
            };
        }
    }

    if (circle.invitationCode) {
        return {
            code: circle.invitationCode,
            expiresAt: circle.invitationCodeExpiresAt,
        };
    }

    return {};
};

const CirclesModal: React.FC<CirclesModalProps> = ({
    isOpen,
    onClose,
    onRefresh,
    circles,
    loadingCircles = false,
    onSelectCircle,
    shareTargetCircle,
    shareRequestId,
    onShareHandled,
    activeCircleId
}) => {
    const { showAlert } = useAlert();

    const [currentView, setCurrentView] = useState<
        "list" | "create" | "share" | "invitations"
    >("list");

    const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
    const [newCircleName, setNewCircleName] = useState("");
    const [relationship, setRelationship] = useState<string>("");
    const [creatingCircle, setCreatingCircle] = useState(false);
    const [createdCircleData, setCreatedCircleData] = useState<CircleData | null>(null);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [codeExpiry, setCodeExpiry] = useState<string | null>(null);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteNickname, setInviteNickname] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const [sendingInvite, setSendingInvite] = useState(false);
    const [generatingCode, setGeneratingCode] = useState(false);
    const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
    const inputRefs = useRef<Array<TextInput | null>>([]);
    const [joiningCircle, setJoiningCircle] = useState(false);
    const [invitations, setInvitations] = useState<InvitationData[]>([]);
    const [loadingInvitations, setLoadingInvitations] = useState(false);
    const [refreshingInvitations, setRefreshingInvitations] = useState(false);
    const [error, setError] = useState("");
    const lastHandledShareRequestId = useRef<number | null>(null);

    useEffect(() => {
        const syncSelection = async () => {
            if (activeCircleId !== undefined && activeCircleId !== null) {
                setSelectedCircleId(String(activeCircleId));
                return;
            }

            try {
                const lastId = await AsyncStorage.getItem("mapScreen:lastSelectedCircleId");
                if (lastId) {
                    const found = circles.find((c) => String(c.id) === lastId);
                    if (found) {
                        setSelectedCircleId(String(found.id));
                        return;
                    }
                }

                if (circles.length > 0) {
                    setSelectedCircleId(String(circles[0].id));
                } else {
                    setSelectedCircleId(null);
                }
            } catch (error) {
                console.warn("Failed to sync circle selection", error);
            }
        };

        if (isOpen) {
            syncSelection();
        }
    }, [isOpen, activeCircleId, circles]);

    useEffect(() => {
        if (!isOpen) return;
        if (!shareTargetCircle) return;
        if (lastHandledShareRequestId.current === shareRequestId) return;

        lastHandledShareRequestId.current = shareRequestId ?? null;
        setCreatedCircleData(shareTargetCircle);
        const shareId = shareTargetCircle?.id;
        if (shareId === undefined || shareId === null) {
            setSelectedCircleId(null);
        } else {
            setSelectedCircleId(String(shareId));
        }

        const { code, expiresAt } = resolveInvitationDetails(shareTargetCircle);
        setGeneratedCode(code ?? null);
        setCodeExpiry(expiresAt ?? null);
        setInviteEmail("");
        setInviteNickname("");
        setInviteRole("member");
        setSendingInvite(false);
        setCurrentView("share");

        if (onShareHandled) onShareHandled();
    }, [isOpen, shareTargetCircle, shareRequestId, onShareHandled]);

    const resetStates = () => {
        setCurrentView("list");
        setNewCircleName("");
        setRelationship("");
        setInviteEmail("");
        setInviteNickname("");
        setGeneratedCode(null);
        setCodeExpiry(null);
        setCreatedCircleData(null);
        setSendingInvite(false);
        setCreatingCircle(false);
        setJoiningCircle(false);
        setGeneratingCode(false);
        setOtp(new Array(6).fill(""));
        setError("");
    };

    const handleCircleSelect = async (id: number | string) => {
        const idStr = String(id);
        if (selectedCircleId === idStr) {
            setSelectedCircleId(null);
            await AsyncStorage.removeItem("mapScreen:lastSelectedCircleId").catch(() => undefined);
        } else {
            setSelectedCircleId(idStr);
            if (onSelectCircle) onSelectCircle(idStr);
            await AsyncStorage.setItem("mapScreen:lastSelectedCircleId", idStr).catch(() => undefined);
        }
    };

    const handleCreateCircle = async (nameToUse?: string) => {
        const name = (nameToUse ?? newCircleName).trim();
        if (!name) {
            setError("Please enter a name for the circle.");
            return;
        }

        if (!relationship) {
            setError("Please select your relationship.");
            return;
        }

        setCreatingCircle(true);
        setError("");
        try {
            const body: any = {
                name: name.trim(),
                location: { latitude: 0, longitude: 0, name: "Default" },
            };
            if (relationship) {
                body.relationship = relationship;
            }

            const createResponse = await authenticatedFetch(`${API_BASE_URL}/circles`, {
                method: "POST",
                headers: { "Content-Type": "application/json", accept: "application/json" },
                body: JSON.stringify(body),
            });

            if (!createResponse.ok) {
                const err = await createResponse.json().catch(() => ({}));
                setError(err.message || "Failed to create circle.");
                return;
            }

            const createData = await createResponse.json();
            const circlePayload = extractCirclePayload(createData);
            setError("");
            setCreatedCircleData(circlePayload);

            if (circlePayload?.id) {
                await AsyncStorage.setItem("mapScreen:lastSelectedCircleId", String(circlePayload.id)).catch(() => undefined);
            }

            const { code, expiresAt } = resolveInvitationDetails(circlePayload);
            if (code) setGeneratedCode(code);
            if (expiresAt) setCodeExpiry(expiresAt);

            if (circlePayload?.id) {
                try {
                    const invitesResponse = await authenticatedFetch(
                        `${API_BASE_URL}/circles/${circlePayload.id}/invites`,
                        { headers: { accept: "application/json" } }
                    );
                    if (invitesResponse.ok) {
                        const invitesData = await invitesResponse.json();
                        const invitesList = Array.isArray(invitesData?.data)
                            ? invitesData.data
                            : Array.isArray(invitesData)
                                ? invitesData
                                : [];
                        const inviteWithCode = invitesList.find(
                            (invite: any) => invite?.code || invite?.invitationCode
                        );
                        if (inviteWithCode) {
                            const inviteCode = inviteWithCode.code || inviteWithCode.invitationCode;
                            const inviteExpiry =
                                inviteWithCode.codeExpiresAt ||
                                inviteWithCode.invitationCodeExpiresAt ||
                                inviteWithCode.expiresAt;
                            if (inviteCode) setGeneratedCode(inviteCode);
                            if (inviteExpiry) setCodeExpiry(inviteExpiry);
                        }
                    }
                } catch (e) {
                    console.log("No invites found immediately after create", e);
                }
            }

            setCurrentView("share");
            setNewCircleName("");
            setRelationship("");
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Error creating circle:", error);
            setError("Connection failed. Please try again.");
        } finally {
            setCreatingCircle(false);
        }
    };

    const handleSendInvite = async () => {
        if (!inviteEmail.trim() || !createdCircleData?.id) {
            showAlert({ title: "Error", message: "Please enter an email address and ensure a circle exists.", type: 'warning' });
            return;
        }

        Keyboard.dismiss();
        setSendingInvite(true);

        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/circles/${createdCircleData.id}/invite`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        accept: "application/json",
                    },
                    body: JSON.stringify({
                        email: inviteEmail.trim(),
                        role: inviteRole,
                        nickname: inviteNickname || undefined,
                    }),
                }
            );

            const data = await response.json().catch(() => ({}));

            if (response.ok || response.status === 201) {
                showAlert({ title: "Success", message: `Invitation sent to ${inviteEmail}.`, type: 'success' });
                setInviteEmail("");
                setInviteNickname("");
                setInviteRole("member");
            } else {
                showAlert({ title: "Error", message: data.message || "Failed to send invite.", type: 'error' });
            }
        } catch (error) {
            console.error(error);
            showAlert({ title: "Error", message: "Network error.", type: 'error' });
        } finally {
            setSendingInvite(false);
        }
    };

    const handleGenerateInvitationCode = async () => {
        if (!createdCircleData?.id) {
            showAlert({ title: "Error", message: "A circle must be selected to generate a code.", type: 'warning' });
            return;
        }

        setGeneratingCode(true);
        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/circles/${createdCircleData.id}/generate-invitation-code`,
                {
                    method: "POST",
                    headers: { accept: "application/json", "Content-Type": "application/json" },
                }
            );

            const payload = await response.json().catch(() => ({}));

            if (response.ok) {
                const circlePayload = extractCirclePayload(payload);
                const { code, expiresAt } = resolveInvitationDetails(circlePayload);
                if (circlePayload) setCreatedCircleData(circlePayload as CircleData);
                setGeneratedCode(code ?? null);
                setCodeExpiry(expiresAt ?? null);
                showAlert({ title: "Success", message: "Invitation code generated successfully.", type: 'success' });
                if (onRefresh) onRefresh();
            } else {
                showAlert({ title: "Error", message: payload.message || "Failed to generate invitation code.", type: 'error' });
            }
        } catch (error) {
            console.error(error);
            showAlert({ title: "Error", message: "Network error.", type: 'error' });
        } finally {
            setGeneratingCode(false);
        }
    };

    const onShareCode = async () => {
        if (!generatedCode || !createdCircleData) return;
        try {
            await Share.share({
                message: `Join my circle "${createdCircleData.name}" on the app using code: ${generatedCode}`,
            });
        } catch (error: any) {
            showAlert({ title: "Share error", message: error.message || "Could not share code.", type: 'error' });
        }
    };

    const handleJoinByCode = async () => {
        const code = otp.join("");
        if (code.length < 6) {
            showAlert({ title: "Invalid Code", message: "Enter a complete 6-digit invite code.", type: 'warning' });
            return;
        }
        Keyboard.dismiss();
        setJoiningCircle(true);
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/circles/join-by-code`, {
                method: "POST",
                headers: { "Content-Type": "application/json", accept: "application/json" },
                body: JSON.stringify({ code: code.toUpperCase().trim() }),
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                showAlert({ title: "Success", message: "Joined circle successfully!", type: 'success' });

                const joinedCircle = extractCirclePayload(data);
                if (joinedCircle?.id) {
                    await AsyncStorage.setItem("mapScreen:lastSelectedCircleId", String(joinedCircle.id)).catch(() => undefined);
                }

                setOtp(new Array(6).fill(""));
                if (onRefresh) await onRefresh();
                await loadInvitations();
            } else {
                showAlert({ title: "Error", message: data.message || "Invalid or expired code.", type: 'error' });
            }
        } catch (error) {
            console.error(error);
            showAlert({ title: "Error", message: "Network error.", type: 'error' });
        } finally {
            setJoiningCircle(false);
        }
    };

    const handleOtpChange = (text: string, index: number) => {
        if (!/^[a-zA-Z0-9]*$/.test(text)) return;
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        if (text && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === "Backspace") {
            if (!otp[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
                const newOtp = [...otp];
                newOtp[index - 1] = "";
                setOtp(newOtp);
            }
        }
    };

    const loadInvitations = async () => {
        setLoadingInvitations(true);
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/profile/pending-requests`, {
                headers: { accept: "application/json" },
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                const list = Array.isArray(data)
                    ? data
                    : Array.isArray(data.data)
                        ? data.data
                        : data.invitations || data.data?.invitations || [];
                setInvitations(list);
            } else {
                const list = Array.isArray(data) ? data : data.data || [];
                setInvitations(list);
            }
        } catch (error) {
            console.error("Failed to load invitations", error);
        } finally {
            setLoadingInvitations(false);
            setRefreshingInvitations(false);
        }
    };

    const handleAcceptInvitation = async (circleId: string) => {
        try {
            const res = await authenticatedFetch(`${API_BASE_URL}/circles/${circleId}/accept-invite`, {
                method: "POST",
            });
            if (res.ok) {
                showAlert({ title: "Joined!", message: "You have joined the circle.", type: 'success' });
                await loadInvitations();
                if (onRefresh) await onRefresh();
            } else {
                const data = await res.json().catch(() => ({}));
                showAlert({ title: "Error", message: data.message || "Could not accept invite.", type: 'error' });
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleRejectInvitation = async (circleId: string) => {
        try {
            const res = await authenticatedFetch(`${API_BASE_URL}/circles/${circleId}/reject-invite`, {
                method: "POST",
            });
            if (res.ok) {
                await loadInvitations();
            } else {
                const data = await res.json().catch(() => ({}));
                showAlert({ title: "Error", message: data.message || "Could not reject invite.", type: 'error' });
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (!isOpen) return null;

    const renderListContent = () => (
        <>
            <View style={styles.listSection}>
                {loadingCircles ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                    <FlatList
                        data={circles}
                        keyExtractor={(item) => item.id.toString()}
                        style={{ maxHeight: windowHeight * 0.5 }}
                        nestedScrollEnabled
                        renderItem={({ item }) => {
                            const isSelected = selectedCircleId === String(item.id);
                            return (
                                <TouchableOpacity
                                    style={[styles.circleRow, isSelected && styles.circleRowSelected]}
                                    onPress={() => handleCircleSelect(item.id)}
                                >
                                    <View style={[styles.tickBox, isSelected && styles.tickBoxActive]}>
                                        {isSelected && <Text style={styles.tickText}>✓</Text>}
                                    </View>
                                    <Text style={[styles.circleNameText, isSelected && styles.circleNameTextActive]}>
                                        {item.name || "Unnamed Circle"}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={<Text style={styles.emptyText}>No circle</Text>}
                    />
                )}
            </View>

            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentView("create")}>
                    <Text style={styles.secondaryButtonText}>Create Circle +</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                        setCurrentView("invitations");
                        loadInvitations();
                    }}
                >
                    <Text style={styles.secondaryButtonText}>
                        Join / Invites ({invitations.length > 0 ? invitations.length : "0"})
                    </Text>
                </TouchableOpacity>
            </View>
        </>
    );

    const renderCreateScreen = () => (
        <ScrollView
            contentContainerStyle={styles.fullScreenContainer}
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.invitationsHeaderRow}>
                <TouchableOpacity
                    style={styles.backButtonSimple}
                    onPress={() => setCurrentView("list")}
                >
                    <Ionicons name="chevron-back" size={24} color="#2563eb" />
                    <Text style={styles.backButtonSimpleText}>Back</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.createTitle}>Create a New Circle</Text>

            <View style={styles.createFormSection}>
                <Text style={styles.inputLabelSimple}>Circle Name</Text>
                <TextInput
                    style={styles.createInputSimple}
                    placeholder="My Family"
                    placeholderTextColor="#9CA3AF"
                    value={newCircleName}
                    onChangeText={(text) => {
                        setNewCircleName(text);
                        setError("");
                    }}
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

            <Text style={[styles.inputLabelSimple, { marginTop: 20 }]}>Your Relationship (How others see you)</Text>
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
                    <TouchableOpacity key={name} style={styles.suggestionChip} onPress={() => {
                        setNewCircleName(name);
                        setError("");
                    }}>
                        <Text style={styles.suggestionText}>+ {name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={{ flex: 1 }} />

            <TouchableOpacity
                style={[styles.continueButton, creatingCircle && styles.buttonDisabled]}
                onPress={() => handleCreateCircle()}
                disabled={creatingCircle}
            >
                {creatingCircle ? <ActivityIndicator color="#fff" /> : <Text style={styles.continueButtonText}>Continue</Text>}
            </TouchableOpacity>
        </ScrollView>
    );

    const renderShareScreen = () => {
        const hasCode = Boolean(generatedCode);
        const expiryDate = codeExpiry ? new Date(codeExpiry) : null;
        const isCodeExpired = hasCode && expiryDate ? expiryDate.getTime() <= Date.now() : false;
        const circleName = createdCircleData?.name || "Family";
        const shareHeading = `Invite members to the ${circleName} Circle`;

        return (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.fullScreenContainer} keyboardShouldPersistTaps="handled">
                    <View style={styles.invitationsHeaderRow}>
                        <TouchableOpacity
                            style={styles.backButtonSimple}
                            onPress={() => setCurrentView("list")}
                        >
                            <Ionicons name="chevron-back" size={24} color="#113C9C" />
                            <Text style={[styles.backButtonSimpleText, { color: '#113C9C' }]}>Back</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.successHeader}>
                        <Text style={styles.inviteMemberTitle}>{shareHeading}</Text>
                        <Text style={styles.inviteMemberSubtitle}>
                            Share your code or send it in a message, email or in-App
                        </Text>
                    </View>

                    <View style={styles.codeDisplayContainerLightBlue}>
                        {hasCode ? (
                            <>
                                <Text style={styles.codeTextBlueH1}>{generatedCode}</Text>
                                <Text style={styles.codeExpiryBlue}>
                                    This code will be active for 2 days
                                </Text>

                                {isCodeExpired && (
                                    <View style={{ marginTop: 10 }}>
                                        <Text style={styles.shareWarningText}>Code Expired</Text>
                                        <TouchableOpacity onPress={handleGenerateInvitationCode}>
                                            <Text style={{ color: '#113C9C', textDecorationLine: 'underline' }}>Generate New</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                <ActivityIndicator color="#113C9C" />
                                <Text style={{ color: '#113C9C', marginTop: 10 }}>Generating code...</Text>
                            </View>
                        )}
                    </View>

                    {hasCode && !isCodeExpired && (
                        <TouchableOpacity style={styles.shareBtn} onPress={onShareCode}>
                            <Text style={styles.shareBtnText}>Share Code</Text>
                        </TouchableOpacity>
                    )}

                    <View style={{ flex: 1 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        );
    };

    const renderInvitationsContent = () => (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <View style={styles.invitationsHeaderRow}>
                    <TouchableOpacity
                        style={styles.backButtonSimple}
                        onPress={() => setCurrentView("list")}
                    >
                        <Ionicons name="chevron-back" size={24} color="#2563eb" />
                        <Text style={styles.backButtonSimpleText}>Back</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.invitationsTitle}>Join a Circle</Text>

                <View style={styles.joinByCodeSection}>
                    <Text style={styles.sectionTitle}>Enter Invitation Code</Text>
                    <View style={styles.otpContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => { inputRefs.current[index] = ref; }}
                                style={styles.otpInput}
                                value={digit}
                                onChangeText={(text) => handleOtpChange(text, index)}
                                onKeyPress={(e) => handleOtpKeyPress(e, index)}
                                maxLength={1}
                                keyboardType="default"
                                autoCapitalize="characters"
                            />
                        ))}
                    </View>
                    <TouchableOpacity
                        style={[styles.joinButton, joiningCircle && styles.buttonDisabled]}
                        onPress={handleJoinByCode}
                        disabled={joiningCircle}
                    >
                        {joiningCircle ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.joinButtonText}>Join Circle</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {invitations.length > 0 && (
                    <View style={styles.pendingInvitesSection}>
                        <Text style={styles.sectionTitle}>Pending Invitations</Text>
                        {invitations.map((inv) => {
                            const circleId = inv.circleId || inv.circle_id || "";
                            const circleName = inv.circleName || inv.Circle?.name || "Unknown Circle";
                            return (
                                <View key={inv.id} style={styles.invitationCard}>
                                    <Text style={styles.invitationCircleName}>{circleName}</Text>
                                    <View style={styles.invitationActions}>
                                        <TouchableOpacity
                                            style={styles.acceptButton}
                                            onPress={() => handleAcceptInvitation(circleId)}
                                        >
                                            <Text style={styles.acceptButtonText}>Accept</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.rejectButton}
                                            onPress={() => handleRejectInvitation(circleId)}
                                        >
                                            <Text style={styles.rejectButtonText}>Reject</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );

    return (
        <Modal
            visible={isOpen}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: "#fff" }}>
                <SafeAreaView style={styles.modalSafeArea} edges={["top"]}>
                    {currentView === "list" && (
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Circle</Text>
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Text style={styles.closeButtonText}>Close ✕</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.contentContainer}>
                        {currentView === "list" && renderListContent()}
                        {currentView === "invitations" && renderInvitationsContent()}
                        {currentView === "create" && renderCreateScreen()}
                        {currentView === "share" && renderShareScreen()}
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

export default CirclesModal;

const styles = StyleSheet.create({
    modalSafeArea: { flex: 1 },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    modalTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
    closeButton: { padding: 8 },
    closeButtonText: { color: "#6b7280", fontWeight: "600" },
    contentContainer: { flex: 1, padding: 20 },
    listSection: { marginBottom: 20 },
    circleRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: "#f9fafb",
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    circleRowSelected: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
    tickBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#d1d5db",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        backgroundColor: "#fff",
    },
    tickBoxActive: { borderColor: "#2563eb", backgroundColor: "#2563eb" },
    tickText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
    circleNameText: { fontSize: 16, color: "#374151", flex: 1 },
    circleNameTextActive: { color: "#2563eb", fontWeight: "600" },
    emptyText: { textAlign: "center", color: "#9ca3af", padding: 20 },
    actionButtonsContainer: { flexDirection: "row", gap: 12 },
    secondaryButton: {
        flex: 1,
        backgroundColor: "#113C9C",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    secondaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
    fullScreenContainer: { flexGrow: 1 },
    invitationsHeaderRow: { marginBottom: 12 },
    backButtonSimple: { flexDirection: "row", alignItems: "center" },
    backButtonSimpleText: { fontSize: 16, color: "#2563eb", marginLeft: 4 },
    createTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 16,
        marginTop: 0,
    },
    createFormSection: { marginBottom: 10 },
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
        marginBottom: 16,
    },
    privacyBox: {
        backgroundColor: '#E8F0FE',
        borderRadius: 16,
        padding: 16,
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
    suggestionLabel: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
    suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    suggestionChip: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    suggestionText: { color: '#2563eb', fontSize: 14, fontWeight: '500' },
    continueButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    continueButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    buttonDisabled: { opacity: 0.5 },
    successHeader: { marginBottom: 24 },
    inviteMemberTitle: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
    inviteMemberSubtitle: { fontSize: 14, color: '#6b7280' },
    codeDisplayContainerLightBlue: {
        backgroundColor: '#E8F0FE',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
    },
    codeTextBlueH1: { fontSize: 36, fontWeight: 'bold', color: '#113C9C', letterSpacing: 4 },
    codeExpiryBlue: { fontSize: 12, color: '#113C9C', marginTop: 8, opacity: 0.7 },
    shareWarningText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
    shareBtn: {
        backgroundColor: '#113C9C',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    invitationsTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 24 },
    joinByCodeSection: { marginBottom: 30 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 16 },
    otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    otpInput: {
        width: 48,
        height: 56,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
        backgroundColor: '#fff',
    },
    joinButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    joinButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    pendingInvitesSection: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 20,
    },
    invitationCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    invitationCircleName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
    invitationActions: { flexDirection: 'row', gap: 12 },
    acceptButton: {
        flex: 1,
        backgroundColor: '#22c55e',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    acceptButtonText: { color: '#fff', fontWeight: '600' },
    rejectButton: {
        flex: 1,
        backgroundColor: '#ef4444',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    rejectButtonText: { color: '#fff', fontWeight: '600' },
    relationshipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    radioButtonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginRight: 16 },
    radioButtonRowSelected: { opacity: 1 },
    radioButtonCircle: { height: 20, width: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    radioButtonCircleSelected: { borderColor: '#113C9C' },
    radioButtonInner: { height: 10, width: 10, borderRadius: 5, backgroundColor: '#113C9C' },
    radioButtonLabel: { fontSize: 16, color: '#333' },
    radioButtonLabelSelected: { color: '#113C9C', fontWeight: '600' },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: -10,
        marginBottom: 10,
        marginLeft: 4,
    },
});
