import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString = process.env.DATABASE_URL;

// Create a connection pool
const pool = new Pool({ connectionString });

// Create the adapter
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: [
      { emit: "stdout", level: "info" },
      { emit: "stdout", level: "error" },
    ],
  });

// In development, reuse the same PrismaClient instance across HMR reloads
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
