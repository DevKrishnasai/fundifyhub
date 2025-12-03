"use strict";
/**
 * In-App Notification Adapter
 *
 * Handles storing in-app notifications in the database.
 * These notifications appear in the user's notification center.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppAdapter = void 0;
exports.getInAppAdapter = getInAppAdapter;
const logger_1 = require("@fundifyhub/logger");
const types_1 = require("@fundifyhub/types");
const prisma_1 = require("@fundifyhub/prisma");
const base_adapter_1 = require("./base-adapter");
const logger = (0, logger_1.createLogger)({ serviceName: 'InAppAdapter' });
/**
 * In-App notification adapter
 * Stores notifications directly in the database for display in the UI
 */
class InAppAdapter extends base_adapter_1.BaseChannelAdapter {
    constructor() {
        super(...arguments);
        this.channel = types_1.NotificationChannel.IN_APP;
    }
    /**
     * Initialize the adapter
     */
    async initialize() {
        if (this._initialized)
            return;
        // Verify database connection
        try {
            await prisma_1.prisma.$queryRaw `SELECT 1`;
            this._initialized = true;
            this._isAvailable = true;
            logger.info('In-App adapter initialized');
        }
        catch (error) {
            logger.error('Failed to initialize In-App adapter: database connection failed');
            throw error;
        }
    }
    /**
     * Send (store) an in-app notification
     */
    async send(params) {
        if (!this._initialized) {
            return this.failureResult('Adapter not initialized', 'not_initialized');
        }
        const inAppParams = params;
        const { userId, title, content, actionUrl, requestId, loanId, emiScheduleId } = inAppParams;
        if (!userId) {
            return this.failureResult('userId is required for in-app notifications', 'missing_user_id');
        }
        try {
            const notification = await prisma_1.prisma.inAppNotification.create({
                data: {
                    userId,
                    title: title || 'Notification',
                    message: content,
                    actionUrl,
                    requestId,
                    loanId,
                    emiScheduleId,
                    isRead: false,
                },
            });
            logger.info(`In-app notification created for user ${userId}`);
            return this.successResult(notification.id, {
                userId,
                title: notification.title,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return this.failureResult(errorMessage, 'database_error');
        }
    }
    /**
     * Check if database is healthy
     */
    async healthCheck() {
        try {
            await prisma_1.prisma.$queryRaw `SELECT 1`;
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Shutdown the adapter
     */
    async shutdown() {
        this._isAvailable = false;
        this._initialized = false;
        logger.info('In-App adapter shutdown');
    }
    /**
     * Mark a notification as read
     */
    async markAsRead(notificationId) {
        try {
            await prisma_1.prisma.inAppNotification.update({
                where: { id: notificationId },
                data: { isRead: true, readAt: new Date() },
            });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Mark all notifications for a user as read
     */
    async markAllAsRead(userId) {
        try {
            const result = await prisma_1.prisma.inAppNotification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true, readAt: new Date() },
            });
            return result.count;
        }
        catch {
            return 0;
        }
    }
    /**
     * Get unread notification count for a user
     */
    async getUnreadCount(userId) {
        try {
            return await prisma_1.prisma.inAppNotification.count({
                where: { userId, isRead: false },
            });
        }
        catch {
            return 0;
        }
    }
    /**
     * Get notifications for a user
     */
    async getNotifications(userId, options) {
        try {
            const { limit = 20, offset = 0, unreadOnly = false } = options || {};
            return await prisma_1.prisma.inAppNotification.findMany({
                where: {
                    userId,
                    ...(unreadOnly ? { isRead: false } : {}),
                },
                select: {
                    id: true,
                    title: true,
                    message: true,
                    isRead: true,
                    actionUrl: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            });
        }
        catch {
            return [];
        }
    }
}
exports.InAppAdapter = InAppAdapter;
/** Singleton instance */
let inAppAdapterInstance = null;
/**
 * Get or create In-App adapter singleton
 */
function getInAppAdapter() {
    if (!inAppAdapterInstance) {
        inAppAdapterInstance = new InAppAdapter();
    }
    return inAppAdapterInstance;
}
exports.default = InAppAdapter;
