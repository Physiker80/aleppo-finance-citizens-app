-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "citizenEmail" TEXT;

-- CreateTable
CREATE TABLE "TicketResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "authorEmployeeId" TEXT,
    "body" TEXT NOT NULL,
    "bodySanitized" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "redactionFlags" TEXT,
    CONSTRAINT "TicketResponse_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TicketResponse_authorEmployeeId_fkey" FOREIGN KEY ("authorEmployeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "ticketResponseId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,
    "storagePath" TEXT,
    CONSTRAINT "Attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Attachment_ticketResponseId_fkey" FOREIGN KEY ("ticketResponseId") REFERENCES "TicketResponse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Attachment" ("encrypted", "filename", "id", "mimeType", "sizeBytes", "ticketId", "uploadedAt", "uploadedById") SELECT "encrypted", "filename", "id", "mimeType", "sizeBytes", "ticketId", "uploadedAt", "uploadedById" FROM "Attachment";
DROP TABLE "Attachment";
ALTER TABLE "new_Attachment" RENAME TO "Attachment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TicketResponse_ticketId_createdAt_idx" ON "TicketResponse"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketResponse_authorEmployeeId_idx" ON "TicketResponse"("authorEmployeeId");
