import AsyncStorage from "@react-native-async-storage/async-storage";

export interface StoredCoordinateSnapshot {
  latitude: number;
  longitude: number;
  speed: number | null;
  timestamp: number;
}

const LAST_KNOWN_LOCATION_STORAGE_KEY = "app:lastKnownLocation";

export const storeLastKnownLocation = async (coords: {
  latitude: number;
  longitude: number;
  speed?: number | null;
}): Promise<void> => {
  const snapshot: StoredCoordinateSnapshot = {
    latitude: Number(coords.latitude),
    longitude: Number(coords.longitude),
    speed: coords.speed !== undefined ? coords.speed : null,
    timestamp: Date.now(),
  };

  try {
    await AsyncStorage.setItem(
      LAST_KNOWN_LOCATION_STORAGE_KEY,
      JSON.stringify(snapshot)
    );
  } catch (error) {
    console.warn("Failed to persist last known location", error);
  }
};

export const readLastKnownLocation = async (): Promise<StoredCoordinateSnapshot | null> => {
  try {
    const raw = await AsyncStorage.getItem(LAST_KNOWN_LOCATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.latitude === "number" &&
      typeof parsed.longitude === "number"
    ) {
      return {
        latitude: Number(parsed.latitude),
        longitude: Number(parsed.longitude),
        speed: typeof parsed.speed === "number" ? parsed.speed : null,
        timestamp: typeof parsed.timestamp === "number" ? parsed.timestamp : Date.now(),
      };
    }
  } catch (error) {
    console.warn("Failed to read last known location", error);
  }

  return null;
};
