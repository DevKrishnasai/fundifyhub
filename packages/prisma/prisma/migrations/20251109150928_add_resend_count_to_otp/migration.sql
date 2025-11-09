/*
  Warnings:

  - You are about to drop the column `maxAttempts` on the `otp_verifications` table. All the data in the column will be lost.
  - You are about to drop the `verification_sessions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[sessionId]` on the table `otp_verifications` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sessionId` to the `otp_verifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "otp_verifications" DROP COLUMN "maxAttempts",
ADD COLUMN     "resendCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sessionId" TEXT NOT NULL;

-- DropTable
DROP TABLE "verification_sessions";

-- CreateIndex
CREATE UNIQUE INDEX "otp_verifications_sessionId_key" ON "otp_verifications"("sessionId");
