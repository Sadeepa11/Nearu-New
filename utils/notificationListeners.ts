import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import { Platform } from "react-native";

export type NotificationNavigationHandler = (data: Record<string, string | undefined>) => void;

export type NotificationMessageHandler = (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => void;

export interface NotificationListenerOptions {
  onNavigate?: NotificationNavigationHandler;
  onMessageReceived?: NotificationMessageHandler;
}

import { Alert } from "react-native";

let notificationReceptionEnabled = false;
let activeListenerCleanup: (() => void) | null = null;

const getTitleAndBody = (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
  const notification = remoteMessage.notification;
  const data = remoteMessage.data;
  return {
    title: (notification?.title || data?.title || "Notification") as string,
    body: (notification?.body || data?.body || data?.message || "New message received") as string,
    data: data,
  };
};

const displayForegroundAlert = (title: string | undefined, body: string | undefined) => {
  // Simple alert fallback if no custom handler is provided
  Alert.alert(title || "Notification", body || "");
};

const handleNavigationIntent = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  onNavigate?: NotificationNavigationHandler
) => {
  if (onNavigate && remoteMessage.data) {
    onNavigate(remoteMessage.data as Record<string, string | undefined>);
  }
};

export const registerNotificationListeners = (
  options?: NotificationListenerOptions
): (() => void) => {
  if (Platform.OS === "web") {
    return () => undefined;
  }

  let unsubscribeForeground: (() => void) | undefined;
  let unsubscribeNotificationOpened: (() => void) | undefined;

  try {
    unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      if (options?.onMessageReceived) {
        options.onMessageReceived(remoteMessage);
      } else {
        const { title, body } = getTitleAndBody(remoteMessage);
        const type = remoteMessage.data?.type;
        if (type !== "location_reached" && type !== "location_left") {
          displayForegroundAlert(title, body);
        }
      }
      handleNavigationIntent(remoteMessage, options?.onNavigate);
    });
  } catch (error) {
    console.warn("Failed to register foreground notification listener", error);
  }

  try {
    unsubscribeNotificationOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      handleNavigationIntent(remoteMessage, options?.onNavigate);
    });
  } catch (error) {
    console.warn("Failed to register notification opened listener", error);
  }

  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        handleNavigationIntent(remoteMessage, options?.onNavigate);
      }
    })
    .catch((error) => {
      console.warn("Failed to get initial notification", error);
    });

  return () => {
    try {
      unsubscribeForeground?.();
    } catch (error) {
      console.warn("Error cleaning up foreground listener", error);
    }

    try {
      unsubscribeNotificationOpened?.();
    } catch (error) {
      console.warn("Error cleaning up opened listener", error);
    }
  };
};

export const setNotificationReceptionEnabled = async (enabled: boolean): Promise<void> => {
  if (enabled) {
    if (notificationReceptionEnabled) {
      return;
    }

    try {
      activeListenerCleanup?.();
    } catch (cleanupError) {
      console.warn("Error clearing existing notification listeners", cleanupError);
    }

    try {
      activeListenerCleanup = registerNotificationListeners();
      notificationReceptionEnabled = true;
    } catch (registrationError) {
      notificationReceptionEnabled = false;
      activeListenerCleanup = null;
      throw registrationError;
    }

    return;
  }

  if (!notificationReceptionEnabled) {
    return;
  }

  notificationReceptionEnabled = false;

  if (activeListenerCleanup) {
    try {
      activeListenerCleanup();
    } catch (cleanupError) {
      console.warn("Error cleaning up notification listeners", cleanupError);
    }
    activeListenerCleanup = null;
  }
};
