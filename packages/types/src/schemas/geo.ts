/**
 * Geo/Geography validation schemas
 */

import { z } from 'zod';

export const CreateCountrySchema = z.object({
  name: z.string().min(2, 'Country name must be at least 2 characters'),
  code: z.string().length(2, 'Country code must be exactly 2 characters').toUpperCase(),
  dialCode: z.string().min(1, 'Dial code required'),
  isActive: z.boolean().default(true),
});

export type CreateCountryInput = z.infer<typeof CreateCountrySchema>;

export const UpdateCountrySchema = z.object({
  name: z.string().min(2).optional(),
  dialCode: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCountryInput = z.infer<typeof UpdateCountrySchema>;

export const CreateStateSchema = z.object({
  countryId: z.string().min(1, 'Country ID required'),
  name: z.string().min(2, 'State name must be at least 2 characters'),
  code: z.string().min(2, 'State code required'),
  isActive: z.boolean().default(true),
});

export type CreateStateInput = z.infer<typeof CreateStateSchema>;

export const UpdateStateSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateStateInput = z.infer<typeof UpdateStateSchema>;

export const CreateDistrictSchema = z.object({
  stateId: z.string().min(1, 'State ID required'),
  name: z.string().min(2, 'District name must be at least 2 characters'),
  code: z.string().min(2, 'District code required'),
  isActive: z.boolean().default(true),
});

export type CreateDistrictInput = z.infer<typeof CreateDistrictSchema>;

export const UpdateDistrictSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateDistrictInput = z.infer<typeof UpdateDistrictSchema>;

export const CreateWarehouseSchema = z.object({
  districtId: z.string().min(1, 'District ID required'),
  name: z.string().min(3, 'Warehouse name must be at least 3 characters'),
  code: z.string().min(2, 'Warehouse code required'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  city: z.string().min(2, 'City required'),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  capacity: z.number().int().positive('Capacity must be positive').optional(),
  managerName: z.string().optional(),
  managerPhone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number').optional(),
  managerEmail: z.string().email('Invalid email').optional(),
  isActive: z.boolean().default(true),
});

export type CreateWarehouseInput = z.infer<typeof CreateWarehouseSchema>;

export const UpdateWarehouseSchema = z.object({
  name: z.string().min(3).optional(),
  code: z.string().min(2).optional(),
  address: z.string().min(10).optional(),
  city: z.string().min(2).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  capacity: z.number().int().positive().optional(),
  managerName: z.string().optional(),
  managerPhone: z.string().regex(/^\+?[1-9]\d{9,14}$/).optional(),
  managerEmail: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateWarehouseInput = z.infer<typeof UpdateWarehouseSchema>;
