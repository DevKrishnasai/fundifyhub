/**
 * Type guards and utilities for safe type access
 * @module lib/type-guards
 */

import type { DistrictType, RequestType, StatusUpdateMetadata, RequestHistoryItem } from '@fundifyhub/types';

// ============================================
// DISTRICT HELPERS
// ============================================

/**
 * Type guard to check if district is a hydrated DistrictType object
 */
export function isDistrictObject(district: string | DistrictType | null | undefined): district is DistrictType {
  return (
    typeof district === 'object' &&
    district !== null &&
    'id' in district &&
    'name' in district
  );
}

/**
 * Get district name from a RequestType's district field.
 * Handles both string ID and hydrated DistrictType object.
 * 
 * @param request - The request object
 * @param fallback - Fallback value if district name cannot be determined
 * @returns The district name or fallback
 */
export function getDistrictName(request: RequestType | null | undefined, fallback = 'N/A'): string {
  if (!request) return fallback;
  
  const { district } = request;
  
  if (isDistrictObject(district)) {
    return district.name;
  }
  
  // If it's a string ID, return fallback as we don't have the name
  if (typeof district === 'string') {
    return fallback;
  }
  
  return fallback;
}

// ============================================
// HISTORY METADATA HELPERS
// ============================================

/**
 * Type guard for StatusUpdateMetadata
 */
export function isStatusUpdateMetadata(metadata: RequestHistoryItem['metadata']): metadata is StatusUpdateMetadata {
  if (!metadata || typeof metadata !== 'object') return false;
  // StatusUpdateMetadata has fromStatus, toStatus, and/or note fields
  return 'fromStatus' in metadata || 'toStatus' in metadata || 'note' in metadata;
}

/**
 * Get a string value from metadata safely
 */
export function getMetadataString(metadata: RequestHistoryItem['metadata'], key: string): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

/**
 * Get a number value from metadata safely
 */
export function getMetadataNumber(metadata: RequestHistoryItem['metadata'], key: string): number | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : null;
}

/**
 * Check if metadata has any non-empty values
 */
export function hasMetadata(metadata: RequestHistoryItem['metadata']): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  return Object.keys(metadata).length > 0;
}

/**
 * Get searchable text from history item metadata
 */
export function getMetadataSearchableText(metadata: RequestHistoryItem['metadata']): string {
  if (!metadata || typeof metadata !== 'object') return '';
  
  const searchableFields = ['toStatus', 'fromStatus', 'reason', 'fileName', 'notes', 'note', 'message'];
  
  return searchableFields
    .map(field => {
      const value = (metadata as Record<string, unknown>)[field];
      return typeof value === 'string' ? value : '';
    })
    .filter(Boolean)
    .join(' ');
}

// ============================================
// STATUS HELPERS
// ============================================

/**
 * Type guard to check if a status is in a list of allowed statuses
 */
export function isStatusIn<T extends string>(status: string | null | undefined, allowedStatuses: readonly T[]): status is T {
  if (!status) return false;
  return (allowedStatuses as readonly string[]).includes(status);
}

// ============================================
// UPLOAD HELPERS
// ============================================

/**
 * Standard shape of an uploaded file from UploadThing
 */
export interface UploadedFileResult {
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
  serverData?: {
    fileKey?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  };
}

/**
 * Extract file data from UploadThing response
 */
export function extractUploadedFileData(file: UploadedFileResult): {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
} {
  return {
    fileKey: file.key || file.serverData?.fileKey || '',
    fileName: file.name || file.serverData?.fileName || '',
    fileSize: file.size || file.serverData?.fileSize || 0,
    fileType: file.type || file.serverData?.fileType || '',
    url: file.url || '',
  };
}

// ============================================
// STAGED PHOTO TYPE
// ============================================

export interface StagedPhoto {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  documentId: string;
}
