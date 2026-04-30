-- AlterTable
ALTER TABLE "ReplenishmentAlert" ADD COLUMN     "daysOfCover" DOUBLE PRECISION,
ADD COLUMN     "forecastedDemand" DOUBLE PRECISION,
ADD COLUMN     "suggestedOrderQty" INTEGER;

-- CreateTable
CREATE TABLE "DailySalesSummary" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "unitsSold" INTEGER NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DailySalesSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesForecast" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "forecastDate" DATE NOT NULL,
    "predictedQty" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'EXPONENTIAL_SMOOTHING',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastAccuracy" (
    "id" TEXT NOT NULL,
    "forecastId" TEXT NOT NULL,
    "actualQty" DOUBLE PRECISION NOT NULL,
    "mae" DOUBLE PRECISION NOT NULL,
    "mape" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastAccuracy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonalityProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SeasonalityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonalityPeriod" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startMD" TEXT NOT NULL,
    "endMD" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SeasonalityPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailySalesSummary_companyId_productId_date_idx" ON "DailySalesSummary"("companyId", "productId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailySalesSummary_companyId_productId_warehouseId_date_key" ON "DailySalesSummary"("companyId", "productId", "warehouseId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SalesForecast_companyId_productId_warehouseId_forecastDate_key" ON "SalesForecast"("companyId", "productId", "warehouseId", "forecastDate");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastAccuracy_forecastId_key" ON "ForecastAccuracy"("forecastId");

-- AddForeignKey
ALTER TABLE "ForecastAccuracy" ADD CONSTRAINT "ForecastAccuracy_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "SalesForecast"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonalityPeriod" ADD CONSTRAINT "SeasonalityPeriod_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SeasonalityProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
