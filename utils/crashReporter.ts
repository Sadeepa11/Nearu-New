import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Location from "expo-location";

import { API_BASE_URL, authenticatedFetch } from "./auth";
import { readLastKnownLocation } from "./locationCache";

export interface CrashReportOptions {
  error?: unknown;
  isFatal?: boolean;
  source?: string;
  additionalDetails?: string;
}

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;

declare const ErrorUtils:
  | undefined
  | {
      setGlobalHandler?: (handler: GlobalErrorHandler) => void;
      getGlobalHandler?: () => GlobalErrorHandler | undefined;
    };

let crashReporterInitialized = false;
let crashReportInFlight = false;
const reportedSignatures = new Set<string>();

const buildSignature = (error: unknown): string | null => {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return `${error.name}:${error.message}:${error.stack ?? ""}`;
  }

  if (typeof error === "string") {
    return `string:${error}`;
  }

  try {
    return `object:${JSON.stringify(error)}`;
  } catch {
    return `object:${String(error)}`;
  }
};

const resolveDeviceIdentifier = (): string => {
  const constants = Constants as Record<string, unknown>;
  const candidates = [
    constants.deviceId,
    constants.installationId,
    constants.sessionId,
    Constants.deviceName,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return `${Platform.OS}-${Constants.nativeAppVersion ?? "unknown"}`;
};

const describeError = (error: unknown, isFatal?: boolean, source?: string, extra?: string): string => {
  const segments: string[] = [];

  segments.push(`Platform: ${Platform.OS}`);
  if (typeof Platform.Version !== "undefined") {
    segments.push(`Platform.Version: ${Platform.Version}`);
  }
  segments.push(`App.Version: ${Constants.nativeAppVersion ?? "unknown"}`);
  segments.push(`App.Build: ${Constants.nativeBuildVersion ?? "unknown"}`);
  segments.push(`Fatal: ${isFatal ? "yes" : "no"}`);
  if (source) {
    segments.push(`Source: ${source}`);
  }

  if (error instanceof Error) {
    segments.push(`Error: ${error.name}: ${error.message}`);
    if (error.stack) {
      segments.push(`Stack: ${error.stack}`);
    }
  } else if (typeof error === "string") {
    segments.push(`Error: ${error}`);
  } else if (error !== undefined) {
    try {
      segments.push(`Error: ${JSON.stringify(error)}`);
    } catch {
      segments.push(`Error: ${String(error)}`);
    }
  }

  if (extra) {
    segments.push(`Notes: ${extra}`);
  }

  return segments.join("\n");
};

const getLocationSnapshot = async (): Promise<{ latitude: number; longitude: number } | null> => {
  const cached = await readLastKnownLocation();
  if (cached) {
    return { latitude: cached.latitude, longitude: cached.longitude };
  }

  try {
    const permissions = await Location.getForegroundPermissionsAsync();
    if (permissions.status !== "granted") {
      return null;
    }

    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown?.coords) {
      return {
        latitude: lastKnown.coords.latitude,
        longitude: lastKnown.coords.longitude,
      };
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,

    });

    if (current?.coords) {
      return {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
    }
  } catch (error) {
    console.warn("Crash reporter failed to fetch device location", error);
  }

  return null;
};

const submitCrashReport = async (options: CrashReportOptions): Promise<void> => {
  const signature = buildSignature(options.error);
  if (signature && reportedSignatures.has(signature)) {
    return;
  }

  if (crashReportInFlight) {
    return;
  }

  crashReportInFlight = true;

  try {
    const coords = await getLocationSnapshot();
    const payload = {
      latitude: coords?.latitude ?? 0,
      longitude: coords?.longitude ?? 0,
      crashDetails: describeError(options.error, options.isFatal, options.source, options.additionalDetails),
      deviceId: resolveDeviceIdentifier(),
    };

    await authenticatedFetch(`${API_BASE_URL}/profile/crash`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (signature) {
      reportedSignatures.add(signature);
    }
  } catch (error) {
    console.warn("Failed to submit crash report", error);
  } finally {
    crashReportInFlight = false;
  }
};

export const reportCrash = async (options: CrashReportOptions): Promise<void> => {
  await submitCrashReport(options);
};

export const initializeCrashReporter = (): void => {
  if (crashReporterInitialized) {
    return;
  }

  crashReporterInitialized = true;

  const defaultGlobalHandler: GlobalErrorHandler | undefined =
    typeof ErrorUtils !== "undefined" && ErrorUtils?.getGlobalHandler
      ? ErrorUtils.getGlobalHandler() ?? undefined
      : undefined;

  const enhancedHandler: GlobalErrorHandler = (error, isFatal) => {
    void submitCrashReport({
      error,
      isFatal,
      source: "global-error-handler",
    });

    if (defaultGlobalHandler) {
      try {
        defaultGlobalHandler(error, isFatal);
      } catch (handlerError) {
        console.error("Default global error handler threw", handlerError);
      }
    }
  };

  if (typeof ErrorUtils !== "undefined" && ErrorUtils?.setGlobalHandler) {
    ErrorUtils.setGlobalHandler(enhancedHandler);
  }

  const originalUnhandledRejection = (globalThis as any).__unhandledPromiseRejectionHandler;
  (globalThis as any).__unhandledPromiseRejectionHandler = (reason: unknown, promise: unknown) => {
    void submitCrashReport({
      error: reason instanceof Error ? reason : new Error(String(reason)),
      isFatal: false,
      source: "unhandled-promise-rejection",
    });

    if (typeof originalUnhandledRejection === "function") {
      originalUnhandledRejection(reason, promise);
    }
  };
};
