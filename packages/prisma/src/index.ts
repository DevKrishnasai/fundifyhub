// Re-export Prisma client
export { default as prisma } from "./client";
export type { PrismaClient } from "@prisma/client";

// Note: Other types (User, Payment, etc.) will be available 
// after running 'prisma generate' command