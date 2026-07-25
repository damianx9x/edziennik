-- CreateEnum
CREATE TYPE "StoredFilePurpose" AS ENUM (
  'IMPORT_SOURCE',
  'PROFILE_ATTACHMENT',
  'SITE_IMAGE',
  'CONTRACT',
  'LEARNING_MATERIAL',
  'HOMEWORK_SUBMISSION',
  'FEEDBACK_SCREENSHOT'
);

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM (
  'PREVIEW_READY',
  'COMMITTED',
  'FAILED',
  'ARCHIVED'
);

-- Extend existing records with stable import identifiers and archival metadata.
ALTER TABLE "User" ADD COLUMN "externalId" TEXT;
ALTER TABLE "GroupTeacher" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "ParentChild" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StoredFile" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "uploadedById" UUID NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "purpose" "StoredFilePurpose" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),

  CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "sourceFileId" UUID NOT NULL,
  "status" "ImportStatus" NOT NULL DEFAULT 'PREVIEW_READY',
  "totalRows" INTEGER NOT NULL,
  "validRows" INTEGER NOT NULL,
  "errorRows" INTEGER NOT NULL,
  "duplicateRows" INTEGER NOT NULL,
  "errorSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "committedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),

  CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_storageKey_key"
ON "StoredFile"("storageKey");

CREATE INDEX "StoredFile_schoolId_purpose_createdAt_idx"
ON "StoredFile"("schoolId", "purpose", "createdAt");

CREATE INDEX "StoredFile_uploadedById_createdAt_idx"
ON "StoredFile"("uploadedById", "createdAt");

CREATE INDEX "StoredFile_archivedAt_idx"
ON "StoredFile"("archivedAt");

CREATE INDEX "ImportBatch_schoolId_status_createdAt_idx"
ON "ImportBatch"("schoolId", "status", "createdAt");

CREATE INDEX "ImportBatch_createdById_createdAt_idx"
ON "ImportBatch"("createdById", "createdAt");

CREATE INDEX "ImportBatch_sourceFileId_idx"
ON "ImportBatch"("sourceFileId");

CREATE INDEX "GroupTeacher_archivedAt_idx"
ON "GroupTeacher"("archivedAt");

CREATE INDEX "ParentChild_schoolId_archivedAt_idx"
ON "ParentChild"("schoolId", "archivedAt");

CREATE UNIQUE INDEX "User_schoolId_externalId_key"
ON "User"("schoolId", "externalId");

-- AddForeignKey
ALTER TABLE "StoredFile"
ADD CONSTRAINT "StoredFile_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StoredFile"
ADD CONSTRAINT "StoredFile_uploadedById_fkey"
FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ImportBatch"
ADD CONSTRAINT "ImportBatch_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ImportBatch"
ADD CONSTRAINT "ImportBatch_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ImportBatch"
ADD CONSTRAINT "ImportBatch_sourceFileId_fkey"
FOREIGN KEY ("sourceFileId") REFERENCES "StoredFile"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
