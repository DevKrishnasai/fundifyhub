/**
 * UploadThing Storage Provider
 * 
 * Implements IStorageProvider interface for UploadThing file storage.
 * Handles signed URL generation and file deletion.
 * 
 * Note: File uploads are handled via UploadThing's frontend SDK.
 * This provider handles server-side operations only.
 * 
 * @module providers/storage/uploadthing
 */

import { UTApi } from 'uploadthing/server';
import {
  IStorageProvider,
  StorageProviderType,
  SignedUrlOptions,
  SignedUrlResult,
  BatchSignedUrlResult,
  FileDeleteResult,
  BatchDeleteResult,
  FileUploadInput,
  FileUploadResult,
  SIGNED_URL_EXPIRY,
} from '@fundifyhub/types';

/**
 * UploadThing provider configuration
 */
export interface UploadThingProviderConfig {
  /** UploadThing API token */
  token: string;
  /** Default signed URL expiry in seconds */
  defaultExpiresIn?: number;
}

/**
 * Demo file key prefix for testing
 */
const DEMO_FILE_PREFIX = 'demo_';

/**
 * UploadThing Storage Provider Implementation
 */
export class UploadThingProvider implements IStorageProvider {
  public readonly type = StorageProviderType.UPLOADTHING;
  public readonly name = 'UploadThing';
  
  private readonly config: UploadThingProviderConfig;
  private readonly utapi: UTApi | null;
  private readonly defaultExpiresIn: number;

  constructor(config: UploadThingProviderConfig) {
    this.config = config;
    this.defaultExpiresIn = config.defaultExpiresIn ?? SIGNED_URL_EXPIRY.MEDIUM;
    
    // Initialize UTApi if configured
    if (config.token) {
      this.utapi = new UTApi({ token: config.token });
    } else {
      this.utapi = null;
    }
  }

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean {
    return this.utapi !== null;
  }

  /**
   * Check if a file key is a demo file
   */
  private isDemoFile(fileKey: string): boolean {
    return fileKey.startsWith(DEMO_FILE_PREFIX);
  }

  /**
   * Generate a signed URL for a file
   */
  async generateSignedUrl(
    fileKey: string, 
    options?: SignedUrlOptions
  ): Promise<SignedUrlResult> {
    // Handle demo files
    if (this.isDemoFile(fileKey)) {
      return {
        success: true,
        url: '',
        expiresAt: new Date(0),
      };
    }

    if (!this.utapi) {
      return {
        success: false,
        error: 'UploadThing is not configured',
      };
    }

    try {
      const expiresIn = options?.expiresIn ?? this.defaultExpiresIn;
      const result = await this.utapi.getSignedURL(fileKey, { expiresIn });
      
      return {
        success: true,
        url: result.url,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };
    } catch (error) {
      const e = error as Record<string, unknown> | null;
      const response = e?.response as Record<string, unknown> | undefined;
      const status = response?.status ?? (e?.status as number | undefined);
      const body = response?.body ?? (e?.message as string | undefined) ?? 
                   (error instanceof Error ? error.message : 'Unknown error');
      
      // If file not found, return empty URL
      if (status === 404 || String(body).toLowerCase().includes('not found')) {
        return {
          success: true,
          url: '',
          expiresAt: new Date(0),
        };
      }

      return {
        success: false,
        error: `Failed to generate signed URL: ${String(body)}`,
      };
    }
  }

  /**
   * Generate signed URLs for multiple files
   */
  async generateSignedUrls(
    fileKeys: string[], 
    options?: SignedUrlOptions
  ): Promise<BatchSignedUrlResult> {
    if (!this.utapi) {
      return {
        success: false,
        results: fileKeys.map(fileKey => ({
          fileKey,
          url: '',
          expiresAt: new Date(0),
          error: 'UploadThing is not configured',
        })),
        successCount: 0,
        failedCount: fileKeys.length,
      };
    }

    const expiresIn = options?.expiresIn ?? this.defaultExpiresIn;
    
    // Process files in parallel
    const results = await Promise.all(
      fileKeys.map(async (fileKey) => {
        // Handle demo files
        if (this.isDemoFile(fileKey)) {
          return {
            fileKey,
            url: '',
            expiresAt: new Date(0),
          };
        }

        try {
          const result = await this.utapi!.getSignedURL(fileKey, { expiresIn });
          return {
            fileKey,
            url: result.url,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
          };
        } catch (error) {
          const e = error as Record<string, unknown> | null;
          const response = e?.response as Record<string, unknown> | undefined;
          const status = response?.status ?? (e?.status as number | undefined);
          const body = response?.body ?? (e?.message as string | undefined) ?? 
                       (error instanceof Error ? error.message : 'Unknown error');
          
          // If file not found, return empty URL (not an error for batch)
          if (status === 404 || String(body).toLowerCase().includes('not found')) {
            return {
              fileKey,
              url: '',
              expiresAt: new Date(0),
            };
          }

          return {
            fileKey,
            url: '',
            expiresAt: new Date(0),
            error: String(body),
          };
        }
      })
    );

    const successCount = results.filter(r => !r.error && r.url !== '').length;
    const failedCount = results.filter(r => r.error).length;

    return {
      success: failedCount === 0,
      results,
      successCount,
      failedCount,
    };
  }

  /**
   * Delete a file
   */
  async deleteFile(fileKey: string): Promise<FileDeleteResult> {
    // Skip demo files
    if (this.isDemoFile(fileKey)) {
      return {
        success: true,
        fileKey,
      };
    }

    if (!this.utapi) {
      return {
        success: false,
        error: 'UploadThing is not configured',
      };
    }

    try {
      await this.utapi.deleteFiles([fileKey]);
      return {
        success: true,
        fileKey,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to delete file: ${message}`,
        fileKey,
      };
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(fileKeys: string[]): Promise<BatchDeleteResult> {
    if (!this.utapi) {
      return {
        success: false,
        results: fileKeys.map(fileKey => ({
          fileKey,
          deleted: false,
          error: 'UploadThing is not configured',
        })),
        successCount: 0,
        failedCount: fileKeys.length,
      };
    }

    // Separate demo files from real files
    const demoFiles = fileKeys.filter(k => this.isDemoFile(k));
    const realFiles = fileKeys.filter(k => !this.isDemoFile(k));

    const results: Array<{ fileKey: string; deleted: boolean; error?: string }> = [];

    // Demo files are always "successfully deleted"
    for (const fileKey of demoFiles) {
      results.push({ fileKey, deleted: true });
    }

    // Delete real files
    if (realFiles.length > 0) {
      try {
        await this.utapi.deleteFiles(realFiles);
        for (const fileKey of realFiles) {
          results.push({ fileKey, deleted: true });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        for (const fileKey of realFiles) {
          results.push({ fileKey, deleted: false, error: message });
        }
      }
    }

    const successCount = results.filter(r => r.deleted).length;
    const failedCount = results.filter(r => !r.deleted).length;

    return {
      success: failedCount === 0,
      results,
      successCount,
      failedCount,
    };
  }

  /**
   * Upload a file to UploadThing
   */
  async uploadFile(input: FileUploadInput): Promise<FileUploadResult> {
    if (!this.utapi) {
      return {
        success: false,
        error: 'UploadThing is not configured',
      };
    }

    try {
      // Convert content to ArrayBuffer for File constructor compatibility
      const arrayBuffer = input.content instanceof Buffer 
        ? input.content.buffer.slice(
            input.content.byteOffset, 
            input.content.byteOffset + input.content.byteLength
          )
        : input.content.buffer;
      
      // Create a File object from the ArrayBuffer
      const file = new File(
        [arrayBuffer], 
        input.fileName, 
        { type: input.mimeType }
      );

      const uploadResult = await this.utapi.uploadFiles(file);
      
      if (uploadResult.error) {
        return {
          success: false,
          error: `Upload failed: ${JSON.stringify(uploadResult.error)}`,
        };
      }

      const data = uploadResult.data;
      return {
        success: true,
        fileKey: data.key,
        url: data.ufsUrl,
        fileName: data.name,
        fileSize: data.size,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown upload error';
      return {
        success: false,
        error: `Upload failed: ${message}`,
      };
    }
  }
}

/**
 * Create an UploadThing provider instance
 */
export function createUploadThingProvider(
  config: UploadThingProviderConfig
): UploadThingProvider {
  return new UploadThingProvider(config);
}
