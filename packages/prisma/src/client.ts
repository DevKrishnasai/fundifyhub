import { PrismaClient } from "@prisma/client";

// Create a global variable to store the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create Prisma client instance with simple logging
export const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log: ["query", "error", "info", "warn"],
  });

// Store the instance globally in development to prevent multiple instances
if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export default prisma;