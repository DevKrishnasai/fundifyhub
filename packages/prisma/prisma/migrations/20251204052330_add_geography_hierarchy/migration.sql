/*
  Warnings:

  - The `status` column on the `documents` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `emi_schedules` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `inspections` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `loans` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `payment_orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `AdditionalDescription` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `assetBrand` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `assetCondition` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `assetModel` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `assetType` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `bankAccountName` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `bankAccountNumber` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `bankIfscCode` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `district` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseYear` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `upiId` on the `requests` table. All the data in the column will be lost.
  - The `currentStatus` column on the `requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `district` on the `users` table. All the data in the column will be lost.
  - The `roles` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `districtId` to the `requests` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'AGENT', 'DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'EXTENDED', 'ENDED', 'SOLD', 'UNSOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('ACTIVE', 'OUTBID', 'WINNING', 'WON', 'WITHDRAWN', 'REJECTED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INTAKE', 'TRANSFER', 'AUCTION', 'RELEASE', 'DISPOSAL');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'OFFER_DECLINED', 'OFFER_EXPIRED', 'INSPECTION_SCHEDULED', 'INSPECTION_RESCHEDULE_REQUESTED', 'INSPECTION_IN_PROGRESS', 'INSPECTION_COMPLETED', 'CUSTOMER_NOT_AVAILABLE', 'ASSET_MISMATCH', 'AGENT_NOT_AVAILABLE', 'APPROVED', 'PENDING_SIGNATURE', 'PENDING_BANK_DETAILS', 'BANK_DETAILS_SUBMITTED', 'TRANSFER_FAILED', 'AMOUNT_DISBURSED', 'ACTIVE', 'PAYMENT_OVERDUE', 'DEFAULTED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "EMIStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('CREATED', 'ATTEMPTED', 'PAID', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PLEDGED', 'RELEASED', 'IN_AUCTION', 'SOLD');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVISED', 'CANCELLED');

-- DropIndex
DROP INDEX "requests_district_idx";

-- DropIndex
DROP INDEX "users_district_idx";

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "emi_schedules" DROP COLUMN "status",
ADD COLUMN     "status" "EMIStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "inspections" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "InspectionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "loans" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "payment_orders" DROP COLUMN "status",
ADD COLUMN     "status" "PaymentOrderStatus" NOT NULL DEFAULT 'CREATED';

-- AlterTable
ALTER TABLE "requests" DROP COLUMN "AdditionalDescription",
DROP COLUMN "assetBrand",
DROP COLUMN "assetCondition",
DROP COLUMN "assetModel",
DROP COLUMN "assetType",
DROP COLUMN "bankAccountName",
DROP COLUMN "bankAccountNumber",
DROP COLUMN "bankIfscCode",
DROP COLUMN "district",
DROP COLUMN "purchaseYear",
DROP COLUMN "upiId",
ADD COLUMN     "activeOfferId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "disbursementAccountId" TEXT,
ADD COLUMN     "districtId" TEXT NOT NULL,
ADD COLUMN     "previousStatus" "RequestStatus",
ADD COLUMN     "statusChangedAt" TIMESTAMP(3),
ADD COLUMN     "statusChangedBy" TEXT,
DROP COLUMN "currentStatus",
ADD COLUMN     "currentStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "district",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "homeDistrictId" TEXT,
DROP COLUMN "roles",
ADD COLUMN     "roles" "UserRole"[] DEFAULT ARRAY['CUSTOMER']::"UserRole"[];

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "capacity" INTEGER,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_state_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "user_state_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_district_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "user_district_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_details" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT,
    "branchName" TEXT,
    "upiId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_offers" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "offeredById" TEXT NOT NULL,
    "offeredAmount" DOUBLE PRECISION NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "processingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emiAmount" DOUBLE PRECISION,
    "totalInterest" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "emiSchedule" JSONB,
    "penaltyPercentage" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "lateFeePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "previousOfferId" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "ipAddress" TEXT,
    "city" TEXT,
    "country" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "purchaseYear" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "estimatedValue" DOUBLE PRECISION,
    "inspectedValue" DOUBLE PRECISION,
    "depreciationRate" DOUBLE PRECISION,
    "lastValuationDate" TIMESTAMP(3),
    "currentMarketValue" DOUBLE PRECISION,
    "status" "AssetStatus" NOT NULL DEFAULT 'PLEDGED',
    "warehouseId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_movements" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "movementType" "MovementType" NOT NULL,
    "fromWarehouseId" TEXT,
    "toWarehouseId" TEXT,
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "movedBy" TEXT NOT NULL,
    "notes" TEXT,
    "attachments" JSONB,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_listings" (
    "id" TEXT NOT NULL,
    "listingNumber" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "extendedEndTime" TIMESTAMP(3),
    "reservePrice" DOUBLE PRECISION NOT NULL,
    "startingBid" DOUBLE PRECISION NOT NULL,
    "bidIncrement" DOUBLE PRECISION NOT NULL,
    "buyNowPrice" DOUBLE PRECISION,
    "status" "AuctionStatus" NOT NULL DEFAULT 'DRAFT',
    "currentHighBid" DOUBLE PRECISION,
    "totalBids" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "winningBidId" TEXT,
    "finalPrice" DOUBLE PRECISION,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mediaUrls" JSONB,
    "termsAndConditions" TEXT,
    "pickupLocation" TEXT,
    "pickupDeadline" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_bids" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "BidStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxAutoBid" DOUBLE PRECISION,
    "isAutoBid" BOOLEAN NOT NULL DEFAULT false,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outbidAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_bids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE INDEX "countries_code_idx" ON "countries"("code");

-- CreateIndex
CREATE INDEX "countries_isActive_idx" ON "countries"("isActive");

-- CreateIndex
CREATE INDEX "countries_deletedAt_idx" ON "countries"("deletedAt");

-- CreateIndex
CREATE INDEX "states_countryId_idx" ON "states"("countryId");

-- CreateIndex
CREATE INDEX "states_isActive_idx" ON "states"("isActive");

-- CreateIndex
CREATE INDEX "states_deletedAt_idx" ON "states"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "states_countryId_code_key" ON "states"("countryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "states_countryId_name_key" ON "states"("countryId", "name");

-- CreateIndex
CREATE INDEX "districts_stateId_idx" ON "districts"("stateId");

-- CreateIndex
CREATE INDEX "districts_isActive_idx" ON "districts"("isActive");

-- CreateIndex
CREATE INDEX "districts_deletedAt_idx" ON "districts"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "districts_stateId_code_key" ON "districts"("stateId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "districts_stateId_name_key" ON "districts"("stateId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "warehouses_districtId_idx" ON "warehouses"("districtId");

-- CreateIndex
CREATE INDEX "warehouses_isActive_idx" ON "warehouses"("isActive");

-- CreateIndex
CREATE INDEX "warehouses_deletedAt_idx" ON "warehouses"("deletedAt");

-- CreateIndex
CREATE INDEX "warehouses_latitude_longitude_idx" ON "warehouses"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "user_state_assignments_userId_idx" ON "user_state_assignments"("userId");

-- CreateIndex
CREATE INDEX "user_state_assignments_stateId_idx" ON "user_state_assignments"("stateId");

-- CreateIndex
CREATE INDEX "user_state_assignments_deletedAt_idx" ON "user_state_assignments"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_state_assignments_userId_stateId_key" ON "user_state_assignments"("userId", "stateId");

-- CreateIndex
CREATE INDEX "user_district_assignments_userId_idx" ON "user_district_assignments"("userId");

-- CreateIndex
CREATE INDEX "user_district_assignments_districtId_idx" ON "user_district_assignments"("districtId");

-- CreateIndex
CREATE INDEX "user_district_assignments_deletedAt_idx" ON "user_district_assignments"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_district_assignments_userId_districtId_key" ON "user_district_assignments"("userId", "districtId");

-- CreateIndex
CREATE INDEX "bank_details_userId_idx" ON "bank_details"("userId");

-- CreateIndex
CREATE INDEX "bank_details_isPrimary_idx" ON "bank_details"("isPrimary");

-- CreateIndex
CREATE INDEX "bank_details_deletedAt_idx" ON "bank_details"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "bank_details_userId_accountNumber_key" ON "bank_details"("userId", "accountNumber");

-- CreateIndex
CREATE INDEX "admin_offers_requestId_idx" ON "admin_offers"("requestId");

-- CreateIndex
CREATE INDEX "admin_offers_offeredById_idx" ON "admin_offers"("offeredById");

-- CreateIndex
CREATE INDEX "admin_offers_status_idx" ON "admin_offers"("status");

-- CreateIndex
CREATE INDEX "admin_offers_requestId_status_idx" ON "admin_offers"("requestId", "status");

-- CreateIndex
CREATE INDEX "admin_offers_deletedAt_idx" ON "admin_offers"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_tokenHash_idx" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_isActive_idx" ON "sessions"("isActive");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "sessions_lastActivityAt_idx" ON "sessions"("lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "assets_requestId_key" ON "assets"("requestId");

-- CreateIndex
CREATE INDEX "assets_assetType_idx" ON "assets"("assetType");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_requestId_idx" ON "assets"("requestId");

-- CreateIndex
CREATE INDEX "assets_warehouseId_idx" ON "assets"("warehouseId");

-- CreateIndex
CREATE INDEX "assets_condition_idx" ON "assets"("condition");

-- CreateIndex
CREATE INDEX "assets_deletedAt_idx" ON "assets"("deletedAt");

-- CreateIndex
CREATE INDEX "asset_movements_assetId_idx" ON "asset_movements"("assetId");

-- CreateIndex
CREATE INDEX "asset_movements_fromWarehouseId_idx" ON "asset_movements"("fromWarehouseId");

-- CreateIndex
CREATE INDEX "asset_movements_toWarehouseId_idx" ON "asset_movements"("toWarehouseId");

-- CreateIndex
CREATE INDEX "asset_movements_movementType_idx" ON "asset_movements"("movementType");

-- CreateIndex
CREATE INDEX "asset_movements_movementDate_idx" ON "asset_movements"("movementDate");

-- CreateIndex
CREATE UNIQUE INDEX "auction_listings_listingNumber_key" ON "auction_listings"("listingNumber");

-- CreateIndex
CREATE INDEX "auction_listings_assetId_idx" ON "auction_listings"("assetId");

-- CreateIndex
CREATE INDEX "auction_listings_status_idx" ON "auction_listings"("status");

-- CreateIndex
CREATE INDEX "auction_listings_startTime_idx" ON "auction_listings"("startTime");

-- CreateIndex
CREATE INDEX "auction_listings_endTime_idx" ON "auction_listings"("endTime");

-- CreateIndex
CREATE INDEX "auction_listings_winnerId_idx" ON "auction_listings"("winnerId");

-- CreateIndex
CREATE INDEX "auction_listings_createdById_idx" ON "auction_listings"("createdById");

-- CreateIndex
CREATE INDEX "auction_listings_listingNumber_idx" ON "auction_listings"("listingNumber");

-- CreateIndex
CREATE INDEX "auction_listings_deletedAt_idx" ON "auction_listings"("deletedAt");

-- CreateIndex
CREATE INDEX "auction_bids_auctionId_idx" ON "auction_bids"("auctionId");

-- CreateIndex
CREATE INDEX "auction_bids_bidderId_idx" ON "auction_bids"("bidderId");

-- CreateIndex
CREATE INDEX "auction_bids_status_idx" ON "auction_bids"("status");

-- CreateIndex
CREATE INDEX "auction_bids_amount_idx" ON "auction_bids"("amount");

-- CreateIndex
CREATE INDEX "auction_bids_placedAt_idx" ON "auction_bids"("placedAt");

-- CreateIndex
CREATE INDEX "auction_bids_auctionId_amount_idx" ON "auction_bids"("auctionId", "amount");

-- CreateIndex
CREATE INDEX "comments_deletedAt_idx" ON "comments"("deletedAt");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_deletedAt_idx" ON "documents"("deletedAt");

-- CreateIndex
CREATE INDEX "emi_schedules_status_idx" ON "emi_schedules"("status");

-- CreateIndex
CREATE INDEX "emi_schedules_dueDate_status_idx" ON "emi_schedules"("dueDate", "status");

-- CreateIndex
CREATE INDEX "emi_schedules_loanId_status_idx" ON "emi_schedules"("loanId", "status");

-- CreateIndex
CREATE INDEX "inspections_status_idx" ON "inspections"("status");

-- CreateIndex
CREATE INDEX "inspections_deletedAt_idx" ON "inspections"("deletedAt");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE INDEX "loans_loanNumber_idx" ON "loans"("loanNumber");

-- CreateIndex
CREATE INDEX "loans_status_disbursedDate_idx" ON "loans"("status", "disbursedDate");

-- CreateIndex
CREATE INDEX "loans_deletedAt_idx" ON "loans"("deletedAt");

-- CreateIndex
CREATE INDEX "payment_orders_status_idx" ON "payment_orders"("status");

-- CreateIndex
CREATE INDEX "payments_paymentReference_idx" ON "payments"("paymentReference");

-- CreateIndex
CREATE INDEX "payments_loanId_paidDate_idx" ON "payments"("loanId", "paidDate");

-- CreateIndex
CREATE INDEX "requests_currentStatus_idx" ON "requests"("currentStatus");

-- CreateIndex
CREATE INDEX "requests_districtId_idx" ON "requests"("districtId");

-- CreateIndex
CREATE INDEX "requests_requestNumber_idx" ON "requests"("requestNumber");

-- CreateIndex
CREATE INDEX "requests_disbursementAccountId_idx" ON "requests"("disbursementAccountId");

-- CreateIndex
CREATE INDEX "requests_activeOfferId_idx" ON "requests"("activeOfferId");

-- CreateIndex
CREATE INDEX "requests_districtId_currentStatus_idx" ON "requests"("districtId", "currentStatus");

-- CreateIndex
CREATE INDEX "requests_customerId_currentStatus_idx" ON "requests"("customerId", "currentStatus");

-- CreateIndex
CREATE INDEX "requests_assignedAgentId_currentStatus_idx" ON "requests"("assignedAgentId", "currentStatus");

-- CreateIndex
CREATE INDEX "requests_deletedAt_idx" ON "requests"("deletedAt");

-- CreateIndex
CREATE INDEX "requests_previousStatus_idx" ON "requests"("previousStatus");

-- CreateIndex
CREATE INDEX "users_phoneNumber_idx" ON "users"("phoneNumber");

-- CreateIndex
CREATE INDEX "users_roles_idx" ON "users"("roles");

-- CreateIndex
CREATE INDEX "users_homeDistrictId_idx" ON "users"("homeDistrictId");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_state_assignments" ADD CONSTRAINT "user_state_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_state_assignments" ADD CONSTRAINT "user_state_assignments_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_district_assignments" ADD CONSTRAINT "user_district_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_district_assignments" ADD CONSTRAINT "user_district_assignments_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_homeDistrictId_fkey" FOREIGN KEY ("homeDistrictId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_details" ADD CONSTRAINT "bank_details_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_offers" ADD CONSTRAINT "admin_offers_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_offers" ADD CONSTRAINT "admin_offers_offeredById_fkey" FOREIGN KEY ("offeredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_offers" ADD CONSTRAINT "admin_offers_previousOfferId_fkey" FOREIGN KEY ("previousOfferId") REFERENCES "admin_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_listings" ADD CONSTRAINT "auction_listings_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_listings" ADD CONSTRAINT "auction_listings_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_listings" ADD CONSTRAINT "auction_listings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auction_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_disbursementAccountId_fkey" FOREIGN KEY ("disbursementAccountId") REFERENCES "bank_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;
