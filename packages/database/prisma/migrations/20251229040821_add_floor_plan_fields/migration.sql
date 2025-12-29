-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Warehouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "address" TEXT,
    "companyId" TEXT,
    "location" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "partnerId" TEXT,
    "viewLocationId" TEXT,
    "incomingSteps" TEXT,
    "outgoingSteps" TEXT,
    "dropshipSubcontractors" BOOLEAN NOT NULL DEFAULT false,
    "resupplySubcontractors" BOOLEAN NOT NULL DEFAULT false,
    "manufactureToResupply" BOOLEAN NOT NULL DEFAULT false,
    "manufactureSteps" TEXT,
    "buyToResupply" BOOLEAN NOT NULL DEFAULT false,
    "floorPlanShape" TEXT DEFAULT 'rectangle',
    "floorPlanVertices" TEXT,
    "floorPlanWidth" REAL DEFAULT 50.0,
    "floorPlanHeight" REAL DEFAULT 30.0,
    "gridEnabled" BOOLEAN NOT NULL DEFAULT true,
    "gridSize" REAL NOT NULL DEFAULT 1.0,
    "snapToGrid" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Warehouse_viewLocationId_fkey" FOREIGN KEY ("viewLocationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Warehouse" ("address", "buyToResupply", "companyId", "dropshipSubcontractors", "id", "incomingSteps", "location", "manufactureSteps", "manufactureToResupply", "name", "outgoingSteps", "partnerId", "resupplySubcontractors", "shortName", "type", "viewLocationId") SELECT "address", "buyToResupply", "companyId", "dropshipSubcontractors", "id", "incomingSteps", "location", "manufactureSteps", "manufactureToResupply", "name", "outgoingSteps", "partnerId", "resupplySubcontractors", "shortName", "type", "viewLocationId" FROM "Warehouse";
DROP TABLE "Warehouse";
ALTER TABLE "new_Warehouse" RENAME TO "Warehouse";
CREATE UNIQUE INDEX "Warehouse_viewLocationId_key" ON "Warehouse"("viewLocationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
