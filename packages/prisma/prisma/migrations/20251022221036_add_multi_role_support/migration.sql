-- AlterTable: Add roles column, migrate data from role column, drop role column
-- Step 1: Add the new roles array column (nullable initially)
ALTER TABLE "users" ADD COLUMN "roles" TEXT[];

-- Step 2: Migrate existing role data to roles array
UPDATE "users" SET "roles" = ARRAY["role"]::TEXT[] WHERE "role" IS NOT NULL;

-- Step 3: Set default for null values
UPDATE "users" SET "roles" = ARRAY['CUSTOMER']::TEXT[] WHERE "roles" IS NULL;

-- Step 4: Make roles column non-null with default
ALTER TABLE "users" ALTER COLUMN "roles" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT ARRAY['CUSTOMER']::TEXT[];

-- Step 5: Drop the old role column and its index
DROP INDEX IF EXISTS "users_role_idx";
ALTER TABLE "users" DROP COLUMN "role";

-- Step 6: Create index on new roles column
CREATE INDEX "users_roles_idx" ON "users"("roles");
