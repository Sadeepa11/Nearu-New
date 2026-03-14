import * as Battery from "expo-battery";
import Constants from "expo-constants";

import { API_BASE_URL, authenticatedFetch } from "./auth";

const resolveDeviceIdentifier = (): string => {
  const candidates = [
    Constants.deviceId,
    Constants.installationId,
    Constants.sessionId,
    Constants.deviceName,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return `${Constants.platform?.ios ? "ios" : Constants.platform?.android ? "android" : "unknown"}-${
    Constants.nativeAppVersion ?? "unknown"
  }`;
};

const normalizeBatteryLevel = (level: number | null | undefined): number | null => {
  if (typeof level !== "number" || Number.isNaN(level)) {
    return null;
  }

  if (level <= 1) {
    return Math.round(level * 100);
  }

  if (level <= 100) {
    return Math.round(level);
  }

  return null;
};

export const readBatteryLevel = async (): Promise<number | null> => {
  try {
    const level = await Battery.getBatteryLevelAsync();
    return normalizeBatteryLevel(level);
  } catch (error) {
    console.warn("Failed to read battery level", error);
    return null;
  }
};

export const sendBatteryLevelValue = async (level: number): Promise<boolean> => {
  try {
    const deviceId = resolveDeviceIdentifier();

    const response = await authenticatedFetch(`${API_BASE_URL}/profile/battery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        batteryLevel: level,
        deviceId,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      console.warn("Battery level update failed", payload);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Failed to send battery level", error);
    return false;
  }
};

export const sendBatteryLevel = async (): Promise<boolean> => {
  const level = await readBatteryLevel();
  if (level === null) {
    return false;
  }

  return sendBatteryLevelValue(level);
};

export const watchBatteryLevel = (listener: (level: number) => void): (() => void) => {
  let subscription: Battery.Subscription | null = null;

  const subscribe = async () => {
    try {
      subscription = await Battery.addBatteryLevelListener(({ batteryLevel }) => {
        const normalized = normalizeBatteryLevel(batteryLevel);
        if (normalized !== null) {
          try {
            listener(normalized);
          } catch (callbackError) {
            console.warn("Battery listener callback threw", callbackError);
          }
        }
      });
    } catch (error) {
      console.warn("Failed to subscribe to battery level changes", error);
    }
  };

  void subscribe();

  return () => {
    try {
      subscription?.remove();
    } catch (error) {
      console.warn("Failed to remove battery listener", error);
    }
  };
};

export const sendLowBatteryAlert = async (level: number, threshold: number = 20): Promise<boolean> => {
  try {
    const deviceId = resolveDeviceIdentifier();

    const response = await authenticatedFetch(`${API_BASE_URL}/profile/low-battery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        batteryLevel: level,
        deviceId,
        threshold,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      console.warn("Low battery alert failed", payload);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Failed to send low battery alert", error);
    return false;
  }
};
