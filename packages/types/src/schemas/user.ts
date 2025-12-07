/**
 * User validation schemas
 */

import { z } from 'zod';
import { UserRole } from '../constants/user';

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode').optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  roles: z.array(z.nativeEnum(UserRole)),
  homeDistrictId: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{9,14}$/).optional(),
  roles: z.array(z.nativeEnum(UserRole)).optional(),
  homeDistrictId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const AssignUserDistrictsSchema = z.object({
  userId: z.string().min(1, 'User ID required'),
  districtIds: z.array(z.string()).min(1, 'At least one district required'),
  primaryDistrictId: z.string().optional(),
});

export type AssignUserDistrictsInput = z.infer<typeof AssignUserDistrictsSchema>;

export const AssignUserStatesSchema = z.object({
  userId: z.string().min(1, 'User ID required'),
  stateIds: z.array(z.string()).min(1, 'At least one state required'),
  primaryStateId: z.string().optional(),
});

export type AssignUserStatesInput = z.infer<typeof AssignUserStatesSchema>;
