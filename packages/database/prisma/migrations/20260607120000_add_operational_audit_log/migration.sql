-- CreateTable
CREATE TABLE "OperationalAuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationalAuditLog_companyId_idx" ON "OperationalAuditLog"("companyId");

-- CreateIndex
CREATE INDEX "OperationalAuditLog_entity_entityId_idx" ON "OperationalAuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "OperationalAuditLog_actorId_idx" ON "OperationalAuditLog"("actorId");

-- CreateIndex
CREATE INDEX "OperationalAuditLog_createdAt_idx" ON "OperationalAuditLog"("createdAt");
