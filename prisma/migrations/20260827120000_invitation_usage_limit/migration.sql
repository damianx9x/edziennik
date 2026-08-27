ALTER TABLE "Invitation"
  ADD COLUMN "maxUses" INTEGER DEFAULT 1,
  ADD COLUMN "useCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Invitation"
SET "useCount" = CASE WHEN "acceptedAt" IS NULL THEN 0 ELSE 1 END;

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_maxUses_check"
  CHECK ("maxUses" IS NULL OR "maxUses" >= 1),
  ADD CONSTRAINT "Invitation_useCount_check"
  CHECK ("useCount" >= 0);
