/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Link` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "_CategoryToLink" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CategoryToLink_A_fkey" FOREIGN KEY ("A") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CategoryToLink_B_fkey" FOREIGN KEY ("B") REFERENCES "Link" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Preserve existing single-category assignments as the first (only) entry
-- in the new many-to-many join table, before the old categoryId column is
-- dropped below.
INSERT INTO "_CategoryToLink" ("A", "B") SELECT "categoryId", "id" FROM "Link" WHERE "categoryId" IS NOT NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Link" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Link" ("createdAt", "extractedAt", "extractionError", "extractionStatus", "id", "keyPoints", "language", "llmError", "llmStatus", "manualText", "rawContent", "sourceType", "summary", "tags", "title", "updatedAt", "url") SELECT "createdAt", "extractedAt", "extractionError", "extractionStatus", "id", "keyPoints", "language", "llmError", "llmStatus", "manualText", "rawContent", "sourceType", "summary", "tags", "title", "updatedAt", "url" FROM "Link";
DROP TABLE "Link";
ALTER TABLE "new_Link" RENAME TO "Link";
CREATE UNIQUE INDEX "Link_url_key" ON "Link"("url");
CREATE INDEX "Link_extractionStatus_idx" ON "Link"("extractionStatus");
CREATE INDEX "Link_llmStatus_idx" ON "Link"("llmStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_CategoryToLink_AB_unique" ON "_CategoryToLink"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoryToLink_B_index" ON "_CategoryToLink"("B");
