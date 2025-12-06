/**
 * Common Zod schemas shared across the application
 * @module common/common.schemas
 */

import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');
