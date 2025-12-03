"use strict";
/**
 * WhatsApp Channel Adapter
 *
 * Handles sending WhatsApp notifications via whatsapp-web.js.
 * Integrates with the service manager for connection management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppAdapter = void 0;
exports.getWhatsAppAdapter = getWhatsAppAdapter;
const logger_1 = require("@fundifyhub/logger");
const types_1 = require("@fundifyhub/types");
const base_adapter_1 = require("./base-adapter");
const logger = (0, logger_1.createLogger)({ serviceName: 'WhatsAppAdapter' });
/**
 * WhatsApp channel adapter using whatsapp-web.js
 *
 * Note: This adapter is designed to work with the existing service-manager
 * architecture. In production, it uses the client from service-manager.
 */
class WhatsAppAdapter extends base_adapter_1.BaseChannelAdapter {
    constructor() {
        super(...arguments);
        this.channel = types_1.NotificationChannel.WHATSAPP;
        this.config = {
            defaultCountryCode: '91', // Default to India
        };
    }
    /**
     * Initialize with optional config
     */
    async initialize(config) {
        if (this._initialized)
            return;
        if (config) {
            this.config = { ...this.config, ...config };
        }
        this._initialized = true;
        this._isAvailable = true;
        logger.info('WhatsApp adapter initialized');
    }
    /**
     * Send a WhatsApp notification
     */
    async send(params) {
        if (!this._initialized) {
            return this.failureResult('Adapter not initialized', 'not_initialized');
        }
        const { recipient, content, priority } = params;
        // Validate and format phone number
        const formattedNumber = this.formatPhoneNumber(recipient);
        if (!formattedNumber) {
            return this.failureResult(`Invalid phone number: ${recipient}`, 'invalid_phone');
        }
        try {
            // In production, this will use the service-manager's WhatsApp client
            // For now, we'll return success and let the worker handle actual sending
            const messageId = this.generateMessageId();
            logger.info(`WhatsApp message queued for ${formattedNumber} (priority: ${priority})`);
            return this.successResult(messageId, {
                to: formattedNumber,
                contentLength: content.length,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorCode = this.mapErrorToCode(errorMessage);
            return this.failureResult(errorMessage, errorCode);
        }
    }
    /**
     * Check if WhatsApp service is healthy
     */
    async healthCheck() {
        return this._isAvailable;
    }
    /**
     * Shutdown the adapter
     */
    async shutdown() {
        this._isAvailable = false;
        this._initialized = false;
        logger.info('WhatsApp adapter shutdown');
    }
    /**
     * Format phone number for WhatsApp
     * Removes non-digits and adds country code if needed
     */
    formatPhoneNumber(phone) {
        if (!phone || phone.trim() === '') {
            return null;
        }
        // Check if it's an email (common mistake)
        if (phone.includes('@') && !phone.includes('@c.us')) {
            return null;
        }
        // Already formatted for WhatsApp
        if (phone.includes('@c.us')) {
            return phone;
        }
        // Remove all non-digits
        let digits = phone.replace(/\D/g, '');
        if (!digits || digits.length === 0) {
            return null;
        }
        // Handle local format (leading 0)
        if (digits.startsWith('0')) {
            digits = `${this.config.defaultCountryCode}${digits.slice(1)}`;
        }
        else if (digits.length === 10) {
            // Assume local number without country code
            digits = `${this.config.defaultCountryCode}${digits}`;
        }
        // Validate reasonable length (country code + local number)
        if (digits.length < 10 || digits.length > 15) {
            return null;
        }
        return `${digits}@c.us`;
    }
    /**
     * Generate a unique message ID
     */
    generateMessageId() {
        return `whatsapp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    /**
     * Map error messages to error codes
     */
    mapErrorToCode(errorMessage) {
        const lowerError = errorMessage.toLowerCase();
        if (lowerError.includes('not registered')) {
            return 'user_not_found';
        }
        if (lowerError.includes('invalid') && lowerError.includes('phone')) {
            return 'invalid_phone';
        }
        if (lowerError.includes('connection') || lowerError.includes('timeout')) {
            return 'connection_error';
        }
        if (lowerError.includes('auth') || lowerError.includes('session')) {
            return 'invalid_credentials';
        }
        if (lowerError.includes('blocked')) {
            return 'blocked';
        }
        if (lowerError.includes('rate') || lowerError.includes('limit')) {
            return 'rate_limited';
        }
        return 'unknown_error';
    }
}
exports.WhatsAppAdapter = WhatsAppAdapter;
/** Singleton instance */
let whatsAppAdapterInstance = null;
/**
 * Get or create WhatsApp adapter singleton
 */
function getWhatsAppAdapter() {
    if (!whatsAppAdapterInstance) {
        whatsAppAdapterInstance = new WhatsAppAdapter();
    }
    return whatsAppAdapterInstance;
}
exports.default = WhatsAppAdapter;
