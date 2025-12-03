/*
  Warnings:

  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `request_history` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'PERMANENTLY_FAILED', 'CANCELLED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "NotificationPriorityLevel" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'BULK');

-- CreateEnum
CREATE TYPE "NotificationCategoryType" AS ENUM ('SECURITY', 'TRANSACTIONAL', 'REMINDER', 'MARKETING', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DeliveryModeType" AS ENUM ('BROADCAST', 'INDEPENDENT', 'FALLBACK', 'SINGLE');

-- CreateEnum
CREATE TYPE "BackoffStrategyType" AS ENUM ('FIXED', 'EXPONENTIAL', 'LINEAR');

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_emiScheduleId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_loanId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_requestId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "request_history" DROP CONSTRAINT "request_history_requestId_fkey";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "request_history";

-- DropEnum
DROP TYPE "NotificationPriority";

-- DropEnum
DROP TYPE "NotificationType";

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "userId" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "recipientName" TEXT,
    "templateName" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "renderedContent" JSONB,
    "channel" "NotificationChannel" NOT NULL,
    "deliveryMode" "DeliveryModeType" NOT NULL DEFAULT 'BROADCAST',
    "priority" "NotificationPriorityLevel" NOT NULL DEFAULT 'NORMAL',
    "category" "NotificationCategoryType" NOT NULL DEFAULT 'TRANSACTIONAL',
    "channelOptions" JSONB,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "backoffStrategy" "BackoffStrategyType" NOT NULL DEFAULT 'EXPONENTIAL',
    "initialDelay" INTEGER NOT NULL DEFAULT 1000,
    "maxDelay" INTEGER NOT NULL DEFAULT 300000,
    "backoffMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "providerMessageId" TEXT,
    "providerResponse" JSONB,
    "lastError" TEXT,
    "lastErrorCode" TEXT,
    "errorHistory" JSONB,
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "requestId" TEXT,
    "loanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "category" "NotificationCategoryType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "frequencyLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "in_app_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "icon" TEXT,
    "category" "NotificationCategoryType" NOT NULL DEFAULT 'TRANSACTIONAL',
    "priority" "NotificationPriorityLevel" NOT NULL DEFAULT 'NORMAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "requestId" TEXT,
    "loanId" TEXT,
    "emiScheduleId" TEXT,
    "notificationLogId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_logs_correlationId_idx" ON "notification_logs"("correlationId");

-- CreateIndex
CREATE INDEX "notification_logs_userId_idx" ON "notification_logs"("userId");

-- CreateIndex
CREATE INDEX "notification_logs_recipientEmail_idx" ON "notification_logs"("recipientEmail");

-- CreateIndex
CREATE INDEX "notification_logs_recipientPhone_idx" ON "notification_logs"("recipientPhone");

-- CreateIndex
CREATE INDEX "notification_logs_templateName_idx" ON "notification_logs"("templateName");

-- CreateIndex
CREATE INDEX "notification_logs_channel_idx" ON "notification_logs"("channel");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- CreateIndex
CREATE INDEX "notification_logs_priority_idx" ON "notification_logs"("priority");

-- CreateIndex
CREATE INDEX "notification_logs_category_idx" ON "notification_logs"("category");

-- CreateIndex
CREATE INDEX "notification_logs_nextRetryAt_idx" ON "notification_logs"("nextRetryAt");

-- CreateIndex
CREATE INDEX "notification_logs_scheduledAt_idx" ON "notification_logs"("scheduledAt");

-- CreateIndex
CREATE INDEX "notification_logs_createdAt_idx" ON "notification_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notification_logs_requestId_idx" ON "notification_logs"("requestId");

-- CreateIndex
CREATE INDEX "notification_logs_loanId_idx" ON "notification_logs"("loanId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_logs_idempotencyKey_key" ON "notification_logs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "notification_preferences_channel_idx" ON "notification_preferences"("channel");

-- CreateIndex
CREATE INDEX "notification_preferences_category_idx" ON "notification_preferences"("category");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_channel_category_key" ON "notification_preferences"("userId", "channel", "category");

-- CreateIndex
CREATE INDEX "in_app_notifications_userId_idx" ON "in_app_notifications"("userId");

-- CreateIndex
CREATE INDEX "in_app_notifications_userId_isRead_idx" ON "in_app_notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "in_app_notifications_userId_createdAt_idx" ON "in_app_notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "in_app_notifications_category_idx" ON "in_app_notifications"("category");

-- CreateIndex
CREATE INDEX "in_app_notifications_requestId_idx" ON "in_app_notifications"("requestId");

-- CreateIndex
CREATE INDEX "in_app_notifications_loanId_idx" ON "in_app_notifications"("loanId");

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_emiScheduleId_fkey" FOREIGN KEY ("emiScheduleId") REFERENCES "emi_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
