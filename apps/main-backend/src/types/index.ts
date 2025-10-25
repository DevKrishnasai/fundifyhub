export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthPayload {
  id: string;
  email: string;
  role: string; // Primary role (first role for backward compatibility)
  roles?: string[]; // All roles array (optional for backward compatibility)
  emailVerified: boolean;
  phoneVerified: boolean;
  firstName?: string;
  lastName?: string;
}

export interface OTPData {
  otp: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  type: 'PHONE' | 'EMAIL';
  userId: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}



export interface SendOTPRequest {
  phoneNumber: string;
  userName?: string;
  userId: string;
}

export interface VerifyOTPRequest {
  userId: string;
  otp: string;
}

export interface SendOTPResponse {
  success: boolean;
  message: string;
  otp?: string; // Only in development
  jobId?: string; // Job ID from queue
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
}

// Express Request extension
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}