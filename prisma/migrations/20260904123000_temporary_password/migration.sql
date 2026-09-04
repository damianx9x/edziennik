ALTER TABLE "User"
  ADD COLUMN "passwordChangeRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "temporaryPasswordExpiresAt" TIMESTAMP(3);

CREATE INDEX "User_passwordChangeRequired_idx"
  ON "User"("passwordChangeRequired")
  WHERE "passwordChangeRequired" = true;
