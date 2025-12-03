"use strict";
/**
 * Base Channel Adapter
 *
 * Abstract base class for all channel adapters.
 * Provides common functionality and defines the interface that all adapters must implement.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseChannelAdapter = exports.NON_RETRYABLE_ERROR_CODES = void 0;
const logger_1 = require("@fundifyhub/logger");
const logger = (0, logger_1.createLogger)({ serviceName: 'NotificationAdapter' });
/** Non-retryable error codes */
exports.NON_RETRYABLE_ERROR_CODES = new Set([
    'invalid_email',
    'invalid_phone',
    'user_not_found',
    'blocked',
    'unsubscribed',
    'opt_out',
    'invalid_template',
    'missing_variables',
    'content_too_long',
    'invalid_credentials',
    'service_disabled',
]);
/**
 * Abstract base adapter that all channel adapters extend
 */
class BaseChannelAdapter {
    constructor() {
        this._isAvailable = false;
        this._initialized = false;
    }
    get isAvailable() {
        return this._isAvailable;
    }
    /**
     * Check if an error is retryable
     */
    isRetryableError(errorCode) {
        if (!errorCode)
            return true;
        return !exports.NON_RETRYABLE_ERROR_CODES.has(errorCode);
    }
    /**
     * Create a success result
     */
    successResult(messageId, metadata) {
        return {
            success: true,
            messageId,
            timestamp: new Date(),
            metadata,
        };
    }
    /**
     * Create a failure result
     */
    failureResult(error, errorCode, metadata) {
        logger.error(`[${this.channel}] Send failed: ${error} (code: ${errorCode || 'unknown'})`);
        return {
            success: false,
            error,
            errorCode,
            timestamp: new Date(),
            metadata,
        };
    }
}
exports.BaseChannelAdapter = BaseChannelAdapter;
