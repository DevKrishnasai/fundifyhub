// UploadThing specific types
import { UserType } from './types';

export interface UploadThingFile {
  key: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  customId?: string;
}

export interface UploadThingUploadComplete {
  file: UploadThingFile;
  metadata: UploadThingMetadata;
}

export interface UploadThingMetadata {
  userId: string;
  userEmail: string;
  userRoles: string[];
  userDistricts: string[];
}

export interface UploadThingListFilesResponse {
  files: UploadThingFile[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface UploadThingSignedUrlResponse {
  url: string;
  expiresAt: Date;
  expiresIn: number;
  fileKey: string;
}

// User authentication types
export interface AuthValidationResponse {
  success: boolean;
  data: {
    isAuthenticated: boolean;
    user: UserType;
  };
}

// API Response types
export interface APIResponseType<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}