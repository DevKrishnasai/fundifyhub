-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "password" TEXT,
    "roles" TEXT[] DEFAULT ARRAY['CUSTOMER']::TEXT[],
    "district" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "district" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "purchaseYear" INTEGER,
    "assetType" TEXT NOT NULL,
    "assetBrand" TEXT NOT NULL,
    "assetModel" TEXT NOT NULL,
    "assetCondition" TEXT NOT NULL,
    "AdditionalDescription" TEXT,
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
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
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
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "emiScheduleId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'EMI',
    "paymentMethod" TEXT NOT NULL,
    "paymentReference" TEXT,
    "paidDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedBy" TEXT,
    "remarks" TEXT,
    "receiptPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "identifier" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "emailOTP" TEXT NOT NULL,
    "phoneOTP" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_configs" (
    "id" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "lastConnectedAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastError" TEXT,
    "connectionStatus" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "qrCode" TEXT,
    "configuredBy" TEXT,
    "configuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_roles_idx" ON "users"("roles");

-- CreateIndex
CREATE INDEX "users_district_idx" ON "users"("district");

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
CREATE INDEX "payments_loanId_idx" ON "payments"("loanId");

-- CreateIndex
CREATE INDEX "payments_requestId_idx" ON "payments"("requestId");

-- CreateIndex
CREATE INDEX "payments_emiScheduleId_idx" ON "payments"("emiScheduleId");

-- CreateIndex
CREATE INDEX "payments_paidDate_idx" ON "payments"("paidDate");

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
CREATE INDEX "otp_verifications_userId_idx" ON "otp_verifications"("userId");

-- CreateIndex
CREATE INDEX "otp_verifications_identifier_idx" ON "otp_verifications"("identifier");

-- CreateIndex
CREATE INDEX "otp_verifications_type_idx" ON "otp_verifications"("type");

-- CreateIndex
CREATE INDEX "otp_verifications_expiresAt_idx" ON "otp_verifications"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "verification_sessions_sessionId_key" ON "verification_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "verification_sessions_sessionId_idx" ON "verification_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "verification_sessions_email_idx" ON "verification_sessions"("email");

-- CreateIndex
CREATE INDEX "verification_sessions_phoneNumber_idx" ON "verification_sessions"("phoneNumber");

-- CreateIndex
CREATE INDEX "verification_sessions_expiresAt_idx" ON "verification_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "service_configs_serviceName_key" ON "service_configs"("serviceName");

-- CreateIndex
CREATE INDEX "service_configs_serviceName_idx" ON "service_configs"("serviceName");

-- CreateIndex
CREATE INDEX "service_configs_isEnabled_idx" ON "service_configs"("isEnabled");

-- CreateIndex
CREATE INDEX "service_configs_isActive_idx" ON "service_configs"("isActive");

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

-- AddForeignKey
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
