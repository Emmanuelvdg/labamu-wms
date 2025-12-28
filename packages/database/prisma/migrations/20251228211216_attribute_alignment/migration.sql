/*
  Warnings:

  - You are about to drop the column `depth` on the `ProductPackaging` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `ProductPackaging` table. All the data in the column will be lost.
  - Added the required column `name` to the `PutawayRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `strategy` to the `PutawayRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PutawayRule` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "WarehouseFunctionalArea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaType" TEXT NOT NULL,
    "x" REAL NOT NULL DEFAULT 0,
    "y" REAL NOT NULL DEFAULT 0,
    "width" REAL NOT NULL DEFAULT 100,
    "height" REAL NOT NULL DEFAULT 100,
    "rotation" REAL NOT NULL DEFAULT 0,
    "color" TEXT,
    "icon" TEXT,
    "attributes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "linkedLocationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WarehouseFunctionalArea_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WarehouseFunctionalArea_linkedLocationId_fkey" FOREIGN KEY ("linkedLocationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PutawaySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "workerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PutawaySession_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PutawaySession_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PutawayTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sourceLocationId" TEXT NOT NULL,
    "destinationLocationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "putawayQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "exceptionType" TEXT,
    "exceptionReason" TEXT,
    "originalQuantity" INTEGER,
    "actualQuantity" INTEGER,
    "alternativeLocationId" TEXT,
    "requiresSupervisorReview" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PutawayTask_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PutawaySession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PutawayTask_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PutawayTask_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PutawayTask_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PutawayTask_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PutawayRuleAttribute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "putawayRuleId" TEXT NOT NULL,
    "attributeDefinitionId" TEXT NOT NULL,
    "requiredValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PutawayRuleAttribute_putawayRuleId_fkey" FOREIGN KEY ("putawayRuleId") REFERENCES "PutawayRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PutawayRuleAttribute_attributeDefinitionId_fkey" FOREIGN KEY ("attributeDefinitionId") REFERENCES "LocationAttributeDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "attributeDefinitionId" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductAttribute_attributeDefinitionId_fkey" FOREIGN KEY ("attributeDefinitionId") REFERENCES "LocationAttributeDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT NOT NULL,
    "fixedPrice" REAL NOT NULL DEFAULT 0,
    "carrier" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShippingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryMethodId" TEXT NOT NULL,
    "minWeight" REAL,
    "maxWeight" REAL,
    "minVolume" REAL,
    "maxVolume" REAL,
    "minPrice" REAL,
    "maxPrice" REAL,
    "price" REAL NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ShippingRule_deliveryMethodId_fkey" FOREIGN KEY ("deliveryMethodId") REFERENCES "DeliveryMethod" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RotationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "customerId" TEXT,
    "orderTypeId" TEXT,
    "productId" TEXT,
    "categoryId" TEXT,
    "warehouseId" TEXT,
    "policy" TEXT NOT NULL,
    "minShelfLifeDays" INTEGER,
    "missingExpiryAction" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RotationRule_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RotationRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RotationRule_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FulfillmentRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "strategy" TEXT NOT NULL,
    "warehouseId" TEXT,
    "actionIfUnavailable" TEXT NOT NULL DEFAULT 'NEXT_RULE',
    "transferSourceRule" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FulfillmentRule_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FulfillmentRule" ("active", "createdAt", "id", "name", "priority", "strategy", "updatedAt", "warehouseId") SELECT "active", "createdAt", "id", "name", "priority", "strategy", "updatedAt", "warehouseId" FROM "FulfillmentRule";
DROP TABLE "FulfillmentRule";
ALTER TABLE "new_FulfillmentRule" RENAME TO "FulfillmentRule";
CREATE TABLE "new_InventoryBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "packageId" TEXT,
    "initialQuantity" INTEGER NOT NULL,
    "currentQuantity" INTEGER NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "costPerUnit" REAL NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "expiryDate" DATETIME,
    "status" TEXT NOT NULL,
    "vendor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryBatch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryBatch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryBatch_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InventoryBatch" ("batchNumber", "costPerUnit", "createdAt", "currentQuantity", "expiryDate", "id", "initialQuantity", "locationId", "packageId", "productId", "purchaseDate", "status", "updatedAt", "vendor", "warehouseId") SELECT "batchNumber", "costPerUnit", "createdAt", "currentQuantity", "expiryDate", "id", "initialQuantity", "locationId", "packageId", "productId", "purchaseDate", "status", "updatedAt", "vendor", "warehouseId" FROM "InventoryBatch";
DROP TABLE "InventoryBatch";
ALTER TABLE "new_InventoryBatch" RENAME TO "InventoryBatch";
CREATE UNIQUE INDEX "InventoryBatch_batchNumber_key" ON "InventoryBatch"("batchNumber");
CREATE TABLE "new_Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "structuralType" TEXT,
    "attributes" TEXT,
    "supportedPackaging" TEXT,
    "removalStrategy" TEXT,
    "inventoryFrequency" INTEGER NOT NULL DEFAULT 0,
    "nextInventoryDate" DATETIME,
    "maxVolume" REAL,
    "maxWeight" REAL,
    "x" REAL DEFAULT 0,
    "y" REAL DEFAULT 0,
    "width" REAL DEFAULT 1,
    "height" REAL DEFAULT 1,
    "rotation" REAL DEFAULT 0,
    "zonePriority" INTEGER NOT NULL DEFAULT 100,
    "putawaySequence" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "warehouseId" TEXT,
    CONSTRAINT "Location_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Location" ("attributes", "height", "id", "inventoryFrequency", "maxVolume", "maxWeight", "name", "nextInventoryDate", "parentId", "removalStrategy", "rotation", "structuralType", "supportedPackaging", "type", "warehouseId", "width", "x", "y") SELECT "attributes", "height", "id", "inventoryFrequency", "maxVolume", "maxWeight", "name", "nextInventoryDate", "parentId", "removalStrategy", "rotation", "structuralType", "supportedPackaging", "type", "warehouseId", "width", "x", "y" FROM "Location";
DROP TABLE "Location";
ALTER TABLE "new_Location" RENAME TO "Location";
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "status" TEXT NOT NULL,
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'UNALLOCATED',
    "priority" TEXT NOT NULL,
    "shippingCarrier" TEXT,
    "expectedDate" DATETIME,
    "warehouseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SALES',
    "destinationWarehouseId" TEXT,
    "parentOrderId" TEXT,
    "deliveryMethodId" TEXT,
    "shippingCost" REAL NOT NULL DEFAULT 0,
    "shippingCostInCOGS" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_destinationWarehouseId_fkey" FOREIGN KEY ("destinationWarehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_parentOrderId_fkey" FOREIGN KEY ("parentOrderId") REFERENCES "Order" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "Order_deliveryMethodId_fkey" FOREIGN KEY ("deliveryMethodId") REFERENCES "DeliveryMethod" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "customerId", "expectedDate", "fulfillmentStatus", "id", "priority", "shippingCarrier", "status", "updatedAt", "warehouseId") SELECT "createdAt", "customerId", "expectedDate", "fulfillmentStatus", "id", "priority", "shippingCarrier", "status", "updatedAt", "warehouseId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "classification" TEXT,
    "type" TEXT,
    "unitOfMeasure" TEXT,
    "isStockable" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "averageCost" REAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "tracking" TEXT NOT NULL DEFAULT 'none',
    "expiryDate" DATETIME,
    "width" REAL,
    "height" REAL,
    "depth" REAL,
    "weight" REAL,
    "velocity" TEXT DEFAULT 'C',
    "abcClass" TEXT,
    "temperatureMin" REAL,
    "temperatureMax" REAL,
    "preferredPackaging" TEXT,
    "stackable" BOOLEAN NOT NULL DEFAULT true,
    "maxStackHeight" INTEGER,
    "supplierId" TEXT,
    "requiredAttributeId" TEXT,
    CONSTRAINT "Product_requiredAttributeId_fkey" FOREIGN KEY ("requiredAttributeId") REFERENCES "LocationAttributeDefinition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("averageCost", "category", "classification", "depth", "description", "expiryDate", "height", "id", "isStockable", "name", "sku", "status", "supplierId", "tracking", "type", "unitOfMeasure", "weight", "width") SELECT "averageCost", "category", "classification", "depth", "description", "expiryDate", "height", "id", "isStockable", "name", "sku", "status", "supplierId", "tracking", "type", "unitOfMeasure", "weight", "width" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE TABLE "new_ProductPackaging" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unitType" TEXT NOT NULL DEFAULT 'UNIT',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "width" REAL NOT NULL DEFAULT 0,
    "height" REAL NOT NULL DEFAULT 0,
    "length" REAL NOT NULL DEFAULT 0,
    "weight" REAL NOT NULL DEFAULT 0,
    "barcode" TEXT,
    "storageRequirements" TEXT,
    "maxStacking" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "productId" TEXT,
    CONSTRAINT "ProductPackaging_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProductPackaging" ("barcode", "createdAt", "height", "id", "maxStacking", "name", "productId", "quantity", "storageRequirements", "updatedAt", "weight", "width") SELECT "barcode", "createdAt", coalesce("height", 0) AS "height", "id", "maxStacking", "name", "productId", "quantity", "storageRequirements", "updatedAt", coalesce("weight", 0) AS "weight", coalesce("width", 0) AS "width" FROM "ProductPackaging";
DROP TABLE "ProductPackaging";
ALTER TABLE "new_ProductPackaging" RENAME TO "ProductPackaging";
CREATE TABLE "new_PutawayRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "productId" TEXT,
    "categoryId" TEXT,
    "velocityClass" TEXT,
    "abcClass" TEXT,
    "minPackagingSize" TEXT,
    "maxPackagingSize" TEXT,
    "minWeight" REAL,
    "maxWeight" REAL,
    "sourceLocationId" TEXT,
    "strategy" TEXT NOT NULL,
    "destinationLocationId" TEXT,
    "preferredZonePriorityMin" INTEGER,
    "preferredZonePriorityMax" INTEGER,
    "warehouseId" TEXT,
    "locationId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PutawayRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PutawayRule_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PutawayRule_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PutawayRule_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PutawayRule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PutawayRule" ("active", "categoryId", "id", "locationId", "priority", "productId", "sourceLocationId") SELECT "active", "categoryId", "id", "locationId", "priority", "productId", "sourceLocationId" FROM "PutawayRule";
DROP TABLE "PutawayRule";
ALTER TABLE "new_PutawayRule" RENAME TO "PutawayRule";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PutawayRuleAttribute_putawayRuleId_attributeDefinitionId_key" ON "PutawayRuleAttribute"("putawayRuleId", "attributeDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_productId_attributeDefinitionId_key" ON "ProductAttribute"("productId", "attributeDefinitionId");
