-- CreateTable
CREATE TABLE "CompanyNotificationConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "recipients" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyNotificationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyNotificationConfig_companyId_idx" ON "CompanyNotificationConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyNotificationConfig_companyId_notificationType_key" ON "CompanyNotificationConfig"("companyId", "notificationType");

-- AddForeignKey
ALTER TABLE "CompanyNotificationConfig" ADD CONSTRAINT "CompanyNotificationConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
