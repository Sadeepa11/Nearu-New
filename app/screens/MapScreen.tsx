import AsyncStorage from "@react-native-async-storage/async-storage";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
// import * as TaskManager from "expo-task-manager"; // Removed
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  AppStateStatus,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import MapView, { Circle, Marker, Polyline, UrlTile } from "react-native-maps";

import { isBackgroundLocationRunning, startBackgroundLocation, stopBackgroundLocation } from "../../services/BackgroundLocationService";
import { useAlert } from "../context/AlertContext";
import { useSpeed } from "../context/SpeedContext";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Svg, {
  Defs,
  FeBlend,
  FeColorMatrix,
  FeFlood,
  FeGaussianBlur,
  FeMorphology,
  FeOffset,
  Filter,
  G,
  Mask,
  Path,
  Rect
} from "react-native-svg";


import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- Components & Utils ---
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { NotificationToast } from "../../components/NotificationToast";
import { NotificationItem, NotificationService } from "../../services/NotificationService";
import { API_BASE_URL, authenticatedFetch, logout, storeTokens, updateUserProfile } from "../../utils/auth";
import {
  readBatteryLevel,
  sendBatteryLevel,
  sendBatteryLevelValue,
  sendLowBatteryAlert,
  watchBatteryLevel
} from "../../utils/battery";
import { formatToSLTime } from "../../utils/dateHelpers";
import { storeLastKnownLocation } from "../../utils/locationCache";
import { setNotificationReceptionEnabled } from "../../utils/notificationListeners";
import { requestNotificationPermissions } from "../../utils/permissions";
import NotificationIcon from "../components/icons/NotificationIcon";
import StartupLoading from "../components/StartupLoading";

// --- Custom Modals ---

import {
  AssignedLocationDetails,
  AssignedLocationRecord,
  BatteryLevelInfo,
  CircleData,
  CircleMember,
  LocationHistoryEntry,
  LocationHistoryFilterKey,
  LocationPoint,
  MemberLocationOption,
  UserLocation,
} from "../types/models";
// --- Custom Modals ---
import { LocationMarker, MemberMarker } from "../components/MapMarkers";
import AccountModal from "../components/modals/AccountModal";
import AddPeopleModal from "../components/modals/AddPeopleModal";
import AddPlaceModal from "../components/modals/AddPlaceModal";
import CircleManagementModal from "../components/modals/CircleManagementModal";
import CirclesModal from "../components/modals/CirclesModal";
import DriveDetectionModal from "../components/modals/DriveDetectionModal";
import EditCircleNameModal from "../components/modals/EditCircleNameModal";
import LocationSharingModal from "../components/modals/LocationSharingModal";
import MemberJourneysModal from "../components/modals/MemberJourneysModal";
import MyRoleModal from "../components/modals/MyRoleModal";
import NotificationsModal from "../components/modals/NotificationsModal";
import SettingsModal from "../components/modals/SettingsModal";
import SmartNotificationModal from "../components/modals/SmartNotificationModal";
import SosModal from "../components/modals/SosModal";
import { CreateCircleModal, JoinCircleModal } from "./CreateJoinModals";



// const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
// --- Modal Components ---

// --- SVG Icons ---
const CheckInIcon = () => (
  <Svg width="54" height="54" viewBox="0 0 64 64" fill="none">
    <G filter="url(#filter0_d_288_2663)">
      <Rect x="11" y="9" width="42" height="42" rx="21" fill="#C6D8FF" />
    </G>
    <Path
      d="M32 19.7998C36.5553 19.7998 40.2002 23.3754 40.2002 27.75C40.2002 29.7603 39.6077 31.6503 38.5127 33.3701L38.5117 33.3711C37.9272 34.2923 37.2467 35.1543 36.5342 36.0527C35.8306 36.94 35.0944 37.8648 34.4521 38.8662C33.8217 39.8443 33.3677 40.754 32.9004 41.7754C32.8049 41.9718 32.707 42.2182 32.6318 42.3955C32.547 42.5957 32.4696 42.7629 32.3848 42.9004C32.2211 43.1656 32.1149 43.2002 32 43.2002C31.8851 43.2002 31.7789 43.1656 31.6152 42.9004C31.5304 42.7629 31.453 42.5957 31.3682 42.3955C31.3306 42.3069 31.2869 42.2011 31.2412 42.0928L31.0996 41.7754C30.6323 40.754 30.1783 39.8443 29.5479 38.8662C28.9056 37.8648 28.1694 36.94 27.4658 36.0527C26.7533 35.1543 26.0728 34.2923 25.4883 33.3711L25.4873 33.3701C24.3923 31.6503 23.7998 29.7603 23.7998 27.75C23.7998 23.3754 27.4447 19.7998 32 19.7998Z"
      stroke="#113C9C"
      strokeWidth="1.6"
    />
    <Path
      d="M32 33V25M28 29H36"
      stroke="#113C9C"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Defs>
      <Filter id="filter0_d_288_2663" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
        <FeFlood floodOpacity="0" result="BackgroundImageFix" />
        <FeColorMatrix
          in="SourceAlpha"
          type="matrix"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          result="hardAlpha"
        />
        <FeMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_288_2663" />
        <FeOffset dy="2" />
        <FeGaussianBlur stdDeviation="5" />
        <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
        <FeBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_288_2663" />
        <FeBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_288_2663" result="shape" />
      </Filter>
    </Defs>
  </Svg>
);


const SosIcon = () => (
  <Svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <G filter="url(#filter0_d_288_2667)">
      <Rect x="11" y="9" width="42" height="42" rx="21" fill="#FB3748" />
    </G>
    <Path d="M32.8182 37H31.1818C30.5818 37 30.0909 37.4909 30.0909 38.0909V41.3636C30.0909 41.9636 30.5818 42.4545 31.1818 42.4545H32.8182C33.4182 42.4545 33.9091 41.9636 33.9091 41.3636V38.0909C33.9091 37.4909 33.4182 37 32.8182 37ZM32.8182 41.3636H31.1818V38.0909H32.8182V41.3636ZM26 41.3636H28.1818V40.2727H27.0909C26.4909 40.2727 26 39.7818 26 39.1818V38.0909C26 37.4909 26.4909 37 27.0909 37H29.2727V38.0909H27.0909V39.1818H28.1818C28.7818 39.1818 29.2727 39.6727 29.2727 40.2727V41.3636C29.2727 41.9636 28.7818 42.4545 28.1818 42.4545H26V41.3636ZM34.7273 41.3636H36.9091V40.2727H35.8182C35.2182 40.2727 34.7273 39.7818 34.7273 39.1818V38.0909C34.7273 37.4909 35.2182 37 35.8182 37H38V38.0909H35.8182V39.1818H36.9091C37.5091 39.1818 38 39.6727 38 40.2727V41.3636C38 41.9636 37.5091 42.4545 36.9091 42.4545H34.7273V41.3636Z" fill="white" />
    <Path d="M33.45 34.475C33.0667 34.8583 32.5917 35.05 32.025 35.05C31.4583 35.05 30.9833 34.8583 30.6 34.475L22.575 26.45C22.1917 26.0667 22 25.5917 22 25.025C22 24.4583 22.1917 23.9833 22.575 23.6L30.6 15.575C30.9833 15.1917 31.4583 15 32.025 15C32.5917 15 33.0667 15.1917 33.45 15.575L41.475 23.6C41.8583 23.9833 42.05 24.4583 42.05 25.025C42.05 25.5917 41.8583 26.0667 41.475 26.45L33.45 34.475ZM32.025 33.05L40.05 25.025L32.025 17L24 25.025L32.025 33.05ZM31.025 26.025H33.025V20.025H31.025V26.025ZM32.025 29.025C32.3083 29.025 32.546 28.929 32.738 28.737C32.9293 28.5457 33.025 28.3083 33.025 28.025C33.025 27.7417 32.9293 27.504 32.738 27.312C32.546 27.1207 32.3083 27.025 32.025 27.025C31.7417 27.025 31.5043 27.1207 31.313 27.312C31.121 27.504 31.025 27.7417 31.025 28.025C31.025 28.3083 31.121 28.5457 31.313 28.737C31.5043 28.929 31.7417 29.025 32.025 29.025Z" fill="white" />
    <Defs>
      <Filter id="filter0_d_288_2667" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
        <FeFlood floodOpacity="0" result="BackgroundImageFix" />
        <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
        <FeMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_288_2667" />
        <FeOffset dy="2" />
        <FeGaussianBlur stdDeviation="5" />
        <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
        <FeBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_288_2667" />
        <FeBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_288_2667" result="shape" />
      </Filter>
    </Defs>
  </Svg>
);

const MyLocationIcon = () => (
  <Svg width="21" height="21" viewBox="0 0 21 21" fill="none">
    <Path d="M1.75 10.5C1.75 15.3325 5.66751 19.25 10.5 19.25V17.7188C6.51319 17.7188 3.28125 14.4868 3.28125 10.5H1.75ZM10.5 19.25C15.3325 19.25 19.25 15.3325 19.25 10.5H17.7188C17.7188 14.4868 14.4868 17.7188 10.5 17.7188V19.25ZM19.25 10.5C19.25 5.66751 15.3325 1.75 10.5 1.75V3.28125C14.4868 3.28125 17.7188 6.51319 17.7188 10.5H19.25ZM10.5 1.75C5.66751 1.75 1.75 5.66751 1.75 10.5H3.28125C3.28125 6.51319 6.51319 3.28125 10.5 3.28125V1.75Z" fill="#113C9C" />
    <Path d="M18.7022 10.6124H20.5H18.7022ZM10.3876 18.7022V20.5V18.7022ZM0.5 10.6124H2.29775H0.5ZM10.3876 0.5V2.29775V0.5Z" fill="#113C9C" />
    <Path d="M18.7022 10.6124H20.5M10.3876 18.7022V20.5M0.5 10.6124H2.29775M10.3876 0.5V2.29775" stroke="#113C9C" strokeLinecap="round" />
    <Mask id="path-4-inside-1_288_236" fill="white">
      <Path d="M15.5 10.5C15.5 13.2614 13.2614 15.5 10.5 15.5V13.6579C12.2441 13.6579 13.6579 12.2441 13.6579 10.5H15.5ZM10.5 15.5C7.73858 15.5 5.5 13.2614 5.5 10.5H7.34211C7.34211 12.2441 8.75595 13.6579 10.5 13.6579V15.5ZM5.5 10.5C5.5 7.73858 7.73858 5.5 10.5 5.5V7.34211C8.75595 7.34211 7.34211 8.75595 7.34211 10.5H5.5ZM10.5 5.5C13.2614 5.5 15.5 7.73858 15.5 10.5H13.6579C13.6579 8.75595 12.2441 7.34211 10.5 7.34211V5.5Z" />
    </Mask>
    <Path d="M15.5 10.5C15.5 13.2614 13.2614 15.5 10.5 15.5V13.6579C12.2441 13.6579 13.6579 12.2441 13.6579 10.5H15.5ZM10.5 15.5C7.73858 15.5 5.5 13.2614 5.5 10.5H7.34211C7.34211 12.2441 8.75595 13.6579 10.5 13.6579V15.5ZM5.5 10.5C5.5 7.73858 7.73858 5.5 10.5 5.5V7.34211C8.75595 7.34211 7.34211 8.75595 7.34211 10.5H5.5ZM10.5 5.5C13.2614 5.5 15.5 7.73858 15.5 10.5H13.6579C13.6579 8.75595 12.2441 7.34211 10.5 7.34211V5.5Z" fill="#113C9C" />
    <Path d="M10.5 15.5H12.5V13.6579H10.5H8.5V15.5H10.5ZM13.6579 10.5V12.5H15.5V10.5V8.5H13.6579V10.5ZM5.5 10.5V12.5H7.34211V10.5V8.5H5.5V10.5ZM10.5 5.5H8.5V7.34211H10.5H12.5V5.5H10.5ZM15.5 10.5H11.5C11.5 11.0523 11.0523 11.5 10.5 11.5V15.5V19.5C15.4706 19.5 19.5 15.4706 19.5 10.5H15.5ZM10.5 13.6579V17.6579C14.4532 17.6579 17.6579 14.4532 17.6579 10.5H13.6579H9.6579C9.6579 10.0349 10.0349 9.6579 10.5 9.6579V13.6579ZM10.5 15.5V11.5C9.94772 11.5 9.5 11.0523 9.5 10.5H5.5H1.5C1.5 15.4706 5.52944 19.5 10.5 19.5V15.5ZM7.34211 10.5H3.34211C3.34211 14.4532 6.54681 17.6579 10.5 17.6579V13.6579V9.6579C10.9651 9.6579 11.3421 10.0349 11.3421 10.5H7.34211ZM5.5 10.5H9.5C9.5 9.94772 9.94772 9.5 10.5 9.5V5.5V1.5C5.52944 1.5 1.5 5.52944 1.5 10.5H5.5ZM10.5 7.34211V3.34211C6.54681 3.34211 3.34211 6.54681 3.34211 10.5H7.34211H11.3421C11.3421 10.9651 10.9651 11.3421 10.5 11.3421V7.34211ZM10.5 5.5V9.5C11.0523 9.5 11.5 9.94772 11.5 10.5H15.5H19.5C19.5 5.52944 15.4706 1.5 10.5 1.5V5.5ZM13.6579 10.5H17.6579C17.6579 6.54681 14.4532 3.34211 10.5 3.34211V7.34211V11.3421C10.0349 11.3421 9.6579 10.9651 9.6579 10.5H13.6579Z" fill="#113C9C" mask="url(#path-4-inside-1_288_236)" />
  </Svg>
);

// --- Enums & Types for Circle Notifications ---
export enum NotificationType {
  LOCATION_REACHED = "location_reached", // Location arrived
  LOCATION_LEFT = "location_left", // Departed from location
  INVITE = "invite",
  MEMBERSHIP_ACCEPTED = "membership_accepted", // Join
  MEMBERSHIP_REJECTED = "membership_rejected",
  MEMBER_REMOVED = "member_removed", // Remove
  ROLE_UPDATED = "role_updated", // Change user role
  NICKNAME_UPDATED = "nickname_updated",
  LOCATION_ADDED = "location_added", // Location add to circle
  LOCATION_REMOVED = "location_removed", // Location remove from circle
  LOCATION_ASSIGNED = "location_assigned", // Assign location
  LOCATION_UNASSIGNED = "location_unassigned", // Unassign location
  CRASH_DETECTED = "crash_detected", // App crash
  SOS_ALERT = "sos_alert",
  LOW_BATTERY = "low_battery",
}

export enum NotificationRecipientType {
  ALL_MEMBERS = "all_members",
  CREATOR_AND_ADMINS = "creator_and_admins",
  TRIGGERING_USER_ONLY = "triggering_user_only",
  NONE = "none",
}

export interface CircleNotificationSettings {
  [key: string]: NotificationRecipientType;
}


// Helper: split array into chunks of 2
function splitIntoJourneys(history: LocationHistoryEntry[]): LocationHistoryEntry[][] {
  const journeys: LocationHistoryEntry[][] = [];
  for (let i = 0; i < history.length; i += 2) {
    journeys.push(history.slice(i, i + 2));
  }
  return journeys;
}





// --- Constants ---
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const TOP_HEADER_HEIGHT = 60;
const TAB_BAR_HEIGHT = 85;
const HANDLE_HEIGHT = 30;

const MAX_HEIGHT = SCREEN_HEIGHT * 0.75;
const MIN_HEIGHT = TAB_BAR_HEIGHT + HANDLE_HEIGHT;
const MID_HEIGHT = MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) / 2;
const INITIAL_SHEET_HEIGHT = MID_HEIGHT;

const COLORS = {
  primary: "#113C9C",
  accent: "#EF4444",
  white: "#FFFFFF",
  black: "#1A1A1A",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
  success: "#22C55E",
};

const STORAGE_KEYS = {
  lastSelectedCircleId: "mapScreen:lastSelectedCircleId",
  locationSharingEnabled: "user_location_sharing_enabled",
  notificationsEnabled: "user_notifications_enabled",
  mapStyle: "user_map_style",
};

const BACKGROUND_LOCATION_TASK_NAME = "circle-location-background-task";
const LAST_POSTED_LOCATION_STORAGE_KEY = "mapScreen:lastPostedPerCircle";
const isNativePlatform = Platform.OS === "ios" || Platform.OS === "android";
const CIRCLE_LOCATIONS_CACHE_KEY = "mapScreen:circleLocationsCache";
const LOCATION_PRESENCE_STORAGE_KEY = "mapScreen:locationPresenceCache";
const DEFAULT_LOCATION_RADIUS_METERS = 20;
const ASSIGNED_LOCATION_STROKE_COLOR = "rgba(79, 53, 155, 0.6)";
const ASSIGNED_LOCATION_FILL_COLOR = "rgba(79, 53, 155, 0.18)";
const USER_ACCURACY_STROKE_COLOR = "rgba(79, 70, 229, 0.35)";
const USER_ACCURACY_FILL_COLOR = "rgba(129, 140, 248, 0.14)";
const MAX_USER_ACCURACY_RADIUS = 250;
const MIN_CIRCLE_REFRESH_INTERVAL_MS = 4000;
const MIN_ASSIGNED_REFRESH_INTERVAL_MS = 4000;
const MIN_MEMBER_REFRESH_INTERVAL_MS = 3000;
const WEBP_MIME_TYPE = "image/webp";
const BATTERY_SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;
const LOW_BATTERY_THRESHOLD = 20;
const LOCATION_HISTORY_LIMIT = 100; // Limit for history items per fetch

// Google Maps API Key directly from app.json/config or hardcoded if necessary for reliability in this context
// In a real app, use Constants.expoConfig or similar, but for immediate stability we use the key found in app.json.
// Google Maps API Key removed as we migrated to OSM/Nominatim/OSRM.
// If needed for other features, add back here.
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";




const parseBooleanPreference = (value: string | null | undefined, fallback: boolean): boolean => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
};

const ensureWebpFileName = (name: string): string => {
  const trimmed = name ? name.trim() : "";
  if (!trimmed) {
    return `avatar_${Date.now()}.webp`;
  }
  const normalized = trimmed.replace(/\s+/g, "_");
  const dotIndex = normalized.lastIndexOf(".");
  const base = dotIndex >= 0 ? normalized.slice(0, dotIndex) : normalized;
  return `${base}.webp`;
};

const isWebpResource = (uri: string, mimeType?: string | null): boolean => {
  const loweredMime = mimeType?.toLowerCase() ?? null;
  if (loweredMime && (loweredMime === WEBP_MIME_TYPE || loweredMime.endsWith("+webp"))) {
    return true;
  }
  const normalizedUri = uri?.toLowerCase?.() ?? "";
  if (!normalizedUri) {
    return false;
  }
  const [pathWithoutQuery] = normalizedUri.split("?");
  return pathWithoutQuery.endsWith(".webp");
};

const prepareImageAsWebp = async (uri: string, name: string, mimeType: string): Promise<PickedImage> => {
  const targetName = ensureWebpFileName(name);

  if (isWebpResource(uri, mimeType)) {
    return {
      uri,
      name: targetName,
      type: WEBP_MIME_TYPE,
    };
  }

  const manipulated = await manipulateAsync(
    uri,
    [],
    {
      compress: 0.9,
      format: SaveFormat.WEBP,
    }
  );

  return {
    uri: manipulated.uri,
    name: targetName,
    type: WEBP_MIME_TYPE,
  };
};

const normalizeIdentifier = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveMembershipLocationId = (member: CircleMember | null | undefined): string | null => {
  if (!member) return null;
  const membership = (member as any)?.Membership ?? {};

  const locIdCandidates = [
    membership.locationId,
    membership.LocationId,
    membership.location_id,
    membership.specialLocationId,
    membership.assignedLocationId,
    (member as any).locationId,
    (member as any).LocationId,
  ];

  for (const candidate of locIdCandidates) {
    const normalized = normalizeIdentifier(candidate);
    if (normalized) return normalized;
  }
  return null;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

type StoredLocationSnapshot = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

const readLastPostedLocationMap = async (): Promise<Record<string, StoredLocationSnapshot>> => {
  try {
    const raw = await AsyncStorage.getItem(LAST_POSTED_LOCATION_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, StoredLocationSnapshot>;
    }
  } catch (error) {
    console.warn("Failed to read cached location updates", error);
  }

  return {};
};

const writeLastPostedLocationMap = async (map: Record<string, StoredLocationSnapshot>) => {
  const mapKeys = Object.keys(map);
  if (!mapKeys.length) {
    await AsyncStorage.removeItem(LAST_POSTED_LOCATION_STORAGE_KEY).catch(() => undefined);
    return;
  }

  await AsyncStorage.setItem(LAST_POSTED_LOCATION_STORAGE_KEY, JSON.stringify(map)).catch(() => undefined);
};

const getLastPostedLocationForCircle = async (circleId: string): Promise<StoredLocationSnapshot | null> => {
  const map = await readLastPostedLocationMap();
  return map[circleId] ?? null;
};

const setLastPostedLocationForCircle = async (
  circleId: string,
  coords: { latitude: number; longitude: number }
) => {
  const map = await readLastPostedLocationMap();
  map[circleId] = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    timestamp: Date.now(),
  };
  await writeLastPostedLocationMap(map);
};



const handleCreateCircleAction = async (name: string, relationship?: string): Promise<any> => {
  const body: any = {
    name: name.trim(),
    location: { latitude: 0, longitude: 0, name: "Default" },
  };

  if (relationship) {
    body.relationship = relationship;
  }

  const response = await authenticatedFetch(`${API_BASE_URL}/circles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to create circle");
  }

  return await response.json();
};

const handleUpdateCircleNameAction = async (circleId: any, name: string): Promise<void> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/circles/${circleId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ name: name.trim() }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to update circle name");
  }
};

const handleJoinCircleAction = async (pin: string): Promise<any> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/circles/join-by-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ code: pin.toUpperCase().trim() }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Invalid or expired code.");
  }

  return await response.json();
};

const removeLastPostedLocationForCircle = async (circleId: string) => {
  const map = await readLastPostedLocationMap();
  if (map[circleId]) {
    delete map[circleId];
    await writeLastPostedLocationMap(map);
  }
};

const clearAllPostedLocations = async (): Promise<void> => {
  await AsyncStorage.removeItem(LAST_POSTED_LOCATION_STORAGE_KEY).catch(() => undefined);
};


const getLocationNameFromOSM = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NearuApp/1.0'
      }
    });
    const data = await response.json();

    if (data && data.display_name) {
      return data.display_name;
    } else {
      console.warn("Nominatim reverse geocoding returned no display_name");
      return "Unknown Location";
    }
  } catch (error) {
    console.warn("Error fetching location name from OSM:", error);
    return "Unknown Location";
  }
};

interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  status?: string;
}

const maybePostCircleLocationUpdate = async (
  circleIdLike: unknown,
  coords: LocationUpdatePayload
): Promise<{ success: boolean; name: string | null }> => {
  const circleId = normalizeIdentifier(circleIdLike);
  if (!circleId) {
    return { success: false, name: null };
  }

  const { latitude, longitude } = coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { success: false, name: null };
  }

  // Removed distance filter to ensure strict 30s frequency

  // Check location sharing preference
  const sharingEnabled = await AsyncStorage.getItem(STORAGE_KEYS.locationSharingEnabled);
  if (sharingEnabled !== null && sharingEnabled !== "true") {
    console.log("Location sharing is disabled, skipping update.");
    return { success: false, name: null };
  }

  // Throttle updates to prevent duplicate calls (5-second window)
  const lastPosted = await getLastPostedLocationForCircle(circleId);
  if (lastPosted && Date.now() - lastPosted.timestamp < 5000) {
    console.log("Throttled: Skipping location update as it has been less than 5s.");
    // Return mock success so the caller thinks it went through and won't aggressively retry
    return { success: true, name: "Throttled" };
  }

  // Allow 'active' and 'inactive' (iOS partially covered).
  // Background updates should be handled solely by BackgroundLocationService.ts
  if (AppState.currentState === 'background') {
    console.log("App is in background. Skipping MapScreen sync to let background service handle it.");
    return { success: false, name: "Background" };
  }

  // Fetch real location name
  const realLocationName = await getLocationNameFromOSM(latitude, longitude);

  // Check drive detection setting
  const isDriveDetectionEnabled = (await AsyncStorage.getItem("user_drive_detection_enabled")) === "true";

  const response = await authenticatedFetch(`${API_BASE_URL}/profile/circles/${circleId}/location`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      latitude,
      longitude,
      name: realLocationName,
      metadata: {
        speed: isDriveDetectionEnabled ? String(coords.speed) : "0"
      },
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message ?? "Failed to post location update.");
  }

  await setLastPostedLocationForCircle(circleId, { latitude, longitude });
  return { success: true, name: realLocationName };
};

// Background task registration moved to services/BackgroundLocationService.ts
// const registerBackgroundLocationTask = ... removed



type CachedCircleLocation = {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  name?: string;
  metadata?: Record<string, unknown> | null;
};

type CachedCircleLocationMap = Record<string, CachedCircleLocation[]>;
type LocationPresenceMap = Record<string, Record<string, boolean>>;

const coerceFiniteNumber = (value: unknown): number | null => {
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

const extractRadiusFromMetadata = (metadata: LocationPoint["metadata"] | null | undefined): number | null => {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const metadataRecord = metadata as Record<string, unknown>;
  const candidates: unknown[] = [
    metadataRecord.radius,
    metadataRecord.Radius,
    (metadataRecord as any)?.geofenceRadius,
    (metadataRecord as any)?.geofence_radius,
    (metadataRecord as any)?.geofence?.radius,
  ];

  for (const candidate of candidates) {
    const numeric = coerceFiniteNumber(candidate);
    if (numeric !== null) {
      return numeric;
    }
    if (candidate && typeof candidate === "object") {
      const nestedRadius = coerceFiniteNumber((candidate as any)?.radius);
      if (nestedRadius !== null) {
        return nestedRadius;
      }
    }
  }

  return null;
};

const getRadiusForLocation = (
  location: LocationPoint,
  fallbackRadius: number = DEFAULT_LOCATION_RADIUS_METERS
): number => {
  const directRadius = coerceFiniteNumber((location as any)?.radius);
  if (directRadius !== null) {
    return directRadius;
  }

  const metadataRadius = extractRadiusFromMetadata(location.metadata);
  if (metadataRadius !== null) {
    return metadataRadius;
  }

  return fallbackRadius;
};

const sanitizeLocationForCache = (
  location: LocationPoint,
  fallbackRadius: number = DEFAULT_LOCATION_RADIUS_METERS
): CachedCircleLocation | null => {
  const id = normalizeIdentifier(location.id);
  if (!id) {
    return null;
  }

  if (!isValidCoordinate(location.latitude, location.longitude)) {
    return null;
  }

  const radius = getRadiusForLocation(location, fallbackRadius);
  const name =
    typeof location.name === "string" && location.name.trim().length > 0
      ? location.name.trim()
      : undefined;

  return {
    id,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    radius,
    name,
    metadata: location.metadata && typeof location.metadata === "object" ? { ...location.metadata } : null,
  };
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
    case 'center': return 'location';
    default: return 'location-sharp';
  }
};

const readCircleLocationsCache = async (): Promise<CachedCircleLocationMap> => {
  try {
    const raw = await AsyncStorage.getItem(CIRCLE_LOCATIONS_CACHE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as CachedCircleLocationMap;
    }
  } catch (error) {
    console.warn("Failed to read circle locations cache", error);
  }
  return {};
};

const writeCircleLocationsCache = async (map: CachedCircleLocationMap): Promise<void> => {
  const hasEntries = Object.values(map).some((locations) => locations.length > 0);
  if (!hasEntries) {
    await AsyncStorage.removeItem(CIRCLE_LOCATIONS_CACHE_KEY).catch(() => undefined);
    return;
  }

  await AsyncStorage.setItem(CIRCLE_LOCATIONS_CACHE_KEY, JSON.stringify(map)).catch(() => undefined);
};

const readCachedCircleLocations = async (circleId: string): Promise<CachedCircleLocation[]> => {
  const map = await readCircleLocationsCache();
  return map[circleId] ?? [];
};

const cacheCircleLocations = async (
  circleId: string,
  locations: LocationPoint[],
  fallbackRadius: number = DEFAULT_LOCATION_RADIUS_METERS
): Promise<CachedCircleLocation[]> => {
  const sanitized = locations
    .map((location) => sanitizeLocationForCache(location, fallbackRadius))
    .filter((location): location is CachedCircleLocation => location !== null);

  const map = await readCircleLocationsCache();
  if (sanitized.length > 0) {
    map[circleId] = sanitized;
  } else {
    delete map[circleId];
  }

  await writeCircleLocationsCache(map);
  return sanitized;
};

const removeCachedCircleLocations = async (circleId: string): Promise<void> => {
  const map = await readCircleLocationsCache();
  if (!map[circleId]) {
    return;
  }

  delete map[circleId];
  await writeCircleLocationsCache(map);
};

const clearCircleLocationsCache = async (): Promise<void> => {
  await AsyncStorage.removeItem(CIRCLE_LOCATIONS_CACHE_KEY).catch(() => undefined);
};

const readLocationPresenceMap = async (): Promise<LocationPresenceMap> => {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_PRESENCE_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as LocationPresenceMap;
    }
  } catch (error) {
    console.warn("Failed to read location presence map", error);
  }
  return {};
};

const writeLocationPresenceMap = async (map: LocationPresenceMap): Promise<void> => {
  const hasEntries = Object.values(map).some((circle) => Object.keys(circle).length > 0);
  if (!hasEntries) {
    await AsyncStorage.removeItem(LOCATION_PRESENCE_STORAGE_KEY).catch(() => undefined);
    return;
  }

  await AsyncStorage.setItem(LOCATION_PRESENCE_STORAGE_KEY, JSON.stringify(map)).catch(() => undefined);
};

const clearLocationPresenceMap = async (): Promise<void> => {
  await AsyncStorage.removeItem(LOCATION_PRESENCE_STORAGE_KEY).catch(() => undefined);
};


const markCircleLocationReached = async (
  circleId: string,
  locationId: string,
  coords: LocationUpdatePayload
): Promise<void> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/circles/${circleId}/mark-location-reached`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      locationId,
      latitude: coords.latitude,
      longitude: coords.longitude,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message ?? "Failed to notify members that the location was reached.");
  }
};

const markCircleLocationLeft = async (circleId: string, locationId: string): Promise<void> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/circles/${circleId}/mark-location-left`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      locationId,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message ?? "Failed to notify members that the location was left.");
  }
};

type PresenceSnapshot = Record<string, boolean>;

interface PresenceTransitions {
  validIds: Set<string>;
  entered: CachedCircleLocation[];
  exited: CachedCircleLocation[];
}

const computePresenceTransitions = (
  locations: CachedCircleLocation[],
  coords: LocationUpdatePayload,
  snapshot: PresenceSnapshot
): PresenceTransitions => {
  const validIds = new Set<string>();
  const entered: CachedCircleLocation[] = [];
  const exited: CachedCircleLocation[] = [];

  for (const location of locations) {
    validIds.add(location.id);

    const distance = haversineDistanceMeters(
      coords.latitude,
      coords.longitude,
      location.latitude,
      location.longitude
    );

    const isInside = distance <= location.radius;
    const previouslyInside = snapshot[location.id] ?? false;

    if (isInside && !previouslyInside) {
      entered.push(location);
    } else if (!isInside && previouslyInside) {
      exited.push(location);
    }
  }

  return {
    validIds,
    entered,
    exited,
  };
};

const prunePresenceSnapshot = (snapshot: PresenceSnapshot, validIds: Set<string>): boolean => {
  let changed = false;
  for (const locationId of Object.keys(snapshot)) {
    if (!validIds.has(locationId)) {
      delete snapshot[locationId];
      changed = true;
    }
  }
  return changed;
};

const notifyLocationEntries = async (
  circleId: string,
  entered: CachedCircleLocation[],
  coords: LocationUpdatePayload,
  snapshot: PresenceSnapshot
): Promise<CachedCircleLocation[]> => {
  const processed: CachedCircleLocation[] = [];
  for (const location of entered) {
    try {
      // Check metadata for arrival notification toggle
      const notifyArrival = location.metadata?.notifyOnArrival !== false;

      if (notifyArrival) {
        await markCircleLocationReached(circleId, location.id, coords);
      } else {
        console.log(`Skipping arrival alert for ${location.name || location.id} (disabled in metadata)`);
      }

      snapshot[location.id] = true;
      processed.push(location);
    } catch (error) {
      console.warn("Failed to mark location reached", error);
    }
  }
  return processed;
};

const notifyLocationExits = async (
  circleId: string,
  exited: CachedCircleLocation[],
  snapshot: PresenceSnapshot
): Promise<boolean> => {
  let changed = false;
  for (const location of exited) {
    try {
      // Check metadata for departure notification toggle
      const notifyDeparture = location.metadata?.notifyOnDeparture !== false;

      if (notifyDeparture) {
        await markCircleLocationLeft(circleId, location.id);
      } else {
        console.log(`Skipping departure alert for ${location.name || location.id} (disabled in metadata)`);
      }

      snapshot[location.id] = false;
      changed = true;
    } catch (error) {
      console.warn("Failed to mark location left", error);
    }
  }
  return changed;
};

const handleLocationPresence = async (
  circleId: string,
  coords: LocationUpdatePayload,
  candidateLocations?: LocationPoint[]
): Promise<CachedCircleLocation[]> => {
  let locations: CachedCircleLocation[] = [];

  if (candidateLocations?.length) {
    locations = candidateLocations
      .map((loc) => sanitizeLocationForCache(loc))
      .filter((loc): loc is CachedCircleLocation => loc !== null);
  }

  if (!locations.length) {
    locations = await readCachedCircleLocations(circleId);
  }

  if (!locations.length) {
    return [];
  }

  const presenceMap = await readLocationPresenceMap();
  const circlePresenceSnapshot: PresenceSnapshot = { ...presenceMap[circleId] };

  const { validIds, entered, exited } = computePresenceTransitions(locations, coords, circlePresenceSnapshot);

  let hasChanges = prunePresenceSnapshot(circlePresenceSnapshot, validIds);
  const processedEntries = await notifyLocationEntries(circleId, entered, coords, circlePresenceSnapshot);
  const entriesChanged = processedEntries.length > 0;
  const exitsChanged = await notifyLocationExits(circleId, exited, circlePresenceSnapshot);

  hasChanges = hasChanges || entriesChanged || exitsChanged;

  if (hasChanges) {
    const cleanedEntries = Object.fromEntries(
      Object.entries(circlePresenceSnapshot).filter(([, inside]) => inside)
    );

    if (Object.keys(cleanedEntries).length > 0) {
      presenceMap[circleId] = cleanedEntries;
    } else {
      delete presenceMap[circleId];
    }

    await writeLocationPresenceMap(presenceMap);
  }
  return processedEntries;
};

const processCircleLocationUpdate = async (
  circleIdLike: unknown,
  coords: LocationUpdatePayload,
  candidateLocations?: LocationPoint[],
  options?: { onLocationsArrived?: (arrived: CachedCircleLocation[]) => void }
): Promise<{ success: boolean; name: string | null }> => {
  const circleId = normalizeIdentifier(circleIdLike);
  if (!circleId) {
    return { success: false, name: null };
  }

  let arrivedLocations: CachedCircleLocation[] = [];
  try {
    arrivedLocations = await handleLocationPresence(circleId, coords, candidateLocations);
  } catch (error) {
    console.warn("Location presence handling failed", error);
  }

  if (arrivedLocations.length && options?.onLocationsArrived) {
    try {
      options.onLocationsArrived(arrivedLocations);
    } catch (callbackError) {
      console.warn("onLocationsArrived handler failed", callbackError);
    }
  }

  // --- Journey Logic ---
  // const now = Date.now();
  // const LAST_UPDATE_TIME_KEY = `journey_last_update_time_${circleId}`;

  // try {
  //   const lastUpdateStr = await AsyncStorage.getItem(LAST_UPDATE_TIME_KEY);
  //   const lastUpdateTime = lastUpdateStr ? parseInt(lastUpdateStr, 10) : 0;

  //   // 5 minutes = 5 * 60 * 1000 ms = 300000 ms
  //   if (lastUpdateTime > 0 && (now - lastUpdateTime) > 300000) {
  //     // It's been more than 5 mins since last update.
  //     // 1. Send "Journey End" for the PREVIOUS location (last known)
  //     const previousLoc = await getLastPostedLocationForCircle(circleId);
  //     if (previousLoc) {
  //       if (previousLoc) {
  //         await maybePostCircleLocationUpdate(circleId, {
  //           latitude: previousLoc.latitude,
  //           longitude: previousLoc.longitude,
  //           // Force journey_end status
  //           status: "journey_end",
  //           speed: 0
  //         });
  //       }

  //       // 2. Send "Journey Start" for CURRENT location
  //       await maybePostCircleLocationUpdate(circleId, { ...coords, status: "journey_start", speed: coords.speed ?? 0 });
  //     }

  //     await AsyncStorage.setItem(LAST_UPDATE_TIME_KEY, now.toString());
  //   }
  // } catch (jError) {
  //   console.warn("Journey logic failed", jError);
  // }
  // ---------------------

  return maybePostCircleLocationUpdate(circleId, coords);
};

const LOCATION_HISTORY_FILTERS: { key: LocationHistoryFilterKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

const DEFAULT_MEMBER_AVATAR = "https://i.pravatar.cc/120?u=";

const AVATAR_FIELD_KEYS = [
  "avatar",
  "Avatar",
  "profileImage",
  "profile_image",
  "profileImageUrl",
  "profile_image_url",
  "profileImageURL",
  "profilePicture",
  "profile_picture",
  "profilePic",
  "profile_pic",
  "photo",
  "photoUrl",
  "photo_url",
  "photoURL",
  "picture",
  "image",
  "imageUrl",
  "image_url",
  "imageURL",
];

const extractAvatarUrl = (source: any, visited = new WeakSet<object>()): string | null => {
  if (!source) {
    return null;
  }

  if (typeof source === "string") {
    const trimmed = source.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof source !== "object") {
    return null;
  }

  if (visited.has(source)) {
    return null;
  }
  visited.add(source);

  if (Array.isArray(source)) {
    for (const item of source) {
      const resolved = extractAvatarUrl(item, visited);
      if (resolved) {
        return resolved;
      }
    }
    return null;
  }

  const extractFromObject = (value: unknown): string | null => {
    if (!value) {
      return null;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    if (typeof value === "object") {
      const nested = value as Record<string, unknown>;
      const nestedKeys = ["url", "uri", "href", "source", "path"];
      for (const key of nestedKeys) {
        if (key in nested) {
          const resolved = extractFromObject(nested[key]);
          if (resolved) {
            return resolved;
          }
        }
      }
    }
    return null;
  };

  for (const key of AVATAR_FIELD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const resolved = extractFromObject((source as Record<string, unknown>)[key]);
      if (resolved) {
        return resolved;
      }
    }
  }

  const relatedObjects = [
    (source as Record<string, unknown>).profile,
    (source as Record<string, unknown>).user,
    (source as Record<string, unknown>).data,
    (source as Record<string, unknown>).attributes,
  ];

  for (const candidate of relatedObjects) {
    if (candidate && typeof candidate === "object") {
      const resolved = extractAvatarUrl(candidate, visited);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
};

const toDateAtMidnight = (date: Date): Date => {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
};

const toDateAtEndOfDay = (date: Date): Date => {
  const clone = new Date(date);
  clone.setHours(23, 59, 59, 999);
  return clone;
};

const startOfWeekLocal = (date: Date): Date => {
  const clone = new Date(date);
  const day = clone.getDay();
  const diff = (day === 0 ? 6 : day - 1); // start week on Monday
  clone.setDate(clone.getDate() - diff);
  return toDateAtMidnight(clone);
};

const startOfMonthLocal = (date: Date): Date => {
  const clone = new Date(date.getFullYear(), date.getMonth(), 1);
  return toDateAtMidnight(clone);
};

const parseDateInput = (value: string): Date | null => {
  if (!value) {
    return null;
  }
  const parts = value.trim().split("-");
  if (parts.length !== 3) {
    return null;
  }
  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  const result = new Date(year, month - 1, day);
  if (Number.isNaN(result.getTime())) {
    return null;
  }
  return result;
};

const calculateHeadingDegrees = (
  from: { latitude: number; longitude: number } | null,
  to: { latitude: number; longitude: number } | null
): number => {
  if (!from || !to) {
    return 0;
  }
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  const bearing = Math.atan2(y, x);
  const bearingDeg = (bearing * 180) / Math.PI;
  return (bearingDeg + 360) % 360;
};

// --- Helpers ---
const extractBatteryLevelInfo = (candidate: unknown): BatteryLevelInfo | null => {
  if (candidate === null || candidate === undefined) {
    return null;
  }

  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    const clamped = Math.max(0, Math.min(100, candidate));
    return {
      batteryLevel: clamped,
      deviceId: null,
      updatedAt: null,
    };
  }

  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      const clamped = Math.max(0, Math.min(100, parsed));
      return {
        batteryLevel: clamped,
        deviceId: null,
        updatedAt: null,
      };
    }
    try {
      const parsedJson = JSON.parse(trimmed);
      if (parsedJson && typeof parsedJson === "object") {
        return extractBatteryLevelInfo(parsedJson);
      }
    } catch {
      // ignore non-JSON strings
    }
    return null;
  }

  if (typeof candidate !== "object") {
    return null;
  }

  const record = candidate as Record<string, unknown>;

  const numericKeys = [
    "level",
    "batteryLevel",
    "battery_level",
    "percentage",
    "percent",
    "value",
    "charge",
    "battery",
    "current",
  ];

  for (const key of numericKeys) {
    if (!(key in record)) {
      continue;
    }
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      const clamped = Math.max(0, Math.min(100, value));
      const deviceId =
        asNonEmptyString(record.deviceId) ??
        asNonEmptyString(record.device_id) ??
        asNonEmptyString(record.device) ??
        asNonEmptyString(record.deviceName) ??
        asNonEmptyString(record.device_name) ??
        null;
      const updatedAt =
        asNonEmptyString(record.updatedAt) ??
        asNonEmptyString(record.updated_at) ??
        asNonEmptyString(record.timestamp) ??
        asNonEmptyString(record.updated) ??
        asNonEmptyString(record.lastUpdated) ??
        asNonEmptyString(record.last_updated) ??
        null;
      return {
        batteryLevel: clamped,
        deviceId,
        updatedAt,
      };
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        const parsed = Number(trimmed);
        if (Number.isFinite(parsed)) {
          const clamped = Math.max(0, Math.min(100, parsed));
          const deviceId =
            asNonEmptyString(record.deviceId) ??
            asNonEmptyString(record.device_id) ??
            asNonEmptyString(record.device) ??
            asNonEmptyString(record.deviceName) ??
            asNonEmptyString(record.device_name) ??
            null;
          const updatedAt =
            asNonEmptyString(record.updatedAt) ??
            asNonEmptyString(record.updated_at) ??
            asNonEmptyString(record.timestamp) ??
            asNonEmptyString(record.updated) ??
            asNonEmptyString(record.lastUpdated) ??
            asNonEmptyString(record.last_updated) ??
            null;
          return {
            batteryLevel: clamped,
            deviceId,
            updatedAt,
          };
        }
      }
    }
    if (value && typeof value === "object") {
      const nested = extractBatteryLevelInfo(value);
      if (nested) {
        return nested;
      }
    }
  }

  const nestedKeys = [
    "batteryLevel",
    "battery_level",
    "data",
    "payload",
    "info",
    "latest",
    "details",
  ];

  for (const key of nestedKeys) {
    const nestedCandidate = record[key];
    if (nestedCandidate && typeof nestedCandidate === "object" && nestedCandidate !== record) {
      const nested = extractBatteryLevelInfo(nestedCandidate);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
};
const extractCircleMembers = (circle: any): CircleMember[] => {
  if (!circle) {
    console.log("extractCircleMembers: No circle data provided");
    return [];
  }

  console.log("extractCircleMembers: Processing circle:", circle.id, circle.name);
  console.log("extractCircleMembers: Full circle object keys:", Object.keys(circle));

  // Check data.members[] first as this is where the API puts member data
  const candidateLists = [
    circle?.data?.members,      // PRIORITY: API returns members here
    circle?.data?.Members,
    circle?.members,
    circle?.Members,
    circle?.users,
    circle?.Users,
    circle?.param?.users,
    circle?.data?.users,
  ];

  console.log("extractCircleMembers: Checking candidate member lists...");
  candidateLists.forEach((list, index) => {
    if (Array.isArray(list)) {
      console.log(`extractCircleMembers: ✅ Found member list at index ${index} with ${list.length} members`);
      console.log(`extractCircleMembers: First member sample:`, list[0]);
    }
  });

  let rawMembers = candidateLists.find((value) => Array.isArray(value)) ?? [];

  if (!Array.isArray(rawMembers)) rawMembers = [];

  console.log(`extractCircleMembers: Initial rawMembers count: ${rawMembers.length}`);

  // --- FIX: Explicitly check for creator and add if missing ---
  const creator = circle?.creator ?? circle?.Creator ?? circle?.data?.creator;
  if (creator && typeof creator === "object") {
    console.log("extractCircleMembers: Found creator:", {
      id: creator.id,
      name: creator.name,
      hasLiveLocation: !!creator.liveLocation,
      hasBatteryLevel: !!creator.batteryLevel,
      liveLocation: creator.liveLocation,
      batteryLevel: creator.batteryLevel
    });

    const creatorId = creator.id ?? creator.userId ?? creator.UserId;
    if (creatorId) {
      const exists = rawMembers.some((m: any) => (m.id ?? m.userId) === creatorId);
      if (!exists) {
        console.log("extractCircleMembers: Adding creator to members list");
        // Normalize creator to look like a member
        const normalizedCreator = {
          ...creator,
          // Ensure liveLocation is preserved
          liveLocation: creator.liveLocation ?? creator.currentLocation ?? creator.location,
          // Ensure batteryLevel is preserved
          batteryLevel: creator.batteryLevel,
          // Creator typically has 'admin' or 'creator' role implicitly,
          // but we can mock a Membership object if missing
          Membership: creator.Membership ?? {
            role: creator.role ?? "creator",
            status: creator.status ?? "accepted",
            nickname: creator.name ?? creator.email,
          },
        };
        rawMembers = [normalizedCreator, ...rawMembers];
        console.log("extractCircleMembers: Creator added successfully");
      } else {
        console.log("extractCircleMembers: Creator already exists in members list");
      }
    } else {
      console.log("extractCircleMembers: Creator has no valid ID");
    }
  } else {
    console.log("extractCircleMembers: No creator found in circle data");
  }
  // ------------------------------------------------------------

  console.log(`extractCircleMembers: Total rawMembers before mapping: ${rawMembers.length}`);

  return rawMembers
    .filter(Boolean)
    .map((member: any, index: number) => {
      const memberId = member?.id ?? member?.userId ?? member?.UserId ?? undefined;
      const memberName = member?.name ?? member?.Name ?? "Unknown";

      console.log(`extractCircleMembers: Processing member ${index + 1}/${rawMembers.length}:`, {
        id: memberId,
        name: memberName,
        hasLiveLocation: !!member?.liveLocation,
        hasBatteryLevel: !!member?.batteryLevel,
        liveLocation: member?.liveLocation,
        batteryLevel: member?.batteryLevel,
        memberKeys: Object.keys(member || {})
      });

      // Log the full member object for the first member to see structure
      if (index === 0) {
        console.log("extractCircleMembers: Full first member object:", JSON.stringify(member, null, 2));
      }

      return {
        id: memberId,
        name: memberName,
        email: member?.email ?? member?.Email,

        // Avatar Fix: Check profileLink first, then direct string
        avatar:
          (() => {
            const raw = member?.profileLink ??
              member?.avatar ??
              extractAvatarUrl(member) ??
              extractAvatarUrl(member?.Membership) ??
              null;

            if (typeof raw === "string" && raw.trim().length > 0) {
              let cleaned = raw.trim();
              if (cleaned.startsWith("/")) {
                cleaned = `${API_BASE_URL}${cleaned}`;
              }
              return cleaned.replace("/api/uploads", "/uploads");
            }
            return raw;
          })(),

        // Battery Fix: Check nested object property first
        batteryLevel: (() => {
          // Debug Log
          if (member?.batteryLevel) {
            console.log(`[BatteryDebug] ${memberName}:`, JSON.stringify(member.batteryLevel));
          }

          let result = extractBatteryLevelInfo(member?.batteryLevel);

          if (!result) {
            result = extractBatteryLevelInfo(member?.latestBatteryLevel) ??
              extractBatteryLevelInfo(member?.Membership?.batteryLevel) ??
              null;
          }

          console.log(`[ExtractedResult] ${memberName}:`, JSON.stringify(result));
          return result;
        })(),

        currentLocation:
          member?.liveLocation ??
          member?.currentLocation ??
          member?.current_location ??
          member?.latestLocation ??
          member?.latest_location ??
          member?.lastLocation ??
          member?.last_location ??
          member?.lastKnownLocation ??
          member?.location ??
          null,

        Membership: member?.Membership ?? member?.membership ?? undefined,

        locationHistory: member?.todayLocationHistory ?? member?.locationHistory ?? [],
        journeys: member?.journeys ?? [],
      };
    });
};
const parseAssignedLocationsList = (payload: any): any[] => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload && Array.isArray(payload.assignedLocations)) {
    return payload.assignedLocations;
  }
  return [];
};

const buildAssignedLocationRecord = (item: any): { circleId: string; record: AssignedLocationRecord } | null => {
  if (!item) {
    return null;
  }

  const circleId = normalizeIdentifier(item.circleId ?? item.CircleId ?? item.circle_id);
  if (!circleId) {
    return null;
  }

  const locationId = normalizeIdentifier(item.locationId ?? item.LocationId ?? item.location_id ?? item.location?.id);

  const locationCandidate: Record<string, unknown> =
    item.location && typeof item.location === "object" ? { ...item.location } : {};

  if (locationCandidate.id === undefined) {
    locationCandidate.id = item.location?.id ?? item.locationId ?? item.location_id;
  }

  const latFallback = typeof item.latitude === "number" ? item.latitude : item.lat;
  const lngFallback = typeof item.longitude === "number" ? item.longitude : item.lng;

  if (locationCandidate.latitude === undefined) {
    locationCandidate.latitude = item.location?.latitude ?? (locationCandidate as any).lat ?? latFallback;
  }

  if (locationCandidate.longitude === undefined) {
    locationCandidate.longitude = item.location?.longitude ?? (locationCandidate as any).lng ?? lngFallback;
  }

  if (locationCandidate.name === undefined) {
    locationCandidate.name = item.location?.name ?? item.name;
  }

  if (locationCandidate.metadata === undefined) {
    locationCandidate.metadata = item.location?.metadata ?? item.metadata;
  }

  const formattedFallback =
    item.location?.formattedAddress ?? item.location?.formatted_address ?? item.formattedAddress;
  if ((locationCandidate as any).formattedAddress === undefined && formattedFallback !== undefined) {
    (locationCandidate as any).formattedAddress = formattedFallback;
  }

  if ((locationCandidate as any).address === undefined && item.location?.address) {
    (locationCandidate as any).address = item.location.address;
  }

  const locationPoint = normalizeLocationPoint(locationCandidate);
  const assignmentId =
    normalizeIdentifier(item.id ?? item.assignmentId ?? item.assignment_id) ?? `${circleId}:${locationId ?? "pending"}`;

  let normalizedMetadata: Record<string, unknown> | null = null;
  if (item.metadata && typeof item.metadata === "object") {
    normalizedMetadata = { ...item.metadata };
  } else if (item.location?.metadata && typeof item.location.metadata === "object") {
    normalizedMetadata = { ...item.location.metadata };
  }

  const latitudeValue = typeof item.latitude === "number" ? item.latitude : undefined;
  const longitudeValue = typeof item.longitude === "number" ? item.longitude : undefined;

  return {
    circleId,
    record: {
      assignmentId,
      circleId,
      locationId,
      locationPoint,
      latitude: latitudeValue,
      longitude: longitudeValue,
      metadata: normalizedMetadata,
      raw: item,
    },
  };
};

const normalizeLocationPoint = (loc: any): LocationPoint | null => {
  const latitudeCandidate = loc?.latitude ?? loc?.lat ?? loc?.Latitude ?? loc?.Lat;
  const longitudeCandidate = loc?.longitude ?? loc?.lng ?? loc?.lon ?? loc?.Longitude ?? loc?.Lon;
  const latitude = typeof latitudeCandidate === "string" ? Number(latitudeCandidate) : latitudeCandidate;
  const longitude = typeof longitudeCandidate === "string" ? Number(longitudeCandidate) : longitudeCandidate;

  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  let metadata: LocationPoint["metadata"] | undefined;
  if (loc?.metadata) {
    if (typeof loc.metadata === "object") {
      metadata = { ...loc.metadata };
    } else if (typeof loc.metadata === "string" && loc.metadata.trim().length > 0) {
      try {
        const parsed = JSON.parse(loc.metadata);
        if (parsed && typeof parsed === "object") {
          metadata = parsed;
        }
      } catch (e) {
        console.warn("Failed to parse location metadata string", e);
      }
    }
  }

  const mergeMetadata = (updates: Partial<NonNullable<LocationPoint["metadata"]>>) => {
    metadata = { ...(metadata ?? {}), ...updates };
  };

  const inferredAddress = loc?.address ?? loc?.Address ?? loc?.formattedAddress ?? loc?.formatted_address;
  if (typeof inferredAddress === "string" && inferredAddress.trim().length > 0) {
    mergeMetadata({
      address: metadata?.address ?? inferredAddress.trim(),
      formattedAddress: metadata?.formattedAddress ?? inferredAddress.trim(),
    });
  }

  if (loc?.radius !== undefined && loc?.radius !== null) {
    const numericRadius = Number(loc.radius);
    if (Number.isFinite(numericRadius) && (metadata?.radius === undefined || metadata?.radius === null)) {
      mergeMetadata({ radius: numericRadius });
    }
  }

  const rawId = loc?.id ?? loc?.locationId ?? loc?.LocationId;
  let resolvedId: number | string | undefined;

  if (typeof rawId === "string") {
    resolvedId = rawId.trim().length > 0 ? rawId.trim() : undefined;
  } else if (typeof rawId === "number" && Number.isFinite(rawId)) {
    resolvedId = rawId;
  }

  return {
    id: resolvedId,
    latitude,
    longitude,
    name: typeof loc?.name === "string" && loc.name.trim().length > 0 ? loc.name : loc?.label ?? undefined,
    metadata,
  };
};

const extractCircleLocations = (circle: any): LocationPoint[] => {
  if (!circle) return [];
  const rawLocations =
    circle?.Locations ??
    circle?.locations ??
    circle?.SavedLocations ??
    circle?.savedLocations ??
    circle?.locationList ??
    [];

  if (!Array.isArray(rawLocations)) return [];
  return rawLocations
    .map((loc) => normalizeLocationPoint(loc))
    .filter((loc): loc is LocationPoint => loc !== null);
};

type LocationLike = Record<string, unknown>;

const COORDINATE_FIELD_PAIRS: [string, string][] = [
  ["latitude", "longitude"],
  ["lat", "lng"],
  ["lat", "lon"],
  ["Latitude", "Longitude"],
  ["Lat", "Long"],
  ["LATITUDE", "LONGITUDE"],
  ["LAT", "LON"],
];

const ACCURACY_FIELD_KEYS = ["accuracy", "horizontalAccuracy", "accuracyMeters", "accuracy_meters", "precision"];
const HEADING_FIELD_KEYS = ["heading", "bearing", "course"];
const LOCATION_COLLECTION_KEYS = [
  "memberLocations",
  "member_locations",
  "memberLocation",
  "member_location",
  "userLocations",
  "user_locations",
  "usersLocations",
  "users_locations",
  "currentMemberLocations",
  "current_member_locations",
  "currentLocations",
  "current_locations",
  "latestLocations",
  "latest_locations",
  "liveLocations",
  "live_locations",
  "Locations",
  "locations",
  "locationUpdates",
  "location_updates",
];

const LOCATION_OWNER_ID_KEYS = [
  "userId",
  "user_id",
  "userID",
  "memberId",
  "member_id",
  "memberID",
  "profileId",
  "profile_id",
  "personId",
  "person_id",
  "accountId",
  "account_id",
  "ownerId",
  "owner_id",
  "deviceUserId",
  "device_user_id",
];

const nestedCoordinateKeys = ["coords", "coordinate", "position", "location", "geo", "point"];

const extractCoordinatesFromCandidate = (candidate: unknown, visited = new WeakSet<object>()): UserLocation | null => {
  if (!candidate) {
    return null;
  }

  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      return extractCoordinatesFromCandidate(parsed, visited);
    } catch {
      return null;
    }
  }

  if (typeof candidate !== "object") {
    return null;
  }

  if (visited.has(candidate as object)) {
    return null;
  }
  visited.add(candidate as object);

  if (Array.isArray(candidate)) {
    for (const item of candidate) {
      const extracted = extractCoordinatesFromCandidate(item, visited);
      if (extracted) {
        return extracted;
      }
    }
    return null;
  }

  const obj = candidate as LocationLike;

  for (const [latKey, lonKey] of COORDINATE_FIELD_PAIRS) {
    const latCandidate = obj[latKey];
    const lonCandidate = obj[lonKey];
    const latitude = coerceFiniteNumber(latCandidate);
    const longitude = coerceFiniteNumber(lonCandidate);
    if (latitude !== null && longitude !== null) {
      let accuracy: number | null = null;
      for (const key of ACCURACY_FIELD_KEYS) {
        const val = coerceFiniteNumber(obj[key]);
        if (val !== null) {
          accuracy = val;
          break;
        }
      }

      let heading: number | undefined;
      for (const key of HEADING_FIELD_KEYS) {
        const val = coerceFiniteNumber(obj[key]);
        if (val !== null) {
          heading = val;
          break;
        }
      }

      return {
        latitude,
        longitude,
        accuracy,
        heading,
        battery: asNonEmptyString(obj.battery) ?? (obj.batteryLevel !== undefined ? String(obj.batteryLevel) : undefined),
        updatedAt: asNonEmptyString(obj.updatedAt) ?? asNonEmptyString(obj.timestamp) ?? asNonEmptyString(obj.updated) ?? asNonEmptyString(obj.created_at) ?? asNonEmptyString(obj.createdAt),
      };
    }
  }

  for (const key of nestedCoordinateKeys) {
    const nested = obj[key];
    if (nested && typeof nested === "object") {
      const extracted = extractCoordinatesFromCandidate(nested, visited);
      if (extracted) {
        return extracted;
      }
    }
  }

  return null;
};

const gatherLocationEntries = (circlePayload: any): unknown[] => {
  if (!circlePayload || typeof circlePayload !== "object") {
    return [];
  }

  const entries: unknown[] = [];

  for (const key of LOCATION_COLLECTION_KEYS) {
    const value = (circlePayload as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      entries.push(...value);
    }
  }

  const nestedCandidates = [
    (circlePayload as Record<string, unknown>)?.data,
    (circlePayload as Record<string, unknown>)?.payload,
    (circlePayload as Record<string, unknown>)?.details,
  ];

  for (const candidate of nestedCandidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    for (const key of LOCATION_COLLECTION_KEYS) {
      const nestedValue = (candidate as Record<string, unknown>)[key];
      if (Array.isArray(nestedValue)) {
        entries.push(...nestedValue);
      }
    }
  }

  return entries;
};

const buildMemberNameLookup = (members: CircleMember[]): Map<string, string> => {
  const map = new Map<string, string>();
  members.forEach((member) => {
    const memberId = resolveMemberId(member);
    if (!memberId) {
      return;
    }
    const names = [
      member?.Membership?.nickname,
      member?.name,
      member?.email,
    ];
    names
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .forEach((value) => {
        map.set(value.trim().toLowerCase(), memberId);
      });
  });
  return map;
};

const resolveLocationOwnerId = (
  location: Record<string, unknown>,
  members: CircleMember[],
  nameLookup: Map<string, string>
): string | null => {
  for (const key of LOCATION_OWNER_ID_KEYS) {
    const ownerCandidate = location[key];
    const normalized = normalizeIdentifier(ownerCandidate);
    if (normalized) {
      return normalized;
    }
  }

  const nestedOwnerCandidates = [
    (location.user as Record<string, unknown> | undefined)?.id,
    (location.member as Record<string, unknown> | undefined)?.id,
    (location.profile as Record<string, unknown> | undefined)?.id,
    (location.owner as Record<string, unknown> | undefined)?.id,
    (location.device as Record<string, unknown> | undefined)?.userId,
  ];

  for (const candidate of nestedOwnerCandidates) {
    const normalized = normalizeIdentifier(candidate);
    if (normalized) {
      return normalized;
    }
  }

  if (location.metadata && typeof location.metadata === "object") {
    const metadataRecord = location.metadata as Record<string, unknown>;
    for (const key of LOCATION_OWNER_ID_KEYS) {
      const normalized = normalizeIdentifier(metadataRecord[key]);
      if (normalized) {
        return normalized;
      }
    }
    if (metadataRecord.user && typeof metadataRecord.user === "object") {
      const nestedUserId = normalizeIdentifier((metadataRecord.user as Record<string, unknown>).id);
      if (nestedUserId) {
        return nestedUserId;
      }
    }
  }

  const possibleNameKeys = ["name", "label", "title", "nickname"];
  for (const key of possibleNameKeys) {
    const value = location[key];
    if (typeof value === "string" && value.trim().length > 0) {
      const normalized = nameLookup.get(value.trim().toLowerCase());
      if (normalized) {
        return normalized;
      }
    }
  }

  // Fallback: Check if the location's own ID matches a member ID (or normalized member ID)
  // This helps if the API returns a list of locations where the 'id' IS the userId
  if (location.id) {
    const candidateId = normalizeIdentifier(location.id);
    if (candidateId) {
      // Check if this ID exists in our members list
      // We can check if it's in the nameLookup values (which are member IDs)
      // keys -> names, values -> member IDs.
      // But nameLookup is a Map<Name, MemberId>. 
      // We need to check if 'candidateId' is a valid MemberId.
      // We can iterate members or build a Set. 
      // Since we have 'members' array here:
      const match = members.find(m => resolveMemberId(m) === candidateId);
      if (match) {
        return candidateId;
      }
    }
  }

  return null;
};

const extractLocationFromMemberRecord = (member: CircleMember): UserLocation | null => {
  const membership = (member as any)?.Membership ?? {};
  const candidates: unknown[] = [
    (member as any)?.latestLocation,
    (member as any)?.latest_location,
    (member as any)?.lastLocation,
    (member as any)?.last_location,
    (member as any)?.lastKnownLocation,
    (member as any)?.last_known_location,
    (member as any)?.currentLocation,
    (member as any)?.current_location,
    (member as any)?.liveLocation,
    (member as any)?.live_location,
    (member as any)?.location,
    (member as any)?.Location,
    membership?.latestLocation,
    membership?.latest_location,
    membership?.lastLocation,
    membership?.last_location,
    membership?.lastKnownLocation,
    membership?.last_known_location,
    membership?.currentLocation,
    membership?.current_location,
    membership?.location,
    membership?.Location,
    // Add batteryLevel as a candidate, sometimes APIs mix them or user said "battery level"
    (member as any)?.batteryLevel,
    (member as any)?.battery_level,
  ];

  const locationArrays: unknown[] = [
    (member as any)?.locations,
    membership?.locations,
    membership?.locationHistory,
    (member as any)?.locationHistory,
  ];

  for (const arr of locationArrays) {
    if (Array.isArray(arr) && arr.length > 0) {
      candidates.push(arr[0]);
    }
  }

  const metadataCandidates: unknown[] = [];
  if ((member as any)?.metadata && typeof (member as any).metadata === "string") {
    metadataCandidates.push((member as any).metadata);
  }
  if (membership?.metadata) {
    metadataCandidates.push(membership.metadata);
  }

  candidates.push(...metadataCandidates);

  for (const candidate of candidates) {
    const extracted = extractCoordinatesFromCandidate(candidate);
    if (extracted) {
      return extracted;
    }
  }

  return null;
};

const buildMemberLocationMap = (circlePayload: any, members: CircleMember[]): Record<string, UserLocation> => {
  const map: Record<string, UserLocation> = {};
  if (!members.length) {
    console.log("buildMemberLocationMap: No members provided");
    return map;
  }

  console.log("buildMemberLocationMap: Processing", members.length, "members");
  const nameLookup = buildMemberNameLookup(members);
  const rawLocations = gatherLocationEntries(circlePayload);
  console.log("buildMemberLocationMap: Found", rawLocations.length, "raw location entries");

  for (const raw of rawLocations) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const ownerId = resolveLocationOwnerId(raw as Record<string, unknown>, members, nameLookup);
    if (!ownerId) {
      console.log("buildMemberLocationMap: Could not resolve owner for location:", raw);
      continue;
    }
    const coords = extractCoordinatesFromCandidate(raw);
    if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
      console.log("buildMemberLocationMap: Invalid coords for owner", ownerId, ":", coords);
      continue;
    }
    console.log("buildMemberLocationMap: Adding location for", ownerId, ":", coords);
    map[ownerId] = coords;
  }

  members.forEach((member) => {
    const memberId = resolveMemberId(member);
    if (!memberId) {
      return;
    }
    const directLocation = extractLocationFromMemberRecord(member);
    if (directLocation && Number.isFinite(directLocation.latitude) && Number.isFinite(directLocation.longitude)) {
      console.log("buildMemberLocationMap: Adding direct location for", memberId, ":", directLocation);
      map[memberId] = directLocation;
    } else {
      console.log("buildMemberLocationMap: No valid direct location for", memberId);
    }
  });

  console.log("buildMemberLocationMap: Final map has", Object.keys(map).length, "locations");
  return map;
};

type MapStyle = 'standard' | 'satellite' | 'hybrid' | 'terrain';

const isValidCoordinate = (lat: number, lon: number) => {
  return typeof lat === "number" && typeof lon === "number" && !isNaN(lat) && !isNaN(lon);
};

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
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

const normalizeRole = (role?: string | null) => {
  if (typeof role !== "string") return null;
  const trimmed = role.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

const formatRoleLabel = (role: string | null) => {
  if (!role) return "Member";
  if (role === "creator") return "Creator";
  if (role === "admin") return "Admin";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const resolveMemberId = (member: CircleMember | null | undefined) => {
  if (!member) {
    return null;
  }

  const membershipRecord = ((member as any)?.Membership ?? {}) as Record<string, unknown>;
  const primaryCandidates: unknown[] = [
    (member as any)?.id,
    (member as any)?.userId,
    (member as any)?.UserId,
    (member as any)?.user_id,
    (member as any)?.memberId,
    (member as any)?.member_id,
    (member as any)?.profileId,
    (member as any)?.profile_id,
    (member as any)?._id,
    (member as any)?.uuid,
    membershipRecord.id,
    membershipRecord.userId,
    membershipRecord.user_id,
    membershipRecord.memberId,
    membershipRecord.member_id,
    membershipRecord.profileId,
    membershipRecord.profile_id,
    (member as any)?.user?.id,
    (member as any)?.user?.userId,
    (member as any)?.user?.user_id,
    (member as any)?.user?._id,
    (member as any)?.user?.uuid,
    (member as any)?.account?.id,
    (member as any)?.Account?.id,
    (member as any)?.person?.id,
    (member as any)?.Person?.id,
  ];

  for (const candidate of primaryCandidates) {
    const normalized = normalizeIdentifier(candidate);
    if (normalized) {
      return normalized;
    }
  }

  const fallbackEmail = asNonEmptyString((member as any)?.email ?? (member as any)?.Email);
  if (fallbackEmail) {
    return fallbackEmail.toLowerCase();
  }

  return null;
};




// =======================================================
// MAP SCREEN COMPONENT
// =======================================================
const MapScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [loadingCircles, setLoadingCircles] = useState(false);
  const loadingCirclesRef = useRef(false);
  const lastCircleFetchTimestampRef = useRef(0);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const locationRef = useRef<UserLocation | null>(null);
  const locationWatchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  // Startup Loading State
  const [startupStatus, setStartupStatus] = useState<string | null>("Starting up...");
  const [startupProgress, setStartupProgress] = useState(0);

  const [circles, setCircles] = useState<CircleData[]>([]);
  const circlesRef = useRef<CircleData[]>([]); // Ref to avoid stale closures in selection logic

  const [selectedCircle, setSelectedCircle] = useState<CircleData | null>(null);
  const selectedCircleRef = useRef<CircleData | null>(null);
  const activeCircleIdRef = useRef<string | null>(null);
  const [selectedCircleMembers, setSelectedCircleMembers] = useState<CircleMember[]>([]);
  const [memberLocations, setMemberLocations] = useState<Record<string, UserLocation>>({});
  const [memberAvatarUrls, setMemberAvatarUrls] = useState<Record<string, string | null>>({});
  const [activeTab, setActiveTab] = useState("Location");

  const mapRef = useRef<MapView | null>(null);
  const locationHistoryMapRef = useRef<MapView | null>(null);
  const insets = useSafeAreaInsets();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);
  const [currentUserBatteryLevel, setCurrentUserBatteryLevel] = useState<BatteryLevelInfo | null>(null);
  const [memberRemovalLoadingId, setMemberRemovalLoadingId] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
  const lastSeenNotificationIdRef = useRef<string | null>(null);
  const [isLeavingCircle, setIsLeavingCircle] = useState(false);
  const [isDeletingCircle, setIsDeletingCircle] = useState(false);
  const [assignedLocationsByCircle, setAssignedLocationsByCircle] = useState<Record<string, AssignedLocationRecord>>({});
  const [loadingAssignedLocations, setLoadingAssignedLocations] = useState(false);
  const loadingAssignedLocationsRef = useRef(false);
  const lastAssignedFetchTimestampRef = useRef(0);
  const fetchCircleMembersInFlightRef = useRef(new Set<string>());
  const memberFetchTimestampsRef = useRef<Record<string, number>>({});
  const { showAlert } = useAlert();
  const [activeSection, setActiveSection] = useState<'members' | 'place' | 'key'>('members');
  const [selectedDrivingMemberId, setSelectedDrivingMemberId] = useState<string | "all">("all");
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileMetadataInput, setProfileMetadataInput] = useState("");
  const [profileAvatarOriginal, setProfileAvatarOriginal] = useState<string | null>(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);
  const [profileAvatarUpload, setProfileAvatarUpload] = useState<PickedImage | null>(null);
  const [isPickingProfileImage, setIsPickingProfileImage] = useState(false);
  const [profileModalError, setProfileModalError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingSos, setIsSendingSos] = useState(false);
  const [isCirclesModalOpen, setIsCirclesModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isDriveDetectionModalOpen, setIsDriveDetectionModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isLocationSharingModalOpen, setIsLocationSharingModalOpen] = useState(false);
  const [isCircleManagementModalOpen, setIsCircleManagementModalOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isAddPeopleModalOpen, setIsAddPeopleModalOpen] = useState(false);
  const [isSmartNotificationModalOpen, setIsSmartNotificationModalOpen] = useState(false);

  // Add Place Modal State
  const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState(false);
  const [addPlaceMode, setAddPlaceMode] = useState<'create' | 'edit'>('create');
  const [editingLocation, setEditingLocation] = useState<LocationPoint | null>(null);

  // Member Journeys Modal State
  const [isMemberJourneysModalOpen, setIsMemberJourneysModalOpen] = useState(false);
  const [selectedMemberForJourneys, setSelectedMemberForJourneys] = useState<string | number | undefined>(undefined);
  const [isMyRoleModalOpen, setIsMyRoleModalOpen] = useState(false);

  const [driveDetectionEnabled, setDriveDetectionEnabled] = useState(false);
  const [coordinateAlert, setCoordinateAlert] = useState<{
    visible: boolean;
    lat: number;
    lng: number;
    speed: number | null;
    accuracy: number | null;
    name: string | null;
  }>({
    visible: false,
    lat: 0,
    lng: 0,
    speed: null,
    accuracy: null,
    name: null,
  });

  const { currentSpeed, setCurrentSpeed } = useSpeed();

  // Circles Modal Share State


  // Existing state...
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isUpdatingLocationSharing, setIsUpdatingLocationSharing] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [locationHistoryLoading, setLocationHistoryLoading] = useState(false);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryEntry[]>([]);
  const [locationHistoryError, setLocationHistoryError] = useState<string | null>(null);
  const [locationHistoryActiveFilter, setLocationHistoryActiveFilter] = useState<LocationHistoryFilterKey>("today");
  const [locationHistoryCustomStart, setLocationHistoryCustomStart] = useState("");
  const [locationHistoryCustomEnd, setLocationHistoryCustomEnd] = useState("");
  const [showLocationHistoryCustomStartPicker, setShowLocationHistoryCustomStartPicker] = useState(false);
  const [showLocationHistoryCustomEndPicker, setShowLocationHistoryCustomEndPicker] = useState(false);
  const [shouldRenderLocationHistoryMap, setShouldRenderLocationHistoryMap] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [selectedMemberLocationId, setSelectedMemberLocationId] = useState<string | null>(null);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [memberBeingEdited, setMemberBeingEdited] = useState<CircleMember | null>(null);
  const [editedMemberRole, setEditedMemberRole] = useState("member");
  const [editedMemberNickname, setEditedMemberNickname] = useState("");
  const [editedMemberRelation, setEditedMemberRelation] = useState("Other");
  const [isSavingMemberChanges, setIsSavingMemberChanges] = useState(false);
  const [memberModalError, setMemberModalError] = useState<string | null>(null);
  const [mapLayerStyle, setMapLayerStyle] = useState<MapStyle>('standard');
  const [isMapStyleModalOpen, setIsMapStyleModalOpen] = useState(false);
  const [isCirclesSelectionModalOpen, setIsCirclesSelectionModalOpen] = useState(false);
  const [isLocationHistoryModalVisible, setIsLocationHistoryModalVisible] = useState(false);
  const [iscirclesSelectionOpenAtShare, setCirclesSelectionOpenAtShare] = useState(false);
  const [isCreateCircleModalOpen, setIsCreateCircleModalOpen] = useState(false);
  const [isJoinCircleModalOpen, setIsJoinCircleModalOpen] = useState(false);
  const [isEditCircleNameModalOpen, setIsEditCircleNameModalOpen] = useState(false);



  // Stored User Data (from Auth)
  const [storedUser, setStoredUser] = useState<any>(null);

  const handleCustomStartChange = (event: any, selectedDate?: Date) => {
    setShowLocationHistoryCustomStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setLocationHistoryCustomStart(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleCustomEndChange = (event: any, selectedDate?: Date) => {
    setShowLocationHistoryCustomEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setLocationHistoryCustomEnd(selectedDate.toISOString().split('T')[0]);
    }
  };

  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const userJson = await AsyncStorage.getItem("user");
        if (userJson) {
          setStoredUser(JSON.parse(userJson));
        }
      } catch (e) {
        console.log("Failed to load stored user", e);
      }
    };
    loadStoredUser();
  }, []);

  useEffect(() => {
    const loadDriveDetectionSetting = async () => {
      try {
        const val = await AsyncStorage.getItem("user_drive_detection_enabled");
        setDriveDetectionEnabled(val === "true");
      } catch (e) {
        console.warn("Failed to load drive detection setting", e);
      }
    };
    loadDriveDetectionSetting();
  }, []);

  // Handle AppState to start/stop background location
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState: AppStateStatus) => {
      console.log("AppState changed to", nextAppState);
      if (nextAppState === "active") {
        await stopBackgroundLocation();
      } else if (nextAppState === "background" || nextAppState === "inactive") {
        if (locationSharingEnabled && activeCircleIdRef.current) {
          await startBackgroundLocation();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [locationSharingEnabled]);


  // --- Journeys Modal State ---
  // const [isMemberJourneysModalVisible, setIsMemberJourneysModalVisible] = useState(false);
  // const [memberJourneysData, setMemberJourneysData] = useState<CircleMember | null>(null);

  // --- Derived State (Moved up) ---
  const circleCreatorId = useMemo(() => {
    const creatorIdRaw = selectedCircle?.creatorId;
    if (creatorIdRaw === undefined || creatorIdRaw === null) {
      return null;
    }
    return String(creatorIdRaw);
  }, [selectedCircle]);

  const isCircleCreator = useMemo(() => {
    if (!currentUserId || !circleCreatorId) {
      return false;
    }
    return currentUserId === circleCreatorId;
  }, [circleCreatorId, currentUserId]);

  const currentMembership = useMemo(() => {
    if (!currentUserId) return null;
    return (
      selectedCircleMembers.find((member) => resolveMemberId(member) === currentUserId) ?? null
    );
  }, [currentUserId, selectedCircleMembers]);

  const currentMembershipRole = useMemo(() => {
    if (isCircleCreator) return "creator";
    return normalizeRole(currentMembership?.Membership?.role) ?? null;
  }, [currentMembership, isCircleCreator]);

  const canManageLocations = useMemo(() => {
    return isCircleCreator || currentMembershipRole === "admin";
  }, [currentMembershipRole, isCircleCreator]);

  const handleOpenNotificationsModal = useCallback(() => {
    setIsNotificationsModalOpen(true);
  }, []);

  const handleOpenAccountModal = useCallback(() => {
    setIsAccountModalOpen(true);
  }, []);

  const handleOpenSmartNotificationsModal = useCallback(() => {
    setIsSmartNotificationModalOpen(true);
  }, []);

  const handleOpenCircleNotificationSettings = useCallback(() => {
    if (!selectedCircle) return;

    // Permission check: Creator or Admin
    const myMemberRecord = selectedCircleMembers.find(m => resolveMemberId(m) === currentUserId);
    const role = normalizeRole((myMemberRecord?.Membership as any)?.role);
    const isCreator = selectedCircle.creatorId === currentUserId;
    const isAdmin = role === "admin";

    if (!isCreator && !isAdmin) {
      showAlert({ title: "Permission Denied", message: "Only circle creators and admins can update notification settings.", type: 'warning' });
      return;
    }

    // Load settings from circle data
    const settings = (selectedCircle as any).notificationSettings || {};
    router.push({ pathname: '/screens/CircleNotificationSettingsScreen', params: { circleId: selectedCircle.id, initialSettings: JSON.stringify(settings) } } as any);
  }, [currentUserId, selectedCircle, selectedCircleMembers, showAlert]);



  const batteryLevelRef = useRef<number | null>(null);
  const lastBatterySyncRef = useRef<number>(0);
  const lowBatteryAlertSentRef = useRef(false);

  const postBatteryLevel = useCallback((level: number, force = false) => {
    const now = Date.now();
    if (!force && lastBatterySyncRef.current > 0) {
      const elapsed = now - lastBatterySyncRef.current;
      if (elapsed < BATTERY_SYNC_MIN_INTERVAL_MS) {
        return;
      }
    }

    lastBatterySyncRef.current = now;
    void sendBatteryLevelValue(level);
  }, []);

  const handleLowBatteryAlert = useCallback((level: number) => {
    if (level <= LOW_BATTERY_THRESHOLD) {
      if (lowBatteryAlertSentRef.current) {
        return;
      }

      lowBatteryAlertSentRef.current = true;
      void sendLowBatteryAlert(level, LOW_BATTERY_THRESHOLD).catch((error) => {
        console.warn("Failed to send low battery alert", error);
        lowBatteryAlertSentRef.current = false;
      });
    } else if (lowBatteryAlertSentRef.current) {
      lowBatteryAlertSentRef.current = false;
    }
  }, []);

  const handleOpenSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  const handleOpenLocationSharingModal = useCallback(() => {
    setIsLocationSharingModalOpen(true);
  }, []);

  const handleOpenCircleManagementModal = useCallback(() => {
    setIsCircleManagementModalOpen(true);
  }, []);

  const handleOpenCreateCircleModal = useCallback(() => {
    setIsSettingsModalOpen(false);
    setIsCreateCircleModalOpen(true);
  }, []);

  const handleOpenAddPeopleModal = useCallback(() => {
    if (!selectedCircle) {
      showAlert({ title: "Error", message: "No circle selected.", type: 'error' });
      return;
    }
    setIsAddPeopleModalOpen(true);
  }, [selectedCircle, showAlert]);

  const handleToggleLocationSharing = useCallback(async (nextValue: boolean) => {
    if (isUpdatingLocationSharing || nextValue === locationSharingEnabled) {
      return;
    }

    setIsUpdatingLocationSharing(true);

    try {
      if (nextValue) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          showAlert({
            title: "Permission needed",
            message: "Allow location access in your device settings to share your location with the circle.",
            type: 'warning'
          });
          return;
        }

        if (isNativePlatform) {
          try {
            const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
            if (backgroundPermission.status !== "granted") {
              showAlert({
                title: "Background access limited",
                message: "We'll share your location while the app is open. Enable background access in system settings for continuous updates.",
                type: 'info'
              });
            }
          } catch (backgroundError) {
            console.warn("Failed to request background location permission", backgroundError);
          }
        }

        if (!locationRef.current) {
          try {
            const latest = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const refreshedLocation: UserLocation = {
              latitude: latest.coords.latitude,
              longitude: latest.coords.longitude,
              heading: latest.coords.heading ?? undefined,
              accuracy: latest.coords.accuracy ?? null,
            };
            setLocation(refreshedLocation);
            locationRef.current = refreshedLocation;
          } catch (refreshError) {
            console.warn("Failed to refresh location after enabling sharing", refreshError);
          }
        }
        if (isNativePlatform) {
          try {
            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME, {
              accuracy: Location.Accuracy.High,
              timeInterval: 30000,
              foregroundService: {
                notificationTitle: "Location Sharing Active",
                notificationBody: "Sharing your live location with your circle.",
                notificationColor: "#4F359B",
              },
            });
          } catch (startError) {
            console.warn("Failed to start background location updates", startError);
            showAlert({ title: "Background Error", message: "Could not start background location tracking.", type: 'error' });
          }
        }
      } else if (isNativePlatform) {
        try {
          const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
          if (hasStarted) {
            await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
          }
        } catch (stopError) {
          console.warn("Failed to stop background location updates when disabling sharing", stopError);
        }
      }

      setLocationSharingEnabled(nextValue);

      await AsyncStorage.setItem(
        STORAGE_KEYS.locationSharingEnabled,
        nextValue ? "true" : "false"
      ).catch(() => undefined);

      if (!nextValue) {
        await clearAllPostedLocations().catch(() => undefined);
      } else if (selectedCircle?.id) {
        const circleId = normalizeIdentifier(selectedCircle.id);
        const latestLocation = locationRef.current;
        if (circleId && latestLocation) {
          void maybePostCircleLocationUpdate(circleId, {
            latitude: latestLocation.latitude,
            longitude: latestLocation.longitude,
            accuracy: latestLocation.accuracy ?? null,
          }).catch((error) => {
            console.warn("Immediate location post failed after enabling sharing", error);
          });
        }
      }
    } catch (error) {
      console.warn("Failed to update location sharing preference", error);
      showAlert({
        title: "Location sharing",
        message: "We couldn't update your location sharing preference. Please try again.",
        type: 'error'
      });
    } finally {
      setIsUpdatingLocationSharing(false);
    }
  }, [isUpdatingLocationSharing, locationSharingEnabled, selectedCircle, showAlert]);

  const handleToggleNotifications = useCallback(async (nextValue: boolean) => {
    if (isUpdatingNotifications || nextValue === notificationsEnabled) {
      return;
    }

    setIsUpdatingNotifications(true);

    try {
      if (nextValue) {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          showAlert({
            title: "Permission needed",
            message: "Enable notifications in your device settings to receive circle alerts.",
            type: 'warning'
          });
          return;
        }
      }

      await setNotificationReceptionEnabled(nextValue);
      setNotificationsEnabled(nextValue);

      await AsyncStorage.setItem(
        STORAGE_KEYS.notificationsEnabled,
        nextValue ? "true" : "false"
      ).catch(() => undefined);
    } catch (error) {
      console.warn("Failed to update notification preference", error);
      showAlert({
        title: "Notifications",
        message: "We couldn't update your notification preference. Please try again.",
        type: 'error'
      });
    } finally {
      setIsUpdatingNotifications(false);
    }
  }, [isUpdatingNotifications, notificationsEnabled, showAlert]);

  useEffect(() => {
    let cancelled = false;

    const hydrateSettings = async () => {
      try {
        const [storedLocationSharing, storedNotifications] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.locationSharingEnabled),
          AsyncStorage.getItem(STORAGE_KEYS.notificationsEnabled),
        ]);

        if (cancelled) {
          return;
        }

        const initialLocationSharing = parseBooleanPreference(storedLocationSharing, true);
        setLocationSharingEnabled(initialLocationSharing);

        if (!initialLocationSharing && isNativePlatform) {
          try {
            const hasStarted = await isBackgroundLocationRunning();
            if (hasStarted) {
              await stopBackgroundLocation();
            }
          } catch (stopError) {
            console.warn("Failed to stop location updates during settings hydration", stopError);
          }
        }

        const initialNotifications = parseBooleanPreference(storedNotifications, true);
        setNotificationsEnabled(initialNotifications);
        await setNotificationReceptionEnabled(initialNotifications);
        if (initialNotifications) {
          await requestNotificationPermissions();
        }

        const storedMapStyle = await AsyncStorage.getItem(STORAGE_KEYS.mapStyle);
        if (storedMapStyle && ['standard', 'satellite', 'hybrid', 'terrain'].includes(storedMapStyle)) {
          setMapLayerStyle(storedMapStyle as MapStyle);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to hydrate settings preferences", error);
        }
      }
    };

    void hydrateSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    locationRef.current = location;

    if (!location) {
      return;
    }

    void storeLastKnownLocation({
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }, [location]);

  useEffect(() => {
    let cancelled = false;

    const syncInitialBattery = async () => {
      const level = await readBatteryLevel();
      if (cancelled || level === null) {
        return;
      }

      batteryLevelRef.current = level;
      postBatteryLevel(level, true);
      handleLowBatteryAlert(level);
    };

    void syncInitialBattery();

    const unsubscribe = watchBatteryLevel((level) => {
      if (cancelled) {
        return;
      }

      const previousLevel = batteryLevelRef.current;
      batteryLevelRef.current = level;

      const shouldForce = previousLevel === null || Math.abs(level - (previousLevel ?? level)) >= 1;
      postBatteryLevel(level, shouldForce);
      handleLowBatteryAlert(level);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [handleLowBatteryAlert, postBatteryLevel]);

  useEffect(() => {
    selectedCircleRef.current = selectedCircle;
  }, [selectedCircle]);

  // --- Animation State (Pan Responder, SnapTo) ---
  const sheetHeight = useRef(new Animated.Value(INITIAL_SHEET_HEIGHT)).current;
  const [isExpanded, setIsExpanded] = useState(INITIAL_SHEET_HEIGHT > MID_HEIGHT);
  const dragStartHeightRef = useRef(INITIAL_SHEET_HEIGHT);

  // Poll for notifications
  useEffect(() => {
    let interval: any;
    const pollNotifications = async () => {
      try {
        const response = await NotificationService.fetchNotifications(1, 1);
        const latest = response.notifications[0];
        // Only show toast if it's a new, unread notification and newer than what we've seen
        if (latest && !latest.read && latest.id !== lastSeenNotificationIdRef.current) {
          lastSeenNotificationIdRef.current = latest.id;
          setToastNotification(latest);
        }
      } catch (e) {
        // ignore error during poll
      }
    };

    // Initial fetch
    pollNotifications();
    interval = setInterval(pollNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const fetchCircleLiveStatus = useCallback(async (circleId: number | string | undefined) => {
    if (!circleId) return;
    const circleIdParam = String(circleId);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/circles/${circleIdParam}/live-status`, {
        headers: { accept: "application/json" },
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const liveData = payload?.data;
      console.log("liveData", liveData);

      if (!Array.isArray(liveData)) return;

      // 1. Update Member Locations - skip coords if 'same'
      setMemberLocations(prev => {
        const next = { ...prev };
        let anyChanged = false;
        liveData.forEach(m => {
          const mid = String(m.id);
          const existing = prev[mid];

          // If same, we keep existing lat/lng but might still update speed/battery
          const latitude = m.locationChange === 'same' && existing ? existing.latitude : m.latitude;
          const longitude = m.locationChange === 'same' && existing ? existing.longitude : m.longitude;

          if (
            !existing ||
            existing.latitude !== latitude ||
            existing.longitude !== longitude ||
            existing.speed !== m.speed ||
            existing.battery !== m.battery
          ) {
            next[mid] = {
              latitude,
              longitude,
              heading: undefined,
              accuracy: null,
              speed: m.speed,
              battery: m.battery,
            };
            anyChanged = true;
          }
        });
        return anyChanged ? next : prev;
      });

      // 2. Update Avatar URLs if changed
      setMemberAvatarUrls(prev => {
        const next = { ...prev };
        let anyChanged = false;
        liveData.forEach(m => {
          const mid = String(m.id);
          if (m.avatar && prev[mid] !== m.avatar) {
            next[mid] = m.avatar;
            anyChanged = true;
          }
        });
        return anyChanged ? next : prev;
      });

      // 3. Update Member Data if changed & Sort
      setSelectedCircleMembers(prev => {
        const nextMembers = [...prev];
        let anyChanged = false;

        liveData.forEach(update => {
          const mid = String(update.id);
          const index = nextMembers.findIndex(m => resolveMemberId(m) === mid);

          if (index !== -1) {
            const member = nextMembers[index];
            const hasInfoChanged =
              member.name !== update.name ||
              member.avatar !== update.avatar ||
              (member as any).status !== update.status ||
              (member as any).locationText !== update.locationText ||
              (member as any).battery !== update.battery ||
              (member as any).speed !== update.speed ||
              (member as any).role !== update.role ||
              (member as any).isTracker !== update.isTracker ||
              (member as any).isMe !== update.isMe;

            if (hasInfoChanged) {
              anyChanged = true;
              nextMembers[index] = {
                ...member,
                name: update.name,
                avatar: update.avatar,
                status: update.status,
                locationText: update.locationText,
                lastSeen: update.lastSeen,
                isMe: update.isMe,
                role: update.role,
                isTracker: update.isTracker,
                battery: update.battery,
                speed: update.speed,
              } as any;
            }
          } else {
            // Member not found in state, add it
            anyChanged = true;
            nextMembers.push({
              id: update.id,
              name: update.name,
              avatar: update.avatar,
              status: update.status,
              locationText: update.locationText,
              lastSeen: update.lastSeen,
              isMe: update.isMe,
              role: update.role,
              isTracker: update.isTracker,
              battery: update.battery,
              speed: update.speed,
            } as any);
          }
        });

        if (!anyChanged) {
          // Even if no data changed, we might want to check the sort if this is the first poll
          // But usually we just return prev.
          // Let's enforce sort if it's the first time we see isMe
          const isSorted = nextMembers.length > 0 && ((nextMembers[0] as any).isMe || resolveMemberId(nextMembers[0]) === currentUserId);
          if (isSorted) return prev;
        }

        // Sort: isMe first, then name
        return nextMembers.sort((a, b) => {
          const aId = resolveMemberId(a);
          const bId = resolveMemberId(b);
          const aMe = (a as any).isMe || aId === currentUserId;
          const bMe = (b as any).isMe || bId === currentUserId;
          if (aMe && !bMe) return -1;
          if (!aMe && bMe) return 1;
          const aName = a.name || "";
          const bName = b.name || "";
          return aName.localeCompare(bName);
        });
      });

    } catch (e) {
      console.warn("Failed to poll live status:", e);
    }
  }, []);

  // Poll for circle live status every 5 minutes
  useEffect(() => {
    let interval: any;
    const runPoll = () => {
      const cid = selectedCircleRef.current?.id;
      if (cid) {
        fetchCircleLiveStatus(cid);
      }
    };

    runPoll();
    interval = setInterval(runPoll, 5000); // 5 seconds
    return () => clearInterval(interval);
  }, [fetchCircleLiveStatus]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderGrant: () => {
        sheetHeight.stopAnimation((value) => {
          dragStartHeightRef.current = value ?? INITIAL_SHEET_HEIGHT;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        let newHeight = dragStartHeightRef.current - gestureState.dy;

        if (newHeight < MIN_HEIGHT) newHeight = MIN_HEIGHT;
        if (newHeight > MAX_HEIGHT) newHeight = MAX_HEIGHT;

        sheetHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const finalHeight = Math.min(
          Math.max(dragStartHeightRef.current - gestureState.dy, MIN_HEIGHT),
          MAX_HEIGHT
        );

        // Velocity check or significant distance check
        const isSwipeUp = gestureState.dy < -50;
        const isSwipeDown = gestureState.dy > 50;

        let target = finalHeight;

        if (isSwipeUp) {
          // Swipe Up: move to next stop
          if (dragStartHeightRef.current < MID_HEIGHT) { // From Min
            target = MID_HEIGHT;
          } else { // From Mid or Max
            target = MAX_HEIGHT;
          }
        } else if (isSwipeDown) {
          // Swipe Down: move to prev stop
          if (dragStartHeightRef.current > MID_HEIGHT) { // From Max
            target = MID_HEIGHT;
          } else { // From Mid or Min
            target = MIN_HEIGHT;
          }
        } else {
          // Snap to closest
          const distMin = Math.abs(finalHeight - MIN_HEIGHT);
          const distMid = Math.abs(finalHeight - MID_HEIGHT);
          const distMax = Math.abs(finalHeight - MAX_HEIGHT);

          if (distMid < distMin && distMid < distMax) {
            target = MID_HEIGHT;
          } else if (distMax < distMin && distMax < distMid) {
            target = MAX_HEIGHT;
          } else {
            target = MIN_HEIGHT;
          }
        }

        snapTo(target);
        setIsExpanded(target > MIN_HEIGHT);
      },
    })
  ).current;

  const snapTo = (targetHeight: number) => {
    dragStartHeightRef.current = targetHeight;
    Animated.spring(sheetHeight, {
      toValue: targetHeight,
      useNativeDriver: false,
      bounciness: 4,
      speed: 12
    }).start();
  };

  // --- Scroll / Section Tracking ---
  const sheetScrollRef = useRef<ScrollView | null>(null);
  const sectionPositions = useRef<Record<string, number>>({}).current;

  const scrollToSection = (key: string) => {
    const y = sectionPositions[key];
    if (y === undefined) return;
    const performScroll = () => {
      sheetScrollRef.current?.scrollTo({ y: Math.max(y - 10, 0), animated: true });
    };
    if (!isExpanded) {
      setIsExpanded(true);
      snapTo(MAX_HEIGHT);
      setTimeout(performScroll, 280);
    } else {
      performScroll();
    }
  };

  // --- CORE LOGIC: Fetch Members and their data from circle ---
  const fetchCircleMembers = useCallback(async (circleId: number | string | undefined) => {
    if (circleId === undefined || circleId === null) return;
    const circleIdParam = typeof circleId === "string" ? circleId : String(circleId);

    if (fetchCircleMembersInFlightRef.current.has(circleIdParam)) {
      return;
    }

    const lastFetch = memberFetchTimestampsRef.current[circleIdParam];
    if (lastFetch && Date.now() - lastFetch < MIN_MEMBER_REFRESH_INTERVAL_MS) {
      return;
    }

    fetchCircleMembersInFlightRef.current.add(circleIdParam);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/circles/${circleIdParam}`, {
        headers: { accept: "application/json" },
      });

      const payload = await response.json().catch(() => ({}));
      console.log("DEBUG: GET /api/circles/{id} payload:", JSON.stringify(payload, null, 2));

      // Log specifically the members array
      if (payload?.data?.members) {
        console.log("DEBUG: data.members array found with", payload.data.members.length, "members");
        console.log("DEBUG: First member:", JSON.stringify(payload.data.members[0], null, 2));
      } else {
        console.log("DEBUG: ⚠️ No data.members array in response!");
      }

      if (!response.ok) {
        console.warn("Failed to load circle members", payload?.message);
        return;
      }

      const circlePayload =
        payload?.data?.circle ??
        payload?.circle ??
        payload?.data ??
        payload;

      const normalizedLocations = extractCircleLocations(circlePayload);
      const normalizedCircle = {
        ...circlePayload,
        Locations: normalizedLocations,
      } as CircleData;

      const members = extractCircleMembers(normalizedCircle);
      console.log("fetchCircleMembers members extracted:", members.length, members.map(m => ({ id: m.id, avatar: m.avatar })));

      setSelectedCircleMembers(members);

      const avatarMap = members.reduce<Record<string, string | null>>((acc, member) => {
        const memberId = resolveMemberId(member);
        if (!memberId) {
          return acc;
        }
        // Use direct avatar property from CircleMember if available, otherwise try extraction
        const avatar = member.avatar ?? extractAvatarUrl(member) ?? extractAvatarUrl(member?.Membership) ?? null;
        acc[memberId] = avatar;
        return acc;
      }, {});



      const locationMap = buildMemberLocationMap(circlePayload, members);
      console.log("fetchCircleMembers locationMap built:", JSON.stringify(locationMap, null, 2));
      console.log("fetchCircleMembers locationMap keys:", Object.keys(locationMap));
      console.log("fetchCircleMembers locationMap count:", Object.keys(locationMap).length);

      setMemberAvatarUrls(avatarMap);
      setMemberLocations(locationMap);
      console.log("fetchCircleMembers setMemberLocations called with", Object.keys(locationMap).length, "locations");

      if (currentUserId) {
        const selfMember = members.find((member) => resolveMemberId(member) === currentUserId);
        const avatarFromMembers = extractAvatarUrl(selfMember) ?? extractAvatarUrl(selfMember?.Membership);
        if (avatarFromMembers) {
          setCurrentUserAvatarUrl(avatarFromMembers);
        }
        if (selfMember?.batteryLevel) {
          setCurrentUserBatteryLevel(selfMember.batteryLevel);
        }
      }

      // Update the full object if we got more details
      setSelectedCircle((prev) => {
        if (prev && String(prev.id) === circleIdParam) {
          return {
            ...prev,
            ...normalizedCircle,
            Locations: normalizedLocations,
          } as CircleData;
        }
        return prev;
      });
    } catch (error) {
      console.error("Failed to fetch circle members", error);
    } finally {
      fetchCircleMembersInFlightRef.current.delete(circleIdParam);
      memberFetchTimestampsRef.current[circleIdParam] = Date.now();
    }
  }, [currentUserId]);


  // --- CORE LOGIC: Select Circle ---
  const selectCircle = useCallback(
    async (circleId: number | string | null, circleList?: CircleData[]) => {
      if (circleId === null) {
        const previousCircleId = normalizeIdentifier(selectedCircleRef.current?.id);
        if (previousCircleId) {
          await removeCachedCircleLocations(previousCircleId);
          await removeLastPostedLocationForCircle(previousCircleId);
        }
        setSelectedCircle(null);
        setSelectedCircleMembers([]);
        setMemberAvatarUrls({});
        setMemberLocations({});
        await AsyncStorage.removeItem(STORAGE_KEYS.lastSelectedCircleId).catch(() => undefined);
        return;
      }

      const sourceList = circleList ?? circlesRef.current;
      if (!sourceList.length) return;

      const targetId = String(circleId);
      const found = sourceList.find((c) => String(c.id) === targetId);
      if (!found) return;

      const normalizedLocations = extractCircleLocations(found);
      const normalizedCircle: CircleData = {
        ...found,
        Locations: normalizedLocations,
      };

      setSelectedCircle(normalizedCircle);
      const currentMembers = extractCircleMembers(normalizedCircle);
      console.log("selectCircle members extracted:", currentMembers.length, currentMembers.map(m => ({ id: m.id, avatar: m.avatar })));

      setSelectedCircleMembers(currentMembers);

      const avatarMap = currentMembers.reduce<Record<string, string | null>>((acc, member) => {
        const memberId = resolveMemberId(member);
        if (!memberId) {
          return acc;
        }
        // Explicitly check member.avatar which we know is populated
        const avatar = member.avatar ?? extractAvatarUrl(member) ?? extractAvatarUrl(member?.Membership) ?? null;
        acc[memberId] = avatar;
        return acc;
      }, {});

      console.log("selectCircle avatarMap:", JSON.stringify(avatarMap, null, 2));

      const locationMap = buildMemberLocationMap(found, currentMembers);
      const hasMemberLocations = Object.keys(locationMap).length > 0;

      setMemberAvatarUrls(avatarMap);
      setMemberLocations(locationMap);

      if (currentUserId) {
        const selfMember = currentMembers.find((member) => resolveMemberId(member) === currentUserId);
        const avatarFromMembers = extractAvatarUrl(selfMember);
        if (avatarFromMembers) {
          setCurrentUserAvatarUrl(avatarFromMembers);
        }
        if (selfMember?.batteryLevel) {
          setCurrentUserBatteryLevel(selfMember.batteryLevel);
        }
      }

      // Always fetch fresh member data to ensure we have the latest locations
      // This fixes an issue where the initial list might lack current locations
      fetchCircleMembers(found.id);

      await AsyncStorage.setItem(STORAGE_KEYS.lastSelectedCircleId, String(found.id)).catch(() => undefined);


      // Fit Map to Circle Content
      if (normalizedLocations.length > 0 && mapRef.current) {
        const coords = normalizedLocations
          .filter((l) => isValidCoordinate(l.latitude, l.longitude))
          .map((l) => ({ latitude: l.latitude, longitude: l.longitude }));

        // Include user location in bounds if available
        const latestLocation = locationRef.current;
        if (latestLocation) {
          coords.push({ latitude: latestLocation.latitude, longitude: latestLocation.longitude });
        }

        if (coords.length > 0) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(coords, {
              edgePadding: { top: 100, right: 50, bottom: MIN_HEIGHT + 100, left: 50 },
              animated: true,
            });
          }, 500);
        }
      }
    },
    [currentUserId, fetchCircleMembers]
  );

  const fetchCircleLocations = useCallback(async (circleId: number | string | undefined) => {
    if (!circleId) return;
    const cid = String(circleId);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/circles/${cid}/locations`, {
        headers: { accept: "application/json" },
      });
      if (!response.ok) return;

      const payload = await response.json();
      const locations = payload?.data || payload?.locations || [];

      setSelectedCircle(prev => {
        if (prev && String(prev.id) === cid) {
          return { ...prev, Locations: locations };
        }
        return prev;
      });
    } catch (e) {
      console.warn("Failed to fetch circle locations:", e);
    }
  }, []);

  const handleSelectCircle = useCallback(
    (circleId: number | string, circleList?: CircleData[]) => {
      selectCircle(circleId, circleList);
    },
    [selectCircle]
  );

  // --- CORE LOGIC: Fetch Current User Profile ---
  const fetchCurrentUserProfile = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/profile`, {
        method: "GET",
        headers: { accept: "application/json" },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.warn("Failed to fetch current user profile", payload?.message);
        return;
      }

      const userPayload =
        payload?.data?.user ??
        payload?.user ??
        payload?.data ??
        payload;

      const userIdCandidate =
        userPayload?.id ??
        userPayload?._id ??
        userPayload?.userId ??
        userPayload?.uuid ??
        null;

      const normalizedUserId =
        userIdCandidate !== undefined && userIdCandidate !== null
          ? String(userIdCandidate)
          : currentUserId;

      if (userPayload) {
        // Update storedUser to keep local state in sync with backend truth
        const mergedUser = { ...storedUser, ...userPayload };
        setStoredUser(mergedUser);
        await AsyncStorage.setItem("user", JSON.stringify(mergedUser)).catch(() => undefined);
      }

      if (normalizedUserId && normalizedUserId !== currentUserId) {
        setCurrentUserId(normalizedUserId);
      }

      const avatarFromProfile = extractAvatarUrl(userPayload);
      if (avatarFromProfile) {
        setCurrentUserAvatarUrl(avatarFromProfile);
        setProfileAvatarOriginal((prev) => prev ?? avatarFromProfile);
        setProfileAvatarPreview((prev) => prev ?? avatarFromProfile);

        if (normalizedUserId) {
          setMemberAvatarUrls((prev) => {
            if (prev[normalizedUserId] === avatarFromProfile) {
              return prev;
            }
            return { ...prev, [normalizedUserId]: avatarFromProfile };
          });
        }
      }

      if (userPayload?.batteryLevel) {
        const extracted = extractBatteryLevelInfo(userPayload.batteryLevel);
        setCurrentUserBatteryLevel(extracted);
      } else {
        setCurrentUserBatteryLevel(null);
      }

      if (normalizedUserId) {
        const possibleLocation = extractCoordinatesFromCandidate(userPayload);
        if (
          possibleLocation &&
          Number.isFinite(possibleLocation.latitude) &&
          Number.isFinite(possibleLocation.longitude)
        ) {
          setMemberLocations((prev) => {
            const existing = prev[normalizedUserId];
            if (
              existing &&
              existing.latitude === possibleLocation.latitude &&
              existing.longitude === possibleLocation.longitude &&
              existing.accuracy === possibleLocation.accuracy
            ) {
              return prev;
            }
            return { ...prev, [normalizedUserId]: possibleLocation };
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch current user profile", error);
    }
  }, [currentUserId, storedUser]);

  const loadAssignedLocations = useCallback(async (force: boolean = false) => {
    if (loadingAssignedLocationsRef.current) {
      return;
    }

    if (!force) {
      const elapsed = Date.now() - lastAssignedFetchTimestampRef.current;
      if (elapsed < MIN_ASSIGNED_REFRESH_INTERVAL_MS) {
        return;
      }
    }

    loadingAssignedLocationsRef.current = true;
    setLoadingAssignedLocations(true);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/profile/assigned-locations`, {
        method: "GET",
        headers: { accept: "application/json" },
      });

      if (response.status === 401) {
        console.log("Assigned locations request unauthorized - redirecting to login");
        await logout();
        router.replace("/screens/LogInScreen" as any);
        return;
      }

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.warn("Failed to fetch assigned locations", payload?.message);
        return;
      }

      const rawList = parseAssignedLocationsList(payload);

      if (!rawList.length) {
        setAssignedLocationsByCircle({});
        return;
      }

      const map: Record<string, AssignedLocationRecord> = {};
      for (const item of rawList) {
        const normalized = buildAssignedLocationRecord(item);
        if (!normalized) {
          continue;
        }
        map[normalized.circleId] = normalized.record;
      }

      setAssignedLocationsByCircle(map);
    } catch (error) {
      console.warn("Failed to load assigned locations", error);
    } finally {
      loadingAssignedLocationsRef.current = false;
      setLoadingAssignedLocations(false);
      lastAssignedFetchTimestampRef.current = Date.now();
    }
  }, []);

  // --- CORE LOGIC: Load Circles (Robust Version) ---
  const loadCircles = useCallback(async (force: boolean = false) => {
    if (loadingCirclesRef.current) {
      return;
    }

    if (!force) {
      const elapsed = Date.now() - lastCircleFetchTimestampRef.current;
      if (elapsed < MIN_CIRCLE_REFRESH_INTERVAL_MS) {
        return;
      }
    }

    try {
      loadingCirclesRef.current = true;
      setLoadingCircles(true);
      console.log("Fetching circles from:", `${API_BASE_URL}/circles`);

      const res = await authenticatedFetch(`${API_BASE_URL}/circles`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      console.log("Fetch circles response status:", res.status);

      if (res.status === 401) {
        console.log("Unauthorized access - redirecting to login");
        loadingCirclesRef.current = false;
        setLoadingCircles(false);
        await logout();
        return router.replace("/screens/LogInScreen" as any);
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Could not read error body");
        console.error("Failed to fetch circles. Status:", res.status, "Body:", errorText);
        showAlert({ title: "Fetch Error", message: `Failed to load circles (Status: ${res.status}). ${errorText.substring(0, 100)}`, type: 'error' });
        return;
      }

      const data = await res.json();
      console.log("Circles data received:", JSON.stringify(data));

      // Handle various response structures
      let list: CircleData[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.data)) {
        list = data.data;
      } else if (data && data.data && Array.isArray(data.data.circles)) {
        list = data.data.circles;
      } else if (data && Array.isArray(data.circles)) {
        list = data.circles;
      } else if (data && data.data && Array.isArray(data.data.data)) {
        list = data.data.data;
      }

      setCircles(list);

      if (list.length === 0) {
        await selectCircle(null, []);
        return;
      }

      // Restore last selected circle or default to first
      try {
        const storedCircleId = await AsyncStorage.getItem(STORAGE_KEYS.lastSelectedCircleId);
        if (storedCircleId) {
          const matchingByString = list.find((c) => String(c.id) === storedCircleId);
          if (matchingByString) {
            await selectCircle(matchingByString.id, list);
            return;
          }

          const parsed = Number(storedCircleId);
          if (Number.isFinite(parsed)) {
            const matchingByNumber = list.find((c) => Number(c.id) === parsed);
            if (matchingByNumber) {
              await selectCircle(matchingByNumber.id, list);
              return;
            }
          }
        }

        await selectCircle(list[0].id, list);
      } catch (storageError) {
        console.warn("Failed to restore last selected circle", storageError);
      }
    } catch (e) {
      console.error("Network or Logic Error in loadCircles:", e);
      showAlert({ title: "Connection Error", message: "Please check your internet connection.", type: 'error' });
    } finally {
      loadingCirclesRef.current = false;
      setLoadingCircles(false);
      lastCircleFetchTimestampRef.current = Date.now();
    }
  }, [selectCircle, showAlert]);

  const requestCirclesRefresh = useCallback(() => {
    void loadCircles(true);
  }, [loadCircles]);


  const handleSaveProfile = useCallback(async () => {
    if (isSavingProfile) return;

    // Basic Validation
    if (!profileNameInput.trim()) {
      setProfileModalError("Name cannot be empty.");
      return;
    }

    setIsSavingProfile(true);
    setProfileModalError(null);

    try {
      // 1. Prepare Metadata
      let metadata: Record<string, any> | undefined;
      if (profileMetadataInput.trim()) {
        try {
          metadata = JSON.parse(profileMetadataInput);
        } catch {
          // If simple string or invalid JSON, treat as a single 'bio' field or similar
          metadata = { bio: profileMetadataInput };
        }
      }

      // 2. Call API
      const result = await updateUserProfile({
        name: profileNameInput.trim(),
        metadata,
        email: storedUser?.email,
        phoneNumber: storedUser?.phoneNumber,
        profileImage: profileAvatarUpload ? {
          uri: profileAvatarUpload.uri,
          name: profileAvatarUpload.name,
          type: profileAvatarUpload.type // We rely on prepareImageAsWebp setting this to image/webp
        } : undefined
      });

      console.log("Profile update result:", JSON.stringify(result, null, 2));

      // 3. Update Local Storage & State with Robust Parsing
      // Handle various response structures: { data: { user: ... } } or { user: ... } or { data: ... }
      const updatedUser =
        result?.data?.user ??
        result?.user ??
        result?.data ??
        result;

      if (updatedUser) {
        // Merge with existing stored user to preserve any missing fields
        const mergedUser = { ...storedUser, ...updatedUser };
        console.log("Merging user:", JSON.stringify(mergedUser, null, 2));
        setStoredUser(mergedUser);
        await AsyncStorage.setItem("user", JSON.stringify(mergedUser));

        // Update current avatar URL if changed
        const newAvatar = extractAvatarUrl(updatedUser);
        if (newAvatar) {
          setCurrentUserAvatarUrl(newAvatar);
          // If we uploaded a new image, clear the upload state
          if (profileAvatarUpload) {
            setProfileAvatarOriginal(newAvatar);
            setProfileAvatarUpload(null);
          }
        }
      }

      // 4. Close Modal / Feedback
      // We don't necessarily close the modal on save ("Edit" flow often keeps it open),
      // but we can show a toast or just success state.
      // Alert.alert("Success", "Profile updated successfully.");

      // Refresh circles content to show new name/avatar immediately
      // We do a "soft" refresh by triggering a fetch if possible
      void loadCircles(true); // force refresh

    } catch (error: any) {
      console.error("Profile save failed", error);
      setProfileModalError(error.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }, [isSavingProfile, profileNameInput, profileMetadataInput, profileAvatarUpload, storedUser, loadCircles]);

  // --- EFFECTS ---

  // 1. Sync Ref
  useEffect(() => {
    circlesRef.current = circles;
  }, [circles]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    setSelectedCircleMembers((prevMembers) => {
      let changed = false;
      const updated = prevMembers.map((member) => {
        if (resolveMemberId(member) === currentUserId) {
          const storedName = (storedUser as any)?.name;
          const currentAvatar = currentUserAvatarUrl;

          let memberUpdated = false;
          const updatedMember = { ...member };

          if (storedName && member.name !== storedName) {
            updatedMember.name = storedName;
            memberUpdated = true;
          }

          if (currentAvatar && member.avatar !== currentAvatar) {
            updatedMember.avatar = currentAvatar;
            memberUpdated = true;
          }

          if (memberUpdated) {
            changed = true;
            return updatedMember;
          }
        }
        return member;
      });

      return changed ? updated : prevMembers;
    });
  }, [currentUserAvatarUrl, currentUserId, storedUser]);

  useEffect(() => {
    if (!currentUserId || !currentUserAvatarUrl) {
      return;
    }

    setMemberAvatarUrls((prev) => {
      if (prev[currentUserId] === currentUserAvatarUrl) {
        return prev;
      }
      return { ...prev, [currentUserId]: currentUserAvatarUrl };
    });
  }, [currentUserAvatarUrl, currentUserId]);

  useEffect(() => {
    fetchCurrentUserProfile();
  }, [fetchCurrentUserProfile]);

  // 2. Initial Data Load (Location + Circles) - Optimized startup
  useEffect(() => {
    const runStartupSequence = async () => {
      try {
        setStartupStatus("Starting up...");
        setStartupProgress(0.05);

        // Step 1: Permissions
        setStartupStatus("Checking permissions...");
        const { status } = await Location.requestForegroundPermissionsAsync();
        setStartupProgress(0.15);

        if (status === "granted") {
          try {
            setStartupStatus("Getting location...");
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              heading: pos.coords.heading || 0,
              accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy ?? null : null,
            });
            setStartupProgress(0.3);
          } catch (e) {
            console.warn("Failed to get initial location during startup", e);
          }
        } else {
          setStartupProgress(0.3);
        }

        // Step 2: Parallel data fetching with granular progress
        setStartupStatus("Loading your data...");

        // Helper to wrap promise and update progress
        // async function wrapProgress<T>(promise: Promise<T>, increment: number): Promise<T> {
        //   const result = await promise;
        //   setStartupProgress(prev => Math.min(0.95, prev + increment));
        //   return result;
        // }


        const wrapProgress = async <T,>(promise: Promise<T>, increment: number): Promise<T> => {
          const result = await promise;
          setStartupProgress(prev => Math.min(0.95, prev + increment));
          return result;
        };

        await Promise.all([
          wrapProgress(sendBatteryLevel().catch(e => console.warn("Failed to sync battery", e)), 0.15),
          wrapProgress(fetchCurrentUserProfile().catch(e => console.warn("Failed to fetch profile", e)), 0.15),
          wrapProgress(loadCircles().catch(e => console.warn("Failed to load circles", e)), 0.2),
          wrapProgress(loadAssignedLocations().catch(e => console.warn("Failed to load assignments", e)), 0.15)
        ]);

        setStartupStatus("Ready");
        setStartupProgress(1.0);
        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        console.warn("Startup sequence error:", e);
        // Fallback: critical data only
        await loadCircles().catch(() => { });
        setStartupProgress(1.0);
      } finally {
        setLoading(false);
        setStartupStatus(null); // Finish loading
      }
    };

    runStartupSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // 3. Focus Effect (Refresh when screen comes into focus)
  useFocusEffect(
    useCallback(() => {
      const refreshSettings = async () => {
        try {
          const [storedLocationSharing, storedNotifications, storedDriveDetection] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.locationSharingEnabled),
            AsyncStorage.getItem(STORAGE_KEYS.notificationsEnabled),
            AsyncStorage.getItem("user_drive_detection_enabled"),
          ]);

          const initialLocationSharing = parseBooleanPreference(storedLocationSharing, true);
          const initialNotifications = parseBooleanPreference(storedNotifications, true);
          const initialDriveDetection = parseBooleanPreference(storedDriveDetection, false);

          setLocationSharingEnabled(initialLocationSharing);
          setNotificationsEnabled(initialNotifications);
          setDriveDetectionEnabled(initialDriveDetection);

          // Apply notification reception state
          await setNotificationReceptionEnabled(initialNotifications);
        } catch (e) {
          console.warn("Failed to refresh settings on focus", e);
        }
      };

      if (!loading) {
        loadCircles();
        loadAssignedLocations();
        refreshSettings();
      }
    }, [loading, loadCircles, loadAssignedLocations]) // Safe dependencies
  );

  useFocusEffect(
    useCallback(() => {
      const checkSelectedCircle = async () => {
        try {
          const storedId = await AsyncStorage.getItem(STORAGE_KEYS.lastSelectedCircleId);
          if (storedId && circlesRef.current.length > 0) {
            const found = circlesRef.current.find(c => String(c.id) === storedId);
            if (found && String(found.id) !== String(selectedCircleRef.current?.id)) {
              selectCircle(found.id);
            }
          }
        } catch (e) {
          console.warn("Failed to sync selected circle", e);
        }
        // Refresh circles list whenever we focus, to pick up new circles or name changes
        loadCircles(true);
      };

      checkSelectedCircle();
    }, [loadCircles, selectCircle])
  );
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const handleKeyboardShow = (event: any) => {
      setKeyboardHeight(event?.endCoordinates?.height ?? 0);
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const showListener = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideListener = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const ensureForegroundWatch = async () => {
      try {
        let status = (await Location.getForegroundPermissionsAsync()).status;
        if (status !== "granted") {
          status = (await Location.requestForegroundPermissionsAsync()).status;
        }

        if (status !== "granted") {
          return;
        }

        try {
          locationWatchSubscriptionRef.current?.remove();
        } catch (cleanupError) {
          console.warn("Failed to remove existing location subscription", cleanupError);
        }

        const config = {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // 5 seconds for real-time performance
        };

        const subscription = await Location.watchPositionAsync(
          config,
          (position) => {
            if (cancelled || !position?.coords) {
              return;
            }

            const { latitude, longitude } = position.coords;

            const nextLocation: UserLocation = {
              latitude,
              longitude,
              heading: position.coords.heading ?? undefined,
              accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy ?? null : null,
            };

            const rawSpeed = position.coords.speed ?? 0;
            const kmphSpeed = rawSpeed;
            setCurrentSpeed(kmphSpeed);

            // Process location update immediately for connected circle
            if (activeCircleIdRef.current) {
              processCircleLocationUpdate(activeCircleIdRef.current, {
                latitude,
                longitude,
                accuracy: position.coords.accuracy ?? null,
                speed: position.coords.speed !== null ? position.coords.speed : null,   //Test Case 4
              }).then((result) => {
                // Show auto-closing coordinate alert with full details
                setCoordinateAlert({
                  visible: true,
                  lat: latitude,
                  lng: longitude,
                  speed: position.coords.speed !== null ? position.coords.speed : null, // Store as kmph to match UI logic
                  accuracy: position.coords.accuracy ?? null,
                  name: result.name,
                });

                setTimeout(() => {
                  if (!cancelled) {
                    setCoordinateAlert((prev) => ({ ...prev, visible: false }));
                  }
                }, 5000); // Show for 5 seconds
              }).catch((err) => {
                console.warn("Location update failed for alert", err);
              });
            }

            setLocation(nextLocation);
            locationRef.current = nextLocation;
          }
        );

        if (cancelled) {
          subscription.remove();
        } else {
          locationWatchSubscriptionRef.current = subscription;
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to start foreground location watcher", error);
        }
      }
    };

    void ensureForegroundWatch();

    return () => {
      cancelled = true;
      if (locationWatchSubscriptionRef.current) {
        try {
          locationWatchSubscriptionRef.current.remove();
        } catch (error) {
          console.warn("Failed to remove location watcher", error);
        }
        locationWatchSubscriptionRef.current = null;
      }
    };
  }, []); // Remove dependency on driveDetectionEnabled to keep it fixed

  useEffect(() => {
    activeCircleIdRef.current = selectedCircle?.id ? String(selectedCircle.id) : null;
  }, [selectedCircle]);

  // 4. Update members when selection changes
  useEffect(() => {
    if (!selectedCircle) {
      setSelectedCircleMembers([]);
      return;
    }

    const members = extractCircleMembers(selectedCircle);
    setSelectedCircleMembers(members);

    if (!members.length) {
      fetchCircleMembers(selectedCircle.id);
    }
  }, [selectedCircle, fetchCircleMembers]);



  useEffect(() => {
    if (!isNativePlatform) {
      return;
    }

    let cancelled = false;

    const manageBackgroundLocationUpdates = async () => {
      try {
        if (!locationSharingEnabled || !selectedCircle) {
          const hasStarted = await isBackgroundLocationRunning();
          if (hasStarted) {
            await stopBackgroundLocation();
          }
          return;
        }

        // Check Permissions
        const foregroundPermissions = await Location.getForegroundPermissionsAsync();
        let foregroundStatus = foregroundPermissions.status;
        if (foregroundStatus !== "granted") {
          const request = await Location.requestForegroundPermissionsAsync();
          foregroundStatus = request.status;
          if (foregroundStatus !== "granted") {
            return;
          }
        }

        const backgroundPermissions = await Location.getBackgroundPermissionsAsync();
        let backgroundStatus = backgroundPermissions.status;
        if (backgroundStatus !== "granted") {
          const request = await Location.requestBackgroundPermissionsAsync();
          backgroundStatus = request.status;
          if (backgroundStatus !== "granted") {
            return;
          }
        }

        const hasStarted = await isBackgroundLocationRunning();
        if (!hasStarted) {
          await startBackgroundLocation();
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Background location setup failed", error);
        }
      }
    };

    void manageBackgroundLocationUpdates();

    return () => {
      cancelled = true;
    };
  }, [locationSharingEnabled, selectedCircle]);

  const circleMembersById = useMemo(() => {
    const map = new Map<string, CircleMember>();
    selectedCircleMembers.forEach((member) => {
      const memberId = resolveMemberId(member);
      if (memberId) {
        map.set(memberId, member);
      }
    });
    return map;
  }, [selectedCircleMembers]);

  const currentLocations = useMemo(() => extractCircleLocations(selectedCircle), [selectedCircle]);

  useEffect(() => {
    const circleId = normalizeIdentifier(selectedCircle?.id);
    if (!circleId) {
      return;
    }

    void cacheCircleLocations(circleId, currentLocations);
  }, [currentLocations, selectedCircle]);

  const locationOptions = useMemo<MemberLocationOption[]>(() => {
    return currentLocations
      .map((loc, index) => {
        const id = normalizeIdentifier(loc.id);
        if (!id) {
          return null;
        }

        let metadataAddress: string | undefined;
        if (loc.metadata && typeof loc.metadata === "object") {
          const addressValue = (loc.metadata as any).address;
          const formattedValue = (loc.metadata as any).formattedAddress;
          if (typeof addressValue === "string" && addressValue.trim().length > 0) {
            metadataAddress = addressValue.trim();
          } else if (typeof formattedValue === "string" && formattedValue.trim().length > 0) {
            metadataAddress = formattedValue.trim();
          }
        }

        const label =
          loc.name && loc.name.trim().length > 0
            ? loc.name.trim()
            : metadataAddress ?? `Place ${index + 1}`;
        const subtitle = metadataAddress ?? "Location Label";

        return {
          id,
          label,
          subtitle,
        };
      })
      .filter((item): item is MemberLocationOption => item !== null);
  }, [currentLocations]);

  const assignedLocationLabel = useMemo(() => {
    if (!selectedMemberLocationId) {
      return "None";
    }
    const match = locationOptions.find((option) => option.id === selectedMemberLocationId);
    return match?.label ?? "Unknown place";
  }, [locationOptions, selectedMemberLocationId]);

  const selectedLocationExists = useMemo(() => {
    if (!selectedMemberLocationId) {
      return true;
    }
    return locationOptions.some((option) => option.id === selectedMemberLocationId);
  }, [locationOptions, selectedMemberLocationId]);

  const currentCircleId = useMemo(() => normalizeIdentifier(selectedCircle?.id), [selectedCircle]);

  const currentAssignedEntry = useMemo(() => {
    if (!currentCircleId) {
      return null;
    }
    return assignedLocationsByCircle[currentCircleId] ?? null;
  }, [assignedLocationsByCircle, currentCircleId]);

  const currentUserAssignedLocationId = useMemo(() => {
    if (!currentAssignedEntry) {
      return null;
    }

    return (
      normalizeIdentifier(
        currentAssignedEntry.locationId ??
        currentAssignedEntry.locationPoint?.id ??
        currentAssignedEntry.raw?.location?.id ??
        currentAssignedEntry.raw?.locationId ??
        currentAssignedEntry.raw?.location_id
      ) ?? null
    );
  }, [currentAssignedEntry]);

  const handleLocationArrivalAlerts = useCallback((arrived: CachedCircleLocation[]) => {
    if (!notificationsEnabled) {
      return;
    }

    if (!arrived || arrived.length === 0) {
      return;
    }

    const assignedLocationId = currentUserAssignedLocationId;

    arrived.forEach((location) => {
      const normalizedId = normalizeIdentifier(location.id);
      const isAssignedLocation = assignedLocationId !== null && normalizedId === assignedLocationId;

      let label: string | undefined;
      if (typeof location.name === "string" && location.name.trim().length > 0) {
        label = location.name.trim();
      } else if (location.metadata && typeof location.metadata === "object") {
        const metadataRecord = location.metadata as Record<string, unknown>;
        const addressValue = metadataRecord.address;
        const formattedValue = metadataRecord.formattedAddress ?? (metadataRecord as any)?.formatted_address;
        if (typeof addressValue === "string" && addressValue.trim().length > 0) {
          label = addressValue.trim();
        } else if (typeof formattedValue === "string" && formattedValue.trim().length > 0) {
          label = formattedValue.trim();
        }
      }

      if (!label) {
        label = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
      }

      const title = isAssignedLocation ? "Assigned place reached" : "Circle place reached";
      const message = isAssignedLocation
        ? `You arrived at your assigned place${label ? `: ${label}` : ""}. We're notifying everyone in the circle.`
        : `You arrived at ${label}. We're notifying everyone in the circle.`;

      console.log({ title, message, type: 'info' });


      // showAlert({ title, message, type: 'info' });
    });
  }, [currentUserAssignedLocationId, notificationsEnabled, showAlert]);

  useEffect(() => {
    if (!locationSharingEnabled || !selectedCircle || !location) {
      return;
    }

    const circleId = normalizeIdentifier(selectedCircle.id);
    if (!circleId) {
      return;
    }

    void processCircleLocationUpdate(circleId, {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy ?? null,
    }, currentLocations, {
      onLocationsArrived: handleLocationArrivalAlerts,
    }).catch((error) => {
      console.warn("Location update failed", error);
    });
  }, [currentLocations, handleLocationArrivalAlerts, location, locationSharingEnabled, selectedCircle]);

  const assignedLocationDetails = useMemo<AssignedLocationDetails | null>(() => {
    if (!currentAssignedEntry) {
      return null;
    }

    const candidateId = currentUserAssignedLocationId;
    const matchingSavedLocation = candidateId
      ? currentLocations.find((loc) => normalizeIdentifier(loc.id) === candidateId)
      : undefined;

    const getMetadataAddress = (loc: LocationPoint | null | undefined) => {
      if (!loc?.metadata || typeof loc.metadata !== "object") {
        return undefined;
      }
      const meta = loc.metadata as Record<string, unknown>;
      const addressValue = meta.address;
      const formattedValue = meta.formattedAddress ?? (meta as any)?.formatted_address;
      if (typeof addressValue === "string" && addressValue.trim().length > 0) {
        return addressValue.trim();
      }
      if (typeof formattedValue === "string" && String(formattedValue).trim().length > 0) {
        return String(formattedValue).trim();
      }
      return undefined;
    };

    let label = "Assigned location";
    let subtitle: string | undefined;
    let coordinates: { latitude: number; longitude: number } | undefined;

    if (matchingSavedLocation) {
      label =
        (typeof matchingSavedLocation.name === "string" && matchingSavedLocation.name.trim().length > 0)
          ? matchingSavedLocation.name.trim()
          : getMetadataAddress(matchingSavedLocation) ?? label;
      coordinates = {
        latitude: matchingSavedLocation.latitude,
        longitude: matchingSavedLocation.longitude,
      };
      const savedSubtitle = getMetadataAddress(matchingSavedLocation);
      subtitle = savedSubtitle ?? `${matchingSavedLocation.latitude.toFixed(4)}, ${matchingSavedLocation.longitude.toFixed(4)}`;
    } else if (currentAssignedEntry.locationPoint) {
      const loc = currentAssignedEntry.locationPoint;
      label =
        (typeof loc.name === "string" && loc.name.trim().length > 0)
          ? loc.name.trim()
          : getMetadataAddress(loc) ?? label;
      coordinates = { latitude: loc.latitude, longitude: loc.longitude };
      const locationSubtitle = getMetadataAddress(loc);
      subtitle = locationSubtitle ?? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
    } else if (
      typeof currentAssignedEntry.latitude === "number" &&
      typeof currentAssignedEntry.longitude === "number"
    ) {
      coordinates = {
        latitude: currentAssignedEntry.latitude,
        longitude: currentAssignedEntry.longitude,
      };
      subtitle = `${currentAssignedEntry.latitude.toFixed(4)}, ${currentAssignedEntry.longitude.toFixed(4)}`;
    }

    return {
      label,
      subtitle,
      coordinates,
    };
  }, [currentAssignedEntry, currentLocations, currentUserAssignedLocationId]);

  const fallbackAssignedMarker = useMemo(() => {
    if (!currentAssignedEntry) {
      return null;
    }

    if (currentUserAssignedLocationId) {
      const existsInSaved = currentLocations.some(
        (loc) => normalizeIdentifier(loc.id) === currentUserAssignedLocationId
      );
      if (existsInSaved) {
        return null;
      }
    }

    if (currentAssignedEntry.locationPoint) {
      const { latitude, longitude } = currentAssignedEntry.locationPoint;
      if (isValidCoordinate(latitude, longitude)) {
        return {
          latitude,
          longitude,
          title: assignedLocationDetails?.label ??
            (typeof currentAssignedEntry.locationPoint.name === "string" && currentAssignedEntry.locationPoint.name.trim().length > 0
              ? currentAssignedEntry.locationPoint.name.trim()
              : "Assigned location"),
          subtitle: assignedLocationDetails?.subtitle,
          radius: getRadiusForLocation(currentAssignedEntry.locationPoint),
        };
      }
    }

    if (
      typeof currentAssignedEntry.latitude === "number" &&
      typeof currentAssignedEntry.longitude === "number" &&
      isValidCoordinate(currentAssignedEntry.latitude, currentAssignedEntry.longitude)
    ) {
      return {
        latitude: currentAssignedEntry.latitude,
        longitude: currentAssignedEntry.longitude,
        title: assignedLocationDetails?.label ?? "Assigned location",
        subtitle: assignedLocationDetails?.subtitle,
        radius: DEFAULT_LOCATION_RADIUS_METERS,
      };
    }

    return null;
  }, [assignedLocationDetails, currentAssignedEntry, currentLocations, currentUserAssignedLocationId]);

  const handleFocusAssignedLocation = useCallback(() => {
    if (!assignedLocationDetails?.coordinates) {
      return;
    }

    const { latitude, longitude } = assignedLocationDetails.coordinates;
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      800
    );
    setIsExpanded(true);
  }, [assignedLocationDetails, mapRef, setIsExpanded]);



  const {
    filteredDescending: locationHistoryFilteredDescending,
    polylineCoordinates: locationHistoryPolylineCoordinates,
    arrowMarkers: locationHistoryArrowMarkers,
    filterError: locationHistoryFilterError,
  } = useMemo(() => {
    if (!locationHistory.length) {
      return {
        filteredChronological: [],
        filteredDescending: [],
        polylineCoordinates: [] as { latitude: number; longitude: number }[],
        arrowMarkers: [] as { id: string; latitude: number; longitude: number; rotation: number }[],
        filterError: null as string | null,
      };
    }

    const sortedChronological = [...locationHistory].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return aTime - bTime;
    });

    const now = new Date();
    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;
    let filterError: string | null = null;

    switch (locationHistoryActiveFilter) {
      case "today": {
        rangeStart = toDateAtMidnight(now);
        rangeEnd = toDateAtEndOfDay(now);
        break;
      }
      case "yesterday": {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        rangeStart = toDateAtMidnight(yesterday);
        rangeEnd = toDateAtEndOfDay(yesterday);
        break;
      }
      case "this_week": {
        rangeStart = startOfWeekLocal(now);
        rangeEnd = toDateAtEndOfDay(now);
        break;
      }
      case "this_month": {
        rangeStart = startOfMonthLocal(now);
        rangeEnd = toDateAtEndOfDay(now);
        break;
      }
      case "custom": {
        const parsedStart = parseDateInput(locationHistoryCustomStart);
        const parsedEnd = parseDateInput(locationHistoryCustomEnd);
        if (!parsedStart || !parsedEnd) {
          filterError = "Enter valid dates in YYYY-MM-DD format.";
        } else if (parsedStart > parsedEnd) {
          filterError = "Start date must be before end date.";
        } else {
          rangeStart = toDateAtMidnight(parsedStart);
          rangeEnd = toDateAtEndOfDay(parsedEnd);
        }
        break;
      }
      default:
        rangeStart = null;
        rangeEnd = null;
        break;
    }

    const filteredChronological = sortedChronological.filter((entry) => {
      const entryDate = new Date(entry.createdAt);
      if (Number.isNaN(entryDate.getTime())) {
        return false;
      }
      if (rangeStart && entryDate < rangeStart) {
        return false;
      }
      if (rangeEnd && entryDate > rangeEnd) {
        return false;
      }
      return true;
    });

    const filteredDescending = [...filteredChronological].reverse();

    const polylineCoordinates = filteredChronological
      .map((entry) => {
        if (!Number.isFinite(entry.latitude) || !Number.isFinite(entry.longitude)) {
          return null;
        }
        return { latitude: entry.latitude, longitude: entry.longitude };
      })
      .filter((coord): coord is { latitude: number; longitude: number } => coord !== null);

    const arrowMarkers: { id: string; latitude: number; longitude: number; rotation: number }[] = [];
    if (filteredChronological.length >= 2) {
      for (let i = 1; i < filteredChronological.length; i += 1) {
        const prev = filteredChronological[i - 1];
        const curr = filteredChronological[i];
        if (!Number.isFinite(prev.latitude) || !Number.isFinite(prev.longitude)) {
          continue;
        }
        if (!Number.isFinite(curr.latitude) || !Number.isFinite(curr.longitude)) {
          continue;
        }
        const midpoint = {
          latitude: prev.latitude + (curr.latitude - prev.latitude) * 0.5,
          longitude: prev.longitude + (curr.longitude - prev.longitude) * 0.5,
        };
        arrowMarkers.push({
          id: `${prev.id}-${curr.id}`,
          latitude: midpoint.latitude,
          longitude: midpoint.longitude,
          rotation: calculateHeadingDegrees(prev, curr),
        });
      }
    }

    return {
      filteredChronological,
      filteredDescending,
      polylineCoordinates,
      arrowMarkers,
      filterError,
    };
  }, [
    locationHistory,
    locationHistoryActiveFilter,
    locationHistoryCustomEnd,
    locationHistoryCustomStart,
  ]);

  const locationHistoryMapInitialRegion = useMemo(() => {
    if (!locationHistoryPolylineCoordinates.length) {
      return null;
    }

    const latitudes = locationHistoryPolylineCoordinates.map((coord) => coord.latitude);
    const longitudes = locationHistoryPolylineCoordinates.map((coord) => coord.longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);

    const latitude = (minLat + maxLat) / 2;
    const longitude = (minLon + maxLon) / 2;
    const latitudeDelta = Math.max((maxLat - minLat) * 1.2, 0.01);
    const longitudeDelta = Math.max((maxLon - minLon) * 1.2, 0.01);

    return {
      latitude,
      longitude,
      latitudeDelta,
      longitudeDelta,
    };
  }, [locationHistoryPolylineCoordinates]);

  const batteryLevelPercent = useMemo(() => {
    if (currentUserBatteryLevel?.batteryLevel === undefined || currentUserBatteryLevel?.batteryLevel === null) {
      return null;
    }
    const numeric = Number(currentUserBatteryLevel.batteryLevel);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }, [currentUserBatteryLevel]);

  const batteryUpdatedAtLabel = useMemo(() => {
    const timestamp = currentUserBatteryLevel?.updatedAt;
    if (!timestamp) {
      return null;
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return formatToSLTime(date);
  }, [currentUserBatteryLevel]);

  useEffect(() => {
    if (!isLocationHistoryModalVisible) {
      setShouldRenderLocationHistoryMap(false);
      return;
    }

    const timeout = setTimeout(() => {
      setShouldRenderLocationHistoryMap(true);
    }, 120);

    return () => {
      clearTimeout(timeout);
    };
  }, [isLocationHistoryModalVisible]);

  useEffect(() => {
    if (!shouldRenderLocationHistoryMap) { // Changed from isLocationHistoryModalVisible
      return;
    }
    if (locationHistoryPolylineCoordinates.length < 2) {
      return;
    }
    if (!locationHistoryMapRef.current) {
      return;
    }
    const uniqueCoords = locationHistoryPolylineCoordinates.filter((coord, index, array) => {
      if (index === 0) {
        return true;
      }
      const prev = array[index - 1];
      return coord.latitude !== prev.latitude || coord.longitude !== prev.longitude;
    });
    if (!uniqueCoords.length) {
      return;
    }
    const timer = setTimeout(() => {
      locationHistoryMapRef.current?.fitToCoordinates(uniqueCoords, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }, 350);
    return () => {
      clearTimeout(timer);
    };
  }, [shouldRenderLocationHistoryMap, locationHistoryPolylineCoordinates]); // Changed from isLocationHistoryModalVisible

  const canEditMemberRole = useCallback(
    (member: CircleMember) => {
      if (!member) return false;
      const memberId = resolveMemberId(member);
      if (!memberId) return false;
      if (memberId === currentUserId) return false; // Cannot edit own role

      const memberRole = normalizeRole(member.Membership?.role);

      if (isCircleCreator) {
        // Creator can change anyone who is an admin or member
        return memberRole === "admin" || memberRole === "member";
      }

      if (currentMembershipRole === "admin") {
        // Admins can change anyone who is an admin or member
        return memberRole === "admin" || memberRole === "member";
      }

      return false;
    },
    [currentMembershipRole, currentUserId, isCircleCreator]
  );

  const canEditMemberNickname = useCallback(
    (member: CircleMember) => {
      if (!member) return false;
      const memberId = resolveMemberId(member);
      if (!memberId) return false;
      if (memberId === currentUserId) return true; // Can always edit own nickname

      const memberRole = normalizeRole(member.Membership?.role);

      if (isCircleCreator) {
        // Creator can edit nicknames for admins and members
        return memberRole === "admin" || memberRole === "member";
      }

      if (currentMembershipRole === "admin") {
        // Admins can edit nicknames for other admins and members
        return memberRole === "admin" || memberRole === "member";
      }

      return false;
    },
    [currentMembershipRole, currentUserId, isCircleCreator]
  );

  const canRemoveMember = useCallback(
    (member: CircleMember) => {
      if (!member || !selectedCircle) return false;
      const memberId = resolveMemberId(member);
      if (!memberId || memberId === currentUserId) return false;
      const memberRole = normalizeRole(member.Membership?.role);

      if (isCircleCreator) {
        // creator can change and edit admins and members
        return memberRole === "admin" || memberRole === "member";
      }

      if (currentMembershipRole === "admin") {
        // Admins can change creator and Members Details
        return memberRole === "creator" || memberRole === "member";
      }

      return false;
    },
    [currentMembershipRole, currentUserId, isCircleCreator, selectedCircle]
  );





  const executeRemoveMember = useCallback(
    async (member: CircleMember, memberId: string) => {
      if (!selectedCircle) return;
      const circleId = String(selectedCircle.id);

      try {
        setMemberRemovalLoadingId(memberId);
        const response = await authenticatedFetch(
          `${API_BASE_URL}/circles/${circleId}/members/${memberId}`,
          {
            method: "DELETE",
            headers: {
              accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Failed to remove member.");
        }

        await fetchCircleMembers(selectedCircle.id);
        await loadAssignedLocations(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not remove member.";
        showAlert({ title: "Remove failed", message, type: 'error' });
      } finally {
        setMemberRemovalLoadingId(null);
      }
    },
    [fetchCircleMembers, loadAssignedLocations, selectedCircle]
  );

  const confirmRemoveMember = useCallback(
    (member: CircleMember) => {
      const memberId = resolveMemberId(member);
      if (!memberId) return;

      if (!canRemoveMember(member)) {
        showAlert({ title: "Permission denied", message: "You do not have permission to remove this member.", type: 'warning' });
        return;
      }

      const memberName = member.Membership?.nickname || member.name || member.email || "this member";

      showAlert({
        title: "Remove member",
        message: `Are you sure you want to remove ${memberName} from this circle?`,
        type: 'confirmation',
        buttons: [
          { text: "Cancel", style: "cancel", onPress: () => { } },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => executeRemoveMember(member, memberId),
          },
        ]
      });
    },
    [canRemoveMember, executeRemoveMember]
  );


  // --- HANDLERS ---

  const handleOpenCirclesModal = useCallback(() => {
    setIsCirclesModalOpen(true);
  }, []);



  const handleOpenDriveDetectionModal = useCallback(() => {
    setIsDriveDetectionModalOpen(true);
    setIsSettingsModalOpen(false);
  }, []);







  const handleAddPeople = useCallback(() => {
    setIsCirclesModalOpen(true);
    setIsSettingsModalOpen(false);
  }, []);

  const handleOpenMemberJourneysModal = useCallback((member: CircleMember) => {
    const mId = member.id || member.userId;
    if (selectedCircle?.id && mId) {
      setSelectedMemberForJourneys(mId);
      setIsMemberJourneysModalOpen(true);
    }
  }, [selectedCircle]);
  const handleToggleAdminStatus = useCallback(async (userId: string, isAdmin: boolean) => {
    if (!selectedCircle) return;
    const desiredRole = isAdmin ? 'admin' : 'member';
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/circles/${selectedCircle.id}/members/${userId}/role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({ role: desiredRole }),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? "Failed to update role.");
      }

      await fetchCircleMembers(selectedCircle.id);
    } catch (error: any) {
      showAlert({ title: "Error", message: error.message || "Failed to update admin status.", type: 'error' });
      throw error;
    }
  }, [selectedCircle, fetchCircleMembers]);

  // Edit Member Modal - computed values and handlers
  const editMemberModalVisible = isEditMemberModalOpen;

  const canEditRoleInModal = memberBeingEdited ? canEditMemberRole(memberBeingEdited) : false;
  const canEditNicknameInModal = memberBeingEdited ? canEditMemberNickname(memberBeingEdited) : false;



  const openEditMemberModal = useCallback((member: CircleMember) => {
    setMemberBeingEdited(member);
    setEditedMemberRole(normalizeRole(member.Membership?.role) || 'member');
    setEditedMemberNickname(member.Membership?.nickname || '');
    setEditedMemberRelation(member.Membership?.metadata?.relation || 'Other');
    setSelectedMemberLocationId(resolveMembershipLocationId(member));
    setMemberModalError(null);
    setIsEditMemberModalOpen(true);
  }, []);

  const closeEditMemberModal = useCallback(() => {
    setIsEditMemberModalOpen(false);
    setMemberBeingEdited(null);
    setEditedMemberRole('member');
    setEditedMemberNickname('');
    setEditedMemberRelation('Other');
    setSelectedMemberLocationId(null);
    setMemberModalError(null);
  }, []);

  const handleSaveMemberChanges = useCallback(async () => {
    if (!selectedCircle || !memberBeingEdited || isSavingMemberChanges) return;

    const memberId = resolveMemberId(memberBeingEdited);
    if (!memberId) {
      setMemberModalError('Invalid member ID');
      return;
    }

    setMemberModalError(null);
    setIsSavingMemberChanges(true);

    try {
      const updates: any = {};

      // Update role if changed and allowed
      const currentRole = normalizeRole(memberBeingEdited.Membership?.role) || 'member';
      if (canEditRoleInModal && editedMemberRole !== currentRole) {
        updates.role = editedMemberRole;
      }

      // Update nickname if changed and allowed
      const currentNickname = memberBeingEdited.Membership?.nickname || '';
      if (canEditNicknameInModal && editedMemberNickname !== currentNickname) {
        updates.nickname = editedMemberNickname;
      }

      // Update relation if changed
      const currentRelation = memberBeingEdited.Membership?.metadata?.relation || 'Other';
      if (editedMemberRelation !== currentRelation) {
        updates.metadata = { ...(memberBeingEdited.Membership?.metadata || {}), relation: editedMemberRelation };
      }

      // Update location assignment if changed
      const currentLocationId = resolveMembershipLocationId(memberBeingEdited);
      if (selectedMemberLocationId !== currentLocationId) {
        updates.locationId = selectedMemberLocationId;
      }

      if (Object.keys(updates).length === 0) {
        setMemberModalError('No changes to save');
        return;
      }

      const response = await authenticatedFetch(
        `${API_BASE_URL}/circles/${selectedCircle.id}/members/${memberId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? 'Failed to update member');
      }

      await fetchCircleMembers(selectedCircle.id);
      showAlert({ title: 'Success', message: 'Member updated successfully', type: 'success' });
      closeEditMemberModal();
    } catch (error: any) {
      setMemberModalError(error.message || 'Failed to update member');
    } finally {
      setIsSavingMemberChanges(false);
    }
  }, [
    selectedCircle,
    memberBeingEdited,
    isSavingMemberChanges,
    canEditRoleInModal,
    canEditNicknameInModal,
    editedMemberRole,
    editedMemberNickname,
    editedMemberRelation,
    selectedMemberLocationId,
    fetchCircleMembers,
    showAlert,
    closeEditMemberModal,
  ]);

  const handleUpdateMyRelation = useCallback(async (newRelation: string) => {
    if (!selectedCircle || !currentMembership) return;

    const memberId = resolveMemberId(currentMembership);
    if (!memberId) return;

    try {
      const updates = {
        metadata: {
          ...(currentMembership.Membership?.metadata || {}),
          relation: newRelation,
        },
      };

      const response = await authenticatedFetch(
        `${API_BASE_URL}/circles/${selectedCircle.id}/members/${memberId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? 'Failed to update relation');
      }

      await fetchCircleMembers(selectedCircle.id);
      showAlert({ title: 'Success', message: 'Relation updated successfully', type: 'success' });
      setIsMyRoleModalOpen(false);
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message || 'Failed to update relation', type: 'error' });
    }
  }, [selectedCircle, currentMembership, fetchCircleMembers, showAlert]);

  const handleStartInviteFlow = () => {
    if (!selectedCircle) {
      showAlert({ title: "Select a circle", message: "Choose a circle first to invite new members.", type: 'info' });
      return;
    }
    setIsAddPeopleModalOpen(true);
  };

  const handleNavigateToAddPlace = () => {
    if (!selectedCircle) {
      showAlert({ title: "Select a circle", message: "Choose a circle before adding a place.", type: 'info' });
      return;
    }
    snapTo(MIN_HEIGHT);
    setIsExpanded(false);

    setAddPlaceMode('create');
    setEditingLocation(null);
    setIsAddPlaceModalOpen(true);
  };

  const handleEditSavedPlace = (locationPoint: LocationPoint) => {
    if (!selectedCircle) {
      showAlert({ title: "Select a circle", message: "Choose a circle before editing a place.", type: 'info' });
      return;
    }

    if (!canManageLocations) {
      showAlert({ title: "Permission denied", message: "You do not have permission to update saved places.", type: 'warning' });
      return;
    }

    const hasValidId = locationPoint?.id !== undefined && locationPoint?.id !== null && String(locationPoint.id).trim().length > 0;
    if (!hasValidId) {
      showAlert({ title: "Cannot edit place", message: "This saved location is missing an identifier and cannot be updated.", type: 'error' });
      return;
    }

    snapTo(MIN_HEIGHT);
    setIsExpanded(false);

    setAddPlaceMode('edit');
    setEditingLocation(locationPoint);
    setIsAddPlaceModalOpen(true);
  };

  const handleDeleteSavedPlace = (locationPoint: LocationPoint) => {
    if (!selectedCircle) {
      showAlert({ title: "Select a circle", message: "Choose a circle before deleting a place.", type: 'info' });
      return;
    }

    if (!canManageLocations) {
      showAlert({ title: "Permission denied", message: "You do not have permission to delete saved places.", type: 'warning' });
      return;
    }

    const hasValidId = locationPoint?.id !== undefined && locationPoint?.id !== null && String(locationPoint.id).trim().length > 0;
    if (!hasValidId) {
      showAlert({ title: "Cannot delete place", message: "This saved location is missing an identifier.", type: 'error' });
      return;
    }

    const locationId = String(locationPoint.id);
    const placeName = locationPoint.name || "this place";

    showAlert({
      title: "Delete Place",
      message: `Are you sure you want to delete "${placeName}"? This will also remove any user assignments to this place.`,
      type: 'confirmation',
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => { } },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const circleId = String(selectedCircle.id);
              const response = await authenticatedFetch(
                `${API_BASE_URL}/circles/${circleId}/locations/${locationId}`,
                {
                  method: "DELETE",
                  headers: {
                    accept: "application/json",
                  },
                }
              );

              if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.message ?? "Failed to delete location.");
              }

              // Refresh data
              await loadCircles(true);
              await loadAssignedLocations(true);
              showAlert({ title: "Success", message: "Location deleted successfully.", type: 'success' });

            } catch (error) {
              const message = error instanceof Error ? error.message : "Could not delete location.";
              showAlert({ title: "Delete failed", message, type: 'error' });
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    });
  };

  const handleSelectMemberLocation = useCallback((locationId: string | null) => {
    setSelectedMemberLocationId(locationId);
  }, []);

  const handleAddPlace = useCallback(() => {
    if (selectedCircle) {
      setAddPlaceMode('create');
      setEditingLocation(null);
      setIsAddPlaceModalOpen(true);
    }
  }, [selectedCircle]);

  const locationSelectionControls = useMemo(() => {
    if (!canManageLocations) {
      return (
        <Text style={styles.memberModalHelperText}>
          Assigned: {assignedLocationLabel}. Only circle admins can assign a saved place.
        </Text>
      );
    }

    if (!locationOptions.length) {
      return (
        <Text style={styles.memberModalHelperText}>
          Save a place for this circle to assign it here.
        </Text>
      );
    }

    return (
      <View style={styles.memberLocationOptionsWrapper}>
        <TouchableOpacity
          style={[
            styles.memberLocationOption,
            selectedMemberLocationId === null && styles.memberLocationOptionSelected,
          ]}
          onPress={() => handleSelectMemberLocation(null)}
        >
          <View style={styles.memberLocationOptionTextWrapper}>
            <Text style={styles.memberLocationOptionTitle}>No special place</Text>
            <Text style={styles.memberLocationOptionSubtitle}>
              Member will not be tied to a saved location.
            </Text>
          </View>
          <Ionicons
            name={selectedMemberLocationId === null ? "radio-button-on" : "radio-button-off"}
            size={20}
            color={selectedMemberLocationId === null ? COLORS.primary : COLORS.gray}
          />
        </TouchableOpacity>

        {locationOptions.map((option) => {
          const isSelected = selectedMemberLocationId === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.memberLocationOption, isSelected && styles.memberLocationOptionSelected]}
              onPress={() => handleSelectMemberLocation(option.id)}
            >
              <View style={styles.memberLocationOptionTextWrapper}>
                <Text style={styles.memberLocationOptionTitle}>{option.label}</Text>
                <Text style={styles.memberLocationOptionSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons
                name={isSelected ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={isSelected ? COLORS.primary : COLORS.gray}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }, [assignedLocationLabel, canManageLocations, handleSelectMemberLocation, locationOptions, selectedMemberLocationId]);



  const handleLogout = () => {

    showAlert({
      title: "Logout",
      message: "Are you sure?",
      type: 'confirmation',
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => { } },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              if (isNativePlatform) {
                try {
                  const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
                  if (hasStarted) {
                    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
                  }
                } catch (stopError) {
                  console.warn("Failed to stop background updates during logout", stopError);
                }
              }
              await AsyncStorage.removeItem(STORAGE_KEYS.lastSelectedCircleId).catch(() => undefined);
              await clearAllPostedLocations();
              await clearCircleLocationsCache();
              await clearLocationPresenceMap();
              await logout();
              router.replace("/screens/LogInScreen");
            } catch (error) {
              setLoading(false);
              const message = error instanceof Error ? error.message : "Could not log out.";
              showAlert({ title: "Logout failed", message, type: 'error' });
            }
          },
        },
      ]
    });
  };

  const handleOpenMapLayersModal = () => setIsMapStyleModalOpen(true);
  const handleLocateUser = useCallback(() => {
    const currentLoc = locationRef.current;
    if (currentLoc && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLoc.latitude,
        longitude: currentLoc.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    } else {
      showAlert({
        title: "Location unavailable",
        message: "We couldn't find your current location yet. Please make sure location services are enabled.",
        type: 'info'
      });
    }
  }, [showAlert]);



  const handleChangeMapStyle = (type: MapStyle) => {

    setMapLayerStyle(type);
    setIsMapStyleModalOpen(false);
    AsyncStorage.setItem(STORAGE_KEYS.mapStyle, type).catch(() => undefined);
  };

  const handleOpenChat = async () => {
    const url = 'sms:';
    try { await Linking.openURL(url); }
    catch { showAlert({ title: "Chat Unavailable", message: "Unable to open the messaging app.", type: 'warning' }); }
  };




  const handlePressSos = useCallback(() => {
    if (!selectedCircle) {
      showAlert({ title: "Select a circle", message: "Choose a circle before sending an SOS alert.", type: 'info' });
      return;
    }
    setIsSosModalOpen(true);
  }, [selectedCircle]);

  const handleCloseLocationHistoryModal = useCallback(() => {
    setIsLocationHistoryModalVisible(false);
  }, []);



  const fetchLocationHistory = useCallback(async () => {
    if (locationHistoryLoading) {
      return;
    }

    setLocationHistoryError(null);
    setLocationHistoryLoading(true);

    try {
      const params = new URLSearchParams({ limit: String(LOCATION_HISTORY_LIMIT), offset: "0" });
      const response = await authenticatedFetch(`${API_BASE_URL}/profile/location-history?${params.toString()}`, {
        headers: { accept: "application/json" },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.message ?? "Failed to load location history.";
        throw new Error(message);
      }

      const records = Array.isArray(payload?.data) ? payload.data : [];
      const normalized: LocationHistoryEntry[] = records
        .map((item: any): LocationHistoryEntry | null => {
          const lat = Number(item?.latitude ?? item?.lat);
          const lon = Number(item?.longitude ?? item?.lng);
          const createdAtRaw = asNonEmptyString(item?.createdAt) ?? asNonEmptyString(item?.created_at);
          if (!Number.isFinite(lat) || !Number.isFinite(lon) || !createdAtRaw) {
            return null;
          }
          return {
            id: asNonEmptyString(item?.id) ?? `${lat}-${lon}-${createdAtRaw}`,
            latitude: lat,
            longitude: lon,
            createdAt: createdAtRaw,
            name: asNonEmptyString(item?.name) ?? null,
            circleId: asNonEmptyString(item?.circleId) ?? asNonEmptyString(item?.circle_id) ?? null,
          };
        })
        .filter((entry: LocationHistoryEntry | null): entry is LocationHistoryEntry => entry !== null);

      setLocationHistory(normalized);

      if (records.length > 0) {
        const batteryCandidate = records.find((item: any) => item?.user?.batteryLevel)?.user?.batteryLevel;
        if (batteryCandidate) {
          const batteryData = batteryCandidate as Record<string, unknown>;
          setCurrentUserBatteryLevel({
            batteryLevel: typeof batteryData.level === "number" ? batteryData.level : Number(batteryData.level ?? NaN),
            deviceId: asNonEmptyString(batteryData.deviceId) ?? null,
            updatedAt: asNonEmptyString(batteryData.updatedAt) ?? null,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load location history.";
      setLocationHistoryError(message);
    } finally {
      setLocationHistoryLoading(false);
    }
  }, [locationHistoryLoading]);

  const handleOpenLocationHistoryModal = useCallback(() => {
    router.push('/screens/LocationHistoryScreen' as any);
  }, []);

  const handleSelectLocationHistoryFilter = useCallback((filterKey: LocationHistoryFilterKey) => {
    setLocationHistoryActiveFilter(filterKey);
    if (filterKey !== "custom") {
      setLocationHistoryCustomStart("");
      setLocationHistoryCustomEnd("");
    }
  }, []);

  const handleRefreshLocationHistory = useCallback(() => {
    void fetchLocationHistory();
  }, [fetchLocationHistory]);

  const renderLocationHistoryItem = useCallback(({ item }: { item: LocationHistoryEntry }) => {
    const timestampLabel = formatToSLTime(item.createdAt);

    return (
      <View style={styles.locationHistoryListItem}>
        <View style={styles.locationHistoryListItemHeader}>
          <Text style={styles.locationHistoryListItemTimestamp} numberOfLines={1}>
            {timestampLabel}
          </Text>
          {item.name ? (
            <Text style={styles.locationHistoryListItemName} numberOfLines={1}>
              {item.name}
            </Text>
          ) : null}
        </View>
        <Text style={styles.locationHistoryListItemCoords}>
          {`${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`}
        </Text>
        {item.circleId ? (
          <Text style={styles.locationHistoryListItemCircle}>{`Circle: ${item.circleId}`}</Text>
        ) : null}
      </View>
    );
  }, []);

  const locationHistoryKeyExtractor = useCallback((item: LocationHistoryEntry) => item.id, []);



  const handlePickProfileImage = useCallback(async () => {
    if (isSavingProfile || isPickingProfileImage) {
      return;
    }

    try {
      setProfileModalError(null);
      setIsPickingProfileImage(true);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        showAlert({ title: "Permission required", message: "Allow photo library access to update your profile picture.", type: 'warning' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;
      if (!uri) {
        return;
      }

      const mimeType = asset.mimeType ?? "image/jpeg";
      const fileName = asset.fileName ?? `avatar_${Date.now()}`;

      const preparedImage = await prepareImageAsWebp(uri, fileName, mimeType);

      setProfileAvatarPreview(preparedImage.uri);
      setProfileAvatarUpload(preparedImage);
    } catch (error) {
      console.warn("Failed to pick profile image", error);
      showAlert({ title: "Image error", message: "We couldn't open that image. Please try again.", type: 'error' });
    } finally {
      setIsPickingProfileImage(false);
    }
  }, [isPickingProfileImage, isSavingProfile]);

  const handleClearProfileImage = useCallback(() => {
    if (isSavingProfile) {
      return;
    }

    setProfileAvatarUpload(null);
    setProfileAvatarPreview(profileAvatarOriginal);
  }, [isSavingProfile, profileAvatarOriginal]);

  const handleInitiateEmailVerification = useCallback(async (email: string) => {
    try {
      // Use authenticated fetch if the user is logged in to associate the request with their account if needed
      // Or use the public endpoint if it's a generic verification
      const response = await authenticatedFetch(`${API_BASE_URL}/auth/initiate-email-verification`, { // Assuming an endpoint for adding/verifying
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        // Fallback to resend-email-verification if the above fails or doesn't exist, generic approach
        const fallbackResponse = await fetch(`${API_BASE_URL}/auth/resend-email-verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await fallbackResponse.json();
        if (!fallbackResponse.ok) throw new Error(data.message || "Failed to send verification code");
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to initiate email verification.";
      throw new Error(message);
    }
  }, []);

  const handleInitiatePhoneVerification = useCallback(async (phone: string) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/auth/initiate-phone-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to send verification code");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to initiate phone verification.";
      throw new Error(message);
    }
  }, []);

  const handleSubmitEmailVerification = useCallback(async (email: string, code: string) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Verification failed");

      // Refresh user profile here
      await fetchCurrentUserProfile();
      showAlert({ title: "Success", message: "Email verified successfully!", type: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed.";
      throw new Error(message);
    }
  }, [fetchCurrentUserProfile]);

  const handleSubmitPhoneVerification = useCallback(async (phone: string, code: string) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/auth/verify-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, code }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Verification failed");

      // Store tokens if returned (standard for phone login/verification as it might act as a login)
      if (data.token) {
        await storeTokens(data.token, data.refreshToken);
      }

      await fetchCurrentUserProfile();
      showAlert({ title: "Success", message: "Phone verified successfully!", type: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed.";
      throw new Error(message);
    }
  }, [fetchCurrentUserProfile]);

  const handleSubmitProfileUpdate = useCallback(async () => {
    if (isSavingProfile) return;

    setProfileModalError(null);
    setIsSavingProfile(true);

    try {
      const trimmedName = profileNameInput.trim();
      const trimmedMetadata = profileMetadataInput.trim();
      const payloadEntries: [string, string][] = [];
      if (trimmedName.length > 0) {
        payloadEntries.push(["name", trimmedName]);
      }
      if (trimmedMetadata.length > 0) {
        payloadEntries.push(["metadata", trimmedMetadata]);
      }

      const hasAvatarChange = Boolean(profileAvatarUpload);
      const hasFieldUpdates = payloadEntries.length > 0;

      if (!hasAvatarChange && !hasFieldUpdates) {
        setProfileModalError("Nothing to update.");
        return;
      }

      const requestOptions: RequestInit = {
        method: "PUT",
        headers: {
          accept: "application/json",
        },
      };

      if (hasAvatarChange) {
        const formData = new FormData();
        for (const [key, value] of payloadEntries) {
          formData.append(key, value);
        }
        formData.append(
          "profileImage",
          {
            uri: profileAvatarUpload!.uri,
            type: profileAvatarUpload!.type,
            name: profileAvatarUpload!.name,
          } as any
        );
        requestOptions.body = formData;
      } else {
        const jsonPayload: Record<string, string> = {};
        for (const [key, value] of payloadEntries) {
          jsonPayload[key] = value;
        }
        requestOptions.headers = {
          ...requestOptions.headers,
          "Content-Type": "application/json",
        };
        requestOptions.body = JSON.stringify(jsonPayload);
      }

      const response = await authenticatedFetch(`${API_BASE_URL}/profile`, requestOptions);

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.message ?? "Failed to update profile.";
        throw new Error(message);
      }


      setProfileAvatarUpload(null);
      showAlert({ title: "Profile updated", message: "Your profile details were saved.", type: 'success' });

      if (hasAvatarChange && profileAvatarUpload) {
        setProfileAvatarOriginal(profileAvatarUpload.uri);
        setProfileAvatarPreview(profileAvatarUpload.uri);
        setCurrentUserAvatarUrl(profileAvatarUpload.uri);
        if (currentUserId) {
          setSelectedCircleMembers((prevMembers) => {
            let changed = false;
            const updated = prevMembers.map((member) => {
              if (resolveMemberId(member) === currentUserId) {
                changed = true;
                return {
                  ...member,
                  avatar: profileAvatarUpload.uri,
                };
              }
              return member;
            });
            return changed ? updated : prevMembers;
          });
        }
      }

      if (selectedCircle?.id) {
        fetchCircleMembers(selectedCircle.id);
      } else {
        await loadCircles(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile.";
      setProfileModalError(message);
    } finally {
      setIsSavingProfile(false);
    }
  }, [currentUserId, fetchCircleMembers, isSavingProfile, loadCircles, profileAvatarUpload, profileMetadataInput, profileNameInput, selectedCircle]);

  const executeDeleteCircle = useCallback(async () => {
    if (!selectedCircle) {
      showAlert({ title: "No circle selected", message: "Select a circle before deleting.", type: 'info' });
      return;
    }

    if (isDeletingCircle) {
      return;
    }

    setIsDeletingCircle(true);

    try {
      const circleIdParam = typeof selectedCircle.id === "string" ? selectedCircle.id : String(selectedCircle.id);
      const response = await authenticatedFetch(`${API_BASE_URL}/circles/${circleIdParam}`, {
        method: "DELETE",
        headers: {
          accept: "application/json",
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.message ?? "Unable to delete this circle.";
        throw new Error(message);
      }

      await AsyncStorage.removeItem(STORAGE_KEYS.lastSelectedCircleId).catch(() => undefined);
      await removeLastPostedLocationForCircle(circleIdParam).catch(() => undefined);
      await removeCachedCircleLocations(circleIdParam);
      setSelectedCircle(null);
      setSelectedCircleMembers([]);
      setMemberAvatarUrls({});
      setMemberLocations({});
      setCircles((prev) => {
        const filtered = prev.filter((circle) => String(circle.id) !== circleIdParam);
        circlesRef.current = filtered;
        return filtered;
      });
      await loadCircles(true);
      await loadAssignedLocations(true);
      showAlert({ title: "Circle deleted", message: "The circle was deleted successfully.", type: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete this circle.";
      showAlert({ title: "Delete failed", message, type: 'error' });
    } finally {
      setIsDeletingCircle(false);

    }
  }, [isDeletingCircle, loadAssignedLocations, loadCircles, selectedCircle]);

  const executeLeaveCircle = useCallback(async () => {
    if (!selectedCircle) {
      showAlert({ title: "No circle selected", message: "Select a circle before leaving.", type: 'info' });
      return;
    }

    if (isLeavingCircle) {
      return;
    }

    setIsLeavingCircle(true);

    try {
      const circleIdParam = typeof selectedCircle.id === "string" ? selectedCircle.id : String(selectedCircle.id);
      const response = await authenticatedFetch(`${API_BASE_URL}/circles/${circleIdParam}/leave`, {
        method: "DELETE",
        headers: {
          accept: "application/json",
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.message ?? "Unable to leave this circle.";
        throw new Error(message);
      }

      await AsyncStorage.removeItem(STORAGE_KEYS.lastSelectedCircleId).catch(() => undefined);
      await removeLastPostedLocationForCircle(circleIdParam).catch(() => undefined);
      setSelectedCircle(null);
      setSelectedCircleMembers([]);
      setMemberAvatarUrls({});
      setMemberLocations({});
      await loadCircles(true);
      await loadAssignedLocations(true);
      await removeCachedCircleLocations(circleIdParam);
      showAlert({ title: "Circle left", message: "You have left the circle successfully.", type: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to leave this circle.";
      showAlert({ title: "Leave failed", message, type: 'error' });
    } finally {
      setIsLeavingCircle(false);

    }
  }, [isLeavingCircle, loadAssignedLocations, loadCircles, selectedCircle]);

  const handleDeleteCircle = useCallback(() => {
    if (!selectedCircle) {
      showAlert({ title: "No circle selected", message: "Select a circle before deleting.", type: 'info' });
      return;
    }


    const circleName = selectedCircle?.name ?? "this circle";
    showAlert({
      title: "Delete circle",
      message: `Deleting ${circleName} will remove the circle for every member. This action cannot be undone.`,
      type: 'confirmation',
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => { } },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void executeDeleteCircle();
          },
        },
      ]
    });
  }, [executeDeleteCircle, selectedCircle]);

  const handleLeaveCircle = useCallback(() => {
    if (!selectedCircle) {
      showAlert({ title: "No circle selected", message: "Select a circle before leaving.", type: 'info' });
      return;
    }


    const circleName = selectedCircle?.name ?? "this circle";

    if (isCircleCreator) {
      showAlert({
        title: "Cannot Leave Circle",
        message: "You are the creator of this circle. Creators cannot leave their own circle. If you wish to remove it for everyone, please use the 'Delete Circle' option in Circle Management.",
        type: 'warning'
      });
      return;
    }

    // Check if current user is an admin and if they are the only admin
    const isAdmin = currentMembershipRole === "admin";
    if (isAdmin) {
      const otherAdmins = selectedCircleMembers.filter((m) => {
        const mId = resolveMemberId(m);
        // exclude self
        if (mId === currentUserId) return false;
        // check role
        const role = normalizeRole(m.Membership?.role);
        return role === "admin";
      });

      if (otherAdmins.length === 0) {
        showAlert({
          title: "Cannot Leave Circle",
          message: "You are the only admin in this circle. Please appoint another member as an admin before leaving to ensure the circle can still be managed.",
          type: 'warning'
        });
        return;
      }
    }

    showAlert({
      title: "Leave circle",
      message: `Are you sure you want to leave ${circleName}?`,
      type: 'confirmation',
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => { } },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            void executeLeaveCircle();
          },
        },
      ]
    });
  }, [executeLeaveCircle, selectedCircle, isCircleCreator, currentMembershipRole, selectedCircleMembers, currentUserId]);

  // --- RENDER HELPERS ---

  // Fetch circle history and update members
  const fetchCircleHistory = useCallback(async (circleId: string) => {
    if (!circleId) return;
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/circles/${circleId}/history?page=1&perPage=100`);
      if (response.ok) {
        const payload = await response.json();
        const historyData = payload?.data;
        if (historyData) {
          const membersWithHistory = historyData.members || [];
          const creatorData = historyData.creator;

          // Map history data to a lookup
          const historyMap = new Map();

          if (creatorData) {
            historyMap.set(creatorData.id, creatorData.journeys || []);
          }

          membersWithHistory.forEach((m: any) => {
            historyMap.set(m.id, m.journeys || []);
          });

          // Update selectedCircleMembers with new journey data
          setSelectedCircleMembers(prev => prev.map(member => {
            const memberId = resolveMemberId(member);
            if (memberId && historyMap.has(memberId)) {
              return { ...member, journeys: historyMap.get(memberId) };
            }
            return member;
          }));
        }
      }
    } catch (error) {
      console.warn("Failed to fetch circle history", error);
    }
  }, []);

  // Effect to fetch history when circle changes
  useEffect(() => {
    if (selectedCircle?.id) {
      const circleId = String(selectedCircle.id);
      void fetchCircleHistory(circleId);
    }
  }, [selectedCircle?.id, fetchCircleHistory]);

  const mapStylesList: { key: MapStyle; label: string; icon: string; previewColor: string }[] = [
    { key: 'standard', label: 'Standard', icon: 'map', previewColor: '#84CC16' },
    { key: 'satellite', label: 'Satellite', icon: 'image', previewColor: '#FBBF24' },
    { key: 'hybrid', label: 'Hybrid', icon: 'map-outline', previewColor: '#60A5FA' },
    { key: 'terrain', label: 'Terrain', icon: 'earth', previewColor: '#34D399' }
  ];

  const savedPlaces = currentLocations;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }



  // Fallback location if permissions denied (e.g., center of map)
  const mapRegion = location ? {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : {
    latitude: 6.9271, // Default (e.g., Colombo)
    longitude: 79.8612,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const membershipNickname = currentMembership?.Membership?.nickname;
  const resolvedNickname = asNonEmptyString(membershipNickname);
  const membershipName = asNonEmptyString(currentMembership?.name);
  const userDisplayName = resolvedNickname ?? membershipName ?? "You";
  const userAccuracyRadius =
    location && typeof location.accuracy === "number" && Number.isFinite(location.accuracy) && location.accuracy > 0
      ? Math.min(Math.max(location.accuracy, 25), MAX_USER_ACCURACY_RADIUS)
      : null;

  // Fetch a specific member's location history (today)
  // const fetchMemberLocationHistory = async (memberId: string) => {
  //   setLocationHistoryError(null);
  //   setLocationHistoryLoading(true);
  //   try {
  //     const params = new URLSearchParams({limit: String(LOCATION_HISTORY_LIMIT), offset: "0", filter: "today", userId: memberId });
  //     const response = await authenticatedFetch(`${API_BASE_URL}/profile/location-history?${params.toString()}`, {
  //       headers: {accept: "application/json" },
  //     });
  //     const payload = await response.json().catch(() => ({ }));
  //     if (!response.ok) {
  //       const message = payload?.message ?? "Failed to load location history.";
  //       throw new Error(message);
  //     }
  //     const records = Array.isArray(payload?.data) ? payload.data : [];
  //     const normalized: LocationHistoryEntry[] = records
  //       .map((item: any): LocationHistoryEntry | null => {
  //         const lat = Number(item?.latitude ?? item?.lat);
  //         const lon = Number(item?.longitude ?? item?.lng);
  //         const createdAtRaw = asNonEmptyString(item?.createdAt) ?? asNonEmptyString(item?.created_at);
  //         if (!Number.isFinite(lat) || !Number.isFinite(lon) || !createdAtRaw) {
  //           return null;
  //         }
  //         return {
  //           id: asNonEmptyString(item?.id) ?? `${lat}-${lon}-${createdAtRaw}`,
  //           latitude: lat,
  //           longitude: lon,
  //           createdAt: createdAtRaw,
  //           name: asNonEmptyString(item?.name) ?? null,
  //           circleId: asNonEmptyString(item?.circleId) ?? asNonEmptyString(item?.circle_id) ?? null,
  //         };
  //       })
  //       .filter((entry: LocationHistoryEntry | null): entry is LocationHistoryEntry => entry !== null);
  //     setLocationHistory(normalized);
  //     setLocationHistoryActiveFilter("today");
  //     setIsLocationHistoryModalVisible(true);
  //   } catch (error) {
  //     const message = error instanceof Error ? error.message : "Failed to load location history.";
  //     setLocationHistoryError(message);
  //   } finally {
  //     setLocationHistoryLoading(false);
  //   }
  // };


  const renderMemberMarker = (
    memberId: string | null,
    coordinate: UserLocation | null | undefined,
    isCurrentUser: boolean
  ): React.ReactElement | null => {
    if (!coordinate || !isValidCoordinate(coordinate.latitude, coordinate.longitude)) {
      return null;
    }

    const memberRecord = memberId ? circleMembersById.get(memberId) : undefined;
    const displayName = isCurrentUser
      ? userDisplayName || "You"
      : (memberRecord as any)?.Membership?.nickname || memberRecord?.name || (memberRecord as any)?.email || "Circle member";

    const safeMemberId = memberId ?? (isCurrentUser ? "current-user" : null);
    const fallbackSeed = (memberRecord as any)?.email ?? memberRecord?.name ?? (memberRecord as any)?.Membership?.nickname ?? safeMemberId ?? displayName ?? "member";
    const avatarCandidate = isCurrentUser ? currentUserAvatarUrl : memberId ? memberAvatarUrls[memberId] : null;
    let resolvedAvatar = typeof avatarCandidate === "string" && avatarCandidate.trim().length > 0 ? avatarCandidate.trim() : null;

    if (resolvedAvatar && resolvedAvatar.startsWith("/")) {
      resolvedAvatar = `${API_BASE_URL}${resolvedAvatar}`;
    }
    if (resolvedAvatar) {
      resolvedAvatar = resolvedAvatar.replace("/api/uploads", "/uploads");
    }
    resolvedAvatar = resolvedAvatar ?? `${DEFAULT_MEMBER_AVATAR}${encodeURIComponent(fallbackSeed)}`;

    const memberBatteryInfo = memberRecord?.batteryLevel ?? null;
    const effectiveBatteryInfo = isCurrentUser ? currentUserBatteryLevel ?? memberBatteryInfo : memberBatteryInfo;
    const batteryValue = (function () {
      const match = coordinate?.battery?.match(/(\d+)/);
      if (match) return parseInt(match[1], 10);
      if (effectiveBatteryInfo?.batteryLevel != null) return Math.round(effectiveBatteryInfo.batteryLevel);
      return 100;
    })();

    return (
      <MemberMarker
        key={safeMemberId ? `member-marker-${safeMemberId}` : `marker-${coordinate.latitude}-${coordinate.longitude}`}
        memberId={memberId}
        coordinate={coordinate}
        displayName={displayName}
        avatarUrl={resolvedAvatar}
        batteryLevel={batteryValue}
        speed={isCurrentUser ? currentSpeed ?? 0 : coordinate.speed ?? 0}
        isCurrentUser={isCurrentUser}
        relation={(memberRecord as any)?.Membership?.metadata?.relation}
        onLongPress={() => !isCurrentUser && memberRecord && handleOpenMemberJourneysModal(memberRecord)}
      />
    );
  };

  // Helper to keep the render function clean
  const getBatteryIconName = (val: number | null) => {
    if (val === null) return "battery-unknown";
    if (val >= 95) return "battery";
    const levels = [90, 80, 70, 60, 50, 40, 30, 20, 10];
    for (const l of levels) { if (val >= l - 5) return `battery-${l}`; }
    return "battery-10";
  };



  // const renderMemberMarker = (
  //   memberId: string | null,
  //   coordinate: UserLocation | null | undefined,
  //   isCurrentUser: boolean
  // ): React.ReactElement | null => {
  //   if (!coordinate || !isValidCoordinate(coordinate.latitude, coordinate.longitude)) {
  //     return null;
  //   }

  //   const safeMemberId = memberId ?? (isCurrentUser ? "current-user" : null);
  //   const memberRecord = memberId ? circleMembersById.get(memberId) : undefined;

  //   const displayName = isCurrentUser
  //     ? userDisplayName || "You"
  //     : memberRecord?.Membership?.nickname || memberRecord?.name || memberRecord?.email || "Circle member";

  //   if (memberRecord) {
  //     console.log(`[MarkerRecord] ${displayName} battery:`, JSON.stringify(memberRecord));
  //   }
  //   const fallbackSeed =
  //     memberRecord?.email ??
  //     memberRecord?.name ??
  //     memberRecord?.Membership?.nickname ??
  //     safeMemberId ??
  //     displayName ??
  //     "member";
  //   const avatarCandidate = isCurrentUser
  //     ? currentUserAvatarUrl
  //     : memberId
  //       ? memberAvatarUrls[memberId]
  //       : null;

  //   let tempAvatar = null;
  //   if (typeof avatarCandidate === "string" && avatarCandidate.trim().length > 0) {
  //     const trimmed = avatarCandidate.trim();
  //     if (trimmed.startsWith("http") || trimmed.startsWith("file:")) {
  //       tempAvatar = trimmed;
  //     } else {
  //       const relative = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  //       tempAvatar = `${API_BASE_URL}${relative}`.replace("/api/uploads", "/uploads");
  //     }
  //   }

  //   const resolvedAvatar = tempAvatar ?? `${DEFAULT_MEMBER_AVATAR}${encodeURIComponent(fallbackSeed)}`;

  //   const memberBatteryInfo = memberRecord?.batteryLevel ?? null;
  //   const effectiveBatteryInfo = isCurrentUser
  //     ? currentUserBatteryLevel ?? memberBatteryInfo
  //     : memberBatteryInfo;
  //   const batteryPercent = (() => {
  //     if (effectiveBatteryInfo) {
  //       console.log(`[MarkerBattery] ${displayName} info:`, JSON.stringify(effectiveBatteryInfo));
  //     }
  //     return effectiveBatteryInfo && typeof effectiveBatteryInfo.batteryLevel === "number" && Number.isFinite(effectiveBatteryInfo.batteryLevel)
  //       ? Math.max(0, Math.min(100, Math.round(effectiveBatteryInfo.batteryLevel)))
  //       : null;
  //   })();

  //   const markerKey = safeMemberId
  //     ? `member-marker-${safeMemberId}`
  //     : `member-marker-${Math.round(coordinate.latitude * 1e6)}-${Math.round(coordinate.longitude * 1e6)}`;

  //   const markerLabel = isCurrentUser ? "You" : displayName;
  //   const initialsSource = displayName || fallbackSeed;

  //   return (
  //     <Marker
  //       key={markerKey}
  //       coordinate={{ latitude: coordinate.latitude, longitude: coordinate.longitude }}
  //       anchor={{ x: 0.5, y: 1 }}
  //       title={displayName}
  //       zIndex={isCurrentUser ? 3 : 2}
  //       onPress={() => {
  //         const isReallyCurrentUser = isCurrentUser || (currentUserId && memberId === currentUserId);
  //         if (isReallyCurrentUser) {
  //           return;
  //         }
  //         if (memberRecord) {
  //           handleOpenMemberJourneysModal(memberRecord);
  //         }
  //       }}
  //     >
  //       <View style={{ alignItems: 'center', justifyContent: 'center' }}>
  //         {/* Avatar Circle */}
  //         <View style={{
  //           width: 33,
  //           height: 33,
  //           borderRadius: 28,
  //           borderWidth: 3,
  //           borderColor: isCurrentUser ? "#2563EB" : "#22C55E",
  //           backgroundColor: 'white',
  //           overflow: 'hidden',
  //           shadowColor: "#000",
  //           shadowOffset: { width: 0, height: 2 },
  //           shadowOpacity: 0.3,
  //           shadowRadius: 3,
  //           elevation: 5,
  //           alignItems: 'center',
  //           justifyContent: 'center',
  //         }}>
  //           <Image
  //             source={{ uri: resolvedAvatar }}
  //             style={{ width: '100%', height: '100%' }}
  //             resizeMode="cover"
  //           />
  //         </View>

  //         {/* Pointer Triangle */}
  //         <View style={{
  //           width: 0,
  //           height: 0,
  //           backgroundColor: 'transparent',
  //           borderStyle: 'solid',
  //           borderLeftWidth: 6,
  //           borderRightWidth: 6,
  //           borderTopWidth: 8,
  //           borderLeftColor: 'transparent',
  //           borderRightColor: 'transparent',
  //           borderTopColor: isCurrentUser ? "#2563EB" : "#22C55E",
  //           marginTop: -2,
  //           shadowColor: '#000',
  //           shadowOffset: { width: 0, height: 1 },
  //           shadowOpacity: 0.2,
  //           shadowRadius: 1,
  //           elevation: 2,
  //         }} />

  //         {/* Battery Badge */}
  //         {batteryPercent !== null && (
  //           <View style={{
  //             position: 'absolute',
  //             top: -4,
  //             right: -4,
  //             backgroundColor: 'white',
  //             borderRadius: 10,
  //             borderWidth: 2,
  //             borderColor: isCurrentUser ? "#2563EB" : "#22C55E",
  //             paddingHorizontal: 4,
  //             paddingVertical: 1,
  //             alignItems: 'center',
  //             justifyContent: 'center',
  //             elevation: 6,
  //             shadowColor: "#000",
  //             shadowOffset: { width: 0, height: 1 },
  //             shadowOpacity: 0.2,
  //             shadowRadius: 1,
  //           }}>
  //             <Text style={{ fontSize: 9, fontWeight: '800', color: 'black' }}>
  //               {batteryPercent}%
  //             </Text>
  //           </View>
  //         )}
  //       </View>
  //     </Marker>
  //   );
  // };


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top + 24}
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* --- MAP LAYER --- */}
        <MapView
          ref={mapRef}
          style={[styles.map, { paddingBottom: MIN_HEIGHT }]}
          initialRegion={mapRegion}
          mapType={mapLayerStyle}
          showsUserLocation={false}
          showsCompass={false}
          showsMyLocationButton={false}
          onRegionChangeComplete={(region) => {

            if (region.latitudeDelta < 0.02) {
              if (mapLayerStyle !== 'satellite') {
                setMapLayerStyle('satellite');
              }
            } else {
              if (mapLayerStyle === 'satellite') {
                setMapLayerStyle('standard');
              }
            }
          }}
        >
          <UrlTile
            urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maximumZ={19}
            flipY={false}
          />
          {location && userAccuracyRadius ? (
            <Circle
              key="user-accuracy-circle"
              center={{ latitude: location.latitude, longitude: location.longitude }}
              radius={userAccuracyRadius}
              strokeColor={USER_ACCURACY_STROKE_COLOR}
              fillColor={USER_ACCURACY_FILL_COLOR}
              strokeWidth={1.5}
            />
          ) : null}

          {/* Render Member Journeys (Polylines) */}


          {/* Render OTHER member markers */}
          {Object.entries(memberLocations)
            .filter(([mid]) => mid !== currentUserId)
            .map(([memberId, coords]) => {
              return renderMemberMarker(memberId, coords, false);
            })}

          {/* Render LOGGED-IN user marker separately for stability */}
          {location && renderMemberMarker(currentUserId, location, true)}

          {currentLocations.flatMap((loc: LocationPoint, index: number) => {
            let metadataAddress: string | undefined;
            if (loc.metadata && typeof loc.metadata === "object") {
              const metadataRecord = loc.metadata as Record<string, unknown>;
              const addressValue = metadataRecord.address;
              const formattedValue = metadataRecord.formattedAddress;
              if (typeof addressValue === "string" && addressValue.trim().length > 0) {
                metadataAddress = addressValue.trim();
              } else if (typeof formattedValue === "string" && formattedValue.trim().length > 0) {
                metadataAddress = formattedValue.trim();
              }
            }

            let markerTitle = "Saved Place";
            if (typeof loc.name === "string" && loc.name.trim().length > 0) {
              markerTitle = loc.name.trim();
            } else if (metadataAddress) {
              markerTitle = metadataAddress;
            }

            let markerDescription: string | undefined;
            if (metadataAddress && metadataAddress !== markerTitle) {
              markerDescription = metadataAddress;
            }

            const markerKey = loc.id ? `loc-${loc.id}` : `loc-${index}`;
            const circleKey = `${markerKey}-circle`;
            const markerNodeKey = `${markerKey}-marker`;
            const circleRadius = getRadiusForLocation(loc);
            const normalizedId = normalizeIdentifier(loc.id);
            const isAssignedToCurrentUser =
              currentUserAssignedLocationId !== null && normalizedId !== null && normalizedId === currentUserAssignedLocationId;

            const assignedSubtitle = isAssignedToCurrentUser ? "Assigned to you" : undefined;
            const calloutDescription = assignedSubtitle
              ? markerDescription
                ? `${markerDescription}\n${assignedSubtitle}`
                : assignedSubtitle
              : markerDescription;

            return (
              <LocationMarker
                key={markerKey}
                coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                title={markerTitle}
                description={calloutDescription}
                radius={circleRadius}
                placeType={(loc.metadata as any)?.placeType}
                locationType={(loc.metadata as any)?.locationType}
                isAssignedToCurrentUser={isAssignedToCurrentUser}
              />
            );
          })}

          {fallbackAssignedMarker
            ? [
              <Circle
                key="assigned-fallback-circle"
                center={{
                  latitude: fallbackAssignedMarker.latitude,
                  longitude: fallbackAssignedMarker.longitude,
                }}
                radius={fallbackAssignedMarker.radius ?? DEFAULT_LOCATION_RADIUS_METERS}
                strokeColor={ASSIGNED_LOCATION_STROKE_COLOR}
                fillColor={ASSIGNED_LOCATION_FILL_COLOR}
                strokeWidth={2}
              />,
              <Marker
                key="assigned-fallback-marker"
                identifier="assigned-fallback"
                coordinate={{
                  latitude: fallbackAssignedMarker.latitude,
                  longitude: fallbackAssignedMarker.longitude,
                }}
                title={fallbackAssignedMarker.title}
                description={fallbackAssignedMarker.subtitle ? `${fallbackAssignedMarker.subtitle}\nAssigned to you` : "Assigned to you"}
                zIndex={2}
                anchor={{ x: 0.5, y: 1 }}
              >
                <Ionicons name="star" size={30} color="#FACC15" />
              </Marker>,
            ]
            : null}

        </MapView>

        {/* --- TOP HEADER --- */}
        <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.roundButton} onPress={handleOpenSettingsModal}>
            <Ionicons name="settings-sharp" size={24} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.circleSelector} onPress={handleOpenCirclesModal} activeOpacity={0.9}>
            <View style={styles.selectorTextContainer}>

              <Text style={styles.circleName} numberOfLines={1}>
                {selectedCircle ? selectedCircle.name : (circles.length === 0 ? "No Circle" : "Select Circle")}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={{ gap: 10 }}>
            <TouchableOpacity style={styles.roundButton} onPress={handleOpenNotificationsModal}>
              <NotificationIcon width={22} height={22} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.roundButton} onPress={handleOpenChat}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- FLOATING MAP BUTTONS --- */}
        <Animated.View
          style={[
            styles.floatingControlsContainer,
            { bottom: Animated.add(sheetHeight, 20) }
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
            <TouchableOpacity onPress={handleNavigateToAddPlace}>
              <CheckInIcon />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePressSos}
            >
              <SosIcon />
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: 'center', gap: 10 }}>
            <TouchableOpacity style={styles.roundButtonSmall} onPress={handleLocateUser}>
              <MyLocationIcon />
            </TouchableOpacity>

            <TouchableOpacity style={styles.roundButtonSmall} onPress={handleOpenMapLayersModal}>
              <Ionicons name="layers" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>


        </Animated.View>



        {/* Modals replaced by Screen navigation */}

        {/* --- UNIFIED BOTTOM SHEET (Content and Nav) --- */}
        <Animated.View style={[styles.unifiedSheet, { height: sheetHeight, paddingBottom: insets.bottom + keyboardHeight }]}>
          <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <View style={{ flex: 1, width: '100%' }}>
            {activeTab === "Location" ? (
              <ScrollView
                ref={sheetScrollRef}
                contentContainerStyle={styles.sheetContent}
                showsVerticalScrollIndicator={false}
                scrollEnabled={isExpanded}
                keyboardShouldPersistTaps="handled"
              >
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 16, gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      width: 101, height: 38, borderRadius: 23.5,
                      backgroundColor: activeSection === 'members' ? COLORS.primary : '#DBEAFE',
                      alignItems: 'center', justifyContent: 'center'
                    }}
                    onPress={() => {
                      scrollToSection('members');
                      setActiveSection('members');
                    }}
                  >
                    <Ionicons name="people" size={20} color={activeSection === 'members' ? COLORS.white : COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      width: 101, height: 38, borderRadius: 23.5,
                      backgroundColor: activeSection === 'place' ? COLORS.primary : '#DBEAFE',
                      alignItems: 'center', justifyContent: 'center'
                    }}
                    onPress={() => {
                      scrollToSection('place');
                      setActiveSection('place');
                    }}
                  >
                    <MaterialCommunityIcons name="office-building" size={20} color={activeSection === 'place' ? COLORS.white : COLORS.primary} />
                  </TouchableOpacity>

                </View>

                {/* Members Section */}
                <View style={{ height: 1 }} onLayout={e => { sectionPositions['members'] = e.nativeEvent.layout.y; }} />

                {/* <TouchableOpacity style={styles.listItem} onPress={handleStartInviteFlow}>
                  <View style={[styles.listIconCircle, { borderStyle: 'dashed', borderColor: COLORS.primary }]}>
                    <Ionicons name="add" size={24} color={COLORS.primary} />
                  </View>
                  <Text style={styles.listItemText}>Add a new member</Text>
                </TouchableOpacity> */}

                {selectedCircleMembers.map((member) => {
                  const memberId = resolveMemberId(member);
                  const displayName = member.Membership?.nickname || member.name || member.email || "Unknown Member";
                  const memberRole = normalizeRole(member.Membership?.role) ?? "member";
                  const roleLabel = formatRoleLabel(memberRole);
                  const nicknameLabel = member.Membership?.nickname;
                  const fallbackSeed = member.email || member.name || (memberId ?? displayName);
                  let normalizedMemberAvatar = null;
                  if (typeof member.avatar === "string" && member.avatar.trim().length > 0) {
                    const trimmed = member.avatar.trim();
                    if (trimmed.startsWith("http") || trimmed.startsWith("file:")) {
                      normalizedMemberAvatar = trimmed;
                    } else {
                      // Relative path - ensure it starts with / and prepend base URL
                      const relative = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
                      normalizedMemberAvatar = `${API_BASE_URL}${relative}`.replace("/api/uploads", "/uploads");
                    }
                  }

                  // Debug log


                  const selfAvatarFallback =
                    memberId && currentUserId && memberId === currentUserId && currentUserAvatarUrl
                      ? currentUserAvatarUrl
                      : null;
                  const avatarUri =
                    normalizedMemberAvatar ??
                    selfAvatarFallback ??
                    `${DEFAULT_MEMBER_AVATAR}${encodeURIComponent(fallbackSeed)}`;

                  console.log(`[MemberRendering] ${displayName}: raw=${member.avatar}, final=${avatarUri}, base=${API_BASE_URL}`);



                  const memberKey = memberId ?? member.email ?? `${displayName}-${memberRole}`;
                  const allowEdit = canEditMemberRole(member) || canEditMemberNickname(member);
                  const allowRemove = canRemoveMember(member);
                  const isRemoving = memberRemovalLoadingId === memberId;

                  return (
                    <View key={memberKey} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
                      <View style={{ marginRight: 16 }}>
                        <View style={{
                          width: 56, height: 56, borderRadius: 28,
                          backgroundColor: '#1E40AF', justifyContent: 'center', alignItems: 'center',
                          overflow: 'hidden'
                        }}>
                          <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        </View>
                        {/* Battery Badge */}
                        {/* We can add battery here if we had it easily accessible in scope (it is in rendering logic above which I replaced, wait, I need to fetch it) */}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E3A8A' }}>{displayName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <View style={{
                            width: 8, height: 8, borderRadius: 4,
                            backgroundColor: (member as any).status === "Online" ? "#22C55E" : "#9CA3AF",
                            marginRight: 6
                          }} />
                          <Text style={{ fontSize: 13, color: '#3B82F6' }}>
                            {roleLabel} {member.Membership?.metadata?.relation ? `• ${member.Membership.metadata.relation}` : ''}
                            {(member as any).status && ` • ${(member as any).status}`}
                          </Text>
                        </View>
                        {(member as any).locationText && (
                          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
                            {(member as any).locationText}
                          </Text>
                        )}
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                          style={{ padding: 8 }}
                          onPress={() => handleOpenMemberJourneysModal(member)}
                        >
                          <Ionicons name="car-sport-outline" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                        {(allowEdit || allowRemove) && (
                          <>
                            {allowEdit && (
                              <TouchableOpacity
                                style={{ padding: 8 }}
                                onPress={() => openEditMemberModal(member)}
                              >
                                <Ionicons name="create-outline" size={20} color="#3B82F6" />
                              </TouchableOpacity>
                            )}
                            {allowRemove && (
                              <TouchableOpacity
                                style={{ padding: 8 }}
                                onPress={() => confirmRemoveMember(member)}
                              >
                                {isRemoving ? (
                                  <ActivityIndicator size="small" color={COLORS.accent} />
                                ) : (
                                  <Ionicons name="trash-outline" size={20} color={COLORS.accent} />
                                )}
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                        {/* Heart Icon from design - purely cosmetic or for "Safe" status? User said keep functions. I'll stick to edit/delete but maybe add a heart for visuals if no edit rights? No, let's keep it clean. */}
                      </View>
                    </View>
                  );
                })}
                <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 20 }} />


                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginTop: 4 }} onPress={handleStartInviteFlow}>
                  <View style={{
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: COLORS.primary,
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: 16
                  }}>
                    <Ionicons name="person-outline" size={28} color={COLORS.white} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E3A8A' }}>Add a person</Text>
                </TouchableOpacity>





                {/* Places Header & Link */}
                <View onLayout={e => { sectionPositions['place'] = e.nativeEvent.layout.y; }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E3A8A', marginBottom: 12 }}>Places</Text>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }} onPress={handleNavigateToAddPlace}>
                    <View style={{
                      width: 48, height: 48, borderRadius: 24,
                      backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center',
                      marginRight: 14 // Reduced margin
                    }}>
                      <MaterialCommunityIcons name="office-building" size={24} color={COLORS.primary} />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E3A8A' }}>Manage Places</Text>
                  </TouchableOpacity>






                  {currentAssignedEntry ? (
                    <TouchableOpacity
                      style={[
                        styles.assignedSummaryCard,
                        !assignedLocationDetails?.coordinates && styles.assignedSummaryCardDisabled,
                      ]}
                      onPress={handleFocusAssignedLocation}
                      activeOpacity={assignedLocationDetails?.coordinates ? 0.85 : 1}
                      disabled={!assignedLocationDetails?.coordinates}
                    >
                      <View style={styles.assignedSummaryIcon}>
                        <Ionicons name="star" size={18} color={COLORS.white} />
                      </View>
                      <View style={styles.assignedSummaryTextWrapper}>
                        <Text style={styles.assignedSummaryTitle}>{assignedLocationDetails?.label ?? "Assigned location"}</Text>
                        {/* <Text style={styles.assignedSummarySubtitle}>
                          {assignedLocationDetails?.subtitle ?? "We will notify you once additional details are available."}
                        </Text> */}
                        {assignedLocationDetails?.coordinates ? (
                          <Text style={styles.assignedSummaryHint}>Tap to focus on this place</Text>
                        ) : null}
                      </View>
                      {loadingAssignedLocations ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : null}
                    </TouchableOpacity>
                  ) : null}

                  {savedPlaces.length > 0 ? (
                    <View style={styles.savedPlacesWrapper}>
                      <Text style={styles.savedPlacesTitle}>Saved places</Text>
                      {savedPlaces.map((loc: LocationPoint, index: number) => {
                        let metadataAddress: string | undefined;
                        if (loc.metadata && typeof loc.metadata === "object") {
                          const addressValue = (loc.metadata as any).address;
                          const formattedValue = (loc.metadata as any).formattedAddress;
                          if (typeof addressValue === "string" && addressValue.trim().length > 0) {
                            metadataAddress = addressValue.trim();
                          } else if (typeof formattedValue === "string" && formattedValue.trim().length > 0) {
                            metadataAddress = formattedValue.trim();
                          }
                        }

                        const label = loc.name && loc.name.trim().length > 0 ? loc.name.trim() : metadataAddress ?? `Place ${index + 1}`;
                        const subtitle = metadataAddress && metadataAddress !== label ? metadataAddress : "Location Label";
                        const hasEditableId = loc.id !== undefined && loc.id !== null && String(loc.id).trim().length > 0;
                        const canEditThisLocation = canManageLocations && hasEditableId;
                        const normalizedLocationId = normalizeIdentifier(loc.id);
                        const isAssignedToCurrentUser =
                          currentUserAssignedLocationId !== null &&
                          normalizedLocationId !== null &&
                          normalizedLocationId === currentUserAssignedLocationId;

                        return (
                          <View key={loc.id ? `saved-${loc.id}` : `saved-${index}`} style={styles.savedPlaceRow}>
                            <View style={styles.savedPlaceIconCircle}>
                              <Ionicons
                                name={getPlaceTypeIcon((loc.metadata as any)?.locationType || (loc.metadata as any)?.placeType) as any}
                                size={18}
                                color={COLORS.primary}
                              />
                            </View>
                            <View style={styles.savedPlaceTextWrapper}>
                              <Text style={styles.savedPlaceName}>{label}</Text>
                              <Text style={styles.savedPlaceCoords}>{subtitle}</Text>
                              {isAssignedToCurrentUser ? (
                                <View style={styles.assignedBadge}>
                                  <Ionicons name="star" size={12} color={COLORS.primary} />
                                  <Text style={styles.assignedBadgeText}>Assigned to you</Text>
                                </View>
                              ) : null}
                            </View>
                            {canEditThisLocation ? (
                              <TouchableOpacity
                                style={styles.savedPlaceActionButton}
                                onPress={() => handleEditSavedPlace(loc)}
                              >
                                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                              </TouchableOpacity>
                            ) : null}

                            {canEditThisLocation ? (
                              <TouchableOpacity
                                style={styles.savedPlaceActionButton}
                                onPress={() => handleDeleteSavedPlace(loc)}
                              >
                                <Ionicons name="trash-outline" size={20} color={COLORS.accent} />
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.savedPlacesEmpty}>No saved places yet.</Text>
                  )}



                </View>

                <View style={{ height: 20 }} />





                <View style={{ height: 20 }} />
              </ScrollView>
            ) : null}

            {activeTab === "Driving" ? (
              <View style={{ flex: 1, backgroundColor: COLORS.white }}>
                {/* Member Selector Row */}
                <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>

                    {/* "All" Option */}
                    <TouchableOpacity
                      style={{ marginRight: 20, alignItems: 'center' }}
                      onPress={() => setSelectedDrivingMemberId("all")}
                    >
                      <View style={{
                        width: 58, height: 58, borderRadius: 29,
                        backgroundColor: COLORS.primary,
                        alignItems: 'center', justifyContent: 'center',
                        marginBottom: 6
                      }}>
                        <Text style={{ fontSize: 18, color: COLORS.white, fontWeight: '700' }}>
                          {selectedCircle?.name ? selectedCircle.name.substring(0, 2).toUpperCase() : "ALL"}
                        </Text>
                      </View>
                      <Text style={{
                        fontSize: 12,
                        color: selectedDrivingMemberId === "all" ? COLORS.primary : COLORS.gray,
                        fontWeight: selectedDrivingMemberId === "all" ? '700' : '400'
                      }}>
                        All
                      </Text>
                      {selectedDrivingMemberId === "all" && (
                        <View style={{
                          height: 3, width: 20, backgroundColor: COLORS.primary,
                          borderRadius: 2, marginTop: 4
                        }} />
                      )}
                    </TouchableOpacity>

                    {/* Members */}
                    {selectedCircleMembers.map((member) => {
                      const memberId = resolveMemberId(member);
                      const displayName = member.Membership?.nickname || member.name || member.email?.split('@')[0] || "Member";
                      const fallbackSeed = member.email || member.name || displayName;
                      let avatarUrl = member.avatar;
                      if (typeof avatarUrl === "string" && avatarUrl.startsWith("/")) {
                        avatarUrl = `${API_BASE_URL}${avatarUrl}`.replace("/api/uploads", "/uploads");
                      }
                      const resolvedAvatar = avatarUrl || `${DEFAULT_MEMBER_AVATAR}${encodeURIComponent(fallbackSeed)}`;
                      const isSelected = selectedDrivingMemberId === memberId;

                      return (
                        <TouchableOpacity
                          key={memberId}
                          style={{ marginRight: 20, alignItems: 'center' }}
                          onPress={() => setSelectedDrivingMemberId(memberId || "")}
                        >
                          <View style={{
                            width: 58, height: 58, borderRadius: 29,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            overflow: 'hidden',
                            marginBottom: 6
                          }}>
                            <Image source={{ uri: resolvedAvatar }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          </View>
                          <Text style={{
                            fontSize: 12,
                            color: isSelected ? COLORS.primary : COLORS.gray,
                            fontWeight: isSelected ? '700' : '400'
                          }}>
                            {displayName}
                          </Text>
                          {isSelected && (
                            <View style={{
                              height: 3, width: 20, backgroundColor: COLORS.primary,
                              borderRadius: 2, marginTop: 4
                            }} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Period Selector */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 }}>
                  <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.primary }}>This Week</Text>
                  <View style={{ width: 32 }} />
                </View>

                {/* Empty State Card */}
                <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
                  <View style={{
                    backgroundColor: '#EBEFFF',
                    borderRadius: 20,
                    paddingVertical: 40,
                    paddingHorizontal: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 250
                  }}>
                    <View style={{
                      width: 60, height: 60, borderRadius: 30,
                      backgroundColor: '#3B82F6',
                      alignItems: 'center', justifyContent: 'center',
                      marginBottom: 16,
                      shadowColor: "#3B82F6",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6
                    }}>
                      <MaterialCommunityIcons name="steering" size={32} color={COLORS.white} />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E3A8A', marginBottom: 12, textAlign: 'center' }}>
                      No Drives Detected
                    </Text>
                    <Text style={{ fontSize: 14, color: '#60A5FA', textAlign: 'center', lineHeight: 22 }}>
                      Your Circle may have turned off Drive Detection or had a low battery/poor connectivity.
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {activeTab === "Safety" ? (
              <ScrollView style={{ flex: 1, backgroundColor: COLORS.white }} contentContainerStyle={{ padding: 20 }}>
                {/* Safety Network Banner */}
                <View style={{
                  backgroundColor: '#1E3A8A', // Deep blue
                  borderRadius: 16,
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 24
                }}>
                  <View style={{
                    width: 80, height: 80, borderRadius: 40,
                    backgroundColor: COLORS.white,
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: 16
                  }}>
                    {/* Illustration placeholder */}
                    <View style={{ flexDirection: 'row', marginBottom: -10 }}>
                      <Ionicons name="person-outline" size={24} color="#1E3A8A" style={{ marginRight: -8 }} />
                      <Ionicons name="person-outline" size={24} color="#1E3A8A" style={{ marginLeft: -8 }} />
                    </View>
                    <Ionicons name="person-outline" size={24} color="#1E3A8A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>
                      Expand your safety network
                    </Text>
                    <Text style={{ color: '#BFDBFE', fontSize: 13, lineHeight: 18 }}>
                      We recommend to invite 3 to 4 members to your emergency contacts in your circle.
                    </Text>
                  </View>
                </View>

                {/* Emergency Contacts Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 15, color: '#3B82F6', fontWeight: '500' }}>Your Circle emergency contacts</Text>
                  <TouchableOpacity>
                    <Text style={{ fontSize: 15, color: '#1E3A8A', fontWeight: '700' }}>+ Add Contact</Text>
                  </TouchableOpacity>
                </View>

                {/* Contact List Item (Mock) */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: '#EFF6FF', // Light blue bg
                  padding: 12, borderRadius: 12, marginBottom: 32
                }}>
                  <Image
                    source={{ uri: "https://i.pravatar.cc/150?u=campbell" }}
                    style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#DBEAFE' }}
                  />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E3A8A', marginRight: 6 }}>D Campbell</Text>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
                    </View>
                    <Text style={{ fontSize: 13, color: '#3B82F6' }}>Pending Approval</Text>
                  </View>
                </View>

                {/* SOS Alert Card */}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#EF4444', // Red for SOS
                    borderRadius: 16,
                    padding: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 20
                  }}
                  onPress={() => {
                    if (selectedCircle?.id) {
                      setIsSosModalOpen(true);
                    } else {
                      showAlert({ title: "Select a Circle", message: "Please select a circle first.", type: 'info' });
                    }
                  }}
                >
                  <View style={{
                    width: 64, height: 64, borderRadius: 32,
                    backgroundColor: '#FCA5A5',
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: 16
                  }}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#7F1D1D" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 4 }}>
                      SOS Alert
                    </Text>
                    <Text style={{ fontSize: 13, color: '#FEE2E2', lineHeight: 18 }}>
                      Send an immediate alert to your circle and emergency contacts.
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Crash Detection Card */}
                <View style={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: 16,
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <View style={{
                    width: 64, height: 64, borderRadius: 32,
                    backgroundColor: '#E5E7EB',
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: 16
                  }}>
                    <MaterialCommunityIcons name="car-emergency" size={32} color="#1E3A8A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E3A8A', marginBottom: 4 }}>
                      Crash Detection
                    </Text>
                    <Text style={{ fontSize: 13, color: '#4B5563', lineHeight: 18 }}>
                      Crash Alerts help keep you safe by sending a notification to everyone in your circle.
                    </Text>
                  </View>
                </View>

              </ScrollView>
            ) : null}

            {activeTab === "Membership" ? (
              <ScrollView style={{ flex: 1, backgroundColor: COLORS.white }} contentContainerStyle={{ padding: 20 }}>
                <View style={{ alignItems: 'center', marginBottom: 30, marginTop: 10 }}>
                  <View style={{
                    width: 70, height: 70, borderRadius: 35,
                    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16
                  }}>
                    <MaterialCommunityIcons name="crown-outline" size={40} color={COLORS.primary} />
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.black, textAlign: 'center', marginBottom: 8 }}>
                    Go Premium
                  </Text>
                  <Text style={{ fontSize: 16, color: COLORS.gray, textAlign: 'center', maxWidth: '80%' }}>
                    Unlock full access to advanced safety features for your circle.
                  </Text>
                </View>

                {/* Features List */}
                <View style={{ marginBottom: 30 }}>
                  {[
                    { icon: "history", title: "30 Days Location History", desc: "See where your family has been." },
                    { icon: "map-marker-multiple-outline", title: "Unlimited Places", desc: "Get alerted when they arrive or leave." },
                    { icon: "car-speed-limiter", title: "Drive Reports", desc: "See top speed and driving habits." },
                    { icon: "alert-octagon-outline", title: "SOS Alerts", desc: "Immediate emergency notifications." },
                  ].map((feature, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                      <View style={{
                        width: 48, height: 48, borderRadius: 12,
                        backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
                        marginRight: 16
                      }}>
                        <MaterialCommunityIcons name={feature.icon as any} size={24} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.black }}>{feature.title}</Text>
                        <Text style={{ fontSize: 13, color: COLORS.gray }}>{feature.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Pricing / CTA */}
                <View style={{
                  backgroundColor: '#1E3A8A',
                  borderRadius: 20,
                  padding: 24,
                  alignItems: 'center'
                }}>
                  <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                    Start 7-Day Free Trial
                  </Text>
                  <Text style={{ color: '#93C5FD', fontSize: 14, marginBottom: 20 }}>
                    Then $9.99/month. Cancel anytime.
                  </Text>
                  <TouchableOpacity style={{
                    backgroundColor: COLORS.white,
                    paddingVertical: 14,
                    width: '100%',
                    borderRadius: 12,
                    alignItems: 'center'
                  }}>
                    <Text style={{ color: '#1E3A8A', fontSize: 16, fontWeight: '700' }}>Subscribe Now</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            ) : null}
          </View>

          {/* Navigation Bar */}
          <View style={styles.navBar}>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("Location")}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="location-outline"
                  size={28}
                  color={activeTab === "Location" ? COLORS.primary : COLORS.gray}
                />
              </View>
              <Text style={[styles.navText, activeTab === "Location" && styles.activeNavText]}>Map</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("Driving")}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name="car-side"
                  size={28}
                  color={activeTab === "Driving" ? COLORS.primary : COLORS.gray}
                />
              </View>
              <Text style={[styles.navText, activeTab === "Driving" && styles.activeNavText]}>Driving</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("Safety")}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={28}
                  color={activeTab === "Safety" ? COLORS.primary : COLORS.gray}
                />
              </View>
              <Text style={[styles.navText, activeTab === "Safety" && styles.activeNavText]}>Safety</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("Membership")}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name="card-account-details-outline"
                  size={28}
                  color={activeTab === "Membership" ? COLORS.primary : COLORS.gray}
                />
              </View>
              <Text style={[styles.navText, activeTab === "Membership" && styles.activeNavText]}>Membership</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* CirclesModal removed */}





        {/* SettingsModal removed */}

        {/* LocationSharingModal removed */}

        {/* CircleManagementModal removed */}

        {/* AccountModal removed */}

        {/* NotificationsModal removed */}

        <Modal
          visible={isLocationHistoryModalVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          presentationStyle="overFullScreen"
          onRequestClose={handleCloseLocationHistoryModal}
        >
          <View style={styles.memberModalOverlay}>
            <TouchableOpacity
              style={styles.memberModalBackdrop}
              activeOpacity={1}
              onPress={handleCloseLocationHistoryModal}
            />
            <View style={[styles.locationHistoryCard, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.locationHistoryHeader}>
                <Text style={styles.locationHistoryTitle}>Location history</Text>
                <TouchableOpacity
                  style={styles.locationHistoryCloseButton}
                  onPress={handleCloseLocationHistoryModal}
                >
                  <Ionicons name="close" size={22} color={COLORS.black} />
                </TouchableOpacity>
              </View>

              <View style={styles.locationHistoryBatteryRow}>
                <View>
                  <Text style={styles.locationHistoryBatteryLabel}>Battery status</Text>
                  {batteryUpdatedAtLabel ? (
                    <Text style={styles.locationHistoryBatterySubLabel}>{`Updated ${batteryUpdatedAtLabel}`}</Text>
                  ) : null}
                </View>
                <View style={styles.batteryIndicatorWrapper}>
                  <View style={styles.batteryShell}>
                    <View
                      style={[
                        styles.batteryFill,
                        batteryLevelPercent !== null
                          ? {
                            width: `${batteryLevelPercent}%`,
                            backgroundColor:
                              batteryLevelPercent < LOW_BATTERY_THRESHOLD ? COLORS.accent : COLORS.success,
                          }
                          : styles.batteryFillEmpty,
                      ]}
                    />
                    <View style={styles.batteryCap} />
                  </View>
                  <Text style={styles.batteryPercentText}>
                    {batteryLevelPercent !== null ? `${batteryLevelPercent}%` : "--"}
                  </Text>
                </View>
              </View>

              <View style={styles.locationHistoryActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.locationHistoryRefreshButton,
                    locationHistoryLoading && styles.locationHistoryRefreshButtonDisabled,
                  ]}
                  onPress={handleRefreshLocationHistory}
                  disabled={locationHistoryLoading}
                >
                  {locationHistoryLoading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.locationHistoryRefreshButtonText}>Refresh</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.locationHistoryFiltersRow}>
                {LOCATION_HISTORY_FILTERS.map((filter) => {
                  const isActive = filter.key === locationHistoryActiveFilter;
                  return (
                    <TouchableOpacity
                      key={filter.key}
                      style={[styles.locationHistoryFilterChip, isActive && styles.locationHistoryFilterChipActive]}
                      onPress={() => handleSelectLocationHistoryFilter(filter.key)}
                    >
                      <Text
                        style={[
                          styles.locationHistoryFilterText,
                          isActive && styles.locationHistoryFilterTextActive,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {locationHistoryActiveFilter === "custom" ? (
                <View style={styles.locationHistoryCustomRange}>
                  <View style={styles.locationHistoryCustomInputBlock}>
                    <Text style={styles.locationHistoryCustomLabel}>Start</Text>
                    <TouchableOpacity
                      style={styles.locationHistoryCustomInput}
                      onPress={() => setShowLocationHistoryCustomStartPicker(true)}
                    >
                      <Text style={{ color: locationHistoryCustomStart ? COLORS.black : COLORS.gray }}>
                        {locationHistoryCustomStart || "Select Start Date"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.locationHistoryCustomInputBlock, styles.locationHistoryCustomInputBlockLast]}>
                    <Text style={styles.locationHistoryCustomLabel}>End</Text>
                    <TouchableOpacity
                      style={styles.locationHistoryCustomInput}
                      onPress={() => setShowLocationHistoryCustomEndPicker(true)}
                    >
                      <Text style={{ color: locationHistoryCustomEnd ? COLORS.black : COLORS.gray }}>
                        {locationHistoryCustomEnd || "Select End Date"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showLocationHistoryCustomStartPicker && (
                    <DateTimePicker
                      value={parseDateInput(locationHistoryCustomStart) || new Date()}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={handleCustomStartChange}
                    />
                  )}
                  {showLocationHistoryCustomEndPicker && (
                    <DateTimePicker
                      value={parseDateInput(locationHistoryCustomEnd) || new Date()}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={handleCustomEndChange}
                    />
                  )}
                </View>
              ) : null}

              {shouldRenderLocationHistoryMap && locationHistoryPolylineCoordinates.length > 0 ? (
                <View style={styles.locationHistoryMapWrapper}>
                  <MapView
                    ref={locationHistoryMapRef}
                    style={styles.locationHistoryMap}
                    mapType="none"
                    initialRegion={locationHistoryMapInitialRegion ?? undefined}
                    scrollEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    zoomEnabled={false}
                    liteMode={Platform.OS === "android"}
                    pointerEvents="none"
                  >
                    <UrlTile
                      urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                      maximumZ={19}
                      flipY={false}
                    />
                    {locationHistoryPolylineCoordinates.length >= 2 ? (
                      <Polyline
                        coordinates={locationHistoryPolylineCoordinates}
                        strokeColor="#2563EB"
                        strokeWidth={4}
                      />
                    ) : null}

                    {locationHistoryPolylineCoordinates.length === 1 ? (
                      <Marker
                        coordinate={locationHistoryPolylineCoordinates[0]}
                        anchor={{ x: 0.5, y: 0.5 }}
                      >
                        <View style={styles.locationHistorySinglePoint} />
                      </Marker>
                    ) : null}

                    {locationHistoryArrowMarkers.map((segment) => (
                      <Marker
                        key={`history-arrow-${segment.id}`}
                        coordinate={{ latitude: segment.latitude, longitude: segment.longitude }}
                        flat
                        anchor={{ x: 0.5, y: 0.5 }}
                        rotation={segment.rotation}
                      >
                        <View style={styles.locationHistoryArrowIcon}>
                          <Ionicons name="arrow-forward-circle" size={18} color="#2563EB" />
                        </View>
                      </Marker>
                    ))}
                  </MapView>
                </View>
              ) : null}

              {locationHistoryFilterError ? (
                <Text style={styles.locationHistoryErrorText}>{locationHistoryFilterError}</Text>
              ) : null}

              {locationHistoryError ? (
                <View style={styles.locationHistoryErrorBanner}>
                  <Text style={styles.locationHistoryErrorBannerText}>{locationHistoryError}</Text>
                </View>
              ) : null}

              <View style={styles.locationHistoryListWrapper}>
                {locationHistoryLoading && !locationHistory.length ? (
                  <ActivityIndicator size="large" color={COLORS.primary} style={styles.locationHistoryLoadingSpinner} />
                ) : null}

                {!locationHistoryLoading && locationHistoryFilteredDescending.length === 0 && !locationHistoryFilterError ? (
                  <View style={styles.locationHistoryEmptyState}>
                    <MaterialCommunityIcons name="map-search-outline" size={42} color={COLORS.gray} />
                    <Text style={styles.locationHistoryEmptyText}>No location history found for this range.</Text>
                  </View>
                ) : null}

                {locationHistoryFilteredDescending.length > 0 ? (
                  <FlatList
                    data={locationHistoryFilteredDescending}
                    keyExtractor={locationHistoryKeyExtractor}
                    renderItem={renderLocationHistoryItem}
                    contentContainerStyle={styles.locationHistoryList}
                    showsVerticalScrollIndicator={false}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </Modal>



        <Modal
          visible={editMemberModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeEditMemberModal}
        >
          <View style={styles.memberModalOverlay}>
            <TouchableOpacity
              style={styles.memberModalBackdrop}
              activeOpacity={1}
              onPress={closeEditMemberModal}
            />
            <View style={[styles.memberModalCard, { maxHeight: '90%', paddingBottom: 0 }]}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
                <Text style={styles.memberModalTitle}>Manage member</Text>
                {memberBeingEdited ? (
                  <Text style={styles.memberModalSubtitle}>
                    {memberBeingEdited.Membership?.nickname || memberBeingEdited.name || memberBeingEdited.email || "Unnamed member"}
                  </Text>
                ) : null}

                <Text style={styles.memberModalLabel}>Member Type</Text>
                <View style={styles.roleOptionsRow}>
                  {ROLE_OPTIONS.map((option, index) => {
                    const isSelected = editedMemberRole === option.value;
                    const isDisabled = !canEditRoleInModal;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.roleOptionChip,
                          isSelected && styles.roleOptionChipSelected,
                          isDisabled && styles.roleOptionChipDisabled,
                          index === ROLE_OPTIONS.length - 1 && { marginRight: 0 },
                        ]}
                        onPress={() => {
                          if (isDisabled) return;
                          setEditedMemberRole(option.value);
                        }}
                        disabled={isDisabled}
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            isSelected && styles.roleOptionTextSelected,
                            isDisabled && styles.roleOptionTextDisabled,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.memberModalLabel}>Role</Text>
                <View style={styles.relationOptionsRow}>
                  {RELATION_OPTIONS.map((option) => {
                    const isSelected = editedMemberRelation === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.relationOptionChip,
                          isSelected && styles.relationOptionChipSelected,
                        ]}
                        onPress={() => setEditedMemberRelation(option.value)}
                      >
                        <Text
                          style={[
                            styles.relationOptionText,
                            isSelected && styles.relationOptionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.memberModalLabel}>Nickname</Text>
                <TextInput
                  style={[styles.memberModalInput, !canEditNicknameInModal && styles.memberModalInputDisabled]}
                  value={editedMemberNickname}
                  onChangeText={setEditedMemberNickname}
                  editable={canEditNicknameInModal}
                  placeholder="Enter nickname"
                  placeholderTextColor={COLORS.gray}
                />

                <Text style={[styles.memberModalLabel, { marginTop: 16 }]}>Special place</Text>
                {locationSelectionControls}

                {canManageLocations && selectedMemberLocationId && !selectedLocationExists ? (
                  <Text style={styles.memberModalHelperText}>
                    The previously assigned place is no longer available.
                  </Text>
                ) : null}

                {memberModalError ? <Text style={styles.memberModalError}>{memberModalError}</Text> : null}

                <View style={styles.memberModalButtonsRow}>
                  <TouchableOpacity style={styles.memberModalSecondaryButton} onPress={closeEditMemberModal} disabled={isSavingMemberChanges}>
                    <Text style={styles.memberModalSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.memberModalPrimaryButton, isSavingMemberChanges && styles.memberModalPrimaryButtonDisabled]}
                    onPress={handleSaveMemberChanges}
                    disabled={isSavingMemberChanges}
                  >
                    {isSavingMemberChanges ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.memberModalPrimaryText}>Edit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* --- MAP STYLE MODAL --- */}
        <Modal
          visible={isMapStyleModalOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsMapStyleModalOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsMapStyleModalOpen(false)}
          >
            <View style={[styles.mapStyleModalContent, { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 10 : 20 }]}>
              {/* <View style={styles.modalHeaderRow}>
                <TouchableOpacity onPress={() => setIsMapStyleModalOpen(false)} style={styles.modalCloseIcon}>
                  <Ionicons name="close" size={24} color={COLORS.black} />
                </TouchableOpacity>
                <Text style={styles.activateSosText}>Activate SOS →</Text>
              </View> */}

              <Text style={styles.modalTitle}>Map type</Text>

              <FlatList
                data={mapStylesList}
                keyExtractor={(item) => item.key}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalOptionsContainer}
                snapToInterval={SCREEN_WIDTH * 0.35 + 15}
                decelerationRate="fast"
                renderItem={({ item }) => {
                  const isSelected = mapLayerStyle === item.key;
                  return (
                    <TouchableOpacity
                      style={styles.mapPreviewCard}
                      onPress={() => handleChangeMapStyle(item.key)}
                    >
                      <View style={[styles.mapPreviewInner, { backgroundColor: item.previewColor }, isSelected && styles.mapPreviewInnerSelected]}>
                        <Ionicons name={item.icon as any} size={40} color={COLORS.white} />
                      </View>
                      <View style={styles.mapPreviewLabelContainer}>
                        <Text style={[styles.mapPreviewLabel, isSelected && { color: COLORS.primary, fontWeight: '700' }]} numberOfLines={1}>
                          {item.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
              <View style={styles.activeStyleIndicatorBar}>
                <View style={styles.activeStyleIndicator} />
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* --- MEMBER JOURNEYS MODAL --- */}
        {/* MemberJourneysModal removed */}

        {/* Startup Loading Overlay */}
        {startupStatus && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
            <StartupLoading status={startupStatus} progress={startupProgress} />
          </View>
        )}

        {/* Global Action Loading Overlay */}
        {(loading && !startupStatus) && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 9998, backgroundColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center' }]}>
            <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="light" />
            <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          </View>
        )}

        <NotificationToast
          visible={!!toastNotification}
          notification={toastNotification}
          onClose={() => setToastNotification(null)}
          onPress={() => {
            setToastNotification(null);
            router.push('/screens/NotificationsScreen' as any);
          }}
        />

        {/* Coordinate Alert Overlay */}
        {coordinateAlert.visible && (
          <View style={styles.coordinateAlertContainer}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.coordinateAlertContent}>
              <Ionicons name="location" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.coordinateAlertHeader}>Location Update Sent</Text>
                <Text style={styles.coordinateAlertText}>
                  Lat: {coordinateAlert.lat.toFixed(6)}, Lng: {coordinateAlert.lng.toFixed(6)}
                </Text>
                <Text style={styles.coordinateAlertDetail}>
                  Name: {coordinateAlert.name || 'Resolving...'}
                </Text>
                <Text style={styles.coordinateAlertDetail}>
                  Acc: {coordinateAlert.accuracy?.toFixed(1) || 'N/A'}m |
                  Speed: {coordinateAlert.speed != null ? `${Math.round(coordinateAlert.speed)} kmph` : '0 kmph'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Persistent Speed indicator on left-mid */}
        {driveDetectionEnabled && (
          <View style={styles.leftMidSpeedContainer} pointerEvents="none">
            <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
            <Ionicons name="speedometer-outline" size={16} color={COLORS.primary} />
            <Text style={styles.currentSpeedText}>
              {Math.round(currentSpeed ?? 0)}
            </Text>
            <Text style={styles.speedUnitText}>kmph</Text>
          </View>
        )}

        <CirclesModal
          isOpen={isCirclesModalOpen}
          onClose={() => setIsCirclesModalOpen(false)}
          onRefresh={requestCirclesRefresh}
          circles={circles}
          loadingCircles={loadingCircles}
          activeCircleId={selectedCircle?.id}
          onSelectCircle={(id) => {
            selectCircle(id);
            setIsCirclesModalOpen(false);
          }}
        />

        <AddPlaceModal
          visible={isAddPlaceModalOpen}
          onClose={() => setIsAddPlaceModalOpen(false)}
          circleId={selectedCircle?.id}
          circleName={selectedCircle?.name}
          mode={addPlaceMode}
          editingLocation={editingLocation}
          members={selectedCircleMembers}
          memberLocations={memberLocations}
          savedPlaces={currentLocations}
          currentUserId={currentUserId}
          currentUserAvatarUrl={currentUserAvatarUrl}
          currentUserBatteryLevel={currentUserBatteryLevel}
          memberAvatarUrls={memberAvatarUrls}
          onPlaceSaved={() => {
            if (selectedCircle?.id) {
              fetchCircleLocations(selectedCircle.id);
            }
            setIsAddPlaceModalOpen(false);
          }}
        />

        <MemberJourneysModal
          isOpen={isMemberJourneysModalOpen}
          onClose={() => setIsMemberJourneysModalOpen(false)}
          circleId={selectedCircle?.id}
          memberId={selectedMemberForJourneys}
        />

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          circleId={selectedCircle?.id}
          circleName={selectedCircle?.name}
          onOpenSmartNotifications={handleOpenSmartNotificationsModal}
          onOpenLocationSharing={handleOpenLocationSharingModal}
          onOpenCircleManagement={handleOpenCircleManagementModal}
          onOpenAddPeople={handleOpenAddPeopleModal}
          onOpenAccount={handleOpenAccountModal}
          onOpenDriveDetection={handleOpenDriveDetectionModal}
          onOpenCreateCircle={handleOpenCreateCircleModal}
          onLogout={handleLogout}
        />

        <CreateCircleModal
          isOpen={isCreateCircleModalOpen}
          onClose={() => setIsCreateCircleModalOpen(false)}
          onCreate={async (name: string, relationship: string) => {
            try {
              const result = await handleCreateCircleAction(name, relationship);
              const newCircleId = result?.data?.id ?? result?.id ?? result?.data?.circle?.id;

              if (newCircleId) {
                await AsyncStorage.setItem(STORAGE_KEYS.lastSelectedCircleId, String(newCircleId)).catch(() => undefined);
              }

              await requestCirclesRefresh();
              setIsCreateCircleModalOpen(false);
              showAlert({ title: "Success", message: "Circle created successfully!", type: 'success' });
            } catch (error: any) {
              showAlert({ title: "Error", message: error.message, type: 'error' });
            }
          }}
        />

        <JoinCircleModal
          isOpen={isJoinCircleModalOpen}
          onClose={() => setIsJoinCircleModalOpen(false)}
          onJoin={async (pin: string) => {
            try {
              const result = await handleJoinCircleAction(pin);
              const newCircleId = result?.data?.id ?? result?.id ?? result?.data?.circle?.id;

              if (newCircleId) {
                await AsyncStorage.setItem(STORAGE_KEYS.lastSelectedCircleId, String(newCircleId)).catch(() => undefined);
              }

              await requestCirclesRefresh();
              setIsJoinCircleModalOpen(false);
              showAlert({ title: "Success", message: "Joined circle successfully!", type: 'success' });
            } catch (error: any) {
              showAlert({ title: "Error", message: error.message, type: 'error' });
            }
          }}
        />

        <NotificationsModal
          isOpen={isNotificationsModalOpen}
          onClose={() => setIsNotificationsModalOpen(false)}
        />

        <DriveDetectionModal
          isOpen={isDriveDetectionModalOpen}
          onClose={() => setIsDriveDetectionModalOpen(false)}
          onSettingsChanged={async (enabled) => {
            setDriveDetectionEnabled(enabled);
            // Restart background service to apply new frequency config
            await stopBackgroundLocation();
            if (locationSharingEnabled && selectedCircle) {
              await startBackgroundLocation();
            }
          }}
        />

        <AccountModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
        />

        <LocationSharingModal
          isOpen={isLocationSharingModalOpen}
          onClose={() => setIsLocationSharingModalOpen(false)}
          userName={storedUser?.name || "User"}
          userAvatarUrl={currentUserAvatarUrl}
          userRole={selectedCircle ? formatRoleLabel(currentMembershipRole) : "None"}
        />

        <SmartNotificationModal
          isOpen={isSmartNotificationModalOpen}
          onClose={() => setIsSmartNotificationModalOpen(false)}
          userName={storedUser?.name || "User"}
          userAvatarUrl={currentUserAvatarUrl}
          circleId={selectedCircle ? String(selectedCircle.id) : undefined}
          notificationSettings={selectedCircle?.notificationSettings}
          onSettingsChanged={() => requestCirclesRefresh()}
        />

        <CircleManagementModal
          isOpen={isCircleManagementModalOpen}
          onClose={() => setIsCircleManagementModalOpen(false)}
          circleId={selectedCircle?.id}
          circleName={selectedCircle?.name}
          userRole={currentMembershipRole ?? "Member"}
          onOpenAdminManagement={(type?: string) => {
            setIsCircleManagementModalOpen(false);
            if (type === 'my-role') {
              setIsMyRoleModalOpen(true);
            } else {
              // In NearU, admin management is done per member in the bottom sheet list.
              // We can scroll to the members section as a way to "manage" them.
              scrollToSection('members');
              setActiveSection('members');
              snapTo(MAX_HEIGHT);
              setIsExpanded(true);
            }
          }}
          onOpenEditCircle={() => {
            setIsCircleManagementModalOpen(false);
            setIsEditCircleNameModalOpen(true);
          }}
          onAddPeople={() => {
            setIsCircleManagementModalOpen(false);
            handleStartInviteFlow();
          }}
          onLeaveCircle={() => {
            setIsCircleManagementModalOpen(false);
            handleLeaveCircle();
          }}
        />

        <EditCircleNameModal
          isOpen={isEditCircleNameModalOpen}
          onClose={() => setIsEditCircleNameModalOpen(false)}
          initialName={selectedCircle?.name || ""}
          onSave={async (newName) => {
            try {
              if (!selectedCircle) return;
              await handleUpdateCircleNameAction(selectedCircle.id, newName);
              await requestCirclesRefresh();
              setIsEditCircleNameModalOpen(false);
              showAlert({ title: "Success", message: "Circle name updated!", type: 'success' });
            } catch (error: any) {
              showAlert({ title: "Error", message: error.message, type: 'error' });
            }
          }}
        />

        <SosModal
          isOpen={isSosModalOpen}
          onClose={() => setIsSosModalOpen(false)}
          circleId={selectedCircle?.id}
          circleName={selectedCircle?.name}
          members={selectedCircleMembers}
        />

        <AddPeopleModal
          isOpen={isAddPeopleModalOpen}
          onClose={() => setIsAddPeopleModalOpen(false)}
          circleId={selectedCircle?.id}
          circleName={selectedCircle?.name}
        />

        <MyRoleModal
          isOpen={isMyRoleModalOpen}
          onClose={() => setIsMyRoleModalOpen(false)}
          userRole={currentMembershipRole ?? "Member"}
          userRelation={currentMembership?.Membership?.metadata?.relation}
          onSaveRelation={handleUpdateMyRelation}
        />

      </View>
    </KeyboardAvoidingView >
  );
};

export default MapScreen;

// =======================================================
// STYLES
// =======================================================
const styles = StyleSheet.create({
  coordinateAlertContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 10000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  coordinateAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  coordinateAlertText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  coordinateAlertHeader: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  coordinateAlertDetail: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
  leftMidSpeedContainer: {
    position: 'absolute',
    left: 10,
    top: '45%',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  currentSpeedText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    marginTop: 2,
  },
  speedUnitText: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.gray,
    textTransform: 'uppercase',
  },
  container: { flex: 1, backgroundColor: COLORS.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  map: { flex: 1 },

  // --- Map Style Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  mapStyleModalContent: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalCloseIcon: {
    padding: 5,
  },
  activateSosText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    padding: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 20,
  },
  horizontalOptionsContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  mapPreviewCard: {
    width: SCREEN_WIDTH * 0.35,
    marginRight: 15,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  mapPreviewInner: {
    height: SCREEN_WIDTH * 0.35 * 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  mapPreviewInnerSelected: {
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  mapPreviewLabelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  mapPreviewLabel: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeStyleIndicatorBar: {
    height: 10,
    width: '100%',
    backgroundColor: COLORS.lightGray,
    borderRadius: 5,
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStyleIndicator: {
    height: 6,
    width: '30%',
    backgroundColor: COLORS.white,
    borderRadius: 3,
    position: 'absolute',
    left: '5%',
  },

  // Header
  headerContainer: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 16, paddingBottom: 10, zIndex: 10
  },
  roundButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.white, justifyContent: "center", alignItems: "center",
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3
  },
  floatingChatButton: {
    position: 'absolute',
    right: 16,
    zIndex: 12,
    elevation: 6,
  },
  circleSelector: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: COLORS.white, marginHorizontal: 12,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24,
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3
  },
  selectorTextContainer: { flex: 1, justifyContent: 'center' },
  selectorLabel: { fontSize: 10, color: COLORS.gray, textTransform: 'uppercase', fontWeight: '700' },
  circleName: { fontSize: 16, fontWeight: "700", color: COLORS.primary },

  // Floating Controls
  floatingControlsContainer: {
    position: 'absolute',
    bottom: MIN_HEIGHT + 15,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 15,
  },
  roundActionButtonPurple: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  roundActionButtonRed: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  roundButtonSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  locationHistoryArrowIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationHistoryCard: {
    marginHorizontal: 16,
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: SCREEN_HEIGHT * 0.75,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  locationHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationHistoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
  },
  locationHistoryCloseButton: {
    padding: 6,
  },
  locationHistoryBatteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  locationHistoryBatteryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  locationHistoryBatterySubLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  batteryIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryShell: {
    width: 70,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.black,
    justifyContent: 'center',
    paddingHorizontal: 2,
    marginRight: 8,
    position: 'relative',
  },
  batteryCap: {
    position: 'absolute',
    right: -6,
    width: 6,
    height: 12,
    backgroundColor: COLORS.black,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    top: 7,
  },
  batteryFill: {
    height: '80%',
    borderRadius: 4,
  },
  batteryFillEmpty: {
    width: '0%',
    backgroundColor: COLORS.lightGray,
  },
  batteryPercentText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.black,
  },
  locationHistoryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  locationHistoryRefreshButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  locationHistoryRefreshButtonDisabled: {
    opacity: 0.6,
  },
  locationHistoryRefreshButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  locationHistoryFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  locationHistoryFilterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginRight: 8,
    marginBottom: 8,
  },
  locationHistoryFilterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  locationHistoryFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.black,
  },
  locationHistoryFilterTextActive: {
    color: COLORS.white,
  },
  locationHistoryCustomRange: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  locationHistoryCustomInputBlock: {
    flex: 1,
    marginRight: 12,
  },
  locationHistoryCustomInputBlockLast: {
    marginRight: 0,
  },
  locationHistoryMapWrapper: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  locationHistoryMap: {
    width: '100%',
    height: 200,
  },
  locationHistorySinglePoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  locationHistoryCustomLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 6,
  },
  locationHistoryCustomInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.black,
    backgroundColor: '#F9FAFB',
  },
  locationHistoryErrorText: {
    color: COLORS.accent,
    fontSize: 12,
    marginBottom: 8,
  },
  locationHistoryErrorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  locationHistoryErrorBannerText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  locationHistoryListWrapper: {
    flex: 1,
    flexGrow: 1,
    minHeight: 160,
  },
  locationHistoryLoadingSpinner: {
    marginVertical: 24,
  },
  locationHistoryEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  locationHistoryEmptyText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  locationHistoryList: {
    paddingBottom: 16,
  },
  locationHistoryListItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  locationHistoryListItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationHistoryListItemTimestamp: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    flex: 1,
    marginRight: 12,
  },
  locationHistoryListItemName: {
    fontSize: 13,
    color: COLORS.gray,
    flexShrink: 0,
  },
  locationHistoryListItemCoords: {
    fontSize: 13,
    color: COLORS.black,
  },
  locationHistoryListItemCircle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },

  // Markers
  userMarkerWrapper: { alignItems: 'center', justifyContent: 'center', maxWidth: 180 },
  userMarkerGlow: {
    padding: 4,
    borderRadius: 24,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  userMarkerCard: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 6,
    position: 'relative',
  },
  userMarkerAvatarShell: {
    width: 46,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerAvatarImage: { width: '100%', height: '100%' },
  userMarkerInitial: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  userMarkerStatusDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34D399',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userMarkerPointer: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#113C9C',
    marginTop: -3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 1.4,
    elevation: 4,
  },
  userMarkerLabelBubble: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
  },
  userMarkerLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    maxWidth: 150,
  },
  locationMarkerWrapper: { alignItems: 'center', maxWidth: 220 },
  locationMarkerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 6,
    borderWidth: 1,
  },
  locationMarkerCardDefault: {
    backgroundColor: COLORS.white,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  locationMarkerCardAssigned: {
    backgroundColor: COLORS.primary,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  locationMarkerBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationMarkerBadgeDefault: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  locationMarkerBadgeAssigned: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  locationMarkerBadgeText: { fontSize: 14, fontWeight: '700' },
  locationMarkerBadgeTextDefault: { color: COLORS.accent },
  locationMarkerBadgeTextAssigned: { color: COLORS.white },
  locationMarkerTextBlock: { marginLeft: 10, maxWidth: 160 },
  locationMarkerTitle: { fontSize: 13, fontWeight: '700', color: COLORS.accent },
  locationMarkerTitleAssigned: { color: COLORS.white },
  locationMarkerSubtitle: { fontSize: 11, color: '#4B5563', marginTop: 2 },
  locationMarkerSubtitleAssigned: { color: 'rgba(255, 255, 255, 0.85)' },
  locationMarkerPointer: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.2,
    elevation: 4,
  },
  locationMarkerPointerDefault: { borderTopColor: COLORS.white },
  locationMarkerPointerAssigned: { borderTopColor: COLORS.primary },

  // Bottom Sheet
  unifiedSheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    elevation: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 8,
    zIndex: 20, overflow: 'hidden'
  },
  dragHandleContainer: { width: '100%', height: HANDLE_HEIGHT, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' },

  sheetContent: { paddingHorizontal: 20, paddingTop: 5 },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sectionTitleContainer: { paddingVertical: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.black },
  divider: { height: 1, backgroundColor: COLORS.lightGray, marginVertical: 10 },

  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  memberRow: { alignItems: 'center' },
  listIconCircle: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.lightGray,
    alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: '#E5E7EB'
  },
  memberAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: COLORS.lightGray,
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  memberDetails: {
    flex: 1,
  },
  listItemText: { fontSize: 16, fontWeight: '600', color: COLORS.black },
  listItemSubText: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  memberNicknameText: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  memberActionsColumn: {
    marginLeft: 12,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  memberActionButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  memberActionButtonSpacing: {
    marginBottom: 6,
  },

  // Nav Bar
  navBar: {
    height: TAB_BAR_HEIGHT, flexDirection: "row", width: '100%',
    justifyContent: "space-around", alignItems: "flex-start", paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: COLORS.white
  },
  navItem: { alignItems: "center", justifyContent: "flex-start", flex: 1 },
  iconContainer: { marginBottom: 4 },
  navText: { fontSize: 11, color: COLORS.gray, fontWeight: "600" },
  activeNavText: { color: COLORS.primary, fontWeight: "700" },

  savedPlacesWrapper: {
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  savedPlacesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 6,
  },
  savedPlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  savedPlaceIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  savedPlaceTextWrapper: {
    flex: 1,
  },
  savedPlaceName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.black,
  },
  savedPlaceCoords: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  assignedSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F4F0FF',
    marginTop: 16,
  },
  assignedSummaryCardDisabled: {
    opacity: 0.7,
  },
  assignedSummaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  assignedSummaryTextWrapper: {
    flex: 1,
  },
  assignedSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.black,
  },
  assignedSummarySubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  assignedSummaryHint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
  },
  assignedBadgeText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  savedPlaceActionButton: {
    padding: 6,
    marginLeft: 8,
  },
  savedPlacesEmpty: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.gray,
  },
  memberModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  memberModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  memberModalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  memberModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
    textAlign: 'center',
  },
  memberModalSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  memberModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },
  profileAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  profileAvatarPreviewWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  profileAvatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarActions: {
    flex: 1,
  },
  profileAvatarPrimaryButton: {
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  profileAvatarPrimaryText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  profileAvatarSecondaryButton: {
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarSecondaryText: {
    color: COLORS.gray,
    fontWeight: '600',
  },
  roleOptionsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  roleOptionChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginRight: 10,
  },
  roleOptionChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F3F0FF',
  },
  roleOptionChipDisabled: {
    opacity: 0.5,
  },
  roleOptionText: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '600',
  },
  roleOptionTextSelected: {
    color: COLORS.primary,
  },
  roleOptionTextDisabled: {
    color: COLORS.gray,
  },
  relationOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  relationOptionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginRight: 8,
    marginBottom: 8,
  },
  relationOptionChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F3F0FF',
  },
  relationOptionText: {
    fontSize: 13,
    color: COLORS.black,
    fontWeight: '600',
  },
  relationOptionTextSelected: {
    color: COLORS.primary,
  },
  memberModalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.black,
    backgroundColor: '#F8FAFC',
  },
  memberModalTextarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  memberModalInputDisabled: {
    opacity: 0.5,
  },
  memberLocationOptionsWrapper: {
    marginTop: 8,
  },
  memberLocationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    backgroundColor: COLORS.white,
  },
  memberLocationOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F3F0FF',
  },
  memberLocationOptionTextWrapper: {
    flex: 1,
    marginRight: 12,
  },
  memberLocationOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.black,
  },
  memberLocationOptionSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  memberModalHelperText: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 6,
  },
  memberModalError: {
    color: COLORS.accent,
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  memberModalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  memberModalSecondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberModalSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray,
  },
  memberModalPrimaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberModalPrimaryButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  memberModalPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },




  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBadge: {
    borderRadius: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'white',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1.5,
    minHeight: 16,
    position: 'absolute',
    top: -4,
    right: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 20,
    zIndex: 10,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'white',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: 'white',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopWidth: 3,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  batteryBadgeContainer: {
    position: 'absolute',
    top: -6,
    right: -5,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 20,
    zIndex: 10,
  },
  batteryBadgeInner: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batteryIcon: {
    margin: 0,
    transform: [{ rotate: '90deg' }],
  },
  batteryText: {
    position: 'absolute',
    fontWeight: '900',
    color: COLORS.black, // Ensure COLORS is defined in your theme
    textAlign: 'center',
    backgroundColor: 'white',
    borderRadius: 2,
  },

});