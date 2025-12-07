/**
 * UploadThing Storage Utilities
 * 
 * Simple wrapper around UploadThing SDK for file operations.
 */

import { UTApi } from 'uploadthing/server';
import { CLIENT_CONSTANTS } from "@fundifyhub/types";
import config from './config';
import logger from './logger';

// Initialize UploadThing API client
const utapi = config.uploadthing.token ? new UTApi({ token: config.uploadthing.token }) : null;

// Validate configuration on startup
if (!utapi) {
  logger.error('UploadThing not configured. File storage features will not work.');
} else {
  logger.info('UploadThing storage initialized successfully');
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
  if (!utapi) {
    return { url: '', expiresAt: new Date(0) };
  }

  try {
    const result = await utapi.getSignedURL(fileKey, { expiresIn });
    // getSignedURL returns a single { url: string } object when given a string key
    const urlString = typeof result === 'string' ? result : (result as any).url || '';
    return {
      url: urlString,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(`UploadThing getSignedURL failed for fileKey=${fileKey}: ${msg}`);
    return { url: '', expiresAt: new Date(0) };
  }
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
  if (!utapi || fileKeys.length === 0) {
    return fileKeys.map(key => ({ fileKey: key, url: '', expiresAt: new Date(0) }));
  }

  try {
    const results = await utapi.getSignedURL(fileKeys as any, { expiresIn }) as any;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    // Handle array of results
    if (Array.isArray(results)) {
      return results.map((urlData: any, index: number) => ({
        fileKey: fileKeys[index],
        url: typeof urlData === 'string' ? urlData : (urlData.url || ''),
        expiresAt,
      }));
    }
    
    // Fallback if not an array
    return fileKeys.map(key => ({ fileKey: key, url: '', expiresAt: new Date(0) }));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to generate signed URLs: ${msg}`);
    return fileKeys.map(key => ({ fileKey: key, url: '', expiresAt: new Date(0) }));
  }
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
  if (!utapi || fileKeys.length === 0) {
    return { success: false, deletedCount: 0 };
  }

  try {
    await utapi.deleteFiles(fileKeys);
    return {
      success: true,
      deletedCount: fileKeys.length,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to delete files: ${msg}`);
    throw new Error('Failed to delete files from UploadThing');
  }
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
  if (!utapi) {
    return { success: false };
  }

  try {
    await utapi.deleteFiles(fileKey);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to delete file ${fileKey}: ${msg}`);
    throw new Error(`Failed to delete file from UploadThing`);
  }
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
  if (!utapi) {
    throw new Error('UploadThing not configured');
  }

  try {
    // Convert Buffer to Blob for File constructor
    const blob = new Blob([buffer as any], { type: mimeType });
    const file = new File([blob], fileName, { type: mimeType });
    const result = await utapi.uploadFiles(file);

    if (!result.data) {
      throw new Error('Upload failed');
    }

    return {
      fileKey: result.data.key,
      url: result.data.url,
      fileName: result.data.name,
      fileSize: result.data.size,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to upload file ${fileName}: ${msg}`);
    throw new Error(`Failed to upload file to UploadThing`);
  }
}

// Export the provider for direct access if needed
// All exports above
