CREATE TYPE "ContractAcceptanceMode" AS ENUM ('DOCUMENTARY', 'EXTERNAL_SIGNATURE');

ALTER TABLE "Contract"
  ADD COLUMN "acceptanceMode" "ContractAcceptanceMode" NOT NULL DEFAULT 'DOCUMENTARY',
  ADD COLUMN "serviceSummary" TEXT,
  ADD COLUMN "requiresPayment" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "paymentSummary" TEXT;

UPDATE "Contract"
SET
  "serviceSummary" = 'Zajęcia języka angielskiego na warunkach opisanych w dokumencie PDF.',
  "paymentSummary" = 'Zgodnie z warunkami opisanymi w dokumencie PDF.'
WHERE "serviceSummary" IS NULL;

ALTER TABLE "Contract"
  ALTER COLUMN "serviceSummary" SET NOT NULL;
