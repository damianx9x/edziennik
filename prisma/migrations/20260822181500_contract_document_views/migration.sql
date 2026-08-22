CREATE TABLE "ContractDocumentView" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "assignmentId" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "firstViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastViewedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContractDocumentView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContractDocumentView_assignmentId_documentId_userId_key" ON "ContractDocumentView"("assignmentId", "documentId", "userId");
CREATE INDEX "ContractDocumentView_schoolId_userId_lastViewedAt_idx" ON "ContractDocumentView"("schoolId", "userId", "lastViewedAt");

ALTER TABLE "ContractDocumentView" ADD CONSTRAINT "ContractDocumentView_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractDocumentView" ADD CONSTRAINT "ContractDocumentView_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ContractAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractDocumentView" ADD CONSTRAINT "ContractDocumentView_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ContractDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractDocumentView" ADD CONSTRAINT "ContractDocumentView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
