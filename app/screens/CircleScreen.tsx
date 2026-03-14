import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { LatLng, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { API_BASE_URL, authenticatedFetch } from "../../utils/auth";

type CreatedCircleInfo = {
  id?: string;
  name: string;
  invitationCode?: string;
  invitationCodeExpiresAt?: string;
};

type CircleUserWithMembership = {
  Membership?: {
    code?: string;
    codeExpiresAt?: string;
  };
};

const extractCirclePayload = (raw: any) => {
  if (!raw) {
    return {};
  }

  if (raw?.data?.circle) {
    return raw.data.circle;
  }

  if (raw?.circle) {
    return raw.circle;
  }

  if (raw?.data && (raw.data.invitationCode || raw.data.users || raw.data.metadata)) {
    return raw.data;
  }

  if (raw?.data?.data) {
    return extractCirclePayload(raw.data);
  }

  return raw;
};

const CircleScreen: React.FC = () => {
  const router = useRouter();
  const [circleName, setCircleName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [metadata, setMetadata] = useState("{}"); // JSON string
  const [location, setLocation] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCreatedCircle, setLastCreatedCircle] = useState<CreatedCircleInfo | null>(null);

  const formatInvitationExpiry = (value?: string | null) => {
    if (!value) {
      return null;
    }

    try {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
    } catch (error_) {
      console.warn("Failed to format invitation code expiry", error_);
      return null;
    }
  };

  const formattedExpiration = formatInvitationExpiry(lastCreatedCircle?.invitationCodeExpiresAt);

  const handleShareInvitationCode = async () => {
    if (!lastCreatedCircle?.invitationCode) {
      Alert.alert("No Code", "Create a circle to receive an invitation code you can share.");
      return;
    }

    try {
      await Share.share({
        message: formattedExpiration
          ? `Join my circle "${lastCreatedCircle.name}" using invitation code ${lastCreatedCircle.invitationCode}. The code expires ${formattedExpiration}.`
          : `Join my circle "${lastCreatedCircle.name}" using invitation code ${lastCreatedCircle.invitationCode}.`,
      });
    } catch (error) {
      console.error("Error sharing invitation code:", error);
      Alert.alert("Share Failed", "Unable to open the share sheet. Please try again.");
    }
  };

  const handleCreateCircle = async () => {
    if (!circleName || !locationName || !location) {
      Alert.alert("Error", "Please enter all fields and pick a location on the map.");
      return;
    }

    let parsedMetadata = {};
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch (error_) {
      console.warn("Invalid metadata JSON:", error_);
      Alert.alert("Error", "Metadata must be valid JSON.");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Error", "No auth token found. Please log in again.");
        router.replace("/screens/LogInScreen");
        return;
      }

      const response = await authenticatedFetch(`${API_BASE_URL}/circles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          name: circleName,
          metadata: parsedMetadata,
          location: {
            name: locationName,
            latitude: location.latitude,
            longitude: location.longitude,
            metadata: {},
          },
        }),
      });

      if (response.status === 401) {
        // Token refresh failed or no valid token
        Alert.alert("Authentication Error", "Your session has expired. Please log in again.");
        router.replace("/screens/LogInScreen");
        return;
      }

      const data = await response.json();
      if (response.ok) {
        console.log("Circle created:", data);
        const circlePayload = extractCirclePayload(data);

        const users = Array.isArray(circlePayload?.users)
          ? (circlePayload.users as CircleUserWithMembership[])
          : [];
        const membershipWithCode = users.find((user) => user?.Membership?.code);

        const invitationCode =
          circlePayload?.invitationCode ||
          circlePayload?.joinCode ||
          circlePayload?.code ||
          membershipWithCode?.Membership?.code;

        const invitationCodeExpiresAt =
          circlePayload?.invitationCodeExpiresAt ||
          circlePayload?.codeExpiresAt ||
          circlePayload?.invitationCodeExpiry ||
          membershipWithCode?.Membership?.codeExpiresAt;

        const formattedExpirationForAlert = formatInvitationExpiry(invitationCodeExpiresAt);

        setLastCreatedCircle({
          id: circlePayload?.id,
          name: circlePayload?.name || circleName,
          invitationCode,
          invitationCodeExpiresAt,
        });

        const successMessage = invitationCode
          ? formattedExpirationForAlert
            ? `Circle created! Share this invitation code before ${formattedExpirationForAlert}: ${invitationCode}`
            : `Circle created! Share this invitation code: ${invitationCode}`
          : "Circle created successfully.";

        Alert.alert("Success", successMessage);
        setCircleName("");
        setLocationName("");
        setLocation(null);
        setMetadata("{}");
      } else {
        console.error(data);
        Alert.alert("Error", "Failed to create circle.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong while creating the circle.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Circle Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter circle name"
        value={circleName}
        onChangeText={setCircleName}
      />

      <Text style={styles.label}>Location Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter location name"
        value={locationName}
        onChangeText={setLocationName}
      />

      <Text style={styles.label}>Metadata (JSON)</Text>
      <TextInput
        style={styles.input}
        placeholder='e.g. {"key":"value"}'
        value={metadata}
        onChangeText={setMetadata}
      />

      <Text style={styles.label}>Pick Location on Map</Text>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: 6.9271,
          longitude: 79.8612,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={(e) => setLocation(e.nativeEvent.coordinate)}
      >
        {location && <Marker coordinate={location} title="Selected Location" />}
      </MapView>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleCreateCircle}>
          <Text style={styles.buttonText}>Create Circle</Text>
        </TouchableOpacity>
      )}

      {lastCreatedCircle?.invitationCode && (
        <View style={styles.joinCodeCard}>
          <Text style={styles.joinCodeHeading}>Circle invitation code</Text>
          <Text style={styles.joinCodeValue}>{lastCreatedCircle.invitationCode}</Text>
          {formattedExpiration && (
            <Text style={styles.joinCodeExpiry}>Expires {formattedExpiration}</Text>
          )}
          <TouchableOpacity style={styles.shareButton} onPress={handleShareInvitationCode}>
            <Text style={styles.shareButtonText}>Share code</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  label: {
    fontWeight: "bold",
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
  },
  map: {
    width: "100%",
    height: 300,
    marginTop: 10,
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  joinCodeCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#eef2ff",
  },
  joinCodeHeading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  joinCodeValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1d4ed8",
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 12,
  },
  joinCodeExpiry: {
    fontSize: 14,
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 12,
  },
  shareButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  shareButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default CircleScreen;
