import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { API_BASE_URL, authenticatedFetch } from "@/utils/auth";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import MapView, { Circle, PROVIDER_GOOGLE, Region, UrlTile } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

import { BatteryLevelInfo, CircleMember, LocationPoint, UserLocation } from "../../types/models";
import { LocationMarker, MemberMarker } from "../MapMarkers";

interface AddPlaceModalProps {
    visible: boolean;
    circleId?: number | string | null;
    circleName?: string | null;
    onClose: () => void;
    onPlaceSaved?: () => void | Promise<void>;
    mode?: "create" | "edit";
    editingLocation?: LocationEditPayload | null;
    // Added for cross-feature visibility
    members?: CircleMember[];
    memberLocations?: Record<string, UserLocation>;
    savedPlaces?: LocationPoint[];
    currentUserId?: string | null;
    currentUserAvatarUrl?: string | null;
    currentUserBatteryLevel?: BatteryLevelInfo | null;
    memberAvatarUrls?: Record<string, string | null>;
}

const COLORS = {
    primary: "#113C9C",
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

const PLACE_TYPES = [
    { label: "Home", value: "Home", icon: "home" },
    { label: "Office", value: "Office", icon: "briefcase" },
    { label: "School", value: "School", icon: "school" },
    { label: "Gym", value: "Gym", icon: "fitness" },
    { label: "Hotel", value: "Hotel", icon: "bed" },
    { label: "Ground", value: "Ground", icon: "map" },
    { label: "Business", value: "Business", icon: "business" },
] as const;

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

const getPlaceTypeIcon = (type?: string | null) => {
    const normalized = type?.trim().toLowerCase();
    switch (normalized) {
        case 'home': return 'home';
        case 'office': return 'briefcase';
        case 'school': return 'school';
        case 'gym': return 'fitness';
        case 'hotel': return 'bed';
        case 'ground': return 'map';
        case 'business': return 'business';
        default: return 'location-sharp';
    }
};

const buildAddressFromReverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
                "User-Agent": "NearuApp/1.0",
            },
        });
        const data = await response.json();
        if (data && data.display_name) {
            return data.display_name;
        }
    } catch (error) {
        console.warn("OSM reverse geocode failed", error);
    }

    return "Location Label";
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
                        : "Location Label",
            }));
    } catch (error) {
        console.warn("Fallback geocoding failed", error);
        return [];
    }
};

const gatherSuggestions = async (query: string): Promise<GeocodeSuggestion[]> => {
    // Always use OSM for suggestions to avoid Google Maps services
    return fetchFallbackSuggestions(query);
};

const AddPlaceModal: React.FC<AddPlaceModalProps> = ({
    visible,
    circleId,
    circleName,
    onClose,
    onPlaceSaved,
    mode = "create",
    editingLocation = null,
    members = [],
    memberLocations = {},
    savedPlaces = [],
    currentUserId = null,
    currentUserAvatarUrl = null,
    currentUserBatteryLevel = null,
    memberAvatarUrls = {},
}) => {
    const [locationSearchQuery, setLocationSearchQuery] = useState("");
    const [locationSearchResults, setLocationSearchResults] = useState<GeocodeSuggestion[]>([]);
    const [isSearchingLocations, setIsSearchingLocations] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
    const [placeNickname, setPlaceNickname] = useState("");
    const [hasEditedNickname, setHasEditedNickname] = useState(false);
    const [isSavingLocation, setIsSavingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [initialRegion, setInitialRegion] = useState<Region | undefined>(DEFAULT_REGION);
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);
    const [radiusMeters, setRadiusMeters] = useState<number>(DEFAULT_RADIUS_METERS);
    const [canShowUserLocation, setCanShowUserLocation] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [isNotifyOnArrival, setIsNotifyOnArrival] = useState(true);
    const [isNotifyOnDeparture, setIsNotifyOnDeparture] = useState(true);
    const [selectedPlaceType, setSelectedPlaceType] = useState<string>("Home");

    const hasHydratedRef = useRef(false);
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
        setInitialRegion(undefined); // Changed from DEFAULT_REGION to undefined
        setRadiusMeters(DEFAULT_RADIUS_METERS);
        setCanShowUserLocation(false);
        setIsKeyboardVisible(false); // Added
        setIsNotifyOnArrival(true); // Added
        setIsNotifyOnDeparture(true); // Added
        setSelectedPlaceType("Home");
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

    const updateSelectedLocation = useCallback(
        async (latitude: number, longitude: number, address?: string, skipReverse = false, preserveNickname = false, shouldAnimateMap = true) => {
            setLocationError(null);
            let resolvedAddress = address?.trim();

            if (!resolvedAddress && !skipReverse) {
                setIsResolvingAddress(true);
                resolvedAddress = await buildAddressFromReverseGeocode(latitude, longitude);
                setIsResolvingAddress(false);
            }

            const finalAddress = resolvedAddress && resolvedAddress.length > 0
                ? resolvedAddress
                : "Resolving address...";

            setSelectedLocation({ latitude, longitude, address: finalAddress });
            if (!preserveNickname && !hasEditedNickname) {
                setPlaceNickname(finalAddress);
                setHasEditedNickname(false);
            }

            if (shouldAnimateMap) {
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
            }
        },
        [hasEditedNickname]
    );

    useEffect(() => {
        let cancelled = false;

        const hydrateCurrentLocation = async () => {
            try {
                const granted = await requestLocationPermission();
                if (!granted) {
                    // Fallback to default region if permission denied
                    await updateSelectedLocation(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude, undefined, false, false, false);
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
                // Also set the selected location state so it's not null initially
                await updateSelectedLocation(current.coords.latitude, current.coords.longitude, undefined, false, false, false);

                requestAnimationFrame(() => {
                    mapRef.current?.animateToRegion(region, 320);
                });
            } catch (error) {
                console.warn("Unable to fetch current position", error);
                // Fallback to default region on error
                await updateSelectedLocation(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude, undefined, false, false, false);
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

            const fallbackAddress = metadataAddress ?? "Location Label";
            const nicknameSeed = typeof editingLocation.name === "string" && editingLocation.name.trim().length > 0
                ? editingLocation.name.trim()
                : fallbackAddress;

            if (cancelled) return;

            const metadataRadius = resolveRadiusFromMetadata(metadata);
            const directRadius = coerceRadiusValue((editingLocation as Record<string, unknown>).radius);
            const initialRadius = clampRadiusValue(metadataRadius ?? directRadius ?? DEFAULT_RADIUS_METERS);
            setRadiusMeters(initialRadius);

            setIsNotifyOnArrival(metadata?.notifyOnArrival !== false);
            setIsNotifyOnDeparture(metadata?.notifyOnDeparture !== false);

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

            const metadataPlaceType = (metadata?.locationType || metadata?.placeType) as string | undefined;
            if (metadataPlaceType) {
                setSelectedPlaceType(metadataPlaceType);
            }
        };

        const hydrate = async () => {
            resetFormState();

            if (isEditMode && editingLocation) {
                await hydrateExistingLocation();
            } else {
                await hydrateCurrentLocation();
            }
            hasHydratedRef.current = true;
        };

        if (visible && !hasHydratedRef.current) {
            hydrate();
        }

        return () => {
            cancelled = true;
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
                searchTimeoutRef.current = null;
            }
        };
    }, [editingLocation?.id, isEditMode, requestLocationPermission, resetFormState, updateSelectedLocation, visible]);

    useEffect(() => {
        if (!visible) {
            hasHydratedRef.current = false;
        }
    }, [visible]);

    useEffect(() => {
        const showEvent = Platform.OS === "android" ? "keyboardDidShow" : "keyboardWillShow";
        const hideEvent = Platform.OS === "android" ? "keyboardDidHide" : "keyboardWillHide";

        const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
        const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

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

    const handleRegionChangeComplete = useCallback(
        (region: Region) => {
            if (isSavingLocation) return;
            // No-op satellite switch for pure OSM
            updateSelectedLocation(region.latitude, region.longitude, undefined, false, false, false);
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
                    notifyOnArrival: isNotifyOnArrival,
                    notifyOnDeparture: isNotifyOnDeparture,
                    placeType: selectedPlaceType,
                    locationType: selectedPlaceType,
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
        [circleId, radiusMeters, isNotifyOnArrival, isNotifyOnDeparture, selectedPlaceType]
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
    const mapStatus = isResolvingAddress ? "Looking up address..." : selectedLocation?.address ?? "Move the map to select a location.";

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <View style={[styles.screen, { paddingTop: insets.top }]}>
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <ScrollView
                        style={styles.flex}
                        contentContainerStyle={[
                            styles.content,
                            { paddingBottom: (isKeyboardVisible ? 250 : 0) }
                        ]}
                        keyboardShouldPersistTaps="handled"
                    >
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
                                    style={styles.map}
                                    initialRegion={initialRegion}
                                    mapType="standard"
                                    onRegionChangeComplete={handleRegionChangeComplete}
                                >
                                    <UrlTile
                                        urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                        maximumZ={19}
                                        flipY={false}
                                    />
                                    {selectedLocation && (
                                        <Circle
                                            center={{ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }}
                                            radius={clampRadiusValue(radiusMeters)}
                                            strokeColor="rgba(239, 68, 68, 0.6)"
                                            fillColor="rgba(239, 68, 68, 0.18)"
                                            strokeWidth={2}
                                        />
                                    )}

                                    {/* Render other saved places in the circle */}
                                    {savedPlaces.map((loc, idx) => {
                                        // Skip the one we are currently editing to avoid duplication
                                        if (isEditMode && editingLocation?.id && String(loc.id) === String(editingLocation.id)) {
                                            return null;
                                        }

                                        let markerTitle = loc.name || "Saved Place";
                                        let markerDescription: string | undefined;

                                        if (loc.metadata && typeof loc.metadata === 'object') {
                                            const meta = loc.metadata as any;
                                            markerDescription = meta.address || meta.formattedAddress;
                                        }

                                        return (
                                            <LocationMarker
                                                key={`other-loc-${loc.id || idx}`}
                                                coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                                                title={markerTitle}
                                                description={markerDescription}
                                                radius={(loc.metadata as any)?.radius || DEFAULT_RADIUS_METERS}
                                                placeType={(loc.metadata as any)?.placeType}
                                                isAssignedToCurrentUser={false}
                                            />
                                        );
                                    })}

                                    {/* Render circle members */}
                                    {Object.entries(memberLocations).map(([mId, coords]) => {
                                        const isCurrentUser = currentUserId === mId;
                                        const memberRecord = members.find(m => {
                                            const mid = m.id || (m as any).userId || (m as any).UserId;
                                            return String(mid) === String(mId);
                                        });

                                        if (!coords || !coords.latitude || !coords.longitude) return null;

                                        const displayName = isCurrentUser
                                            ? "You"
                                            : memberRecord?.Membership?.nickname || memberRecord?.name || memberRecord?.email || "Member";

                                        const fallbackSeed = memberRecord?.email ?? memberRecord?.name ?? memberRecord?.Membership?.nickname ?? mId ?? "member";
                                        const avatarCandidate = isCurrentUser ? currentUserAvatarUrl : mId ? memberAvatarUrls[mId] : null;
                                        let resolvedAvatar = avatarCandidate || `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackSeed)}&background=random`;

                                        if (resolvedAvatar && resolvedAvatar.startsWith("/") && !resolvedAvatar.startsWith("http")) {
                                            resolvedAvatar = `${API_BASE_URL}${resolvedAvatar}`.replace("/api/uploads", "/uploads");
                                        }

                                        const batteryInfo = isCurrentUser ? currentUserBatteryLevel : memberRecord?.batteryLevel;
                                        const batteryValue = batteryInfo?.batteryLevel != null ? Math.round(batteryInfo.batteryLevel) : 100;

                                        return (
                                            <MemberMarker
                                                key={`member-${mId}`}
                                                memberId={mId}
                                                coordinate={coords}
                                                displayName={displayName}
                                                avatarUrl={resolvedAvatar}
                                                batteryLevel={batteryValue}
                                                speed={(coords as any).speed ?? 0}
                                                isCurrentUser={isCurrentUser}
                                                relation={memberRecord?.Membership?.metadata?.relation}
                                            />
                                        );
                                    })}
                                </MapView>
                                <View style={styles.centerMarkerContainer} pointerEvents="none">
                                    <View style={styles.dynamicMarkerWrapper}>
                                        <View style={[styles.dynamicMarkerCircle, { borderColor: COLORS.accent }]}>
                                            <Ionicons
                                                name='location-sharp'
                                                size={20}
                                                color={COLORS.accent}
                                            />
                                        </View>
                                        <View style={[styles.dynamicMarkerPointer, { borderTopColor: COLORS.accent }]} />
                                    </View>
                                </View>
                            </View>
                            <Text style={styles.mapHint}>Move the map to align the pin.</Text>
                            <Text style={styles.mapStatus}>{mapStatus}</Text>
                        </View>

                        <View style={styles.placeTypeSection}>
                            <Text style={styles.sectionLabel}>Place Type</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.placeTypeContainer}
                            >
                                {PLACE_TYPES.map((type) => (
                                    <TouchableOpacity
                                        key={type.value}
                                        style={[
                                            styles.placeTypeChip,
                                            selectedPlaceType === type.value && styles.placeTypeChipSelected
                                        ]}
                                        onPress={() => setSelectedPlaceType(type.value)}
                                    >
                                        <Ionicons
                                            name={type.icon as any}
                                            size={18}
                                            color={selectedPlaceType === type.value ? COLORS.white : COLORS.gray}
                                            style={styles.placeTypeIcon}
                                        />
                                        <Text
                                            style={[
                                                styles.placeTypeLabel,
                                                selectedPlaceType === type.value && styles.placeTypeLabelSelected
                                            ]}
                                        >
                                            {type.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {selectedLocation ? (
                            <View style={styles.nicknameSection}>
                                <Text style={styles.nicknameLabel}>{selectedLocation?.address || "Label this place"}</Text>
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

                        <View style={styles.alertSection}>
                            <View style={styles.alertItem}>
                                <View style={styles.alertTextWrapper}>
                                    <Text style={styles.alertTitle}>Arrival alert</Text>
                                    <Text style={styles.alertSubtitle}>Notify circle when someone arrives</Text>
                                </View>
                                <Switch
                                    value={isNotifyOnArrival}
                                    onValueChange={setIsNotifyOnArrival}
                                    trackColor={{ false: "#D1D5DB", true: COLORS.primary }}
                                    thumbColor={COLORS.white}
                                />
                            </View>

                            <View style={styles.alertItem}>
                                <View style={styles.alertTextWrapper}>
                                    <Text style={styles.alertTitle}>Departure alert</Text>
                                    <Text style={styles.alertSubtitle}>Notify circle when someone leaves</Text>
                                </View>
                                <Switch
                                    value={isNotifyOnDeparture}
                                    onValueChange={setIsNotifyOnDeparture}
                                    trackColor={{ false: "#D1D5DB", true: COLORS.primary }}
                                    thumbColor={COLORS.white}
                                />
                            </View>
                        </View>

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
            </View>
        </Modal>
    );
};

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
        flexGrow: 1,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    backButton: {
        padding: 4,
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.black,
        flex: 1,
    },
    headerSpacer: {
        width: 32,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.gray,
        marginBottom: 24,
    },
    searchInputRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.lightGray,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.black,
        height: "100%",
    },
    errorText: {
        fontSize: 14,
        color: COLORS.accent,
        marginBottom: 12,
        fontWeight: "500",
    },
    searchHint: {
        fontSize: 14,
        color: COLORS.gray,
        marginBottom: 8,
        fontStyle: "italic",
    },
    resultsPlaceholder: {
        height: 100,
        justifyContent: "center",
        alignItems: "center",
    },
    searchResultsContainer: {
        maxHeight: 200,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
        borderRadius: 12,
        backgroundColor: COLORS.white,
    },
    searchResultItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    searchResultSelected: {
        backgroundColor: "#E0E7FF",
    },
    searchResultDisabled: {
        opacity: 0.6,
    },
    searchResultIcon: {
        marginRight: 12,
    },
    searchResultTextWrapper: {
        flex: 1,
    },
    searchResultTitle: {
        fontSize: 14,
        color: COLORS.black,
        fontWeight: "500",
    },
    searchResultSubtitle: {
        fontSize: 12,
        color: COLORS.gray,
        marginTop: 2,
    },
    radiusSection: {
        marginBottom: 24,
        marginTop: 12,
    },
    radiusHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
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
        marginTop: 4,
    },
    radiusHint: {
        fontSize: 12,
        color: COLORS.gray,
    },
    mapSection: {
        marginBottom: 24,
    },
    mapLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.black,
        marginBottom: 12,
    },
    mapWrapper: {
        height: 240,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
    },
    map: {
        width: "100%",
        height: "100%",
    },
    centerMarkerContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
    },
    dynamicMarkerWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    dynamicMarkerCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    dynamicMarkerPointer: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 3,
        borderRightWidth: 3,
        borderTopWidth: 5,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -1,
    },
    mapHint: {
        fontSize: 12,
        color: COLORS.gray,
        marginTop: 8,
        textAlign: "center",
    },
    mapStatus: {
        fontSize: 14,
        color: COLORS.primary,
        marginTop: 4,
        textAlign: "center",
        fontWeight: "500",
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.black,
        marginBottom: 12,
    },
    placeTypeSection: {
        marginBottom: 24,
    },
    placeTypeContainer: {
        paddingVertical: 4,
    },
    placeTypeChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.lightGray,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 10,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
    },
    placeTypeChipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    placeTypeIcon: {
        marginRight: 6,
    },
    placeTypeLabel: {
        fontSize: 14,
        color: COLORS.gray,
        fontWeight: "500",
    },
    placeTypeLabelSelected: {
        color: COLORS.white,
    },
    nicknameSection: {
        marginBottom: 24,
    },
    nicknameLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.black,
        marginBottom: 12,
    },
    nicknameInput: {
        backgroundColor: COLORS.lightGray,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.black,
    },
    alertSection: {
        marginBottom: 32,
        backgroundColor: COLORS.lightGray,
        borderRadius: 16,
        padding: 4,
    },
    alertItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.05)",
    },
    alertTextWrapper: {
        flex: 1,
        marginRight: 12,
    },
    alertTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.black,
    },
    alertSubtitle: {
        fontSize: 13,
        color: COLORS.gray,
        marginTop: 2,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 30,
        height: 56,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButton: {
        marginBottom: 12,
    },
    primaryButtonDisabled: {
        opacity: 0.6,
        shadowOpacity: 0,
    },
    primaryButtonText: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.white,
    },
    missingCircleOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        zIndex: 100,
    },
    missingCircleTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.black,
        marginBottom: 8,
        textAlign: "center",
    },
    missingCircleSubtitle: {
        fontSize: 16,
        color: COLORS.gray,
        textAlign: "center",
        maxWidth: "80%",
    },
});

export default AddPlaceModal;

