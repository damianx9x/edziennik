ALTER TABLE "PageVisit"
  ADD COLUMN "countryCode" VARCHAR(2),
  ADD COLUMN "regionCode" VARCHAR(12),
  ADD COLUMN "regionName" VARCHAR(80),
  ADD COLUMN "clientHash" VARCHAR(16),
  ADD COLUMN "deviceFamily" VARCHAR(20),
  ADD COLUMN "browserFamily" VARCHAR(20);

CREATE INDEX "PageVisit_schoolId_countryCode_regionCode_visitedAt_idx"
  ON "PageVisit"("schoolId", "countryCode", "regionCode", "visitedAt");

CREATE INDEX "PageVisit_schoolId_clientHash_visitedAt_idx"
  ON "PageVisit"("schoolId", "clientHash", "visitedAt");
