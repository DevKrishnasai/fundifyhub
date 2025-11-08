/*
  Warnings:

  - You are about to drop the column `mimeType` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `documents` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fileKey]` on the table `documents` will be added. If there are existing duplicate values, this will fail.
  - Made the column `fileSize` on table `documents` required. This step will fail if there are existing NULL values in that column.
  - Made the column `uploadedBy` on table `documents` required. This step will fail if there are existing NULL values in that column.

*/

-- Step 1: Handle NULL fileSize values first
UPDATE "documents" 
SET "fileSize" = 0 
WHERE "fileSize" IS NULL;

-- Step 2: Handle NULL uploadedBy values (set to a system user or first admin)
UPDATE "documents" 
SET "uploadedBy" = (SELECT id FROM "users" WHERE 'ADMIN' = ANY(roles) LIMIT 1)
WHERE "uploadedBy" IS NULL;

-- Step 3: Add new columns with defaults
ALTER TABLE "documents" 
ADD COLUMN     "displayOrder" INTEGER,
ADD COLUMN     "fileKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "fileName" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "fileType" TEXT NOT NULL DEFAULT 'application/octet-stream',
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- Step 4: Migrate existing data - copy url to fileKey and mimeType to fileType
UPDATE "documents" 
SET "fileKey" = COALESCE("url", id),
    "fileName" = 'legacy-file',
    "fileType" = COALESCE("mimeType", 'application/octet-stream');

-- Step 5: Make fileKey unique by appending ID for duplicates
WITH duplicates AS (
  SELECT id, "fileKey", 
         ROW_NUMBER() OVER (PARTITION BY "fileKey" ORDER BY "createdAt") as rn
  FROM "documents"
)
UPDATE "documents" d
SET "fileKey" = d."fileKey" || '-' || d.id
FROM duplicates dup
WHERE d.id = dup.id AND dup.rn > 1;

-- Step 6: Now drop old columns and update constraints
ALTER TABLE "documents" 
DROP COLUMN "mimeType",
DROP COLUMN "url",
ALTER COLUMN "requestId" DROP NOT NULL,
ALTER COLUMN "fileSize" SET NOT NULL,
ALTER COLUMN "fileSize" SET DEFAULT 0,
ALTER COLUMN "uploadedBy" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "documents_fileKey_key" ON "documents"("fileKey");

-- CreateIndex
CREATE INDEX "documents_fileKey_idx" ON "documents"("fileKey");

-- CreateIndex
CREATE INDEX "documents_documentType_idx" ON "documents"("documentType");

-- CreateIndex
CREATE INDEX "documents_uploadedBy_idx" ON "documents"("uploadedBy");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");
