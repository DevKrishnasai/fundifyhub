/**
 * Storage Adapter
 * 
 * Wraps UploadThing for file storage.
 * Handles document uploads, URL generation, and cleanup.
 * 
 * @module infra-adapters/storage
 */

/**
 * UploadThing wrapper for document storage
 * 
 * In production: use uploadthing package
 * For now: stub implementation with TODO markers
 */
export class StorageAdapter {
  private uploadThingApiKey: string;

  constructor() {
    this.uploadThingApiKey = process.env.UPLOADTHING_API_KEY || '';

    if (!this.uploadThingApiKey) {
      console.warn('[StorageAdapter] UploadThing key not configured');
    }
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
      // TODO: (agent) Call UploadThing API to generate upload token
      // TODO: (agent) Return upload URL and fileKey for later reference
      // TODO: (agent) URL should expire after expiresIn seconds

      console.log('[StorageAdapter] Upload URL generated (stub):', { documentType, customerId });
      return {
        uploadUrl: `https://uploadthing.example.com/upload?key=${Date.now()}`,
        fileKey: `${documentType}_${customerId}_${Date.now()}`,
      };
    } catch (err) {
      console.error('[StorageAdapter] Failed to generate upload URL:', err);
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
      // TODO: (agent) Generate signed download URL using UploadThing API
      // TODO: (agent) URL should expire after expiresIn seconds

      console.log('[StorageAdapter] Download URL generated (stub):', { fileKey });
      return `https://uploadthing.example.com/download/${fileKey}`;
    } catch (err) {
      console.error('[StorageAdapter] Failed to generate download URL:', err);
      throw err;
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(fileKey: string): Promise<void> {
    try {
      // TODO: (agent) Call UploadThing API to delete file
      // TODO: (agent) Handle errors gracefully (file already deleted, etc.)

      console.log('[StorageAdapter] File deleted (stub):', { fileKey });
    } catch (err) {
      console.error('[StorageAdapter] Failed to delete file:', err);
      // Don't re-throw - deletion is best-effort
    }
  }

  /**
   * Verify uploaded file exists and is valid
   */
  async verifyFile(fileKey: string): Promise<boolean> {
    try {
      // TODO: (agent) Call UploadThing API to verify file exists
      // TODO: (agent) Check file size, type, etc.
      // TODO: (agent) Return true if valid, false otherwise

      console.log('[StorageAdapter] File verified (stub):', { fileKey });
      return true;
    } catch (err) {
      console.error('[StorageAdapter] Failed to verify file:', err);
      return false;
    }
  }
}

export const storageAdapter = new StorageAdapter();
