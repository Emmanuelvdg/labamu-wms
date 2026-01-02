-- CreateTable: LalamoveConfig
CREATE TABLE "LalamoveConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "warehouseId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
    "webhookUrl" TEXT,
    "defaultServiceType" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LalamoveConfig_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: LalamoveOrder
CREATE TABLE "LalamoveOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "quotationId" TEXT,
    "lalamoveOrderId" TEXT,
    "shareLink" TEXT,
    "serviceType" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "quotedPrice" REAL,
    "finalPrice" REAL,
    "currency" TEXT,
    "priceBreakdown" TEXT,
    "driverId" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "driverPlate" TEXT,
    "distance" REAL,
    "distanceUnit" TEXT,
    "stops" TEXT NOT NULL,
    "specialRequests" TEXT,
    "remarks" TEXT,
    "metadata" TEXT,
    "podStatus" TEXT,
    "podImageUrl" TEXT,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LalamoveOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LalamoveConfig_warehouseId_key" ON "LalamoveConfig"("warehouseId");

-- CreateIndex
CREATE INDEX "LalamoveConfig_warehouseId_idx" ON "LalamoveConfig"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "LalamoveOrder_lalamoveOrderId_key" ON "LalamoveOrder"("lalamoveOrderId");

-- CreateIndex
CREATE INDEX "LalamoveOrder_orderId_idx" ON "LalamoveOrder"("orderId");

-- CreateIndex
CREATE INDEX "LalamoveOrder_lalamoveOrderId_idx" ON "LalamoveOrder"("lalamoveOrderId");
