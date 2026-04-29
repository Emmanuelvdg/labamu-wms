-- CreateTable
CREATE TABLE "AdvancedShippingNotice" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "estimatedArrival" TIMESTAMP(3) NOT NULL,
    "trackingNumber" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvancedShippingNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsnItem" (
    "id" TEXT NOT NULL,
    "asnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "AsnItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AdvancedShippingNotice" ADD CONSTRAINT "AdvancedShippingNotice_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsnItem" ADD CONSTRAINT "AsnItem_asnId_fkey" FOREIGN KEY ("asnId") REFERENCES "AdvancedShippingNotice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsnItem" ADD CONSTRAINT "AsnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
