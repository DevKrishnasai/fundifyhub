import { UserType } from "@fundifyhub/types";

export interface APIResponseType<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: UserType;
    }
  }
}