import { QueueEvents } from 'bullmq';
import { createLogger } from '@fundifyhub/logger';
import { config } from '../config';
import { Response } from 'express';

const logger = createLogger({ serviceName: 'queue-events' });

export interface ServiceStatusEvent {
  serviceName: 'WHATSAPP' | 'EMAIL';
  status: 'INITIALIZING' | 'WAITING_FOR_QR_SCAN' | 'AUTHENTICATED' | 'CONNECTED' | 'DISCONNECTED' | 'AUTH_FAILURE' | 'DISABLED';
  message?: string;
  qrCode?: string; // Base64 QR code image
  qrText?: string; // QR code text
  timestamp: Date;
}

/**
 * Service to handle BullMQ queue events for real-time updates
 */
class QueueEventsService {
  private otpQueueEvents: QueueEvents;
  private statusQueueEvents: QueueEvents;
  private whatsappSseConnections = new Set<Response>();
  private emailSseConnections = new Set<Response>();

  constructor() {
    const connection = {
      host: config.redis.host,
      port: config.redis.port,
    };

    // Listen to the 'otp' queue events
    this.otpQueueEvents = new QueueEvents('otp', { connection });

    // Listen to the 'service-status' queue events (for real-time status updates)
    this.statusQueueEvents = new QueueEvents('service-status', { connection });

    this.setupEventListeners();
    logger.info('Queue events service initialized');
  }

  private setupEventListeners(): void {
    // Listen for OTP job progress events
    this.otpQueueEvents.on('progress', ({ jobId, data }) => {
      try {
        const progressData = data as ServiceStatusEvent;
        logger.info(`📊 OTP job ${jobId} progress: ${progressData.serviceName} - ${progressData.status}`);
      } catch (error) {
        logger.error('Error handling OTP progress event:', error as Error);
      }
    });

    // Listen for service status updates (WhatsApp/Email real-time status)
    this.statusQueueEvents.on('progress', ({ jobId, data }) => {
      try {
        const statusData = data as ServiceStatusEvent;
        logger.info(`📊 Service status update: ${statusData.serviceName} - ${statusData.status}`);

        // Broadcast to appropriate SSE connections
        if (statusData.serviceName === 'WHATSAPP') {
          this.broadcastToWhatsApp(statusData);
        } else if (statusData.serviceName === 'EMAIL') {
          this.broadcastToEmail(statusData);
        }
      } catch (error) {
        logger.error('Error handling status progress event:', error as Error);
      }
    });

    // Listen for job completion
    this.otpQueueEvents.on('completed', ({ jobId }) => {
      logger.info(`✅ OTP job ${jobId} completed`);
    });

    // Listen for job failures
    this.otpQueueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error(`❌ OTP job ${jobId} failed: ${failedReason}`);
    });

    this.otpQueueEvents.on('error', (err) => {
      logger.error('OTP queue events error:', err);
    });

    this.statusQueueEvents.on('error', (err) => {
      logger.error('Status queue events error:', err);
    });
  }

  /**
   * Broadcast WhatsApp status to all connected SSE clients
   */
  private broadcastToWhatsApp(event: ServiceStatusEvent): void {
    // Map status to frontend-compatible event types
    let eventType = event.status;
    
    // Map WAITING_FOR_QR_SCAN to QR_CODE for frontend compatibility
    if (event.status === 'WAITING_FOR_QR_SCAN' && event.qrCode) {
      eventType = 'QR_CODE' as any;
    } else if (event.status === 'CONNECTED') {
      eventType = 'READY' as any;
    }

    const message = {
      type: eventType,
      data: {
        qrCode: event.qrCode,
        qrText: event.qrText,
        message: event.message || `WhatsApp status: ${event.status}`,
        connectionStatus: event.status,
        timestamp: event.timestamp
      }
    };

    logger.info(`📡 Broadcasting WhatsApp event to ${this.whatsappSseConnections.size} SSE connections: ${eventType}`);

    this.whatsappSseConnections.forEach((res) => {
      try {
        res.write(`data: ${JSON.stringify(message)}\n\n`);
      } catch (error) {
        // Remove dead connections
        this.whatsappSseConnections.delete(res);
      }
    });
  }

  /**
   * Broadcast Email status to all connected SSE clients
   */
  private broadcastToEmail(event: ServiceStatusEvent): void {
    const message = {
      type: event.status,
      data: {
        message: event.message || `Email status: ${event.status}`,
        connectionStatus: event.status,
        timestamp: event.timestamp
      }
    };

    logger.info(`📡 Broadcasting Email event to ${this.emailSseConnections.size} SSE connections`);

    this.emailSseConnections.forEach((res) => {
      try {
        res.write(`data: ${JSON.stringify(message)}\n\n`);
      } catch (error) {
        // Remove dead connections
        this.emailSseConnections.delete(res);
      }
    });
  }

  /**
   * Add WhatsApp SSE connection
   */
  addWhatsAppConnection(res: Response): void {
    this.whatsappSseConnections.add(res);
    logger.info(`📡 WhatsApp SSE connection added (total: ${this.whatsappSseConnections.size})`);
  }

  /**
   * Remove WhatsApp SSE connection
   */
  removeWhatsAppConnection(res: Response): void {
    this.whatsappSseConnections.delete(res);
    logger.info(`📡 WhatsApp SSE connection removed (total: ${this.whatsappSseConnections.size})`);
  }

  /**
   * Add Email SSE connection
   */
  addEmailConnection(res: Response): void {
    this.emailSseConnections.add(res);
    logger.info(`📡 Email SSE connection added (total: ${this.emailSseConnections.size})`);
  }

  /**
   * Remove Email SSE connection
   */
  removeEmailConnection(res: Response): void {
    this.emailSseConnections.delete(res);
    logger.info(`📡 Email SSE connection removed (total: ${this.emailSseConnections.size})`);
  }

  /**
   * Close queue events
   */
  async close(): Promise<void> {
    await Promise.all([
      this.otpQueueEvents.close(),
      this.statusQueueEvents.close()
    ]);
    logger.info('Queue events service closed');
  }
}

// Singleton instance
export const queueEventsService = new QueueEventsService();
export default queueEventsService;
