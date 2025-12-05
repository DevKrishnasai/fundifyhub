/**
 * Backend-only Prisma-dependent API types
 *
 * These types require Prisma and should only be imported on the backend.
 * Frontend should not use these types.
 */

/**
 * Request with common relations
 * Backend-only: Prisma-dependent type
 */
export type RequestWithRelations = any;

/**
 * Full request detail with all relations including loan and EMI schedules
 * Backend-only: Prisma-dependent type
 */
export type RequestDetailWithLoan = any;

/**
 * EMI schedule item from Prisma
 * Backend-only: Prisma-dependent type
 */
export type EMIScheduleItem = any;

