import { z } from 'zod';
import { ROLES } from './enums';

// ============================================================================
// Authentication Schemas
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  district: z.string().min(1, 'Please select a district'),
  phoneNumber: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
});

export const backendRegisterSchema = z.object({
  email: z.string().email(),
  phoneNumber: z.string().min(10),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
  role: z.enum([
    ROLES.CUSTOMER,
    ROLES.AGENT,
    ROLES.DISTRICT_ADMIN,
    ROLES.STATE_ADMIN,
    ROLES.SUPER_ADMIN,
  ]),
  districtIds: z.array(z.string()).optional(),
});

export const phoneSchema = z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  email: z.string().email('Please enter a valid email address'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const backendResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

/** @deprecated Use resetPasswordSchema instead */
export const resetPasswordConfirmSchema = resetPasswordSchema;

// ============================================================================
// Profile Schemas
// ============================================================================

export const profileUpdateSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name too long'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name too long'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format').optional().or(z.literal('')),
});

// ============================================================================
// User Management Schemas
// ============================================================================

export const createUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  phoneNumber: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional(),
  role: z.string().min(1, 'Please select a role'),
  districts: z.array(z.string()).min(1, 'Please select at least one district'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
  phoneNumber: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional().or(z.literal('')),
  role: z.string().min(1, 'Please select a role').optional(),
  districts: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// OTP Schemas
// ============================================================================

export const otpSchema = z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must contain only digits');

export const sendOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address').optional(),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional(),
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone is required',
});

export const verifyOtpSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  otp: otpSchema,
});

// ============================================================================
// Email Configuration Schema
// ============================================================================

export const emailConfigSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().int().min(1, 'Invalid port').max(65535, 'Invalid port'),
  user: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  from: z.string().email('Please enter a valid from email address'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type LoginPayload = z.infer<typeof loginSchema>;
export type RegisterPayload = z.infer<typeof registerSchema>;
export type BackendRegisterPayload = z.infer<typeof backendRegisterSchema>;
export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordPayload = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordPayload = z.infer<typeof resetPasswordSchema>;
export type BackendResetPasswordPayload = z.infer<typeof backendResetPasswordSchema>;
export type ProfileUpdatePayload = z.infer<typeof profileUpdateSchema>;
export type CreateUserPayload = z.infer<typeof createUserSchema>;
export type UpdateUserPayload = z.infer<typeof updateUserSchema>;
export type SendOtpPayload = z.infer<typeof sendOtpSchema>;
export type VerifyOtpPayload = z.infer<typeof verifyOtpSchema>;
export type EmailConfigPayload = z.infer<typeof emailConfigSchema>;
