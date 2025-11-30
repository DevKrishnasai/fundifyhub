/*
  Warnings:

  - Made the column `loanNumber` on table `loans` required. This step will fail if there are existing NULL values in that column.
  - Made the column `approvedDate` on table `loans` required. This step will fail if there are existing NULL values in that column.
  - Made the column `firstEMIDate` on table `loans` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lastEMIDate` on table `loans` required. This step will fail if there are existing NULL values in that column.
  - Made the column `remainingAmount` on table `loans` required. This step will fail if there are existing NULL values in that column.
  - Made the column `remainingEMIs` on table `loans` required. This step will fail if there are existing NULL values in that column.
  - Made the column `paymentReference` on table `payments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `processedBy` on table `payments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `actorId` on table `request_history` required. This step will fail if there are existing NULL values in that column.
  - Made the column `requestNumber` on table `requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `purchaseYear` on table `requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `AdditionalDescription` on table `requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `adminProcessingFee` on table `requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `configuredBy` on table `service_configs` required. This step will fail if there are existing NULL values in that column.

*/
-- Fill NULL values before making columns required

-- Fill loans table NULL values
UPDATE "loans" SET "loanNumber" = 'LN' || LPAD("id"::text, 6, '0') WHERE "loanNumber" IS NULL;
UPDATE "loans" SET "approvedDate" = "createdAt" WHERE "approvedDate" IS NULL;
UPDATE "loans" SET "firstEMIDate" = "createdAt" WHERE "firstEMIDate" IS NULL;
UPDATE "loans" SET "lastEMIDate" = "createdAt" + INTERVAL '1 year' WHERE "lastEMIDate" IS NULL;
UPDATE "loans" SET "remainingAmount" = "totalAmount" WHERE "remainingAmount" IS NULL;
UPDATE "loans" SET "remainingEMIs" = "tenureMonths" WHERE "remainingEMIs" IS NULL;

-- Fill payments table NULL values
UPDATE "payments" SET "paymentReference" = 'PAY' || LPAD("id"::text, 8, '0') WHERE "paymentReference" IS NULL;
UPDATE "payments" SET "processedBy" = (SELECT "customerId" FROM "requests" WHERE "requests"."id" = "payments"."requestId" LIMIT 1) WHERE "processedBy" IS NULL;

-- Fill request_history table NULL values
UPDATE "request_history" SET "actorId" = (SELECT "customerId" FROM "requests" WHERE "requests"."id" = "request_history"."requestId" LIMIT 1) WHERE "actorId" IS NULL;

-- Fill requests table NULL values
UPDATE "requests" SET "requestNumber" = 'REQ' || LPAD("id"::text, 6, '0') WHERE "requestNumber" IS NULL;
UPDATE "requests" SET "purchaseYear" = EXTRACT(YEAR FROM "createdAt")::integer WHERE "purchaseYear" IS NULL;
UPDATE "requests" SET "AdditionalDescription" = '' WHERE "AdditionalDescription" IS NULL;
UPDATE "requests" SET "adminProcessingFee" = 0 WHERE "adminProcessingFee" IS NULL;

-- Fill service_configs table NULL values
UPDATE "service_configs" SET "configuredBy" = 'system' WHERE "configuredBy" IS NULL;

-- AlterTable
ALTER TABLE "documents" ALTER COLUMN "fileKey" DROP DEFAULT,
ALTER COLUMN "fileName" DROP DEFAULT,
ALTER COLUMN "fileSize" DROP DEFAULT,
ALTER COLUMN "fileType" DROP DEFAULT;

-- AlterTable
ALTER TABLE "loans" ALTER COLUMN "loanNumber" SET NOT NULL,
ALTER COLUMN "approvedDate" SET NOT NULL,
ALTER COLUMN "firstEMIDate" SET NOT NULL,
ALTER COLUMN "lastEMIDate" SET NOT NULL,
ALTER COLUMN "remainingAmount" SET NOT NULL,
ALTER COLUMN "remainingEMIs" SET NOT NULL;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "paymentReference" SET NOT NULL,
ALTER COLUMN "processedBy" SET NOT NULL;

-- AlterTable
ALTER TABLE "request_history" ALTER COLUMN "actorId" SET NOT NULL;

-- AlterTable
ALTER TABLE "requests" ALTER COLUMN "requestNumber" SET NOT NULL,
ALTER COLUMN "purchaseYear" SET NOT NULL,
ALTER COLUMN "AdditionalDescription" SET NOT NULL,
ALTER COLUMN "AdditionalDescription" SET DEFAULT '',
ALTER COLUMN "adminProcessingFee" SET NOT NULL,
ALTER COLUMN "adminProcessingFee" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "service_configs" ALTER COLUMN "configuredBy" SET NOT NULL;
