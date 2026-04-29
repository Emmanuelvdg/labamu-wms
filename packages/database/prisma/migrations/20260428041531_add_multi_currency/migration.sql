-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "currencyCode" TEXT NOT NULL DEFAULT 'IDR';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "currencyCode" TEXT NOT NULL DEFAULT 'IDR';

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "currencyCode" TEXT NOT NULL DEFAULT 'IDR';

-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "fromCode" TEXT NOT NULL,
    "toCode" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- CreateIndex
CREATE INDEX "ExchangeRate_fromCode_idx" ON "ExchangeRate"("fromCode");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_fromCode_toCode_key" ON "ExchangeRate"("fromCode", "toCode");
