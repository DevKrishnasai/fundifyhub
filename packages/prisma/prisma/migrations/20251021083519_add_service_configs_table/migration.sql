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
    "configuredBy" TEXT,
    "configuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_configs_serviceName_key" ON "service_configs"("serviceName");

-- CreateIndex
CREATE INDEX "service_configs_serviceName_idx" ON "service_configs"("serviceName");

-- CreateIndex
CREATE INDEX "service_configs_isEnabled_idx" ON "service_configs"("isEnabled");

-- CreateIndex
CREATE INDEX "service_configs_isActive_idx" ON "service_configs"("isActive");
