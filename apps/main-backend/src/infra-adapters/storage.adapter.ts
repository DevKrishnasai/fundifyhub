/**
 * Storage Adapter
 * 
 * Wraps UploadThing for file storage.
 * Handles document uploads, URL generation, and cleanup.
 * 
 * @module infra-adapters/storage
 */
import { createUploadThingProvider } from '@fundifyhub/providers';
import logger from '../utils/logger';

export class StorageAdapter {
  private uploadThingApiKey: string;
  private provider: ReturnType<typeof createUploadThingProvider>;

  constructor() {
    this.uploadThingApiKey = process.env.UPLOADTHING_TOKEN || '';

    if (!this.uploadThingApiKey) {
      logger.warn('[StorageAdapter] UploadThing key not configured');
    }

    this.provider = createUploadThingProvider({
      token: this.uploadThingApiKey,
    });

    logger.info('[StorageAdapter] Initialized with UploadThing provider');
  }

  /**
   * Generate upload URL for document
   * 
   * @returns Signed URL valid for time limit
   */
  async generateUploadUrl(
    documentType: string,
    customerId: string,
    expiresIn: number = 3600
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    try {
      const fileKey = `${documentType}_${customerId}_${Date.now()}`;

      const result = await this.provider.generateSignedUrl(fileKey, { expiresIn });

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Failed to generate upload URL');
      }

      logger.info('[StorageAdapter] Upload URL generated', { documentType, customerId, fileKey });
      return {
        uploadUrl: result.url,
        fileKey,
      };
    } catch (err) {
      logger.error('[StorageAdapter] Failed to generate upload URL', { error: err, documentType, customerId });
      throw err;
    }
  }

  /**
   * Get file download URL
   * 
   * @returns Signed URL valid for time limit
   */
  async getDownloadUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
    try {
      const result = await this.provider.generateSignedUrl(fileKey, { expiresIn });

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Failed to generate download URL');
      }

      logger.info('[StorageAdapter] Download URL generated', { fileKey });
      return result.url;
    } catch (err) {
      logger.error('[StorageAdapter] Failed to generate download URL', { error: err, fileKey });
      throw err;
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(fileKey: string): Promise<void> {
    try {
      const result = await this.provider.deleteFile(fileKey);

      if (!result.success) {
        logger.warn('[StorageAdapter] Delete reported failure', { fileKey, error: result.error });
      }

      logger.info('[StorageAdapter] File deleted', { fileKey });
    } catch (err) {
      logger.error('[StorageAdapter] Failed to delete file', { error: err, fileKey });
      // Don't re-throw - deletion is best-effort
    }
  }

  /**
   * Verify uploaded file exists and is valid
   */
  async verifyFile(fileKey: string): Promise<boolean> {
    try {
      const result = await this.provider.generateSignedUrl(fileKey, { expiresIn: 60 });
      const exists = result.success && !!result.url;

      logger.info('[StorageAdapter] File verified', { fileKey, exists });
      return exists;
    } catch (err) {
      logger.error('[StorageAdapter] Failed to verify file', { error: err, fileKey });
      return false;
    }
  }
}

export const storageAdapter = new StorageAdapter();
