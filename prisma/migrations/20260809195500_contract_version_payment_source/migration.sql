-- Warunki zaakceptowane przez rodzica należą do konkretnej wersji PDF.
ALTER TABLE "ContractVersion"
  ADD COLUMN "acceptanceMode" "ContractAcceptanceMode" NOT NULL DEFAULT 'DOCUMENTARY',
  ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "serviceSummary" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "requiresPayment" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "paymentSummary" TEXT,
  ADD COLUMN "paymentAmountCents" INTEGER,
  ADD COLUMN "paymentLabel" TEXT,
  ADD COLUMN "paymentDueDate" DATE;

UPDATE "ContractVersion" AS version
SET
  "title" = contract."title",
  "acceptanceMode" = contract."acceptanceMode",
  "serviceSummary" = contract."serviceSummary",
  "requiresPayment" = contract."requiresPayment",
  "paymentSummary" = contract."paymentSummary"
FROM "Contract" AS contract
WHERE version."contractId" = contract.id;

CREATE INDEX "ContractVersion_requiresPayment_paymentDueDate_idx"
  ON "ContractVersion"("requiresPayment", "paymentDueDate");

-- Płatność jest stanem administracyjnym konkretnej wysłanej umowy.
ALTER TABLE "PaymentRecord"
  ADD COLUMN "contractAssignmentId" UUID;

DROP INDEX IF EXISTS "PaymentRecord_schoolId_studentId_period_key";

CREATE UNIQUE INDEX "PaymentRecord_contractAssignmentId_key"
  ON "PaymentRecord"("contractAssignmentId");
CREATE INDEX "PaymentRecord_schoolId_contractAssignmentId_idx"
  ON "PaymentRecord"("schoolId", "contractAssignmentId");

ALTER TABLE "PaymentRecord"
  ADD CONSTRAINT "PaymentRecord_contractAssignmentId_fkey"
  FOREIGN KEY ("contractAssignmentId") REFERENCES "ContractAssignment"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
