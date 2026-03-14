import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL, authenticatedFetch } from "../../../utils/auth";
import { useAlert } from "../../context/AlertContext";

import { AppNotification, NotificationPagination } from "../../types/models";

interface NotificationsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({
    isOpen,
    onClose
}) => {
    const { showAlert } = useAlert();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<NotificationPagination | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPage(1);
            fetchNotifications(1, false);
        }
    }, [isOpen]);

    const fetchNotifications = async (pageToFetch: number, append: boolean) => {
        try {
            if (!append) setLoading(true);
            else setLoadingMore(true);

            const response = await authenticatedFetch(
                `${API_BASE_URL}/notifications?page=${pageToFetch}&perPage=20`
            );

            if (response.ok) {
                const result = await response.json();
                const fetchedNotifications = result.data?.notifications || [];
                const fetchedPagination = result.data?.pagination || null;

                if (append) {
                    setNotifications(prev => [...prev, ...fetchedNotifications]);
                } else {
                    setNotifications(fetchedNotifications);
                }
                setPagination(fetchedPagination);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchNotifications(1, false);
    };

    const handleLoadMore = () => {
        if (!loadingMore && pagination && page < pagination.totalPages) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchNotifications(nextPage, true);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/notifications/${id}`, {
                method: 'PUT',
                headers: {
                    "Content-Type": "application/json",
                    accept: "application/json",
                }
            });

            if (response.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            }
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            visible={isOpen}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color="#113C9C" />
                        <Text style={styles.headerTitle}>Notifications</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#113C9C" />
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={(item) => item.id}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        renderItem={({ item }) => {
                            const date = new Date(item.createdAt);
                            const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            return (
                                <TouchableOpacity
                                    style={[styles.notificationItem, !item.read && styles.unreadItem]}
                                    onPress={() => !item.read && handleMarkAsRead(item.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.iconContainer}>
                                        <View style={[styles.typeIconCircle, { backgroundColor: item.read ? '#F3F4F6' : '#DBEAFE' }]}>
                                            <Ionicons
                                                name={getNotificationIcon(item.type)}
                                                size={20}
                                                color={item.read ? '#9CA3AF' : '#113C9C'}
                                            />
                                        </View>
                                    </View>
                                    <View style={styles.notificationContent}>
                                        <View style={styles.itemHeader}>
                                            <Text style={styles.notificationType}>
                                                {formatType(item.type)}
                                            </Text>
                                            <Text style={styles.notificationTime}>{timeStr}</Text>
                                        </View>
                                        <Text style={[styles.notificationMessage, !item.read && styles.unreadMessageText]}>
                                            {item.message}
                                        </Text>
                                        {item.circle && (
                                            <View style={styles.circleTag}>
                                                <Ionicons name="people-outline" size={12} color="#6B7280" />
                                                <Text style={styles.circleTagName}>{item.circle.name}</Text>
                                            </View>
                                        )}
                                    </View>
                                    {!item.read && <View style={styles.unreadDot} />}
                                </TouchableOpacity>
                            );
                        }}
                        ListFooterComponent={() => (
                            loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color="#113C9C" /> : null
                        )}
                        ListEmptyComponent={
                            !loading ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="notifications-off-outline" size={64} color="#9CA3AF" />
                                    <Text style={styles.emptyText}>No notifications</Text>
                                </View>
                            ) : null
                        }
                        contentContainerStyle={styles.listContent}
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
};

const getNotificationIcon = (type: string) => {
    switch (type) {
        case 'location_reached': return 'location-outline';
        case 'location_left': return 'exit-outline';
        case 'low_battery': return 'battery-dead-outline';
        case 'sos_alert': return 'warning-outline';
        case 'drive_detected': return 'car-outline';
        default: return 'notifications-outline';
    }
};

const formatType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    backButton: { flexDirection: "row", alignItems: "center" },
    headerTitle: { fontSize: 20, fontWeight: "700", color: "#113C9C", marginLeft: 8 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 40 },
    notificationItem: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    unreadItem: {
        backgroundColor: '#fff',
        borderLeftWidth: 4,
        borderLeftColor: '#113C9C',
    },
    iconContainer: {
        marginRight: 12,
    },
    typeIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationContent: { flex: 1 },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    notificationType: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    notificationTime: { fontSize: 11, color: '#9CA3AF' },
    notificationMessage: { fontSize: 15, color: '#374151', lineHeight: 20 },
    unreadMessageText: { fontWeight: '600', color: '#111827' },
    circleTag: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    circleTagName: {
        fontSize: 11,
        color: '#6B7280',
        marginLeft: 4,
        fontWeight: '500',
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#113C9C',
        marginLeft: 8,
        marginTop: 15,
    },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
    emptyText: { fontSize: 16, color: '#9CA3AF', marginTop: 16, fontWeight: '500' },
});

export default NotificationsModal;
