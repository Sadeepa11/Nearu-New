import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Slot, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { GestureHandlerRootView } from "react-native-gesture-handler";

import "react-native-reanimated";
import "../global.css";

import { useColorScheme } from "@/hooks/use-color-scheme";

import { syncLocationQueue } from "@/services/BackgroundLocationService"; // Ensure this is imported to register task
import { initializeCrashReporter } from "@/utils/crashReporter";
import { registerNotificationListeners } from "@/utils/notificationListeners";
import { requestNotificationPermissions } from "@/utils/permissions";
import NetInfo from "@react-native-community/netinfo";

import { useState } from "react";
import { NotificationToast } from "../components/NotificationToast";
import { NotificationItem, NotificationService } from "../services/NotificationService";
import { AlertProvider } from "./context/AlertContext";


export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();


  // Notification State
  const [toastVisible, setToastVisible] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<NotificationItem | null>(null);

  useEffect(() => {
    initializeCrashReporter();
    requestNotificationPermissions();
    // Listen for network state changes to sync offline locations
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        syncLocationQueue();
      }
    });

    // Initial fetch on startup
    NotificationService.fetchNotifications().catch(err =>
      console.warn("Failed to fetch initial notifications:", err)
    );


    const navigateFromNotification = (data: Record<string, string | undefined>) => {
      const candidate =
        data.route ??
        data.path ??
        data.screen ??
        data.navigateTo ??
        data.target ??
        null;

      if (!candidate) {
        return;
      }

      const normalized = candidate.startsWith("/") ? candidate : `/screens/${candidate}`;

      try {
        router.push(normalized as any);
      } catch (error) {
        console.warn("Failed to navigate from notification", { error, data, normalized });
      }
    };

    const handleMessageReceived = (remoteMessage: any) => {
      const title = remoteMessage.notification?.title || remoteMessage.data?.title || "Notification";
      const message = remoteMessage.notification?.body || remoteMessage.data?.body || remoteMessage.data?.message || "";
      const type = remoteMessage.data?.type || 'info';

      // Refresh notifications when new one arrives
      NotificationService.fetchNotifications().catch(console.warn);

      // Skip toast for location updates
      if (type === 'location_reached' || type === 'location_left') {
        return;
      }

      setCurrentNotification({
        id: remoteMessage.messageId || Date.now().toString(),
        type,
        message,
        read: false,
        metadata: { title, ...remoteMessage.data },
        createdAt: new Date().toISOString()
      });
      setToastVisible(true);
    };

    const unsubscribe = registerNotificationListeners({
      onNavigate: navigateFromNotification,
      onMessageReceived: handleMessageReceived
    });

    return () => {
      unsubscribe?.();
      unsubscribeNetInfo();

    };
  }, [router]);

  return (

    <GestureHandlerRootView style={{ flex: 1 }}>
      <AlertProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Slot />
          <NotificationToast
            visible={toastVisible}
            notification={currentNotification}
            onPress={() => {
              setToastVisible(false);
            }}
            onClose={() => setToastVisible(false)}
          />
          <StatusBar style="auto" />
        </ThemeProvider>
      </AlertProvider>
    </GestureHandlerRootView>
  );
}
