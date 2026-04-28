-- CreateTable
CREATE TABLE "WaveReleaseRule" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL DEFAULT 'MANUAL',
    "cronExpression" TEXT,
    "minOrders" INTEGER NOT NULL DEFAULT 1,
    "maxOrders" INTEGER NOT NULL DEFAULT 50,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaveReleaseRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaveReleaseRule_warehouseId_idx" ON "WaveReleaseRule"("warehouseId");

-- AddForeignKey
ALTER TABLE "WaveReleaseRule" ADD CONSTRAINT "WaveReleaseRule_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
