/*
  Warnings:

  - You are about to drop the column `created_at` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `razorpay_order_id` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `razorpay_payment_id` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `payments` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `DoublePrecision`.
  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `email_verified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `payment_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallets` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[phone]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `loanId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requestId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "payment_events" DROP CONSTRAINT "payment_events_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_wallet_id_fkey";

-- DropForeignKey
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_user_id_fkey";

-- DropIndex
DROP INDEX "payments_created_at_idx";

-- DropIndex
DROP INDEX "payments_razorpay_payment_id_idx";

-- DropIndex
DROP INDEX "payments_status_idx";

-- DropIndex
DROP INDEX "payments_user_id_idx";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "created_at",
DROP COLUMN "currency",
DROP COLUMN "description",
DROP COLUMN "metadata",
DROP COLUMN "razorpay_order_id",
DROP COLUMN "razorpay_payment_id",
DROP COLUMN "status",
DROP COLUMN "updated_at",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "emiScheduleId" TEXT,
ADD COLUMN     "loanId" TEXT NOT NULL,
ADD COLUMN     "paidDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "paymentMethod" TEXT NOT NULL,
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "paymentType" TEXT NOT NULL DEFAULT 'EMI',
ADD COLUMN     "processedBy" TEXT,
ADD COLUMN     "receiptPath" TEXT,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "requestId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "created_at",
DROP COLUMN "email_verified",
DROP COLUMN "first_name",
DROP COLUMN "is_active",
DROP COLUMN "last_name",
DROP COLUMN "password_hash",
DROP COLUMN "updated_at",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
ADD COLUMN     "state" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "payment_events";

-- DropTable
DROP TABLE "transactions";

-- DropTable
DROP TABLE "wallets";

-- DropEnum
DROP TYPE "payment_status";

-- DropEnum
DROP TYPE "transaction_type";

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT,
    "district" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "assetName" TEXT,
    "assetType" TEXT,
    "assetBrand" TEXT,
    "assetModel" TEXT,
    "assetCondition" TEXT,
    "assetValue" DOUBLE PRECISION,
    "adminOfferedAmount" DOUBLE PRECISION,
    "adminTenureMonths" INTEGER,
    "adminInterestRate" DOUBLE PRECISION,
    "offerMadeDate" TIMESTAMP(3),
    "offerResponseDate" TIMESTAMP(3),
    "assignedAgentId" TEXT,
    "submittedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "approvedAmount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "emiAmount" DOUBLE PRECISION NOT NULL,
    "totalInterest" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedDate" TIMESTAMP(3),
    "disbursedDate" TIMESTAMP(3),
    "firstEMIDate" TIMESTAMP(3),
    "lastEMIDate" TIMESTAMP(3),
    "totalPaidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION,
    "paidEMIs" INTEGER NOT NULL DEFAULT 0,
    "remainingEMIs" INTEGER,
    "overdueEMIs" INTEGER NOT NULL DEFAULT 0,
    "transferMethod" TEXT,
    "transferReference" TEXT,
    "transferProof" TEXT,
    "closedDate" TIMESTAMP(3),
    "closureType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emi_schedules" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "emiNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "emiAmount" DOUBLE PRECISION NOT NULL,
    "principalAmount" DOUBLE PRECISION NOT NULL,
    "interestAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidDate" TIMESTAMP(3),
    "paidAmount" DOUBLE PRECISION,
    "lateFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emi_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "documentType" TEXT NOT NULL,
    "documentCategory" TEXT NOT NULL DEFAULT 'OTHER',
    "uploadedBy" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "commentType" TEXT NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "agentId" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assetCondition" TEXT,
    "estimatedValue" DOUBLE PRECISION,
    "notes" TEXT,
    "recommendApprove" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requests_customerId_idx" ON "requests"("customerId");

-- CreateIndex
CREATE INDEX "requests_currentStatus_idx" ON "requests"("currentStatus");

-- CreateIndex
CREATE INDEX "requests_district_idx" ON "requests"("district");

-- CreateIndex
CREATE INDEX "requests_assignedAgentId_idx" ON "requests"("assignedAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "loans_requestId_key" ON "loans"("requestId");

-- CreateIndex
CREATE INDEX "loans_requestId_idx" ON "loans"("requestId");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE INDEX "loans_disbursedDate_idx" ON "loans"("disbursedDate");

-- CreateIndex
CREATE INDEX "emi_schedules_loanId_idx" ON "emi_schedules"("loanId");

-- CreateIndex
CREATE INDEX "emi_schedules_requestId_idx" ON "emi_schedules"("requestId");

-- CreateIndex
CREATE INDEX "emi_schedules_dueDate_idx" ON "emi_schedules"("dueDate");

-- CreateIndex
CREATE INDEX "emi_schedules_status_idx" ON "emi_schedules"("status");

-- CreateIndex
CREATE UNIQUE INDEX "emi_schedules_loanId_emiNumber_key" ON "emi_schedules"("loanId", "emiNumber");

-- CreateIndex
CREATE INDEX "documents_requestId_idx" ON "documents"("requestId");

-- CreateIndex
CREATE INDEX "documents_documentCategory_idx" ON "documents"("documentCategory");

-- CreateIndex
CREATE INDEX "comments_requestId_idx" ON "comments"("requestId");

-- CreateIndex
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");

-- CreateIndex
CREATE INDEX "comments_commentType_idx" ON "comments"("commentType");

-- CreateIndex
CREATE INDEX "inspections_requestId_idx" ON "inspections"("requestId");

-- CreateIndex
CREATE INDEX "inspections_agentId_idx" ON "inspections"("agentId");

-- CreateIndex
CREATE INDEX "inspections_status_idx" ON "inspections"("status");

-- CreateIndex
CREATE INDEX "payments_loanId_idx" ON "payments"("loanId");

-- CreateIndex
CREATE INDEX "payments_requestId_idx" ON "payments"("requestId");

-- CreateIndex
CREATE INDEX "payments_emiScheduleId_idx" ON "payments"("emiScheduleId");

-- CreateIndex
CREATE INDEX "payments_paidDate_idx" ON "payments"("paidDate");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_district_idx" ON "users"("district");

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emi_schedules" ADD CONSTRAINT "emi_schedules_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emi_schedules" ADD CONSTRAINT "emi_schedules_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_emiScheduleId_fkey" FOREIGN KEY ("emiScheduleId") REFERENCES "emi_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
