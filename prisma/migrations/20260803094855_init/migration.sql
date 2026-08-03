-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "title" TEXT,
    "manualText" TEXT,
    "extractionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "extractionError" TEXT,
    "rawContent" TEXT,
    "extractedAt" DATETIME,
    "llmStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "llmError" TEXT,
    "summary" TEXT,
    "keyPoints" TEXT,
    "tags" TEXT,
    "language" TEXT,
    "categoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Link_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isSeeded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Link_url_key" ON "Link"("url");

-- CreateIndex
CREATE INDEX "Link_extractionStatus_idx" ON "Link"("extractionStatus");

-- CreateIndex
CREATE INDEX "Link_llmStatus_idx" ON "Link"("llmStatus");

-- CreateIndex
CREATE INDEX "Link_categoryId_idx" ON "Link"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
