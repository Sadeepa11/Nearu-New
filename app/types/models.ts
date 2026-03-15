export type IdLike = string | number | null | undefined;

export interface LocationPoint {
  id?: number | string;
  latitude: number;
  longitude: number;
  name?: string;
  metadata?: Record<string, unknown> | null;
}

export interface CircleData {
  id: number | string;
  name?: string;
  code?: string;
  invitationCode?: string;
  Locations?: LocationPoint[];
  metadata?: { radius?: number };
  creatorId?: string;
  creator?: { id: string; name?: string };
  notificationSettings?: any;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  accuracy?: number | null;
  speed?: number | null;
  battery?: string | null;
  updatedAt?: string | null;
}

export interface JourneyHistoryPoint {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  name?: string | null;
}

export interface Journey {
  journeyName: string;
  startTime: string;
  endTime: string;
  history: JourneyHistoryPoint[];
}

export interface CircleMember {
  id?: IdLike;
  userId?: IdLike;
  name?: string;
  email?: string;
  avatar?: string | null;
  batteryLevel?: BatteryLevelInfo | null;
  currentLocation?: {
    id?: string;
    latitude: number;
    longitude: number;
    name?: string | null;
    metadata?: any;
    updatedAt: string;
  } | null;
  todayLocationHistory?: LocationHistoryEntry[];
  journeys?: Journey[];

  Membership?: {
    nickname?: string;
    role?: string;
    status?: string;
    locationId?: IdLike;
    LocationId?: IdLike;
    location_id?: IdLike;
    specialLocationId?: IdLike;
    assignedLocationId?: IdLike;
    metadata?: any;
  };
}

export interface MemberLocationOption {
  id: string;
  label: string;
  subtitle: string;
}

export interface AssignedLocationRecord {
  assignmentId: string;
  circleId: string;
  locationId: string | null;
  locationPoint: LocationPoint | null;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown> | null;
  raw: any;
}

export interface AssignedLocationDetails {
  label: string;
  subtitle?: string;
  coordinates?: { latitude: number; longitude: number };
}

export interface BatteryLevelInfo {
  // level?: number | null;
  batteryLevel?: number | null;
  deviceId?: string | null;
  updatedAt?: string | null;
}

export interface LocationHistoryEntry {
  id: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  name?: string | null;
  circleId?: string | null;
}


export interface AppNotification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  circle?: {
    id: string;
    name: string;
  };
  location?: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
}

export interface NotificationPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}


export type LocationHistoryFilterKey = "today" | "yesterday" | "this_week" | "this_month" | "custom";

export type MapType = "standard" | "satellite" | "hybrid" | "terrain";
