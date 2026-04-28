-- CreateTable
CREATE TABLE "PrinterConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "outputType" TEXT NOT NULL DEFAULT 'PDF',
    "host" TEXT,
    "port" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "labelWidth" INTEGER NOT NULL DEFAULT 288,
    "labelHeight" INTEGER NOT NULL DEFAULT 144,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrinterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrinterConfig_companyId_idx" ON "PrinterConfig"("companyId");
