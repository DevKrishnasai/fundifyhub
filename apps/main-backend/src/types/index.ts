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
  roles?: string[]; // All roles array (optional for backward compatibility)
  emailVerified: boolean;
  phoneVerified: boolean;
  firstName?: string;
  lastName?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}