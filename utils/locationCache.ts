import AsyncStorage from "@react-native-async-storage/async-storage";

export interface StoredCoordinateSnapshot {
  latitude: number;
  longitude: number;
  timestamp: number;
}

const LAST_KNOWN_LOCATION_STORAGE_KEY = "app:lastKnownLocation";

export const storeLastKnownLocation = async (coords: {
  latitude: number;
  longitude: number;
}): Promise<void> => {
  const snapshot: StoredCoordinateSnapshot = {
    latitude: Number(coords.latitude),
    longitude: Number(coords.longitude),
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
        timestamp: typeof parsed.timestamp === "number" ? parsed.timestamp : Date.now(),
      };
    }
  } catch (error) {
    console.warn("Failed to read last known location", error);
  }

  return null;
};
