/*
  Warnings:

  - A unique constraint covering the columns `[loanNumber]` on the table `loans` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[requestNumber]` on the table `requests` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "loans" ADD COLUMN     "loanNumber" TEXT;

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "requestNumber" TEXT;

-- CreateTable
CREATE TABLE "serial_counters" (
    "id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serial_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loans_loanNumber_key" ON "loans"("loanNumber");

-- CreateIndex
CREATE UNIQUE INDEX "requests_requestNumber_key" ON "requests"("requestNumber");
