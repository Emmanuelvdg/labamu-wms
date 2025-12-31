-- Make sessionId nullable in PutawayTask table
PRAGMA foreign_keys=OFF;

-- Create new table with nullable sessionId
CREATE TABLE "PutawayTask_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT,
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
    "requiresSupervisorReview" BOOLEAN NOT NULL DEFAULT 0,
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

-- Copy data from old table
INSERT INTO "PutawayTask_new" SELECT * FROM "PutawayTask";

-- Drop old table
DROP TABLE "PutawayTask";

-- Rename new table
ALTER TABLE "PutawayTask_new" RENAME TO "PutawayTask";

PRAGMA foreign_keys=ON;
