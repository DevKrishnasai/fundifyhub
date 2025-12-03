/*
  Warnings:

  - You are about to drop the column `isVerified` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedAt` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedBy` on the `documents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "documents" DROP COLUMN "isVerified",
DROP COLUMN "verifiedAt",
DROP COLUMN "verifiedBy";
