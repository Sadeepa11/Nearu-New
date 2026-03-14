import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import {
    ActivityIndicator,
    Alert,
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
import MapView, { Circle, MapPressEvent, Marker, MarkerDragStartEndEvent, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL, authenticatedFetch } from "../utils/auth";

interface GeocodeSuggestion {
  latitude: number;
  longitude: number;
  address: string;
}

type SelectedLocation = {
  latitude: number;
  longitude: number;
  address: string;
};

type LocationEditPayload = {
  id?: number | string | null;
  latitude: number;
  longitude: number;
  name?: string | null;
  metadata?: Record<string, any> | null;
};

interface AddPlaceModalProps {
  visible: boolean;
  circleId?: number | string | null;
  circleName?: string | null;
  onClose: () => void;
  onPlaceSaved?: () => void | Promise<void>;
  mode?: "create" | "edit";
  editingLocation?: LocationEditPayload | null;
}

const COLORS = {
  primary: "#4F359B",
  accent: "#EF4444",
  white: "#FFFFFF",
  black: "#1A1A1A",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
};

const DEFAULT_REGION: Region = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const MIN_RADIUS_METERS = 20;
const MAX_RADIUS_METERS = 5000;
const DEFAULT_RADIUS_METERS = 100;

const FALLBACK_ENDPOINT = "https://nominatim.openstreetmap.org/search";

const clampRadiusValue = (value: number): number => {
  if (!Number.isFinite(value)) {
    return MIN_RADIUS_METERS;
  }
  const rounded = Math.round(value);
  if (rounded < MIN_RADIUS_METERS) {
    return MIN_RADIUS_METERS;
  }
  if (rounded > MAX_RADIUS_METERS) {
    return MAX_RADIUS_METERS;
  }
  return rounded;
};

const coerceRadiusValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const resolveRadiusFromMetadata = (metadata: Record<string, unknown> | null | undefined): number | null => {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const record = metadata as Record<string, unknown>;
  const candidates: unknown[] = [
    record.radius,
    record.Radius,
    (record as any)?.geofenceRadius,
    (record as any)?.geofence_radius,
    (record as any)?.geofence?.radius,
  ];

  for (const candidate of candidates) {
    const numeric = coerceRadiusValue(candidate);
    if (numeric !== null) {
      return numeric;
    }
    if (candidate && typeof candidate === "object") {
      const nested = coerceRadiusValue((candidate as Record<string, unknown>).radius);
      if (nested !== null) {
        return nested;
      }
    }
  }

  return null;
};

const buildAddressFromReverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const [reverse] = await Location.reverseGeocodeAsync({ latitude, longitude });
    const parts = [
      reverse?.name,
      reverse?.street,
      reverse?.district,
      reverse?.city,
      reverse?.region,
      reverse?.postalCode,
      reverse?.country,
    ].filter(Boolean) as string[];

    if (parts.length) {
      return Array.from(new Set(parts)).join(", ");
    }
  } catch (error) {
    console.warn("reverseGeocodeAsync failed", error);
  }

  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
};

const fetchFallbackSuggestions = async (query: string): Promise<GeocodeSuggestion[]> => {
  try {
    const response = await fetch(
      `${FALLBACK_ENDPOINT}?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "LocationTrackerApp/1.0",
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload
      .filter((item: any) => item?.lat && item?.lon)
      .map((item: any) => ({
        latitude: Number(item.lat),
        longitude: Number(item.lon),
        address:
          typeof item.display_name === "string" && item.display_name.trim().length > 0
            ? item.display_name.trim()
            : `${Number(item.lat).toFixed(4)}, ${Number(item.lon).toFixed(4)}`,
      }));
  } catch (error) {
    console.warn("Fallback geocoding failed", error);
    return [];
  }
};

const gatherSuggestions = async (query: string): Promise<GeocodeSuggestion[]> => {
  try {
    const geocoded = await Location.geocodeAsync(query);
    if (!geocoded.length) {
      return fetchFallbackSuggestions(query);
    }

    const limited = geocoded.slice(0, 5);
    const enriched = await Promise.all(
      limited.map(async (result) => ({
        latitude: result.latitude,
        longitude: result.longitude,
        address: await buildAddressFromReverseGeocode(result.latitude, result.longitude),
      }))
    );

    return enriched;
  } catch (error) {
    console.warn("Geocoding failed, using fallback", error);
    return fetchFallbackSuggestions(query);
  }
};

const AddPlaceModal: React.FC<AddPlaceModalProps> = ({
  visible,
  circleId,
  circleName,
  onClose,
  onPlaceSaved,
  mode = "create",
  editingLocation = null,
}) => {
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [locationSearchResults, setLocationSearchResults] = useState<GeocodeSuggestion[]>([]);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [placeNickname, setPlaceNickname] = useState("");
  const [hasEditedNickname, setHasEditedNickname] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region>(DEFAULT_REGION);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState<number>(DEFAULT_RADIUS_METERS);
  const [canShowUserLocation, setCanShowUserLocation] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const insets = useSafeAreaInsets();

  const isEditMode = mode === "edit" && !!editingLocation;
  const resolvedCircleName = typeof circleName === "string" && circleName.trim().length > 0 ? circleName.trim() : "";
  const headerTitle = isEditMode ? "Update place" : "Add a place";
  let headerSubtitle = "Search for an address or drop a pin to share with your circle.";
  if (isEditMode) {
    headerSubtitle = "Review and update this saved location.";
  } else if (resolvedCircleName.length > 0) {
    headerSubtitle = `Add a saved place to ${resolvedCircleName}.`;
  }
  const primaryButtonLabel = isEditMode ? "Update place" : "Save place";

  const resetFormState = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setLocationSearchQuery("");
    setLocationSearchResults([]);
    setSelectedLocation(null);
    setPlaceNickname("");
    setHasEditedNickname(false);
    setLocationError(null);
    setIsSearchingLocations(false);
    setIsSavingLocation(false);
    setIsResolvingAddress(false);
    setInitialRegion(DEFAULT_REGION);
    setRadiusMeters(DEFAULT_RADIUS_METERS);
    setCanShowUserLocation(false);
  }, []);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === Location.PermissionStatus.GRANTED;
      setCanShowUserLocation(granted);
      return granted;
    } catch (error) {
      console.warn("Unable to request location permission", error);
      setCanShowUserLocation(false);
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateCurrentLocation = async () => {
      try {
        const granted = await requestLocationPermission();
        if (!granted) {
          return;
        }

        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;

        const region = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setInitialRegion(region);
        requestAnimationFrame(() => {
          mapRef.current?.animateToRegion(region, 320);
        });
      } catch (error) {
        console.warn("Unable to fetch current position", error);
      }
    };

    const hydrateExistingLocation = async () => {
      await requestLocationPermission();
      if (!editingLocation) return;
      const { latitude, longitude } = editingLocation;

      if (typeof latitude !== "number" || typeof longitude !== "number" || Number.isNaN(latitude) || Number.isNaN(longitude)) {
        setLocationError("This saved place is missing coordinates and cannot be edited.");
        return;
      }

      const metadata =
        editingLocation.metadata && typeof editingLocation.metadata === "object"
          ? editingLocation.metadata
          : undefined;

      let metadataAddress: string | undefined;
      if (metadata && typeof metadata.address === "string" && metadata.address.trim().length > 0) {
        metadataAddress = metadata.address.trim();
      } else if (metadata && typeof metadata.formattedAddress === "string" && metadata.formattedAddress.trim().length > 0) {
        metadataAddress = metadata.formattedAddress.trim();
      }

      const fallbackAddress = metadataAddress ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      const nicknameSeed = typeof editingLocation.name === "string" && editingLocation.name.trim().length > 0
        ? editingLocation.name.trim()
        : fallbackAddress;

      if (cancelled) return;

      const metadataRadius = resolveRadiusFromMetadata(metadata);
      const directRadius = coerceRadiusValue((editingLocation as Record<string, unknown>).radius);
      const initialRadius = clampRadiusValue(metadataRadius ?? directRadius ?? DEFAULT_RADIUS_METERS);
      setRadiusMeters(initialRadius);

      setPlaceNickname(nicknameSeed);
      setHasEditedNickname(true);
      setLocationSearchQuery(fallbackAddress);
      await updateSelectedLocation(latitude, longitude, fallbackAddress, true, true);
      if (cancelled) return;
      setInitialRegion({
        latitude,
        longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      });
    };

    const hydrate = async () => {
      resetFormState();

      if (isEditMode && editingLocation) {
        await hydrateExistingLocation();
      } else {
        await hydrateCurrentLocation();
      }
    };

    if (visible) {
      hydrate();
    }

    return () => {
      cancelled = true;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [editingLocation, isEditMode, requestLocationPermission, resetFormState, updateSelectedLocation, visible]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const updateSelectedLocation = useCallback(
    async (latitude: number, longitude: number, address?: string, skipReverse = false, preserveNickname = false) => {
      setLocationError(null);
      let resolvedAddress = address?.trim();

      if (!resolvedAddress && !skipReverse) {
        setIsResolvingAddress(true);
        resolvedAddress = await buildAddressFromReverseGeocode(latitude, longitude);
        setIsResolvingAddress(false);
      }

      const finalAddress = resolvedAddress && resolvedAddress.length > 0
        ? resolvedAddress
        : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      setSelectedLocation({ latitude, longitude, address: finalAddress });
      if (!preserveNickname && !hasEditedNickname) {
        setPlaceNickname(finalAddress);
        setHasEditedNickname(false);
      }

      requestAnimationFrame(() => {
        mapRef.current?.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          },
          280
        );
      });
    },
    [hasEditedNickname]
  );

  const performSearch = useCallback(
    async (query: string) => {
      setLocationError(null);
      setIsSearchingLocations(true);
      setLocationSearchResults([]);

      const results = await gatherSuggestions(query);

      if (!results.length) {
        setLocationError("No locations found. Try refining your search.");
        setIsSearchingLocations(false);
        return;
      }

      setLocationSearchResults(results);
      if (!hasEditedNickname) {
        const topAddress = results[0].address || query;
        setPlaceNickname(topAddress);
        setHasEditedNickname(false);
      }
      setIsSearchingLocations(false);
    },
    [hasEditedNickname]
  );

  const handleLocationQueryChange = useCallback(
    (value: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }

      setLocationSearchQuery(value);
      setLocationError(null);

      const trimmed = value.trim();
      if (!trimmed.length) {
        setLocationSearchResults([]);
        setIsSearchingLocations(false);
        if (!hasEditedNickname) {
          setPlaceNickname("");
          setHasEditedNickname(false);
        }
        return;
      }

      if (!hasEditedNickname) {
        setPlaceNickname(trimmed);
        setHasEditedNickname(false);
      }

      if (trimmed.length < 3) {
        setLocationSearchResults([]);
        setIsSearchingLocations(false);
        return;
      }

      searchTimeoutRef.current = setTimeout(() => {
        performSearch(trimmed);
      }, 400);
    },
    [hasEditedNickname, performSearch]
  );

  const handleSearchLocation = useCallback(async () => {
    const query = locationSearchQuery.trim();
    if (!query) return;
    await performSearch(query);
  }, [locationSearchQuery, performSearch]);

  const handleSelectSearchResult = useCallback(
    async (item: GeocodeSuggestion) => {
      if (isSavingLocation) return;

      const manualLabel = hasEditedNickname ? placeNickname.trim() : "";
      const finalName = (manualLabel.length > 0 ? manualLabel : item.address).trim();

      if (manualLabel.length === 0) {
        setPlaceNickname(finalName);
        setHasEditedNickname(false);
      } else {
        setHasEditedNickname(true);
      }

      setLocationSearchQuery(item.address);
      await updateSelectedLocation(item.latitude, item.longitude, finalName, true);
    },
    [hasEditedNickname, isSavingLocation, placeNickname, updateSelectedLocation]
  );

  const handleMapPress = useCallback(
    async (event: MapPressEvent) => {
      if (isSavingLocation) return;
      const { latitude, longitude } = event.nativeEvent.coordinate;
      await updateSelectedLocation(latitude, longitude);
    },
    [isSavingLocation, updateSelectedLocation]
  );

  const handleMarkerDragEnd = useCallback(
    async (event: MarkerDragStartEndEvent) => {
      if (isSavingLocation) return;
      const { latitude, longitude } = event.nativeEvent.coordinate;
      await updateSelectedLocation(latitude, longitude);
    },
    [isSavingLocation, updateSelectedLocation]
  );

  const handleRadiusSliderChange = useCallback((value: number | number[]) => {
    const next = Array.isArray(value) ? value[0] : value;
    setRadiusMeters(clampRadiusValue(next));
  }, []);

  const saveLocationForCircle = useCallback(
    async (
      location: SelectedLocation,
      nickname: string,
      intent: "create" | "edit",
      locationId?: number | string | null,
      existingMetadata?: Record<string, any> | null
    ): Promise<boolean> => {
      if (!circleId) {
        const title = intent === "edit" ? "Cannot update place" : "Missing circle";
        const message = intent === "edit"
          ? "Select a circle before updating a saved place."
          : "Select a circle before adding a place.";
        Alert.alert(title, message);
        return false;
      }

      if (intent === "edit") {
        const rawId = locationId;
        const isValidId = rawId !== undefined && rawId !== null && String(rawId).trim().length > 0;
        if (!isValidId) {
          Alert.alert("Cannot update place", "This location is missing an identifier and cannot be updated.");
          return false;
        }
      }

      const metadataBase = existingMetadata && typeof existingMetadata === "object" ? { ...existingMetadata } : {};
      const sanitizedRadius = clampRadiusValue(radiusMeters);
      const payload = {
        latitude: location.latitude,
        longitude: location.longitude,
        name: nickname,
        metadata: {
          ...metadataBase,
          address: location.address,
          formattedAddress: location.address,
          radius: sanitizedRadius,
        },
      };

      setIsSavingLocation(true);
      setLocationError(null);

      const targetId = locationId !== undefined && locationId !== null ? String(locationId) : null;
      const endpoint = intent === "edit" && targetId
        ? `${API_BASE_URL}/circles/${circleId}/locations/${targetId}`
        : `${API_BASE_URL}/circles/${circleId}/locations`;

      try {
        const response = await authenticatedFetch(endpoint, {
          method: intent === "edit" ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        const isJson = response.headers.get("content-type")?.includes("application/json");
        const body = isJson ? await response.json().catch(() => ({})) : {};

        if (!response.ok) {
          const defaultMessage = intent === "edit" ? "Unable to update this place." : "Unable to save this place.";
          const message = body?.message || defaultMessage;
          setLocationError(message);
          Alert.alert(intent === "edit" ? "Could not update place" : "Could not add place", message);
          return false;
        }

        Alert.alert(
          intent === "edit" ? "Place updated" : "Place added",
          intent === "edit"
            ? "This location has been updated for your circle."
            : "This location is now saved in your circle."
        );
        return true;
      } catch (error) {
        console.error("Failed to persist location", error);
        const fallbackMessage = intent === "edit"
          ? "Something went wrong while updating this location."
          : "Something went wrong while saving this location.";
        setLocationError(fallbackMessage);
        Alert.alert(intent === "edit" ? "Could not update place" : "Could not add place", fallbackMessage);
        return false;
      } finally {
        setIsSavingLocation(false);
      }
    },
    [circleId, radiusMeters]
  );

  const handleSaveLocation = useCallback(async () => {
    if (isSavingLocation || isResolvingAddress || !selectedLocation) {
      return;
    }

    const nicknameBase = hasEditedNickname ? placeNickname : selectedLocation.address;
    const nickname = (nicknameBase || "").trim() || selectedLocation.address;
    const existingMetadata = isEditMode && editingLocation && typeof editingLocation.metadata === "object"
      ? editingLocation.metadata
      : undefined;
    const saved = await saveLocationForCircle(
      selectedLocation,
      nickname,
      isEditMode ? "edit" : "create",
      isEditMode ? editingLocation?.id ?? null : undefined,
      existingMetadata ?? null
    );
    if (saved) {
      if (onPlaceSaved) {
        await onPlaceSaved();
      }
      onClose();
    }
  }, [editingLocation, hasEditedNickname, isEditMode, isResolvingAddress, isSavingLocation, onClose, onPlaceSaved, placeNickname, saveLocationForCircle, selectedLocation]);

  const isSearchDisabled = useMemo(() => {
    const trimmed = locationSearchQuery.trim();
    return trimmed.length === 0 || isSearchingLocations || isSavingLocation;
  }, [isSavingLocation, isSearchingLocations, locationSearchQuery]);

  const isSaveDisabled = !selectedLocation || isSavingLocation || isResolvingAddress;
  const mapStatus = isResolvingAddress ? "Looking up address..." : selectedLocation?.address ?? "Tap the map to drop a pin.";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{headerTitle}</Text>
              <View style={styles.headerSpacer} />
            </View>

            <Text style={styles.subtitle}>{headerSubtitle}</Text>

            <View style={styles.searchInputRow}>
              <Ionicons name="search" size={18} color={COLORS.gray} style={styles.searchIcon} />
              <TextInput
                value={locationSearchQuery}
                onChangeText={handleLocationQueryChange}
                placeholder="Search for a location"
                placeholderTextColor={COLORS.gray}
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                editable={!isSavingLocation}
                onSubmitEditing={handleSearchLocation}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, styles.searchButton, isSearchDisabled && styles.primaryButtonDisabled]}
              onPress={handleSearchLocation}
              disabled={isSearchDisabled}
            >
              {isSearchingLocations ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>Search</Text>}
            </TouchableOpacity>

            {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}

            {searchTimeoutRef.current && !isSearchingLocations ? (
              <Text style={styles.searchHint}>Searching...</Text>
            ) : null}

            {isSearchingLocations ? (
              <View style={styles.resultsPlaceholder}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : (
              <>
                {locationSearchResults.length > 0 ? (
                  <ScrollView style={styles.searchResultsContainer} keyboardShouldPersistTaps="handled">
                    {locationSearchResults.map((item, index) => {
                      const isSelected =
                        selectedLocation?.latitude === item.latitude &&
                        selectedLocation?.longitude === item.longitude;
                      return (
                        <TouchableOpacity
                          key={`${item.latitude}-${item.longitude}-${index}`}
                          style={[styles.searchResultItem, isSelected && styles.searchResultSelected, isSavingLocation && styles.searchResultDisabled]}
                          onPress={() => handleSelectSearchResult(item)}
                          disabled={isSavingLocation}
                        >
                          <Ionicons name="location" size={20} color={isSelected ? COLORS.primary : COLORS.gray} style={styles.searchResultIcon} />
                          <View style={styles.searchResultTextWrapper}>
                            <Text style={styles.searchResultTitle}>{item.address}</Text>
                            <Text style={styles.searchResultSubtitle}>
                              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                            </Text>
                          </View>
                          {isSelected && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : null}
              </>
            )}

            <View style={styles.radiusSection}>
              <View style={styles.radiusHeader}>
                <Text style={styles.radiusLabel}>Location radius</Text>
                <Text style={styles.radiusValue}>{radiusMeters} m</Text>
              </View>
              <Slider
                style={styles.radiusSlider}
                minimumValue={MIN_RADIUS_METERS}
                maximumValue={MAX_RADIUS_METERS}
                step={5}
                value={radiusMeters}
                onValueChange={handleRadiusSliderChange}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor="#D1D5DB"
                thumbTintColor={COLORS.primary}
                disabled={isSavingLocation}
              />
              <View style={styles.radiusHintRow}>
                <Text style={styles.radiusHint}>{MIN_RADIUS_METERS} m</Text>
                <Text style={styles.radiusHint}>{MAX_RADIUS_METERS} m</Text>
              </View>
            </View>

            <View style={styles.mapSection}>
              <Text style={styles.mapLabel}>Set the location on the map</Text>
              <View style={styles.mapWrapper}>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={initialRegion}
                  showsUserLocation={canShowUserLocation}
                  showsMyLocationButton={canShowUserLocation}
                  onPress={handleMapPress}
                >
                  {selectedLocation ? (
                    <>
                      <Circle
                        center={{ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }}
                        radius={clampRadiusValue(radiusMeters)}
                        strokeColor="rgba(239, 68, 68, 0.6)"
                        fillColor="rgba(239, 68, 68, 0.18)"
                        strokeWidth={2}
                      />
                      <Marker
                        coordinate={{ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }}
                        draggable
                        onDragEnd={handleMarkerDragEnd}
                      />
                    </>
                  ) : null}
                </MapView>
              </View>
              <Text style={styles.mapHint}>Tap anywhere or drag the pin to fine-tune the spot.</Text>
              <Text style={styles.mapStatus}>{mapStatus}</Text>
            </View>

            {selectedLocation ? (
              <View style={styles.nicknameSection}>
                <Text style={styles.nicknameLabel}>Label this place</Text>
                <TextInput
                  value={placeNickname}
                  onChangeText={(value) => {
                    setPlaceNickname(value);
                    setHasEditedNickname(value.trim().length > 0);
                  }}
                  placeholder="e.g. Home, Office"
                  placeholderTextColor={COLORS.gray}
                  style={styles.nicknameInput}
                  returnKeyType="done"
                  editable={!isSavingLocation}
                  onSubmitEditing={handleSaveLocation}
                />
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, styles.saveButton, isSaveDisabled && styles.primaryButtonDisabled]}
              onPress={handleSaveLocation}
              disabled={isSaveDisabled}
            >
              {isSavingLocation ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {!circleId ? (
          <View style={[styles.missingCircleOverlay, { paddingBottom: insets.bottom + 24 }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={COLORS.accent} style={{ marginBottom: 12 }} />
            <Text style={styles.missingCircleTitle}>Select a circle first</Text>
            <Text style={styles.missingCircleSubtitle}>You need to choose a circle before saving places.</Text>
            <TouchableOpacity style={[styles.primaryButton, { marginTop: 24 }]} onPress={onClose}>
              <Text style={styles.primaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

export default AddPlaceModal;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.lightGray,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.black,
  },
  headerSpacer: {
    width: 42,
  },
  subtitle: {
    marginTop: 16,
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 20,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    marginTop: 24,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
  },
  primaryButton: {
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.4,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  searchButton: {
    marginTop: 16,
  },
  searchHint: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.gray,
  },
  resultsPlaceholder: {
    marginTop: 18,
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultsContainer: {
    marginTop: 18,
    maxHeight: 240,
  },
  radiusSection: {
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  radiusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  radiusLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.black,
  },
  radiusValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  radiusSlider: {
    width: "100%",
    height: 40,
  },
  radiusHintRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  radiusHint: {
    fontSize: 12,
    color: COLORS.gray,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: COLORS.white,
    marginBottom: 10,
  },
  searchResultSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#F3F0FF",
  },
  searchResultIcon: {
    marginRight: 12,
  },
  searchResultTextWrapper: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.black,
  },
  searchResultSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  searchResultDisabled: {
    opacity: 0.6,
  },
  errorText: {
    marginTop: 12,
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: "500",
  },
  mapSection: {
    marginTop: 28,
  },
  mapLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 12,
  },
  mapWrapper: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: 320,
    backgroundColor: "#F8FAFC",
  },
  map: {
    flex: 1,
  },
  mapHint: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.gray,
  },
  mapStatus: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.black,
  },
  nicknameSection: {
    marginTop: 20,
  },
  nicknameLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 8,
  },
  nicknameInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    fontSize: 16,
    color: COLORS.black,
  },
  saveButton: {
    marginTop: 24,
  },
  missingCircleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 24,
  },
  missingCircleTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 6,
    textAlign: "center",
  },
  missingCircleSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
  },
});
