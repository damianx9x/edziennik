-- CreateEnum
CREATE TYPE "InvitationKind" AS ENUM ('EMAIL', 'ROLE_QR');

-- CreateEnum
CREATE TYPE "RecordEntityType" AS ENUM ('USER', 'ROOM', 'GROUP');

-- CreateEnum
CREATE TYPE "RecordChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "kind" "InvitationKind" NOT NULL DEFAULT 'EMAIL',
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RateLimit" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "Verification" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "twoFactor" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- CreateTable
CREATE TABLE "RecordChangeRequest" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "reviewedById" UUID,
    "entityType" "RecordEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "changedFields" TEXT[],
    "status" "RecordChangeStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "RecordChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecordChangeRequest_schoolId_status_createdAt_idx" ON "RecordChangeRequest"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RecordChangeRequest_schoolId_entityType_entityId_createdAt_idx" ON "RecordChangeRequest"("schoolId", "entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "RecordChangeRequest_requestedById_createdAt_idx" ON "RecordChangeRequest"("requestedById", "createdAt");

-- CreateIndex
CREATE INDEX "Invitation_schoolId_kind_acceptedAt_revokedAt_idx" ON "Invitation"("schoolId", "kind", "acceptedAt", "revokedAt");

-- AddForeignKey
ALTER TABLE "RecordChangeRequest" ADD CONSTRAINT "RecordChangeRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordChangeRequest" ADD CONSTRAINT "RecordChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordChangeRequest" ADD CONSTRAINT "RecordChangeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
