import { UserType } from "@fundifyhub/types";

export interface APIResponseType<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface CreateDocumentRequest {
  fileKey: string;
  fileName: string;
  fileSize?: number;
  fileType: string;
  documentType: string;
  documentCategory?: string;
  requestId?: string;
  uploadedBy: string;
  description?: string;
  displayOrder?: number;
  metadata?: Record<string, unknown>;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserType;
    }
  }
}