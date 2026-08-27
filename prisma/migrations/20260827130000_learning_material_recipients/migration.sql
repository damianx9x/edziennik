ALTER TABLE "LearningMaterial"
  ADD COLUMN "audience" TEXT NOT NULL DEFAULT 'GROUP';

ALTER TABLE "LearningMaterial"
  ADD CONSTRAINT "LearningMaterial_audience_check"
  CHECK ("audience" IN ('GROUP', 'STUDENTS', 'TEACHERS'));

CREATE TABLE "LearningMaterialRecipient" (
  "materialId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningMaterialRecipient_pkey" PRIMARY KEY ("materialId", "userId"),
  CONSTRAINT "LearningMaterialRecipient_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "LearningMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LearningMaterialRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LearningMaterialRecipient_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "LearningMaterialRecipient_schoolId_userId_idx" ON "LearningMaterialRecipient"("schoolId", "userId");
