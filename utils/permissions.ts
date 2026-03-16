import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import Constants from 'expo-constants';
import { PermissionsAndroid, Platform } from 'react-native';
import { authenticatedFetch } from './auth';


// const API_BASE_URL = "https://api.medi.lk/api";
// const API_BASE_URL = "https://nearu.servefamily.com/api";
const API_BASE_URL = "https://nearu.kalametiyaseafoodrestaurant.com/api";

// const API_BASE_URL = "https://nearu.servefamily.com/api";

// export const API_BASE_URL = "https://nearu.kalametiyaseafoodrestaurant.com/api";
const LAST_SAVED_FCM_TOKEN_KEY = "lastSavedFcmToken";
const LAST_FCM_RATE_LIMIT_TS_KEY = "lastFcmRateLimitTs";
const FCM_RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const PENDING_FCM_TOKEN_KEY = "pendingFcmToken";

let tokenRefreshUnsubscribe: (() => void) | null = null;

const getAndroidApiLevel = (): number => {
  if (typeof Platform.Version === "number") {
    return Platform.Version;
  }

  const parsed = Number(Platform.Version);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Gets device information for FCM token registration
 * @returns Object containing deviceId, deviceType, and deviceDetails
 */
const getDeviceInfo = () => {
  const deviceId = Constants.deviceId || Constants.installationId || 'unknown';
  const deviceType = Platform.OS;
  const deviceDetails = {
    os: Platform.OS,
    version: Platform.Version,
    brand: 'Android',
    model: Constants.deviceName || 'Unknown',
    appVersion: Constants.expoConfig?.version || '1.0.0',
  };

  return { deviceId, deviceType, deviceDetails };
};

/**
 * Registers device for remote messages and gets FCM token
 * @returns Promise<string | null> - FCM token or null if failed
 */
const isIosAuthorizationGranted = (status: number) => {
  const { AUTHORIZED, PROVISIONAL } = messaging.AuthorizationStatus;
  return status === AUTHORIZED || status === PROVISIONAL;
};

export const registerDeviceAndGetFCMToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'ios') {
      try {
        await messaging().registerDeviceForRemoteMessages();
      } catch (registerError) {
        console.warn('Failed to register device for remote messages', registerError);
      }

      const authorizationStatus = await messaging().requestPermission({
        alert: true,
        badge: true,
        sound: true,
      });

      if (!isIosAuthorizationGranted(authorizationStatus)) {
        console.warn('iOS notification permission not granted');
        return null;
      }
    }

    const token = await messaging().getToken();

    if (token) {
      console.log('FCM token obtained:', token);
      ensureTokenRefreshListener();
      return token;
    }

    console.warn('FCM token is null');
    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Saves FCM token to the API endpoint
 * @param token - FCM token string
 * @returns Promise<boolean> - true if saved successfully, false otherwise
 */
export const saveFCMTokenToAPI = async (token: string): Promise<boolean> => {
  try {
    const cachedToken = await AsyncStorage.getItem(LAST_SAVED_FCM_TOKEN_KEY);
    if (cachedToken === token) {
      console.log('FCM token already saved recently, skipping API call');
      return true;
    }

    const lastRateLimit = await AsyncStorage.getItem(LAST_FCM_RATE_LIMIT_TS_KEY);
    if (lastRateLimit) {
      const elapsed = Date.now() - Number(lastRateLimit);
      if (!Number.isNaN(elapsed) && elapsed < FCM_RATE_LIMIT_COOLDOWN_MS) {
        console.warn('Skipping FCM token save due to recent rate-limit response.');
        return false;
      }
    }

    const { deviceId, deviceType, deviceDetails } = getDeviceInfo();

    const response = await authenticatedFetch(`${API_BASE_URL}/profile/firebase-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        token,
        deviceId,
        deviceType,
        deviceDetails,
      }),
    });

    if (response.ok) {
      console.log('FCM token saved successfully to API');
      await AsyncStorage.setItem(LAST_SAVED_FCM_TOKEN_KEY, token);
      await AsyncStorage.removeItem(LAST_FCM_RATE_LIMIT_TS_KEY);
      return true;
    }

    if (response.status === 429) {
      console.warn('FCM token save rate-limited, will retry later.');
      await AsyncStorage.setItem(LAST_FCM_RATE_LIMIT_TS_KEY, String(Date.now()));
      return false;
    }

    const errorData = await response.json().catch(() => ({}));
    console.error('Failed to save FCM token:', response.status, errorData);
    return false;
  } catch (error) {
    console.error('Error saving FCM token to API:', error);
    return false;
  }
};

export const flushPendingFcmToken = async (): Promise<boolean> => {
  try {
    const pending = await AsyncStorage.getItem(PENDING_FCM_TOKEN_KEY);
    if (!pending) {
      return false;
    }

    const isAuth = await import('./auth').then((m) => m.isAuthenticated());
    if (!isAuth) {
      return false;
    }

    const saved = await saveFCMTokenToAPI(pending);
    if (saved) {
      await AsyncStorage.removeItem(PENDING_FCM_TOKEN_KEY);
      return true;
    }
  } catch (error) {
    console.error('Error flushing pending FCM token:', error);
  }

  return false;
};

export async function persistFcmToken(token: string): Promise<void> {
  try {
    const isAuth = await import('./auth').then((m) => m.isAuthenticated());

    if (!isAuth) {
      await AsyncStorage.setItem(PENDING_FCM_TOKEN_KEY, token);
      console.log('Stored FCM token pending authentication');
      return;
    }

    const saved = await saveFCMTokenToAPI(token);
    if (saved) {
      await AsyncStorage.removeItem(PENDING_FCM_TOKEN_KEY);
    } else {
      await AsyncStorage.setItem(PENDING_FCM_TOKEN_KEY, token);
    }
  } catch (error) {
    console.error('Failed to persist FCM token:', error);
    await AsyncStorage.setItem(PENDING_FCM_TOKEN_KEY, token);
  }
}

function ensureTokenRefreshListener(): void {
  if (tokenRefreshUnsubscribe) {
    return;
  }

  tokenRefreshUnsubscribe = messaging().onTokenRefresh(async (newToken) => {
    console.log('FCM token refreshed');
    await persistFcmToken(newToken);
  });
}

/**
 * Requests notification permissions for the app and registers for FCM
 * @returns Promise<boolean> - true if permission is granted, false otherwise
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    await flushPendingFcmToken();

    if (Platform.OS === 'android') {
      const apiLevel = getAndroidApiLevel();
      if (apiLevel >= 33) {
        // Add a small delay to ensure Activity is attached
        await new Promise(resolve => setTimeout(resolve, 500));

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission denied');
          return false;
        }
      }
    }

    const token = await registerDeviceAndGetFCMToken();
    if (!token) {
      console.warn('Unable to obtain FCM token after requesting permissions');
      return false;
    }

    await persistFcmToken(token);
    await flushPendingFcmToken();
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

