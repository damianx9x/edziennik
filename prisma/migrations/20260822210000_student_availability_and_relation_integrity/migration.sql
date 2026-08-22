-- Preferencje uczniów są osobną tabelą. Nie zmieniamy istniejącego kontraktu
-- okien sal, grup i wykładowców, więc aktualizacja pozostaje rozszerzająca.
CREATE TABLE "StudentAvailabilityWindow" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  "preference" INTEGER NOT NULL DEFAULT 10,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentAvailabilityWindow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentAvailabilityWindow_values_check" CHECK (
    "weekday" BETWEEN 1 AND 6
    AND "startMinute" BETWEEN 720 AND 1260
    AND "endMinute" BETWEEN 750 AND 1320
    AND "startMinute" < "endMinute"
    AND "preference" BETWEEN -100 AND 100
  )
);

ALTER TABLE "StudentAvailabilityWindow"
  ADD CONSTRAINT "StudentAvailabilityWindow_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentAvailabilityWindow"
  ADD CONSTRAINT "StudentAvailabilityWindow_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "StudentAvailabilityWindow_schoolId_weekday_startMinute_endMinute_idx"
  ON "StudentAvailabilityWindow"("schoolId", "weekday", "startMinute", "endMinute");

CREATE INDEX "StudentAvailabilityWindow_studentId_weekday_idx"
  ON "StudentAvailabilityWindow"("studentId", "weekday");
