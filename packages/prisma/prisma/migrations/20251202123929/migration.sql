-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "assignedAdminId" TEXT;

-- CreateIndex
CREATE INDEX "requests_assignedAdminId_idx" ON "requests"("assignedAdminId");

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
