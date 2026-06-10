-- Migration: 20260609000000_add_companyid_tenant_isolation
-- Adds companyId column to all tables that need tenant isolation.
-- Backfills from related entities where possible, then creates indexes.

-- ─── 1. ADD COLUMNS ─────────────────────────────────────────────────────────

ALTER TABLE "Location"          ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "InventoryBatch"    ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "StockTransaction"  ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "Order"             ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "PurchaseOrder"     ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "Shipment"          ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "TransferOrder"     ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "Receipt"           ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "PickingSession"    ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "PutawaySession"    ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "PackingSession"    ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "StocktakeSession"  ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "WaveReleaseRule"   ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "ReorderingRule"    ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "RotationRule"      ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "WorkflowTemplate"  ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "WorkflowInstance"  ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- ─── 2. BACKFILL FROM RELATED ENTITIES ──────────────────────────────────────

-- Location → via Warehouse
UPDATE "Location" l
SET "companyId" = w."companyId"
FROM "Warehouse" w
WHERE l."warehouseId" = w.id
  AND w."companyId" IS NOT NULL
  AND l."companyId" IS NULL;

-- InventoryBatch → via Product
UPDATE "InventoryBatch" ib
SET "companyId" = p."companyId"
FROM "Product" p
WHERE ib."productId" = p.id
  AND p."companyId" IS NOT NULL
  AND ib."companyId" IS NULL;

-- StockTransaction → via Product
UPDATE "StockTransaction" st
SET "companyId" = p."companyId"
FROM "Product" p
WHERE st."productId" = p.id
  AND p."companyId" IS NOT NULL
  AND st."companyId" IS NULL;

-- Order → via Customer (most orders will have a customer)
UPDATE "Order" o
SET "companyId" = c."companyId"
FROM "Customer" c
WHERE o."customerId" = c.id
  AND c."companyId" IS NOT NULL
  AND o."companyId" IS NULL;

-- Order fallback → via Warehouse
UPDATE "Order" o
SET "companyId" = w."companyId"
FROM "Warehouse" w
WHERE o."warehouseId" = w.id
  AND w."companyId" IS NOT NULL
  AND o."companyId" IS NULL;

-- PurchaseOrder → via Supplier
UPDATE "PurchaseOrder" po
SET "companyId" = s."companyId"
FROM "Supplier" s
WHERE po."supplierId" = s.id
  AND s."companyId" IS NOT NULL
  AND po."companyId" IS NULL;

-- Shipment → via Order
UPDATE "Shipment" sh
SET "companyId" = o."companyId"
FROM "Order" o
WHERE sh."orderId" = o.id
  AND o."companyId" IS NOT NULL
  AND sh."companyId" IS NULL;

-- TransferOrder → via source Warehouse
UPDATE "TransferOrder" t
SET "companyId" = w."companyId"
FROM "Warehouse" w
WHERE t."sourceWarehouseId" = w.id
  AND w."companyId" IS NOT NULL
  AND t."companyId" IS NULL;

-- Receipt → via PurchaseOrder
UPDATE "Receipt" r
SET "companyId" = po."companyId"
FROM "PurchaseOrder" po
WHERE r."purchaseOrderId" = po.id
  AND po."companyId" IS NOT NULL
  AND r."companyId" IS NULL;

-- PickingSession → via Warehouse
UPDATE "PickingSession" ps
SET "companyId" = w."companyId"
FROM "Warehouse" w
WHERE ps."warehouseId" = w.id
  AND w."companyId" IS NOT NULL
  AND ps."companyId" IS NULL;

-- PutawaySession → via Warehouse
UPDATE "PutawaySession" pus
SET "companyId" = w."companyId"
FROM "Warehouse" w
WHERE pus."warehouseId" = w.id
  AND w."companyId" IS NOT NULL
  AND pus."companyId" IS NULL;

-- PackingSession → via Order
UPDATE "PackingSession" pks
SET "companyId" = o."companyId"
FROM "Order" o
WHERE pks."orderId" = o.id
  AND o."companyId" IS NOT NULL
  AND pks."companyId" IS NULL;

-- StocktakeSession → via Warehouse
UPDATE "StocktakeSession" ss
SET "companyId" = w."companyId"
FROM "Warehouse" w
WHERE ss."warehouseId" = w.id
  AND w."companyId" IS NOT NULL
  AND ss."companyId" IS NULL;

-- WaveReleaseRule → via Warehouse
UPDATE "WaveReleaseRule" wrr
SET "companyId" = w."companyId"
FROM "Warehouse" w
WHERE wrr."warehouseId" = w.id
  AND w."companyId" IS NOT NULL
  AND wrr."companyId" IS NULL;

-- ReorderingRule → via Product
UPDATE "ReorderingRule" rr
SET "companyId" = p."companyId"
FROM "Product" p
WHERE rr."productId" = p.id
  AND p."companyId" IS NOT NULL
  AND rr."companyId" IS NULL;

-- RotationRule → via Warehouse (primary owner) or Product as fallback
UPDATE "RotationRule" rot
SET "companyId" = w."companyId"
FROM "Warehouse" w
WHERE rot."warehouseId" = w.id
  AND w."companyId" IS NOT NULL
  AND rot."companyId" IS NULL;

UPDATE "RotationRule" rot
SET "companyId" = p."companyId"
FROM "Product" p
WHERE rot."productId" = p.id
  AND p."companyId" IS NOT NULL
  AND rot."companyId" IS NULL;

-- WorkflowTemplate → via Warehouse if set
UPDATE "WorkflowTemplate" wt
SET "companyId" = w."companyId"
FROM "Warehouse" w
WHERE wt."warehouseId" = w.id
  AND w."companyId" IS NOT NULL
  AND wt."companyId" IS NULL;

-- WorkflowInstance → via WorkflowTemplate
UPDATE "WorkflowInstance" wi
SET "companyId" = t."companyId"
FROM "WorkflowTemplate" t
WHERE wi."templateId" = t.id
  AND t."companyId" IS NOT NULL
  AND wi."companyId" IS NULL;

-- ─── 3. CREATE INDEXES ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "Location_companyId_idx"         ON "Location"("companyId");
CREATE INDEX IF NOT EXISTS "InventoryBatch_companyId_idx"   ON "InventoryBatch"("companyId");
CREATE INDEX IF NOT EXISTS "StockTransaction_companyId_idx" ON "StockTransaction"("companyId");
CREATE INDEX IF NOT EXISTS "Order_companyId_idx"            ON "Order"("companyId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_companyId_idx"    ON "PurchaseOrder"("companyId");
CREATE INDEX IF NOT EXISTS "Shipment_companyId_idx"         ON "Shipment"("companyId");
CREATE INDEX IF NOT EXISTS "TransferOrder_companyId_idx"    ON "TransferOrder"("companyId");
CREATE INDEX IF NOT EXISTS "Receipt_companyId_idx"          ON "Receipt"("companyId");
CREATE INDEX IF NOT EXISTS "PickingSession_companyId_idx"   ON "PickingSession"("companyId");
CREATE INDEX IF NOT EXISTS "PutawaySession_companyId_idx"   ON "PutawaySession"("companyId");
CREATE INDEX IF NOT EXISTS "PackingSession_companyId_idx"   ON "PackingSession"("companyId");
CREATE INDEX IF NOT EXISTS "StocktakeSession_companyId_idx" ON "StocktakeSession"("companyId");
CREATE INDEX IF NOT EXISTS "WaveReleaseRule_companyId_idx"  ON "WaveReleaseRule"("companyId");
CREATE INDEX IF NOT EXISTS "ReorderingRule_companyId_idx"   ON "ReorderingRule"("companyId");
CREATE INDEX IF NOT EXISTS "RotationRule_companyId_idx"     ON "RotationRule"("companyId");
CREATE INDEX IF NOT EXISTS "WorkflowTemplate_companyId_idx" ON "WorkflowTemplate"("companyId");
CREATE INDEX IF NOT EXISTS "WorkflowInstance_companyId_idx"  ON "WorkflowInstance"("companyId");
