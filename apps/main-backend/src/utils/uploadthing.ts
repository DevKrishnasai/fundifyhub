import { UTApi } from "uploadthing/server";
import type { UploadThingListFilesResponse } from "@fundifyhub/types";
import config from './config';

// Initialize UploadThing API using validated config (token validated at import)
const utapi = new UTApi({
  token: config.uploadthing.token,
});

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
  expiresIn: number = 900
): Promise<{ url: string; expiresAt: Date }> {
  try {
    const result = await utapi.getSignedURL(fileKey, { expiresIn });
    
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    return {
      url: result.url,
      expiresAt,
    };
  } catch (error) {
    throw new Error("Failed to generate signed URL");
  }
}

/**
 * Generate signed URLs for multiple private files
 *
 * Creates temporary, authenticated URLs for accessing multiple private files
 * stored in UploadThing. All URLs expire after the same specified time period.
 *
 * @param fileKeys - Array of unique UploadThing file keys
 * @param expiresIn - Expiration time in seconds for all URLs (default: 900 = 15 minutes)
 * @returns Promise resolving to array of objects with fileKey, signed URL, and expiration date
 * @throws Error if any signed URL generation fails
 *
 * @example
 * ```typescript
 * const urls = await generateSignedUrls(["file_123", "file_456"], 1800);
 * // Both URLs expire in 30 minutes
 * ```
 */
export async function generateSignedUrls(
  fileKeys: string[],
  expiresIn: number = 900
): Promise<Array<{ fileKey: string; url: string; expiresAt: Date }>> {
  try {
    const results = await Promise.all(
      fileKeys.map(async (fileKey) => {
        const result = await utapi.getSignedURL(fileKey, { expiresIn });
        return {
          fileKey,
          url: result.url,
          expiresAt: new Date(Date.now() + expiresIn * 1000),
        };
      })
    );
    
    return results;
  } catch (error) {
    throw new Error("Failed to generate signed URLs");
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
  try {
    await utapi.deleteFiles(fileKeys);
    
    return {
      success: true,
      deletedCount: fileKeys.length,
    };
  } catch (error) {
    throw new Error("Failed to delete files from UploadThing");
  }
}

/**
 * Get file information from UploadThing
 *
 * Retrieves metadata about a file stored in UploadThing without downloading it.
 * Useful for checking file existence, size, type, and other properties.
 *
 * @param fileKey - The unique file key to get information for
 * @returns Promise resolving to file information object
 * @throws Error if file is not found or retrieval fails
 *
 * @example
 * ```typescript
 * const fileInfo = await getFileInfo("file_123");
 * console.log(`File size: ${fileInfo.size} bytes`);
 * ```
 */
export async function getFileInfo(fileKey: string) {
  try {
    const files = await utapi.listFiles();
    const file = files.files.find((f) => f.key === fileKey);
    
    if (!file) {
      throw new Error("File not found");
    }
    
    return file;
  } catch (error) {
    throw new Error("Failed to get file information");
  }
}
