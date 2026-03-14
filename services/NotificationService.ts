import { API_BASE_URL, authenticatedFetch } from "@/utils/auth";

export interface Actor {
    id: string;
    name: string;
    avatar: string;
}

export interface CircleInfo {
    id: string;
    name: string;
}

export interface LocationInfo {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
}

export interface NotificationItem {
    id: string;
    type: string; // 'location_reached', etc.
    message: string;
    read: boolean;
    metadata: Record<string, any>;
    createdAt: string;
    actor?: Actor;
    circle?: CircleInfo;
    location?: LocationInfo;
}

export interface PaginationData {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
}

export interface FetchNotificationsResponse {
    notifications: NotificationItem[];
    pagination: PaginationData;
}

export const NotificationService = {
    /**
     * Fetches the user's notifications.
     */
    fetchNotifications: async (page = 1, perPage = 20, read?: boolean): Promise<FetchNotificationsResponse> => {
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                perPage: perPage.toString(),
            });

            if (read !== undefined) {
                queryParams.append("read", read.toString());
            }

            const response = await authenticatedFetch(`${API_BASE_URL}/notifications?${queryParams.toString()}`, {
                method: "GET",
                headers: { accept: "application/json" },
            });

            if (!response.ok) {
                return {
                    notifications: [],
                    pagination: { page: 1, perPage: 20, total: 0, totalPages: 0 }
                };
            }

            const json = await response.json();

            if (json.success && json.data) {
                return {
                    notifications: json.data.notifications || [],
                    pagination: json.data.pagination || { page: 1, perPage: 20, total: 0, totalPages: 0 }
                };
            }

            return {
                notifications: [],
                pagination: { page: 1, perPage: 20, total: 0, totalPages: 0 }
            };

        } catch (error) {
            console.error("Error fetching notifications:", error);
            return {
                notifications: [],
                pagination: { page: 1, perPage: 20, total: 0, totalPages: 0 }
            };
        }
    },

    /**
     * Marks a notification as read.
     */
    markAsRead: async (notificationId: string): Promise<boolean> => {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/notifications/${notificationId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
            });
            return response.ok;
        } catch (error) {
            console.error("Error marking read:", error);
            return false;
        }
    },

    /**
     * Marks ALL notifications as read.
     */
    markAllAsRead: async (): Promise<boolean> => {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/notifications/mark-all-read`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
            });
            return response.ok;
        } catch (error) {
            console.error("Error marking all read:", error);
            return false;
        }
    },

    /**
     * Creates a new notification (useful for testing or triggering manually).
     */
    createNotification: async (data: Partial<NotificationItem>): Promise<NotificationItem | null> => {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/notifications`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) return null;
            const json = await response.json();
            return json.success ? json.data : null;
        } catch (error) {
            console.error("Error creating notification:", error);
            return null;
        }
    }
};
