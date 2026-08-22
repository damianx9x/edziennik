CREATE TYPE "ContractDocumentKind" AS ENUM ('AGREEMENT_RODO', 'PRICE_LIST', 'SCHEDULE', 'OTHER');

ALTER TABLE "ContractVersion"
ADD COLUMN "installmentCount" INTEGER,
ADD COLUMN "installmentAmountCents" INTEGER,
ADD COLUMN "totalAmountCents" INTEGER;

-- The new columns above are nullable for backward compatibility with every
-- contract version created before document packages and installment plans.
-- Existing records remain readable and do not need a blocking backfill during
-- deployment. The following tables are new structures, so their required
-- columns do not alter or constrain any existing row in the production tables.

CREATE TABLE "ContractDocument" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "versionId" UUID NOT NULL,
  "storedFileId" UUID NOT NULL,
  "kind" "ContractDocumentKind" NOT NULL,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "requiredForAcceptance" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentInstallment" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "assignmentId" UUID NOT NULL,
  "changedById" UUID NOT NULL,
  "installmentNumber" INTEGER NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "dueDate" DATE NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'UNSET',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentInstallment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContractDocument_versionId_kind_key" ON "ContractDocument"("versionId", "kind");
CREATE INDEX "ContractDocument_schoolId_createdAt_idx" ON "ContractDocument"("schoolId", "createdAt");
CREATE INDEX "ContractDocument_storedFileId_idx" ON "ContractDocument"("storedFileId");
CREATE UNIQUE INDEX "PaymentInstallment_assignmentId_installmentNumber_key" ON "PaymentInstallment"("assignmentId", "installmentNumber");
CREATE INDEX "PaymentInstallment_schoolId_status_dueDate_idx" ON "PaymentInstallment"("schoolId", "status", "dueDate");

ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ContractVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ContractAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
