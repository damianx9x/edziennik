-- Public product traffic belongs to the platform, not to a school's tenant.
-- Authenticated and school-presentation visits keep their school relation.
ALTER TABLE "PageVisit" ALTER COLUMN "schoolId" DROP NOT NULL;
