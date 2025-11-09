// Utility functions for handling private UploadThing files
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

/**
 * Generate a signed URL for a private UploadThing file
 * @param fileKey - The file key returned by UploadThing
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL string
 */
export async function getSignedUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
  try {
    const result = await utapi.getSignedURL(fileKey, { expiresIn });
    return result.url;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw new Error("Failed to generate signed URL");
  }
}

/**
 * Generate signed URLs for multiple files
 * @param fileKeys - Array of file keys
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Array of signed URLs
 */
export async function getSignedUrls(fileKeys: string[], expiresIn: number = 3600): Promise<string[]> {
  try {
    const results = await Promise.all(
      fileKeys.map(key => utapi.getSignedURL(key, { expiresIn }))
    );
    return results.map(result => result.url);
  } catch (error) {
    console.error("Error generating signed URLs:", error);
    throw new Error("Failed to generate signed URLs");
  }
}

/**
 * Delete files from UploadThing
 * @param fileKeys - Array of file keys to delete
 */
export async function deleteFiles(fileKeys: string[]): Promise<void> {
  try {
    await utapi.deleteFiles(fileKeys);
  } catch (error) {
    console.error("Error deleting files:", error);
    throw new Error("Failed to delete files");
  }
}