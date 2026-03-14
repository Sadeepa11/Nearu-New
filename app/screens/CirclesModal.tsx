// CirclesModal.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL, authenticatedFetch } from "../../utils/auth";

const { height: windowHeight } = Dimensions.get("window");

// --- Interfaces ---
interface LocationPoint {
  id?: number;
  latitude: number;
  longitude: number;
  name?: string;
  metadata?: { radius?: number };
}

type CircleUserWithMembership = {
  Membership?: {
    code?: string;
    codeExpiresAt?: string;
  };
};

interface CircleData {
  id: number | string;
  name?: string;
  Locations?: LocationPoint[];
  metadata?: { radius?: number };
  creatorId?: string;
  creator?: { id: string; name?: string };
  invitationCode?: string;
  invitationCodeExpiresAt?: string;
  joinCode?: string;
  code?: string;
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
  // possible alternative shapes:
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
}

const CIRCLE_NAME_SUGGESTIONS = [
  "Family",
  "Friends",
  "Office",
  "Gym Buddies",
  "Cousins",
  "Travel Group",
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
  // Returns { code?: string, expiresAt?: string }
  if (!circle) return {};
  // priority: explicit fields
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

  // check users membership
  const users = Array.isArray(circle.users) ? circle.users : [];
  for (const u of users) {
    if (u?.Membership?.code) {
      return {
        code: u.Membership.code,
        expiresAt: u.Membership.codeExpiresAt,
      };
    }
  }

  // fallback: top-level invitationCode fields
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
}) => {
  // animation & open state
  const modalAnim = useRef(new Animated.Value(-windowHeight)).current;
  const [isModalOpen, setIsModalOpen] = useState(false);

  // UI view state: 'list' | 'create' | 'share' | 'invitations'
  const [currentView, setCurrentView] = useState<
    "list" | "create" | "share" | "invitations"
  >("list");

  // selection
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);

  // create circle
  const [newCircleName, setNewCircleName] = useState("");
  const [creatingCircle, setCreatingCircle] = useState(false);

  // created circle + invite code
  const [createdCircleData, setCreatedCircleData] = useState<CircleData | null>(
    null
  );
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeExpiry, setCodeExpiry] = useState<string | null>(null);

  // invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNickname, setInviteNickname] = useState("");
  const [inviteRole, setInviteRole] = useState("member"); // default role
  const [sendingInvite, setSendingInvite] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // join by code
  const [joinCode, setJoinCode] = useState("");
  const [joiningCircle, setJoiningCircle] = useState(false);

  // invitations list
  const [invitations, setInvitations] = useState<InvitationData[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [refreshingInvitations, setRefreshingInvitations] = useState(false);
  const lastHandledShareRequestId = useRef<number | null>(null);

  // effect: open/close modal with animation
  useEffect(() => {
    if (isOpen && !isModalOpen) {
      setIsModalOpen(true);
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else if (!isOpen && isModalOpen) {
      Animated.timing(modalAnim, {
        toValue: -windowHeight,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsModalOpen(false);
        // reset when closed
        resetStates();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isModalOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!shareTargetCircle || shareRequestId == null) return;
    if (lastHandledShareRequestId.current === shareRequestId) return;

    lastHandledShareRequestId.current = shareRequestId;
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
    setInviteEmail("");
    setInviteNickname("");
    setGeneratedCode(null);
    setCodeExpiry(null);
    setCreatedCircleData(null);
    setSendingInvite(false);
    setCreatingCircle(false);
    setJoiningCircle(false);
    setGeneratingCode(false);
  };

  const handleCircleSelect = (id: number | string) => {
    const idStr = String(id);
    if (selectedCircleId === idStr) {
      setSelectedCircleId(null);
    } else {
      setSelectedCircleId(idStr);
      if (onSelectCircle) onSelectCircle(id);
    }
  };

  // Create circle then attempt to find any generated invite code immediately
  const handleCreateCircle = async (nameToUse?: string) => {
    const name = nameToUse ?? newCircleName;
    if (!name || !name.trim()) {
      Alert.alert("Required", "Please enter a name for the circle.");
      return;
    }

    setCreatingCircle(true);
    try {
      const createResponse = await authenticatedFetch(`${API_BASE_URL}/circles`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          location: { name: "Default", latitude: 0, longitude: 0 },
        }),
      });

      if (!createResponse.ok) {
        const err = await createResponse.json().catch(() => ({}));
        Alert.alert("Error", err.message || "Failed to create circle.");
        return;
      }

      const createData = await createResponse.json();
      const circlePayload = extractCirclePayload(createData);
      setCreatedCircleData(circlePayload);

      // resolve code if returned as part of create
      const { code, expiresAt } = resolveInvitationDetails(circlePayload);
      if (code) setGeneratedCode(code);
      if (expiresAt) setCodeExpiry(expiresAt);

      // if circle has id, attempt to fetch invites to find code
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
          // ignore fetch invite errors
          console.log("No invites found immediately after create", e);
        }
      }

      setCurrentView("share");
      setNewCircleName("");
    } catch (error) {
      console.error("Error creating circle:", error);
      Alert.alert("Error", "Connection failed.");
    } finally {
      setCreatingCircle(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !createdCircleData?.id) {
      Alert.alert("Error", "Please enter an email address and ensure a circle exists.");
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
        // NEW: API no longer returns any code
        Alert.alert("Success", `Invitation sent to ${inviteEmail}.`);
        setInviteEmail("");
        setInviteNickname("");
        setInviteRole("member"); // Reset if needed
      } else {
        Alert.alert("Error", data.message || "Failed to send invite.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network error.");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleGenerateInvitationCode = async () => {
    if (!createdCircleData?.id) {
      Alert.alert("Error", "A circle must be selected to generate a code.");
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
        Alert.alert("Success", "Invitation code generated successfully.");
        if (onRefresh) onRefresh();
      } else {
        Alert.alert("Error", payload.message || "Failed to generate invitation code.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network error.");
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
      Alert.alert("Share error", error.message || "Could not share code.");
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim() || joinCode.trim().length < 6) {
      Alert.alert("Invalid Code", "Enter a valid 6-character code.");
      return;
    }
    Keyboard.dismiss();
    setJoiningCircle(true);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/circles/join-by-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ code: joinCode.toUpperCase().trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        Alert.alert("Success", "Joined circle successfully!");
        setJoinCode("");
        if (onRefresh) await onRefresh();
        await loadInvitations();
      } else {
        Alert.alert("Error", data.message || "Invalid or expired code.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network error.");
    } finally {
      setJoiningCircle(false);
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
        // non-200: still try to set any array found
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
        Alert.alert("Joined!");
        await loadInvitations();
        if (onRefresh) await onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert("Error", data.message || "Could not accept invite.");
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
        Alert.alert("Error", data.message || "Could not reject invite.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isModalOpen) return null;

  // --- RENDER HELPERS ---
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
            ListEmptyComponent={<Text style={styles.emptyText}>No circles found.</Text>}
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
      <Text style={styles.fsTitle}>Name your Circle</Text>
      <Text style={styles.fsSubtitle}>Give your new circle a recognizable name.</Text>

      <TextInput
        style={styles.fsInput}
        placeholder="Ex: Family, Marketing Team..."
        placeholderTextColor="#9CA3AF"
        value={newCircleName}
        onChangeText={setNewCircleName}
        autoFocus
      />
      <Text style={styles.suggestionLabel}>Suggestions:</Text>
      <View style={styles.suggestionRow}>
        {CIRCLE_NAME_SUGGESTIONS.map((name) => (
          <TouchableOpacity key={name} style={styles.suggestionChip} onPress={() => handleCreateCircle(name)}>
            <Text style={styles.suggestionText}>+ {name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        style={[styles.primaryButton, creatingCircle && styles.buttonDisabled]}
        onPress={() => handleCreateCircle()}
        disabled={creatingCircle}
      >
        {creatingCircle ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create Circle</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.textBtn} onPress={() => setCurrentView("list")}>
        <Text style={styles.textBtnText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderShareScreen = () => {
    const hasCode = Boolean(generatedCode);
    const expiryDate = codeExpiry ? new Date(codeExpiry) : null;
    const isCodeExpired = hasCode && expiryDate ? expiryDate.getTime() <= Date.now() : false;
    const formattedExpiry = expiryDate
      ? `${isCodeExpired ? "Expired" : "Expires"} ${expiryDate.toLocaleString()}`
      : null;
    const shareHeading = createdCircleData?.name ? `Invite to ${createdCircleData.name}` : "Invite to your circle";
    const shareIcon = !hasCode ? "🤝" : isCodeExpired ? "⌛" : "🎉";
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.fullScreenContainer}>
          <View style={styles.successHeader}>
            <Text style={styles.successIcon}>{shareIcon}</Text>
            <Text style={styles.fsTitle}>{shareHeading}</Text>
            {!hasCode && (
              <Text style={styles.shareSubheading}>
                Send email invitations so members see this circle in their app.
              </Text>
            )}
          </View>

          <View style={styles.codeDisplayContainer}>
            {hasCode ? (
              <>
                <Text style={styles.codeLabel}>Invite Code:</Text>
                <Text style={styles.codeTextH1}>{generatedCode}</Text>
                {formattedExpiry && <Text style={styles.codeExpiry}>{formattedExpiry}</Text>}
                {isCodeExpired ? (
                  <>
                    <Text style={styles.shareWarningText}>
                      Invitation code expired. Please generate a new code.
                    </Text>
                    <TouchableOpacity
                      style={[styles.primaryButton, generatingCode && styles.buttonDisabled, { marginTop: 12 }]}
                      onPress={handleGenerateInvitationCode}
                      disabled={generatingCode}
                    >
                      {generatingCode ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Generate New Code</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.shareBtn} onPress={onShareCode}>
                    <Text style={styles.shareBtnText}>Share Code 📤</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <Text style={styles.codeLabel}>Invite code not available</Text>
                <Text style={styles.shareInfoText}>
                  Email invitations deliver access directly—no join code required.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryButton, generatingCode && styles.buttonDisabled, { marginTop: 16 }]}
                  onPress={handleGenerateInvitationCode}
                  disabled={generatingCode}
                >
                  {generatingCode ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Generate Invitation Code</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.inviteForm}>
            <Text style={styles.sectionTitle}>Invite via Email</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Email Address (Required)"
              placeholderTextColor="#9CA3AF"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.formInput, { flex: 1, marginRight: 8 }]}
                placeholder="Nickname (Opt)"
                placeholderTextColor="#9CA3AF"
                value={inviteNickname}
                onChangeText={setInviteNickname}
              />
              <View style={[styles.formInput, { justifyContent: "center", paddingVertical: 0, width: 100 }]}>
                <Text style={{ color: "#666" }}>{inviteRole}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, sendingInvite && styles.buttonDisabled, { marginTop: 10 }]}
              onPress={handleSendInvite}
              disabled={sendingInvite}
            >
              {sendingInvite ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Send Email Invite</Text>}
            </TouchableOpacity>
          </View>

          <View style={{ height: 20 }} />
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              resetStates();
              if (onRefresh) onRefresh();
            }}
          >
            <Text style={styles.secondaryButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const renderInvitationsContent = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.joinCodeContainer}>
        <Text style={styles.inputLabel}>Join via Code</Text>
        <View style={styles.joinCodeRow}>
          <TextInput
            style={styles.codeInput}
            placeholder="ABC123"
            placeholderTextColor="#9CA3AF"
            value={joinCode}
            onChangeText={setJoinCode}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.joinCodeButton, joiningCircle && styles.buttonDisabled]}
            onPress={handleJoinByCode}
            disabled={joiningCircle}
          >
            {joiningCircle ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.joinCodeButtonText}>Join</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.inputLabel, { marginTop: 10, marginBottom: 5 }]}>Pending Invites</Text>

      {loadingInvitations ? (
        <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item.id.toString()}
          nestedScrollEnabled
          refreshControl={
            <RefreshControl
              refreshing={refreshingInvitations}
              onRefresh={() => {
                setRefreshingInvitations(true);
                loadInvitations();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pending invitations.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cName = item.Circle?.name || item.circleName || "Unknown Circle";
            const inviter = item.Circle?.creator?.name || item.inviterName || "Someone";
            const cId = item.circleId || (item as any).circle_id || item.Circle?.id || "";
            return (
              <View style={styles.inviteCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inviteTitle}>{cName}</Text>
                  <Text style={styles.inviteSub}>Invited by {inviter}</Text>
                </View>
                <View style={styles.inviteActions}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptInvitation(cId)}>
                    <Text style={styles.btnTextWhite}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectInvitation(cId)}>
                    <Text style={styles.btnTextWhite}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => setCurrentView("list")}>
        <Text style={styles.backButtonText}>Back to Circles</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.topSheetModal, { transform: [{ translateY: modalAnim }] }]}>
        <SafeAreaView style={styles.modalSafeArea} edges={["top"]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {currentView === "list"
                ? "Select Circle"
                : currentView === "create"
                  ? "Create Circle"
                  : currentView === "share"
                    ? "Invite Members"
                    : "Invitations"}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close ✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contentContainer}>
            {currentView === "list" && renderListContent()}
            {currentView === "invitations" && renderInvitationsContent()}
            {currentView === "create" && renderCreateScreen()}
            {currentView === "share" && renderShareScreen()}
          </View>
        </SafeAreaView>
      </Animated.View>
    </>
  );
};

export default CirclesModal;

// ---------- Styles (unchanged except minor spacing) ----------
const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 900,
  },
  topSheetModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: windowHeight * 0.92,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 15,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
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

  // List Styles
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
  circleNameText: { fontSize: 16, fontWeight: "500", color: "#374151" },
  circleNameTextActive: { color: "#1e3a8a", fontWeight: "700" },
  emptyText: { textAlign: "center", color: "#9ca3af", fontStyle: "italic", marginTop: 10 },

  // Input Styles
  inputSection: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#4b5563", marginBottom: 8 },
  fakeInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fakeInputText: { color: "#9ca3af", fontSize: 16 },
  fakeInputIcon: { color: "#2563eb", fontSize: 20, fontWeight: "bold" },

  // Create Screen
  fullScreenContainer: { flex: 1, flexGrow: 1 },
  fsTitle: { fontSize: 22, fontWeight: "bold", color: "#111827", marginBottom: 8 },
  fsSubtitle: { fontSize: 14, color: "#6b7280", marginBottom: 20 },
  fsInput: {
    fontSize: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingVertical: 10,
    marginBottom: 20,
    color: "#111827",
  },
  suggestionLabel: { fontSize: 14, fontWeight: "600", color: "#4b5563", marginBottom: 10 },
  suggestionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestionChip: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginRight: 8,
    marginBottom: 8,
  },
  suggestionText: { color: "#2563eb", fontWeight: "500" },

  // Share Screen
  successHeader: { alignItems: "center", marginBottom: 20 },
  successIcon: { fontSize: 40, marginBottom: 10 },
  shareSubheading: { fontSize: 14, color: "#6b7280", textAlign: "center", marginTop: 4 },
  codeDisplayContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 2,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  codeLabel: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  codeTextH1: { fontSize: 36, fontWeight: "800", color: "#111827", letterSpacing: 3, marginVertical: 10 },
  codeExpiry: { fontSize: 12, color: "#ef4444", marginBottom: 16 },
  shareInfoText: { fontSize: 13, color: "#6b7280", textAlign: "center", marginTop: 6 },
  shareWarningText: { fontSize: 13, color: "#b91c1c", textAlign: "center", marginTop: 8 },
  shareBtn: { backgroundColor: "#2563eb", paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8 },
  shareBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },

  inviteForm: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  formInput: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
    color: "#1f2937",
  },
  rowInputs: { flexDirection: "row" },

  // Buttons
  actionButtonsContainer: { flexDirection: "row", gap: 12, alignItems: "flex-end" },
  primaryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#8B5CF6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    color: "#fff",
    borderColor: "#8B5CF6",
    marginLeft: 8,
  },
  secondaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  buttonDisabled: { opacity: 0.6 },
  textBtn: { alignItems: "center", padding: 15 },
  textBtnText: { color: "#6b7280", fontSize: 16 },

  // Invites View
  joinCodeContainer: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  joinCodeRow: { flexDirection: "row", gap: 10 },
  codeInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    letterSpacing: 2,
  },
  joinCodeButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  joinCodeButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 1,
  },
  inviteTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  inviteSub: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  inviteActions: { flexDirection: "row", gap: 8 },
  acceptBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#10b981", alignItems: "center", justifyContent: "center", marginLeft: 8 },
  rejectBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", marginLeft: 8 },
  btnTextWhite: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  backButton: { marginTop: 10, padding: 15, alignItems: "center" },
  backButtonText: { color: "#6b7280", fontWeight: "600" },
  emptyContainer: { padding: 20, alignItems: "center" },
});
