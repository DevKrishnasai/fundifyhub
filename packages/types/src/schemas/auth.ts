/**
 * Authentication validation schemas
 * Consolidated from auth-schemas.ts and existing schemas/auth.ts
 */

import { z } from 'zod';
import { UserRole } from '../constants/user';

// ============================================================================
// LOGIN & REGISTRATION SCHEMAS
// ============================================================================

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// Alias for backward compatibility
export const loginSchema = LoginSchema;

export const RegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  district: z.string().min(1, 'Please select a district'),
  phoneNumber: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  homeDistrictId: z.string().optional(),
  roles: z.array(z.nativeEnum(UserRole)).default([UserRole.CUSTOMER]),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

// Alias for backward compatibility
export const registerSchema = RegisterSchema;

// ============================================================================
// PHONE VALIDATION
// ============================================================================

export const phoneSchema = z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits');

// ============================================================================
// PASSWORD MANAGEMENT SCHEMAS
// ============================================================================

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// Alias for backward compatibility
export const changePasswordSchema = ChangePasswordSchema;

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

// Alias for backward compatibility
export const forgotPasswordSchema = ForgotPasswordSchema;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  email: z.string().email('Please enter a valid email address'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'), // Alias
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// Alias for backward compatibility
export const resetPasswordSchema = ResetPasswordSchema;
export const resetPasswordConfirmSchema = ResetPasswordSchema;

// ============================================================================
// PROFILE SCHEMAS
// ============================================================================

export const profileUpdateSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name too long'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name too long'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format').optional().or(z.literal('')),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// ============================================================================
// TOKEN SCHEMAS
// ============================================================================

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
