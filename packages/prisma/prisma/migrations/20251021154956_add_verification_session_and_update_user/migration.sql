/*
  Warnings:

  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[phoneNumber]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `firstName` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."users_phone_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "name",
DROP COLUMN "phone",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT;

-- CreateTable
CREATE TABLE "verification_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "emailOTP" TEXT NOT NULL,
    "phoneOTP" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verification_sessions_sessionId_key" ON "verification_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "verification_sessions_sessionId_idx" ON "verification_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "verification_sessions_email_idx" ON "verification_sessions"("email");

-- CreateIndex
CREATE INDEX "verification_sessions_phoneNumber_idx" ON "verification_sessions"("phoneNumber");

-- CreateIndex
CREATE INDEX "verification_sessions_expiresAt_idx" ON "verification_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");
