-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SquareLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'square',
    "name" TEXT NOT NULL,
    "status" TEXT,
    "address" TEXT,
    "timezone" TEXT,
    "currency" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'square',
    "name" TEXT NOT NULL,
    "version" TEXT,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'square',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "categoryId" TEXT,
    "imageUrl" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "absentFromSquare" BOOLEAN NOT NULL DEFAULT false,
    "productType" TEXT,
    "version" TEXT,
    "squareUpdatedAt" DATETIME,
    "rawJson" TEXT NOT NULL DEFAULT '{}',
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatalogItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Variation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'square',
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "gtin" TEXT,
    "priceAmount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "pricingType" TEXT NOT NULL DEFAULT 'FIXED_PRICING',
    "trackInventory" BOOLEAN NOT NULL DEFAULT false,
    "sellable" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "absentFromSquare" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT,
    "ordinal" INTEGER NOT NULL DEFAULT 0,
    "squareUpdatedAt" DATETIME,
    "rawJson" TEXT NOT NULL DEFAULT '{}',
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Variation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryCount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "quantity" TEXT NOT NULL,
    "calculatedAt" DATETIME,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryCount_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "SquareLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabelProfile" (
    "variationId" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT,
    "customText" TEXT,
    "material" TEXT,
    "details" TEXT,
    "showPrice" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "barcodeValue" TEXT,
    "barcodeFormat" TEXT NOT NULL DEFAULT 'code128',
    "barcodeSource" TEXT,
    "labelsPrinted" INTEGER NOT NULL DEFAULT 0,
    "lastPrintedAt" DATETIME,
    "lastPrintedPrice" INTEGER,
    "needsReprint" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LabelProfile_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabelTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "widthMm" REAL NOT NULL,
    "heightMm" REAL NOT NULL,
    "marginMm" REAL NOT NULL DEFAULT 1.5,
    "elements" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PrinterPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL DEFAULT 'DYMO',
    "model" TEXT NOT NULL DEFAULT 'LabelWriter 450 Turbo',
    "widthMm" REAL NOT NULL,
    "heightMm" REAL NOT NULL,
    "orientation" TEXT NOT NULL DEFAULT 'landscape',
    "partNumber" TEXT,
    "density" TEXT NOT NULL DEFAULT 'barcode',
    "offsetXMm" REAL NOT NULL DEFAULT 0,
    "offsetYMm" REAL NOT NULL DEFAULT 0,
    "scale" REAL NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PrintJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT,
    "presetId" TEXT,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'prepared',
    "totalLabels" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PrintJobItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "encodedValue" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    CONSTRAINT "PrintJobItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PrintJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BarcodeTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variationId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "identifierField" TEXT NOT NULL,
    "encodedValue" TEXT NOT NULL,
    "printedAt" DATETIME,
    "result" TEXT NOT NULL DEFAULT 'pending',
    "priceMatched" BOOLEAN,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BarcodeTest_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "itemsSeen" INTEGER NOT NULL DEFAULT 0,
    "variationsSeen" INTEGER NOT NULL DEFAULT 0,
    "conflicts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "details" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "eventId" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    "error" TEXT
);

-- CreateTable
CREATE TABLE "PricePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "rules" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PriceDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variationId" TEXT NOT NULL,
    "baselineAmount" INTEGER NOT NULL,
    "proposedAmount" INTEGER NOT NULL,
    "planName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PriceDraft_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variationId" TEXT NOT NULL,
    "oldAmount" INTEGER,
    "newAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "planName" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceChange_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "fromState" TEXT,
    "toState" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockAdjustment_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LowStockThreshold" (
    "variationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,

    PRIMARY KEY ("variationId", "locationId")
);

-- CreateIndex
CREATE INDEX "CatalogItem_source_idx" ON "CatalogItem"("source");

-- CreateIndex
CREATE INDEX "CatalogItem_categoryId_idx" ON "CatalogItem"("categoryId");

-- CreateIndex
CREATE INDEX "Variation_itemId_idx" ON "Variation"("itemId");

-- CreateIndex
CREATE INDEX "Variation_sku_idx" ON "Variation"("sku");

-- CreateIndex
CREATE INDEX "Variation_source_idx" ON "Variation"("source");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCount_variationId_locationId_state_key" ON "InventoryCount"("variationId", "locationId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "LabelProfile_barcodeValue_key" ON "LabelProfile"("barcodeValue");

-- CreateIndex
CREATE INDEX "PriceDraft_variationId_idx" ON "PriceDraft"("variationId");

-- CreateIndex
CREATE UNIQUE INDEX "StockAdjustment_idempotencyKey_key" ON "StockAdjustment"("idempotencyKey");
