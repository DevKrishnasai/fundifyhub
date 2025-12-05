/**
 * UploadThing Storage Utilities
 * 
 * This file provides a thin wrapper around @fundifyhub/providers/storage
 * for consistent storage operations across the backend.
 * 
 * All file operations use the UploadThingProvider abstraction.
 */

import { createUploadThingProvider } from "@fundifyhub/providers";
import { CLIENT_CONSTANTS } from "@fundifyhub/types";
import config from './config';
import logger from './logger';

// Initialize UploadThing provider using validated config
const storageProvider = createUploadThingProvider({
  token: config.uploadthing.token,
  defaultExpiresIn: CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT,
});

// Validate provider configuration on startup
if (!storageProvider.isConfigured()) {
  logger.error('UploadThing provider not configured. File storage features will not work.');
} else {
  logger.info('UploadThing storage provider initialized successfully');
}

/**
 * Generate a signed URL for accessing a private file
 *
 * Creates a temporary, authenticated URL that allows access to private files
 * stored in UploadThing. The URL expires after the specified time period.
 *
 * @param fileKey - The unique UploadThing file key
 * @param expiresIn - Expiration time in seconds (default: 900 = 15 minutes)
 * @returns Promise resolving to object with signed URL and expiration date
 * @throws Error if signed URL generation fails
 *
 * @example
 * ```typescript
 * const { url, expiresAt } = await generateSignedUrl("file_123", 1800);
 * // URL expires in 30 minutes
 * ```
 */
export async function generateSignedUrl(
  fileKey: string,
  expiresIn: number = CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT
): Promise<{ url: string; expiresAt: Date }> {
  const result = await storageProvider.generateSignedUrl(fileKey, { expiresIn });

  if (!result.success) {
    // For file not found or demo files, return empty URL
    if (result.error?.includes('not found') || result.error?.includes('not configured')) {
      logger.warn(`UploadThing getSignedURL failed for fileKey=${fileKey}: ${result.error}`);
      return { url: '', expiresAt: new Date(0) };
    }
    throw new Error(`Failed to generate signed URL for ${fileKey}: ${result.error}`);
  }

  return {
    url: result.url!,
    expiresAt: result.expiresAt!,
  };
}

/**
 * Generate signed URLs for multiple private files
 *
 * Creates temporary, authenticated URLs for accessing multiple private files
 * stored in UploadThing. All URLs expire after the same specified time period.
 * Demo/placeholder file keys are skipped and return empty URLs.
 *
 * @param fileKeys - Array of unique UploadThing file keys
 * @param expiresIn - Expiration time in seconds for all URLs (default: 900 = 15 minutes)
 * @returns Promise resolving to array of objects with fileKey, signed URL, and expiration date
 *
 * @example
 * ```typescript
 * const urls = await generateSignedUrls(["file_123", "file_456"], 1800);
 * // Both URLs expire in 30 minutes
 * ```
 */
export async function generateSignedUrls(
  fileKeys: string[],
  expiresIn: number = CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT
): Promise<Array<{ fileKey: string; url: string; expiresAt: Date }>> {
  const result = await storageProvider.generateSignedUrls(fileKeys, { expiresIn });

  if (!result.success) {
    logger.error(`Failed to generate signed URLs: batch operation failed`);
    throw new Error("Failed to generate signed URLs");
  }

  return result.results.map(item => ({
    fileKey: item.fileKey,
    url: item.url ?? '',
    expiresAt: item.expiresAt ?? new Date(0),
  }));
}

/**
 * Delete files from UploadThing storage
 *
 * Permanently removes files from UploadThing storage. This operation cannot be undone.
 * Use with caution and ensure proper authorization checks are performed before calling.
 *
 * @param fileKeys - Array of file keys to delete
 * @returns Promise resolving to success status and count of deleted files
 * @throws Error if file deletion fails
 *
 * @example
 * ```typescript
 * const result = await deleteUploadThingFiles(["file_123", "file_456"]);
 * console.log(`Deleted ${result.deletedCount} files`);
 * ```
 */
export async function deleteUploadThingFiles(
  fileKeys: string[]
): Promise<{ success: boolean; deletedCount: number }> {
  const result = await storageProvider.deleteFiles(fileKeys);

  if (!result.success) {
    logger.error(`Failed to delete files: batch operation failed`);
    throw new Error("Failed to delete files from UploadThing");
  }

  return {
    success: true,
    deletedCount: result.successCount,
  };
}

/**
 * Delete a single file from UploadThing storage
 *
 * Permanently removes a file from UploadThing storage. This operation cannot be undone.
 *
 * @param fileKey - The file key to delete
 * @returns Promise resolving to success status
 * @throws Error if file deletion fails
 */
export async function deleteUploadThingFile(
  fileKey: string
): Promise<{ success: boolean }> {
  const result = await storageProvider.deleteFile(fileKey);

  if (!result.success) {
    logger.error(`Failed to delete file ${fileKey}: ${result.error}`);
    throw new Error(`Failed to delete file from UploadThing: ${fileKey}`);
  }

  return { success: true };
}

/**
 * Upload a file to UploadThing storage
 *
 * Uploads a buffer to UploadThing and returns the file key and URL.
 *
 * @param buffer - The file content as a Buffer
 * @param fileName - The name to give the file
 * @param mimeType - The MIME type of the file (e.g., 'application/pdf')
 * @returns Promise resolving to upload result with file key and URL
 * @throws Error if upload fails
 *
 * @example
 * ```typescript
 * const result = await uploadFile(pdfBuffer, 'document.pdf', 'application/pdf');
 * console.log(`Uploaded: ${result.fileKey}`);
 * ```
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileKey: string; url: string; fileName: string; fileSize: number }> {
  const result = await storageProvider.uploadFile({
    content: buffer,
    fileName,
    mimeType,
  });

  if (!result.success || !result.fileKey) {
    logger.error(`Failed to upload file ${fileName}: ${result.error}`);
    throw new Error(`Failed to upload file to UploadThing: ${result.error}`);
  }

  return {
    fileKey: result.fileKey,
    url: result.url ?? '',
    fileName: result.fileName ?? fileName,
    fileSize: result.fileSize ?? buffer.length,
  };
}

// Export the provider for direct access if needed
export { storageProvider };
