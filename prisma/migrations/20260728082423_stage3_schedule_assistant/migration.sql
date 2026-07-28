-- CreateEnum
CREATE TYPE "ScheduleGenerationStatus" AS ENUM ('READY', 'APPLIED', 'DISCARDED', 'FAILED');

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "RateLimit" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "ScheduleSlot" ADD COLUMN     "generationId" UUID,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "Verification" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "twoFactor" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- CreateTable
CREATE TABLE "AvailabilityWindow" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "teacherId" UUID,
    "roomId" UUID,
    "groupId" UUID,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "preference" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulingRequirement" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "teacherId" UUID,
    "preferredRoomId" UUID,
    "lessonsPerWeek" INTEGER NOT NULL DEFAULT 2,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "allowedWeekdays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "preferredWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "earliestStartMinute" INTEGER NOT NULL DEFAULT 780,
    "latestEndMinute" INTEGER NOT NULL DEFAULT 1260,
    "preferredStartMinute" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleGeneration" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "weekStart" DATE NOT NULL,
    "status" "ScheduleGenerationStatus" NOT NULL DEFAULT 'READY',
    "score" INTEGER NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "ScheduleGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleProposalSlot" (
    "id" UUID NOT NULL,
    "generationId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "explanation" TEXT,

    CONSTRAINT "ScheduleProposalSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvailabilityWindow_schoolId_weekday_startMinute_endMinute_idx" ON "AvailabilityWindow"("schoolId", "weekday", "startMinute", "endMinute");

-- CreateIndex
CREATE INDEX "AvailabilityWindow_teacherId_weekday_idx" ON "AvailabilityWindow"("teacherId", "weekday");

-- CreateIndex
CREATE INDEX "AvailabilityWindow_roomId_weekday_idx" ON "AvailabilityWindow"("roomId", "weekday");

-- CreateIndex
CREATE INDEX "AvailabilityWindow_groupId_weekday_idx" ON "AvailabilityWindow"("groupId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "SchedulingRequirement_groupId_key" ON "SchedulingRequirement"("groupId");

-- CreateIndex
CREATE INDEX "SchedulingRequirement_schoolId_isActive_idx" ON "SchedulingRequirement"("schoolId", "isActive");

-- CreateIndex
CREATE INDEX "SchedulingRequirement_teacherId_idx" ON "SchedulingRequirement"("teacherId");

-- CreateIndex
CREATE INDEX "SchedulingRequirement_preferredRoomId_idx" ON "SchedulingRequirement"("preferredRoomId");

-- CreateIndex
CREATE INDEX "ScheduleGeneration_schoolId_weekStart_createdAt_idx" ON "ScheduleGeneration"("schoolId", "weekStart", "createdAt");

-- CreateIndex
CREATE INDEX "ScheduleGeneration_createdById_createdAt_idx" ON "ScheduleGeneration"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "ScheduleProposalSlot_generationId_startAt_idx" ON "ScheduleProposalSlot"("generationId", "startAt");

-- CreateIndex
CREATE INDEX "ScheduleProposalSlot_groupId_startAt_endAt_idx" ON "ScheduleProposalSlot"("groupId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "ScheduleProposalSlot_roomId_startAt_endAt_idx" ON "ScheduleProposalSlot"("roomId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "ScheduleProposalSlot_teacherId_startAt_endAt_idx" ON "ScheduleProposalSlot"("teacherId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "ScheduleSlot_generationId_idx" ON "ScheduleSlot"("generationId");

-- AddForeignKey
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "ScheduleGeneration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityWindow" ADD CONSTRAINT "AvailabilityWindow_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityWindow" ADD CONSTRAINT "AvailabilityWindow_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityWindow" ADD CONSTRAINT "AvailabilityWindow_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityWindow" ADD CONSTRAINT "AvailabilityWindow_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourseGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingRequirement" ADD CONSTRAINT "SchedulingRequirement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingRequirement" ADD CONSTRAINT "SchedulingRequirement_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourseGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingRequirement" ADD CONSTRAINT "SchedulingRequirement_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingRequirement" ADD CONSTRAINT "SchedulingRequirement_preferredRoomId_fkey" FOREIGN KEY ("preferredRoomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleGeneration" ADD CONSTRAINT "ScheduleGeneration_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleGeneration" ADD CONSTRAINT "ScheduleGeneration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleProposalSlot" ADD CONSTRAINT "ScheduleProposalSlot_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "ScheduleGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleProposalSlot" ADD CONSTRAINT "ScheduleProposalSlot_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourseGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleProposalSlot" ADD CONSTRAINT "ScheduleProposalSlot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleProposalSlot" ADD CONSTRAINT "ScheduleProposalSlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
