import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { BACKEND_API_CONFIG } from "./urls";
import { post } from './api-client';

/**
 * Logout user (clears httpOnly cookies via API call)
 */
export async function logout(): Promise<void> {
    await post(BACKEND_API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
