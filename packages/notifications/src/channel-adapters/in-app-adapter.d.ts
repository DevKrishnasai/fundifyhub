/**
 * In-App Notification Adapter
 *
 * Handles storing in-app notifications in the database.
 * These notifications appear in the user's notification center.
 */
import { NotificationChannel } from '@fundifyhub/types';
import { BaseChannelAdapter, type ChannelSendParams, type ChannelSendResult } from './base-adapter';
/** Extended params for in-app notifications */
export interface InAppSendParams extends ChannelSendParams {
    /** User ID to deliver notification to */
    userId: string;
    /** Notification title */
    title?: string;
    /** Action URL when clicked */
    actionUrl?: string;
    /** Related request ID */
    requestId?: string;
    /** Related loan ID */
    loanId?: string;
    /** Related EMI schedule ID */
    emiScheduleId?: string;
    /** Auto-dismiss after seconds (0 = no auto-dismiss) */
    autoDismissSeconds?: number;
}
/**
 * In-App notification adapter
 * Stores notifications directly in the database for display in the UI
 */
export declare class InAppAdapter extends BaseChannelAdapter {
    readonly channel = NotificationChannel.IN_APP;
    /**
     * Initialize the adapter
     */
    initialize(): Promise<void>;
    /**
     * Send (store) an in-app notification
     */
    send(params: ChannelSendParams): Promise<ChannelSendResult>;
    /**
     * Check if database is healthy
     */
    healthCheck(): Promise<boolean>;
    /**
     * Shutdown the adapter
     */
    shutdown(): Promise<void>;
    /**
     * Mark a notification as read
     */
    markAsRead(notificationId: string): Promise<boolean>;
    /**
     * Mark all notifications for a user as read
     */
    markAllAsRead(userId: string): Promise<number>;
    /**
     * Get unread notification count for a user
     */
    getUnreadCount(userId: string): Promise<number>;
    /**
     * Get notifications for a user
     */
    getNotifications(userId: string, options?: {
        limit?: number;
        offset?: number;
        unreadOnly?: boolean;
    }): Promise<Array<{
        id: string;
        title: string;
        message: string;
        isRead: boolean;
        actionUrl: string | null;
        createdAt: Date;
    }>>;
}
/**
 * Get or create In-App adapter singleton
 */
export declare function getInAppAdapter(): InAppAdapter;
export default InAppAdapter;
//# sourceMappingURL=in-app-adapter.d.ts.map