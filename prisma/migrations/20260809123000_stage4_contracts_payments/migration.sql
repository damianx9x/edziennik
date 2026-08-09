CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'EXPIRED');
CREATE TYPE "PaymentStatus" AS ENUM ('UNSET', 'PENDING', 'PAID', 'OVERDUE');

CREATE TABLE "Contract" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractVersion" (
  "id" UUID NOT NULL,
  "contractId" UUID NOT NULL,
  "storedFileId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractAssignment" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "contractId" UUID NOT NULL,
  "versionId" UUID NOT NULL,
  "parentId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "status" "ContractStatus" NOT NULL DEFAULT 'SENT',
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "viewedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractAcceptance" (
  "id" UUID NOT NULL,
  "assignmentId" UUID NOT NULL,
  "acceptedById" UUID NOT NULL,
  "documentHash" CHAR(64) NOT NULL,
  "evidence" JSONB NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentRecord" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "changedById" UUID NOT NULL,
  "period" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'UNSET',
  "dueDate" DATE,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Contract_schoolId_createdAt_idx" ON "Contract"("schoolId", "createdAt");
CREATE INDEX "Contract_schoolId_archivedAt_idx" ON "Contract"("schoolId", "archivedAt");
CREATE UNIQUE INDEX "ContractVersion_contractId_version_key" ON "ContractVersion"("contractId", "version");
CREATE INDEX "ContractVersion_storedFileId_idx" ON "ContractVersion"("storedFileId");
CREATE INDEX "ContractVersion_createdById_createdAt_idx" ON "ContractVersion"("createdById", "createdAt");
CREATE UNIQUE INDEX "ContractAssignment_versionId_parentId_studentId_key" ON "ContractAssignment"("versionId", "parentId", "studentId");
CREATE INDEX "ContractAssignment_schoolId_status_createdAt_idx" ON "ContractAssignment"("schoolId", "status", "createdAt");
CREATE INDEX "ContractAssignment_parentId_status_createdAt_idx" ON "ContractAssignment"("parentId", "status", "createdAt");
CREATE INDEX "ContractAssignment_studentId_createdAt_idx" ON "ContractAssignment"("studentId", "createdAt");
CREATE UNIQUE INDEX "ContractAcceptance_assignmentId_key" ON "ContractAcceptance"("assignmentId");
CREATE INDEX "ContractAcceptance_acceptedById_acceptedAt_idx" ON "ContractAcceptance"("acceptedById", "acceptedAt");
CREATE UNIQUE INDEX "PaymentRecord_schoolId_studentId_period_key" ON "PaymentRecord"("schoolId", "studentId", "period");
CREATE INDEX "PaymentRecord_schoolId_status_dueDate_idx" ON "PaymentRecord"("schoolId", "status", "dueDate");
CREATE INDEX "PaymentRecord_studentId_period_idx" ON "PaymentRecord"("studentId", "period");

ALTER TABLE "Contract" ADD CONSTRAINT "Contract_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractVersion" ADD CONSTRAINT "ContractVersion_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractVersion" ADD CONSTRAINT "ContractVersion_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractVersion" ADD CONSTRAINT "ContractVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractAssignment" ADD CONSTRAINT "ContractAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractAssignment" ADD CONSTRAINT "ContractAssignment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractAssignment" ADD CONSTRAINT "ContractAssignment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ContractVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractAssignment" ADD CONSTRAINT "ContractAssignment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractAssignment" ADD CONSTRAINT "ContractAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractAcceptance" ADD CONSTRAINT "ContractAcceptance_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ContractAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractAcceptance" ADD CONSTRAINT "ContractAcceptance_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
