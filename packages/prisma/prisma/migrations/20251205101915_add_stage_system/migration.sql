/*
  Warnings:

  - You are about to drop the column `currentStatus` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `previousStatus` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `statusChangedAt` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `statusChangedBy` on the `requests` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RequestStage" AS ENUM ('DRAFT', 'REVIEW', 'OFFER', 'INSPECTION', 'DOCUMENTATION', 'DISBURSEMENT', 'ACTIVE', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssetStatus" ADD VALUE 'FORFEITED';
ALTER TYPE "AssetStatus" ADD VALUE 'AUCTIONED';

-- AlterEnum
ALTER TYPE "BidStatus" ADD VALUE 'CANCELLED';

-- DropIndex
DROP INDEX "requests_assignedAgentId_currentStatus_idx";

-- DropIndex
DROP INDEX "requests_currentStatus_idx";

-- DropIndex
DROP INDEX "requests_customerId_currentStatus_idx";

-- DropIndex
DROP INDEX "requests_districtId_currentStatus_idx";

-- DropIndex
DROP INDEX "requests_previousStatus_idx";

-- AlterTable
ALTER TABLE "requests" DROP COLUMN "currentStatus",
DROP COLUMN "previousStatus",
DROP COLUMN "statusChangedAt",
DROP COLUMN "statusChangedBy",
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "failureType" TEXT,
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresAdminAction" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requiresAgentAction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresCustomerAction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stage" "RequestStage" NOT NULL DEFAULT 'REVIEW',
ADD COLUMN     "stageChangedAt" TIMESTAMP(3),
ADD COLUMN     "stageChangedBy" TEXT,
ADD COLUMN     "subStatus" TEXT;

-- DropEnum
DROP TYPE "RequestStatus";

-- CreateIndex
CREATE INDEX "requests_stage_idx" ON "requests"("stage");

-- CreateIndex
CREATE INDEX "requests_stage_subStatus_idx" ON "requests"("stage", "subStatus");

-- CreateIndex
CREATE INDEX "requests_districtId_stage_idx" ON "requests"("districtId", "stage");

-- CreateIndex
CREATE INDEX "requests_customerId_stage_idx" ON "requests"("customerId", "stage");

-- CreateIndex
CREATE INDEX "requests_assignedAgentId_stage_idx" ON "requests"("assignedAgentId", "stage");

-- CreateIndex
CREATE INDEX "requests_requiresCustomerAction_idx" ON "requests"("requiresCustomerAction");

-- CreateIndex
CREATE INDEX "requests_requiresAdminAction_idx" ON "requests"("requiresAdminAction");

-- CreateIndex
CREATE INDEX "requests_requiresAgentAction_idx" ON "requests"("requiresAgentAction");

-- CreateIndex
CREATE INDEX "requests_isBlocked_idx" ON "requests"("isBlocked");
