import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  district: z.string().min(1),
  phoneNumber: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
});

export const phoneSchema = z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits')

export type LoginPayload = z.infer<typeof loginSchema>;
export type RegisterPayload = z.infer<typeof registerSchema>;
