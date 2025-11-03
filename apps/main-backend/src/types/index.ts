import { User } from "@fundifyhub/types";

export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}