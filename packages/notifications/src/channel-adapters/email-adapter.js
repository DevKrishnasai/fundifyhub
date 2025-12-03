"use strict";
/**
 * Email Channel Adapter
 *
 * Handles sending email notifications via SMTP using nodemailer.
 * Integrates with the service manager for connection management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAdapter = void 0;
exports.getEmailAdapter = getEmailAdapter;
const logger_1 = require("@fundifyhub/logger");
const types_1 = require("@fundifyhub/types");
const base_adapter_1 = require("./base-adapter");
const logger = (0, logger_1.createLogger)({ serviceName: 'EmailAdapter' });
/**
 * Email channel adapter using nodemailer
 *
 * Note: This adapter is designed to work with the existing service-manager
 * architecture. In production, it uses the transporter from service-manager.
 * For testing/standalone usage, it can create its own transporter.
 */
class EmailAdapter extends base_adapter_1.BaseChannelAdapter {
    constructor() {
        super(...arguments);
        this.channel = types_1.NotificationChannel.EMAIL;
        this.config = null;
    }
    /**
     * Initialize with optional config.
     * If no config provided, will use service-manager's transporter.
     */
    async initialize(config) {
        if (this._initialized)
            return;
        if (config) {
            this.config = config;
            // Validate config
            if (!config.host || !config.port || !config.auth.user) {
                throw new Error('Invalid email configuration: missing required fields');
            }
        }
        this._initialized = true;
        this._isAvailable = true;
        logger.info('Email adapter initialized');
    }
    /**
     * Send an email notification
     */
    async send(params) {
        if (!this._initialized) {
            return this.failureResult('Adapter not initialized', 'not_initialized');
        }
        const { recipient, subject, content, htmlContent, priority } = params;
        // Validate email
        if (!this.isValidEmail(recipient)) {
            return this.failureResult(`Invalid email address: ${recipient}`, 'invalid_email');
        }
        try {
            // In production, this will use the service-manager's transporter
            // For now, we'll return success and let the worker handle actual sending
            // This adapter provides the interface and validation layer
            const messageId = this.generateMessageId();
            logger.info(`Email queued for ${recipient} (priority: ${priority})`);
            return this.successResult(messageId, {
                to: recipient,
                subject,
                hasHtml: !!htmlContent,
                contentLength: (htmlContent || content).length,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorCode = this.mapErrorToCode(errorMessage);
            return this.failureResult(errorMessage, errorCode);
        }
    }
    /**
     * Check if email service is healthy
     */
    async healthCheck() {
        // In production, this would verify SMTP connection
        // For now, return based on initialization status
        return this._isAvailable;
    }
    /**
     * Shutdown the adapter
     */
    async shutdown() {
        this._isAvailable = false;
        this._initialized = false;
        this.config = null;
        logger.info('Email adapter shutdown');
    }
    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Generate a unique message ID
     */
    generateMessageId() {
        return `email_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    /**
     * Map error messages to error codes
     */
    mapErrorToCode(errorMessage) {
        const lowerError = errorMessage.toLowerCase();
        if (lowerError.includes('invalid') && lowerError.includes('email')) {
            return 'invalid_email';
        }
        if (lowerError.includes('connection') || lowerError.includes('timeout')) {
            return 'connection_error';
        }
        if (lowerError.includes('auth') || lowerError.includes('credential')) {
            return 'invalid_credentials';
        }
        if (lowerError.includes('rate') || lowerError.includes('limit')) {
            return 'rate_limited';
        }
        if (lowerError.includes('blocked') || lowerError.includes('rejected')) {
            return 'blocked';
        }
        return 'unknown_error';
    }
}
exports.EmailAdapter = EmailAdapter;
/** Singleton instance */
let emailAdapterInstance = null;
/**
 * Get or create email adapter singleton
 */
function getEmailAdapter() {
    if (!emailAdapterInstance) {
        emailAdapterInstance = new EmailAdapter();
    }
    return emailAdapterInstance;
}
exports.default = EmailAdapter;
