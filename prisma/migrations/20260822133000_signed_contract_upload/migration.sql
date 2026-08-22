ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'SIGNED_PENDING_REVIEW' BEFORE 'ACCEPTED';

ALTER TABLE "ContractAssignment"
  ADD COLUMN "signedFileId" UUID,
  ADD COLUMN "signedUploadedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "ContractAssignment_signedFileId_key" ON "ContractAssignment"("signedFileId");
CREATE INDEX "ContractAssignment_signedFileId_idx" ON "ContractAssignment"("signedFileId");

ALTER TABLE "ContractAssignment"
  ADD CONSTRAINT "ContractAssignment_signedFileId_fkey"
  FOREIGN KEY ("signedFileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
