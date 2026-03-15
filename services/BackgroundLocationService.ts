import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import BackgroundService from 'react-native-background-actions';
import { API_BASE_URL, authenticatedFetch } from '../utils/auth';
import { storeLastKnownLocation } from '../utils/locationCache';

const BACKGROUND_LOCATION_TASK = 'background-location-task';
const LOCATION_QUEUE_KEY = 'location-sync-queue';

// --- Type Definitions ---
interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    timestamp: number;
    speed: number | null;
}

// --- Queue Management ---

const getQueue = async (): Promise<LocationData[]> => {
    try {
        const raw = await AsyncStorage.getItem(LOCATION_QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error('Error reading location queue:', error);
        return [];
    }
};

const saveQueue = async (queue: LocationData[]) => {
    try {
        await AsyncStorage.setItem(LOCATION_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
        console.error('Error saving location queue:', error);
    }
};

const queueLocation = async (location: LocationData) => {
    const queue = await getQueue();
    queue.push(location);
    await saveQueue(queue);
};

// --- Sync Logic ---

export const syncLocationQueue = async () => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
        console.log('Offline: Skipping sync.');
        return;
    }

    const queue = await getQueue();
    if (queue.length === 0) return;

    console.log(`Syncing ${queue.length} locations...`);

    const remainingQueue: LocationData[] = [];

    const circleId = await AsyncStorage.getItem("mapScreen:lastSelectedCircleId");
    const isDriveDetectionEnabled = (await AsyncStorage.getItem("user_drive_detection_enabled")) === "true";

    if (!circleId) {
        console.warn("No circle ID found for background update. Aborting sync.");
        return;
    }

    for (const loc of queue) {
        try {
            // Check drive detection setting
            const isDriveEnabled = (await AsyncStorage.getItem("user_drive_detection_enabled")) === "true";
            
            const response = await authenticatedFetch(`${API_BASE_URL}/profile/circles/${circleId}/location`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    accept: "application/json",
                },
                body: JSON.stringify({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    name: "Background Update from front end",
                    metadata: {
                        speed: isDriveDetectionEnabled ? String(Math.round(loc.speed ?? 0)) : "0"
                   }
                })
            });

            if (!response.ok) {
                console.warn("Failed to sync location:", await response.text());
                remainingQueue.push(loc);
            }
        } catch (error) {
            console.error("Sync error:", error);
            remainingQueue.push(loc);
        }
    }

    await saveQueue(remainingQueue);
};

// --- Background Task (Android) ---

const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), time));

const backgroundTask = async (taskDataArguments?: { delay: number }) => {
    const delay = taskDataArguments?.delay || 5000;

    await new Promise<void>(async (resolve) => {
        let subscription: Location.LocationSubscription | null = null;

        try {
            // Start watching position
            subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: delay,
                    // distanceInterval: 20,
                },
                async (location) => {
                    const locData: LocationData = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy,
                        speed: location.coords.speed !== null ? location.coords.speed : null, //test case 1
                        timestamp: location.timestamp,
                    };

                    console.log('[Android Service] Location received:', locData);

                    // Sync with centralized location cache so foreground can see it
                    await storeLastKnownLocation({
                        latitude: locData.latitude,
                        longitude: locData.longitude,
                        speed: locData.speed
                    });

                    const state = await NetInfo.fetch();
                    if (state.isConnected) {
                        await queueLocation(locData);
                        await syncLocationQueue();
                    } else {
                        await queueLocation(locData);
                    }
                }
            );

            // Loop to keep service alive
            while (BackgroundService.isRunning()) {
                await sleep(5000);
            }

        } catch (e) {
            console.error(e);
        } finally {
            if (subscription) {
                subscription.remove();
            }
        }
    });
};

const options = {
    taskName: 'Nearu Location Service',
    taskTitle: 'Nearu Running',
    taskDesc: 'Your location is being tracked in the background.',
    taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
    },
    color: '#ff00ff',
    linkingURI: 'yourSchemeHere://chat/jane',
    parameters: {
        delay: 30000,
    },
};

// --- Expo Task (iOS) ---

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
        console.error('Background location task error:', error);
        return;
    }
    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const location = locations[0];
        if (!location) return;

        const locData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            speed: location.coords.speed !== null ? location.coords.speed : null,   //Test case 2
            timestamp: location.timestamp,
        };

        const state = await NetInfo.fetch();
        
        // Sync with centralized location cache
        await storeLastKnownLocation({
            latitude: locData.latitude,
            longitude: locData.longitude,
            speed: locData.speed
        });

        if (state.isConnected) {
            await queueLocation(locData);
            await syncLocationQueue();
        } else {
            await queueLocation(locData);
        }
    }
});

// --- Public API ---

export const startBackgroundLocation = async () => {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
        console.warn('Foreground location permission denied');
        return;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
        console.warn('Background location permission denied');
    }

    if (Platform.OS === 'android') {
        if (!BackgroundService.isRunning()) {
            try {
                await BackgroundService.start(backgroundTask, options);
                console.log('Android Background Service Started');
            } catch (e) {
                console.error('Error starting background service', e);
            }
        }
    } else {
        // iOS or others
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10,
            timeInterval: 10000,
            showsBackgroundLocationIndicator: true,
            pausesUpdatesAutomatically: false,
            foregroundService: {
                notificationTitle: 'Location Tracking Active',
                notificationBody: 'Your location is being tracked in the background.',
                notificationColor: '#113C9C',
            },
        });
        console.log('iOS Background location tracking started.');
    }
};

export const stopBackgroundLocation = async () => {
    if (Platform.OS === 'android') {
        await BackgroundService.stop();
    } else {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        if (isRegistered) {
            await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        }
    }
    console.log('Background location tracking stopped.');
};

export const isBackgroundLocationRunning = async () => {
    if (Platform.OS === 'android') {
        return BackgroundService.isRunning();
    }
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
};





// import AsyncStorage from '@react-native-async-storage/async-storage';
// import NetInfo from '@react-native-community/netinfo';
// import * as Location from 'expo-location';
// import * as TaskManager from 'expo-task-manager';
// import { AppState, Platform } from 'react-native';
// import BackgroundService from 'react-native-background-actions';
// import { API_BASE_URL, authenticatedFetch } from '../utils/auth';

// const BACKGROUND_LOCATION_TASK = 'background-location-task';
// const LOCATION_QUEUE_KEY = 'location-sync-queue';
// const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

// // --- Type Definitions ---
// interface LocationData {
//     latitude: number;
//     longitude: number;
//     accuracy: number | null;
//     timestamp: number;
//     speed: number | null;
// }

// // --- Queue Management ---

// const getQueue = async (): Promise<LocationData[]> => {
//     try {
//         const raw = await AsyncStorage.getItem(LOCATION_QUEUE_KEY);
//         return raw ? JSON.parse(raw) : [];
//     } catch (error) {
//         console.error('Error reading location queue:', error);
//         return [];
//     }
// };

// const saveQueue = async (queue: LocationData[]) => {
//     try {
//         await AsyncStorage.setItem(LOCATION_QUEUE_KEY, JSON.stringify(queue));
//     } catch (error) {
//         console.error('Error saving location queue:', error);
//     }
// };

// const queueLocation = async (location: LocationData) => {
//     const queue = await getQueue();
//     queue.push(location);
//     await saveQueue(queue);
// };

// // --- Sync Logic ---

// const getLocationNameFromOSM = async (latitude: number, longitude: number): Promise<string> => {
//     try {
//         const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}`;
//         const response = await fetch(url, {
//             headers: {
//                 'Accept': 'application/json',
//                 'User-Agent': 'NearuApp/1.0'
//             }
//         });
//         const data = await response.json();

//         if (data && data.display_name) {
//             return data.display_name;
//         } else {
//             console.warn("Nominatim reverse geocoding returned no display_name");
//             return "Backgroud Update by Front  End";
//         }
//     } catch (error) {
//         console.warn("Error fetching location name from OSM:", error);
//         return "Backgroud Update by Front  End";
//     }
// };

// export const syncLocationQueue = async () => {
//     const state = await NetInfo.fetch();
//     if (!state.isConnected) {
//         console.log('Offline: Skipping sync.');
//         return;
//     }

//     const queue = await getQueue();
//     if (queue.length === 0) return;

//     console.log(`Syncing ${queue.length} locations...`);

//     const remainingQueue: LocationData[] = [];

//     const circleId = await AsyncStorage.getItem("mapScreen:lastSelectedCircleId");
//     const isDriveDetectionEnabled = (await AsyncStorage.getItem("user_drive_detection_enabled")) === "true";

//     if (!circleId) {
//         console.warn("No circle ID found for background update. Aborting sync.");
//         return;
//     }

//     for (const loc of queue) {
//         try {
//             const realLocationName = await getLocationNameFromOSM(loc.latitude, loc.longitude);
            
//             const response = await authenticatedFetch(`${API_BASE_URL}/profile/circles/${circleId}/location`, {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     accept: "application/json",
//                 },
//                 body: JSON.stringify({
//                     latitude: loc.latitude,
//                     longitude: loc.longitude,
//                     name: realLocationName,
//                     metadata:JSON.stringify({
//                         accuracy: loc.accuracy,
//                         speed: loc.speed,
//                         timestamp: loc.timestamp,
//                         is_offline_sync: true
//                     })
//                 })
//             });

//             if (!response.ok) {
//                 console.warn("Failed to sync location:", await response.text());
//                 remainingQueue.push(loc);
//             }
//         } catch (error) {
//             console.error("Sync error:", error);
//             remainingQueue.push(loc);
//         }
//     }

//     await saveQueue(remainingQueue);
// };

// // --- Dynamic Config ---

// const getFrequencyConfig = (_isDriveEnabled: boolean) => {
//     return {
//         timeInterval: 5000, // 5s
//     };
// };

// // --- Background Task (Android) ---

// const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), time));

// const backgroundTask = async (taskDataArguments?: { timeInterval: number }) => {
//     const timeInterval = taskDataArguments?.timeInterval || 5000;

//     await new Promise<void>(async (resolve) => {
//         let subscription: Location.LocationSubscription | null = null;

//         try {
//             // Start watching position
//             subscription = await Location.watchPositionAsync(
//                 {
//                     accuracy: Location.Accuracy.High,
//                     timeInterval,
//                 },
//                 async (location) => {
//                     const locData: LocationData = {
//                         latitude: location.coords.latitude,
//                         longitude: location.coords.longitude,
//                         accuracy: location.coords.accuracy,
//                         speed: location.coords.speed,
//                         timestamp: location.timestamp,
//                     };

//                     console.log('[Android Service] Location received:', locData);

//                     // Skip background update if app is in foreground
//                     if (AppState.currentState === 'active') {
//                         console.log('[Android Service] App is active, skipping background location queue');
//                         return;
//                     }

//                     const state = await NetInfo.fetch();
//                     if (state.isConnected) {
//                         await queueLocation(locData);
//                         await syncLocationQueue();
//                     } else {
//                         await queueLocation(locData);
//                     }
//                 }
//             );

//             // Loop to keep service alive and force sync every 5s
//             while (BackgroundService.isRunning()) {
//                 await sleep(5000); // 5s frequency
                
//                 try {
//                     const state = await NetInfo.fetch();
//                     if (state.isConnected) {
//                         try {
//                             const loc = await Location.getCurrentPositionAsync({
//                                 accuracy: Location.Accuracy.Balanced,
//                             });
//                             const locData: LocationData = {
//                                 latitude: loc.coords.latitude,
//                                 longitude: loc.coords.longitude,
//                                 accuracy: loc.coords.accuracy,
//                                 speed: loc.coords.speed,
//                                 timestamp: loc.timestamp,
//                             };
//                             await queueLocation(locData);
//                         } catch (locErr) {
//                             console.warn("Failed to get location in explicit bg loop:", locErr);
//                         }
//                         await syncLocationQueue();
//                     }
//                 } catch (syncErr) {
//                     console.error("Error during explicit background sync:", syncErr);
//                 }
//             }

//         } catch (e) {
//             console.error(e);
//         } finally {
//             if (subscription) {
//                 subscription.remove();
//             }
//         }
//     });
// };

// const options = {
//     taskName: 'Nearu Location Service',
//     taskTitle: 'Nearu Running',
//     taskDesc: 'Your location is being tracked in the background.',
//     taskIcon: {
//         name: 'ic_launcher',
//         type: 'mipmap',
//     },
//     color: '#ff00ff',
//     linkingURI: 'yourSchemeHere://chat/jane',
//     parameters: {
//         timeInterval: 5000,
//     },
// };

// // --- Expo Task (iOS) ---

// TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
//     if (error) {
//         console.error('Background location task error:', error);
//         return;
//     }
//     if (data) {
//         const { locations } = data as { locations: Location.LocationObject[] };
//         const location = locations[0];
//         if (!location) return;

//         const locData: LocationData = {
//             latitude: location.coords.latitude,
//             longitude: location.coords.longitude,
//             accuracy: location.coords.accuracy,
//             speed: location.coords.speed,
//             timestamp: location.timestamp,
//         };

//         // Skip background update if app is in foreground
//         if (AppState.currentState === 'active') {
//             console.log('[iOS Task] App is active, skipping background location queue');
//             return;
//         }

//         const state = await NetInfo.fetch();
//         if (state.isConnected) {
//             await queueLocation(locData);
//             await syncLocationQueue();
//         } else {
//             await queueLocation(locData);
//         }
//     }
// });

// // --- Public API ---

// export const startBackgroundLocation = async () => {
//     const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
//     if (fgStatus !== 'granted') {
//         console.warn('Foreground location permission denied');
//         return;
//     }

//     const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
//     if (bgStatus !== 'granted') {
//         console.warn('Background location permission denied');
//     }

//     const isDriveEnabled = (await AsyncStorage.getItem("user_drive_detection_enabled")) === "true";
//     const config = getFrequencyConfig(isDriveEnabled);

//     if (Platform.OS === 'android') {
//         if (!BackgroundService.isRunning()) {
//             try {
//                 await BackgroundService.start(backgroundTask, {
//                     ...options,
//                     parameters: config
//                 });
//                 console.log('Android Background Service Started with config:', config);
//             } catch (e) {
//                 console.error('Error starting background service', e);
//             }
//         }
//     } else {
//         // iOS or others
//         await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
//             accuracy: Location.Accuracy.High,
//             timeInterval: config.timeInterval,
//             showsBackgroundLocationIndicator: true,
//             pausesUpdatesAutomatically: false,
//             foregroundService: {
//                 notificationTitle: 'Location Tracking Active',
//                 notificationBody: 'Your location is being tracked in the background.',
//                 notificationColor: '#113C9C',
//             },
//         });
//         console.log('iOS Background location tracking started with config:', config);
//     }
// };

// export const stopBackgroundLocation = async () => {
//     if (Platform.OS === 'android') {
//         await BackgroundService.stop();
//     } else {
//         const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
//         if (isRegistered) {
//             await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
//         }
//     }
//     console.log('Background location tracking stopped.');
// };

// export const isBackgroundLocationRunning = async () => {
//     if (Platform.OS === 'android') {
//         return BackgroundService.isRunning();
//     }
//     return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
// };
