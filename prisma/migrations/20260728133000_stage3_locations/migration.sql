CREATE TABLE "Location" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Location_schoolId_name_key" ON "Location"("schoolId", "name");
CREATE INDEX "Location_schoolId_isActive_idx" ON "Location"("schoolId", "isActive");

ALTER TABLE "Location"
ADD CONSTRAINT "Location_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Location" (
    "id",
    "schoolId",
    "name",
    "isOnline",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    "School"."id",
    'Główna lokalizacja',
    false,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "School";

ALTER TABLE "Room" ADD COLUMN "locationId" UUID;
ALTER TABLE "CourseGroup" ADD COLUMN "locationId" UUID;

UPDATE "Room"
SET "locationId" = "Location"."id"
FROM "Location"
WHERE "Location"."schoolId" = "Room"."schoolId"
  AND "Location"."name" = 'Główna lokalizacja';

UPDATE "CourseGroup"
SET "locationId" = "Location"."id"
FROM "Location"
WHERE "Location"."schoolId" = "CourseGroup"."schoolId"
  AND "Location"."name" = 'Główna lokalizacja';

ALTER TABLE "Room" ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "CourseGroup" ALTER COLUMN "locationId" SET NOT NULL;

CREATE INDEX "Room_locationId_isActive_idx" ON "Room"("locationId", "isActive");
CREATE INDEX "CourseGroup_locationId_isActive_idx" ON "CourseGroup"("locationId", "isActive");

ALTER TABLE "Room"
ADD CONSTRAINT "Room_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "Location"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CourseGroup"
ADD CONSTRAINT "CourseGroup_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "Location"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
