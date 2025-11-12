-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankDetailsSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "bankIfscCode" TEXT,
ADD COLUMN     "inspectionScheduledAt" TIMESTAMP(3),
ADD COLUMN     "upiId" TEXT;
