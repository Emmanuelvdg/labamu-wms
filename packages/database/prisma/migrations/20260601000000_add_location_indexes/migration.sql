-- AddIndex: Location.parentId and Location.warehouseId
-- These indexes improve hierarchical tree traversal performance in putaway routing

CREATE INDEX IF NOT EXISTS "Location_parentId_idx" ON "Location"("parentId");
CREATE INDEX IF NOT EXISTS "Location_warehouseId_idx" ON "Location"("warehouseId");
