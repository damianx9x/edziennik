-- Informacje konsumenckie widoczne bezpośrednio przed zawarciem umowy.
-- Pola należą do wersji dokumentu, aby późniejsza zmiana nie zmieniła dowodu.
ALTER TABLE "ContractVersion"
  ADD COLUMN "serviceStartDate" DATE,
  ADD COLUMN "serviceEndDate" DATE,
  ADD COLUMN "cancellationSummary" TEXT,
  ADD COLUMN "requiresEarlyStartRequest" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "ContractVersion_serviceStartDate_serviceEndDate_idx"
  ON "ContractVersion"("serviceStartDate", "serviceEndDate");
