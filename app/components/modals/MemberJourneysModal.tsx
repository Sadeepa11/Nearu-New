import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
// import polyline from "@mapbox/polyline"; // Manual decoder used instead
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL, authenticatedFetch } from "../../../utils/auth";
import { CircleMember, Journey, JourneyHistoryPoint } from "../../types/models";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface MemberJourneysModalProps {
    isOpen: boolean;
    onClose: () => void;
    circleId?: string | number;
    memberId?: string | number;
}

const COLORS = {
    primary: "#113C9C",
    secondary: "#002B7F",
    accent: "#4ADE80",
    textMain: "#111827",
    textSub: "#6B7280",
    bgLight: "#F3F4F6",
    white: "#FFFFFF",
    blueLight: "#E8F0FE",
    error: "#EF4444",
    roadBlue: "#4285F4",
    pinRed: "#EA4335",
};

// --- Helpers ---
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

const formatTimeRange = (start: string, end: string) => {
    try {
        const s = new Date(start);
        const e = new Date(end);
        const format = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
        return `${format(s)} - ${format(e)}`;
    } catch {
        return "N/A";
    }
};

const getDuration = (start: string, end: string) => {
    try {
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        const diffMs = e - s;
        if (diffMs < 0) return "0 min";
        const mins = Math.floor(diffMs / 60000);
        if (mins < 60) return `${mins} min`;
        const hrs = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hrs} hr ${remainingMins} min`;
    } catch {
        return "N/A";
    }
};

const calculateJourneyStats = (history: JourneyHistoryPoint[]) => {
    let totalDist = 0;
    let maxSpeed = 0;

    for (let i = 0; i < history.length - 1; i++) {
        const p1 = history[i];
        const p2 = history[i + 1];
        const d = haversineDistanceMeters(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
        totalDist += d;

        const timeDiff = (new Date(p2.timestamp).getTime() - new Date(p1.timestamp).getTime()) / 3600000; // in hours
        if (timeDiff > 0) {
            const speed = (d / 1609.34) / timeDiff; // mph
            if (speed > maxSpeed && speed < 150) maxSpeed = speed; // Filter out GPS jumps
        }
    }

    return {
        distanceMiles: (totalDist / 1609.34).toFixed(1),
        topSpeedMph: Math.round(maxSpeed),
    };
};

// --- Route Helpers ---
// OSRM Base URL for routing and distance calculations
const OSRM_BASE_URL = "https://router.project-osrm.org";

const fetchJourneyStatsFromMatrix = async (history: JourneyHistoryPoint[]) => {
    if (history.length < 2) return null;

    const origin = history[0];
    const destination = history[history.length - 1];

    try {
        const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
        const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=false`;

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.routes?.[0]) {
            const result = data.routes[0];
            const distanceMiles = (result.distance / 1609.34).toFixed(1);

            const seconds = result.duration;
            const mins = Math.round(seconds / 60);

            return {
                distanceMiles,
                duration: mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} hr ${mins % 60} min`,
                rawMeters: result.distance,
                rawSeconds: seconds
            };
        }
    } catch (e) {
        console.warn("OSRM Route API error:", e);
    }

    return null;
};

// Helper: Standard polyline decoder as per Guide
const decodePolyline = (encoded: string) => {
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    while (index < len) {
        let b, shift = 0, result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        lat += (result & 1 ? ~(result >> 1) : result >> 1);
        shift = 0; result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        lng += (result & 1 ? ~(result >> 1) : result >> 1);
        poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return poly;
};

const fetchRoute = async (historyCoords: { latitude: number; longitude: number }[]): Promise<{ latitude: number, longitude: number }[]> => {
    if (historyCoords.length < 2) return historyCoords;

    try {
        // Construct coordinate string for OSRM: lon,lat;lon,lat;...
        const coordsStr = historyCoords.map(p => `${p.longitude},${p.latitude}`).join(';');
        const url = `${OSRM_BASE_URL}/route/v1/driving/${coordsStr}?overview=full&geometries=polyline`;

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.routes?.[0]?.geometry) {
            return decodePolyline(data.routes[0].geometry);
        }
    } catch (e) {
        console.error("OSRM Route fetch error:", e);
    }

    return historyCoords; // Fallback to straight lines if API fails
};

const isStationaryJourney = (history: JourneyHistoryPoint[]) => {
    if (!history || history.length < 2) return true;

    const start = history[0];
    const end = history[history.length - 1];

    const displacementMeters = haversineDistanceMeters(
        Number(start.latitude), Number(start.longitude),
        Number(end.latitude), Number(end.longitude)
    );

    const stats = calculateJourneyStats(history);
    const totalDistanceMeters = parseFloat(stats.distanceMiles) * 1609.34;

    if (displacementMeters < 100 && stats.topSpeedMph < 5) {
        return true;
    }
    if (totalDistanceMeters < 150) {
        return true;
    }

    return false;
};

const JourneyMapItem = ({ history }: { history: JourneyHistoryPoint[] }) => {
    const mapRef = React.useRef<MapView>(null);
    const [roadCoords, setRoadCoords] = useState<{ latitude: number; longitude: number }[]>([]);

    const historyCoords = useMemo(() => (history || []).map(p => ({
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
    })), [history]);

    useEffect(() => {
        let isMounted = true;
        const getRoadPath = async () => {
            if (historyCoords.length < 2) {
                setRoadCoords(historyCoords);
                return;
            }
            const snapped = await fetchRoute(historyCoords);
            if (isMounted) {
                setRoadCoords(snapped);
            }
        };
        getRoadPath();
        return () => { isMounted = false; };
    }, [historyCoords]);

    // Sample markers to avoid cluttering if history is very long
    // Displaying every ~5th point or max 15 points to keep numbers readable
    const sampledMarkers = useMemo(() => {
        if (historyCoords.length <= 15) return historyCoords.map((c, i) => ({ ...c, label: i + 1 }));

        const sampled = [];
        const step = Math.floor(historyCoords.length / 14);
        for (let i = 0; i < historyCoords.length - 1; i += step) {
            sampled.push({ ...historyCoords[i], label: i + 1 });
        }
        // Always include the last point
        sampled.push({ ...historyCoords[historyCoords.length - 1], label: historyCoords.length });
        return sampled;
    }, [historyCoords]);

    const handleMapReady = () => {
        if (historyCoords.length > 1) {
            setTimeout(() => {
                mapRef.current?.fitToCoordinates(historyCoords, {
                    edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
                    animated: true,
                });
            }, 800);
        }
    };

    return (
        <View style={{ flex: 1, width: '100%', height: SCREEN_HEIGHT * 0.25 }}>
            <MapView
                ref={mapRef}

                style={styles.mapPreview}

                onMapReady={handleMapReady}
                initialRegion={historyCoords[0] ? {
                    latitude: historyCoords[0].latitude,
                    longitude: historyCoords[0].longitude,
                    latitudeDelta: historyCoords.length < 2 ? 0.005 : 0.05,
                    longitudeDelta: historyCoords.length < 2 ? 0.005 : 0.05,
                } : undefined}
            >
                {/* Road-snapped connecting line */}
                {(roadCoords.length >= 2 || historyCoords.length >= 2) ? (
                    <Polyline
                        coordinates={roadCoords.length > 0 ? roadCoords : historyCoords}
                        strokeWidth={5}
                        strokeColor={COLORS.roadBlue}
                        lineJoin="round"
                        lineCap="round"
                        geodesic={true}
                    />
                ) : null}

                {sampledMarkers.map((point, idx) => (
                    <Marker
                        key={idx}
                        coordinate={point}
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <View style={styles.numberedMarker}>
                            <Text style={styles.numberedMarkerText}>{point.label}</Text>
                        </View>
                    </Marker>
                ))}
            </MapView>

            <View style={styles.mapControls}>
                <TouchableOpacity
                    style={styles.mapControlBtn}
                    onPress={() => mapRef.current?.fitToCoordinates(historyCoords, {
                        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
                        animated: true,
                    })}
                >
                    <MaterialCommunityIcons name="focus-field" size={20} color={COLORS.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const JourneyListItem = ({ item }: { item: Journey }) => {
    const [stats, setStats] = useState(() => calculateJourneyStats(item.history || []));
    const [duration, setDuration] = useState(() => getDuration(item.startTime, item.endTime));
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    const timeRange = formatTimeRange(item.startTime, item.endTime);
    const isStay = isStationaryJourney(item.history || []);

    useEffect(() => {
        if (isStay || (item.history || []).length < 2) return;

        let isMounted = true;
        const getMatrixStats = async () => {
            setIsLoadingStats(true);
            const matrixRes = await fetchJourneyStatsFromMatrix(item.history!);
            if (isMounted && matrixRes) {
                setStats(prev => ({ ...prev, distanceMiles: matrixRes.distanceMiles }));
                setDuration(matrixRes.duration);
            }
            setIsLoadingStats(false);
        };

        getMatrixStats();
        return () => { isMounted = false; };
    }, [item.startTime, isStay]);

    return (
        <View style={styles.journeyItem}>
            <View style={styles.journeyHeader}>
                <View style={[styles.journeyIconBox, isStay && { backgroundColor: COLORS.secondary }]}>
                    <Ionicons name={isStay ? "location-sharp" : "shuffle"} size={20} color={COLORS.white} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={isStay ? styles.stayTitle : styles.journeyTitle}>
                        {isStay ? (item.history?.[0]?.name || "Stayed at Location") : `${stats.distanceMiles} mi Trip${isLoadingStats ? " ..." : ""}`}
                    </Text>
                    <Text style={styles.journeyTime}>{timeRange} ({duration})</Text>
                </View>
            </View>

            <View style={styles.mapPreviewContainer}>
                <JourneyMapItem history={item.history || []} />
                {/* {!isStay && (
                    <View style={styles.topSpeedPill}>
                        <MaterialCommunityIcons name="speedometer" size={14} color={COLORS.secondary} />
                        <Text style={styles.topSpeedPillLabel}>Top Speed</Text>
                        <Text style={styles.topSpeedPillValue}>{stats.topSpeedMph} mph</Text>
                    </View>
                )} */}
            </View>

            {isStay && (
                <TouchableOpacity style={styles.addToPlacesBtn}>
                    <Text style={styles.addToPlacesText}>Add to Places</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const MemberJourneysModal: React.FC<MemberJourneysModalProps> = ({
    isOpen,
    onClose,
    circleId,
    memberId
}) => {
    const [loading, setLoading] = useState(false);
    const [memberData, setMemberData] = useState<CircleMember | null>(null);
    const [journeys, setJourneys] = useState<Journey[]>([]);
    const [batchStats, setBatchStats] = useState<{ totalMiles: string; totalDrives: number; topSpeed: number } | null>(null);

    const updateBatchStats = async (journeyList: Journey[]) => {
        let totalMilesMeters = 0;
        let topSpeed = 0;
        let driveCount = 0;

        const validTrips = journeyList.filter(j => !isStationaryJourney(j.history || []));

        validTrips.forEach(j => {
            const ls = calculateJourneyStats(j.history || []);
            if (ls.topSpeedMph > topSpeed) topSpeed = ls.topSpeedMph;
            totalMilesMeters += (parseFloat(ls.distanceMiles) * 1609.34);
            driveCount++;
        });

        setBatchStats({
            totalMiles: (totalMilesMeters / 1609.34).toFixed(1),
            totalDrives: driveCount,
            topSpeed
        });

        setBatchStats({
            totalMiles: (totalMilesMeters / 1609.34).toFixed(1),
            totalDrives: driveCount,
            topSpeed
        });
    };

    const fetchHistory = useCallback(async () => {
        if (!circleId || !memberId) return;
        setLoading(true);
        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/circles/${circleId}/history?page=1&perPage=100`
            );
            if (response.ok) {
                const payload = await response.json();
                const historyData = payload?.data;
                const membersWithHistory = historyData?.members || [];
                const creatorData = historyData?.creator;

                let foundMember = null;
                if (creatorData && String(creatorData.id) === String(memberId)) {
                    foundMember = creatorData;
                } else {
                    foundMember = membersWithHistory.find((m: any) => String(m.id) === String(memberId));
                }

                if (foundMember) {
                    setMemberData(foundMember);
                    setJourneys(foundMember.journeys || []);
                    updateBatchStats(foundMember.journeys || []);
                }
            }
        } catch (error) {
            console.warn("Failed to fetch member journeys", error);
        } finally {
            setLoading(false);
        }
    }, [circleId, memberId]);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, fetchHistory]);

    const weeklyStatsDisplay = useMemo(() => {
        if (batchStats) return batchStats;
        return { topSpeed: 0, totalDrives: 0, totalMiles: "0.0" };
    }, [batchStats]);

    if (!isOpen) return null;

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                <View>
                    <Text style={styles.headerTitle}>{memberData?.name || "Member"}</Text>
                    <Text style={styles.headerSubtitle}>Last Update now</Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={fetchHistory} style={styles.refreshButton}>
                <Ionicons name="refresh" size={22} color={COLORS.primary} />
            </TouchableOpacity>
        </View>
    );

    const renderProfileBar = () => {
        const batteryPercent = memberData?.batteryLevel?.batteryLevel ?? 0;
        return (
            <View style={styles.profileBar}>
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: memberData?.avatar || "https://ui-avatars.com/api/?name=" + (memberData?.name || "User") }}
                        style={styles.avatar}
                    />
                    <View style={styles.statusDot} />
                    <View style={styles.batteryBadge}>
                        <Text style={styles.batteryText}>{batteryPercent}%</Text>
                    </View>
                </View>

                <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{memberData?.name}</Text>
                    <Text style={styles.profileAddress} numberOfLines={1}>
                        {memberData?.currentLocation?.name || "Location unknown"}
                    </Text>
                    <Text style={styles.profileDate}>Since 12 December</Text>
                </View>

                <View style={styles.profileIcons}>
                    <View style={styles.deviceIcon}>
                        <MaterialCommunityIcons name="cellphone" size={20} color={COLORS.white} />
                    </View>
                    <View style={styles.blueIndicator} />
                </View>
            </View>
        );
    };

    const renderStatsSummary = () => (
        <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Weekly Driver Report</Text>
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <View style={styles.statIconCircle}>
                        <MaterialCommunityIcons name="speedometer" size={24} color={COLORS.white} />
                    </View>
                    <Text style={styles.statValue}>{weeklyStatsDisplay.topSpeed} mph</Text>
                    <Text style={styles.statLabel}>Top Speed</Text>
                </View>
                <View style={styles.statBox}>
                    <View style={styles.statIconCircle}>
                        <MaterialCommunityIcons name="car-side" size={24} color={COLORS.white} />
                    </View>
                    <Text style={styles.statValue}>{weeklyStatsDisplay.totalDrives}</Text>
                    <Text style={styles.statLabel}>Total Drives</Text>
                </View>
                <View style={styles.statBox}>
                    <View style={styles.statIconCircle}>
                        <MaterialCommunityIcons name="map-marker-distance" size={24} color={COLORS.white} />
                    </View>
                    <Text style={styles.statValue}>{weeklyStatsDisplay.totalMiles} mi</Text>
                    <Text style={styles.statLabel}>Total Miles</Text>
                </View>
            </View>
        </View>
    );

    return (
        <Modal
            visible={isOpen}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {renderHeader()}
                {loading && journeys.length === 0 ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={journeys}
                        keyExtractor={(item, index) => item.startTime || index.toString()}
                        ListHeaderComponent={
                            <>
                                {renderProfileBar()}
                                {/* {renderStatsSummary()} */}
                            </>
                        }
                        renderItem={({ item }) => <JourneyListItem item={item} />}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="car-outline" size={64} color="#D1D5DB" />
                                <Text style={styles.emptyTitle}>No Journeys Yet</Text>
                                <Text style={styles.emptyText}>Driving activity will appear here once detected.</Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    backButton: { flexDirection: "row", alignItems: "center" },
    headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textMain },
    headerSubtitle: { fontSize: 12, color: COLORS.textSub },
    refreshButton: { padding: 4 },
    profileBar: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    avatarContainer: { position: 'relative', marginRight: 12 },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.bgLight },
    statusDot: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: COLORS.accent,
        borderWidth: 2,
        borderColor: COLORS.white
    },
    batteryBadge: {
        position: 'absolute',
        bottom: -6,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        alignItems: 'center',
        paddingVertical: 1
    },
    batteryText: { fontSize: 9, fontWeight: '700', color: COLORS.error },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: "700", color: COLORS.textMain, marginBottom: 2 },
    profileAddress: { fontSize: 13, color: COLORS.primary, fontWeight: '500', marginBottom: 2 },
    profileDate: { fontSize: 12, color: COLORS.textSub },
    profileIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deviceIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center'
    },
    blueIndicator: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.secondary },
    statsContainer: { padding: 16 },
    statsTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.primary,
        textAlign: 'center',
        marginBottom: 20
    },
    statsRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    statBox: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: COLORS.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    statValue: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
    statLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textSub, textTransform: 'uppercase' },
    listContent: { paddingBottom: 40 },
    journeyItem: { padding: 16, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
    journeyHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    journeyIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    journeyTitle: { fontSize: 16, fontWeight: "700", color: COLORS.primary },
    stayTitle: { fontSize: 15, fontWeight: "600", color: COLORS.primary, flexShrink: 1 },
    journeyTime: { fontSize: 13, color: COLORS.textSub },
    addToPlacesBtn: {
        marginTop: 8,
        backgroundColor: COLORS.secondary,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignSelf: 'flex-start'
    },
    addToPlacesText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
    mapPreviewContainer: {
        width: '100%',
        height: SCREEN_HEIGHT * 0.25,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: COLORS.bgLight,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB"
    },
    mapPreview: { width: '100%', height: '100%' },
    topSpeedPill: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "rgba(232, 240, 254, 0.9)",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: COLORS.blueLight,
    },
    topSpeedPillLabel: { fontSize: 12, color: COLORS.textSub },
    topSpeedPillValue: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMain, marginTop: 16 },
    emptyText: { fontSize: 14, color: COLORS.textSub, textAlign: 'center', marginTop: 8 },

    // Numbered Journey Points
    numberedMarker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.roadBlue,
        borderWidth: 1.5,
        borderColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    numberedMarkerText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '900',
    },
    mapControls: {
        position: 'absolute',
        top: 12,
        right: 12,
        gap: 8,
    },
    mapControlBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
});

export default MemberJourneysModal;
