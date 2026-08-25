-- Etap 6 jest migracją rozszerzającą: nie usuwa ani nie zmienia znaczenia
-- istniejących kolumn. Nowe relacje są opcjonalne tam, gdzie dotyczą starych danych.
CREATE TYPE "HomeworkSubmissionStatus" AS ENUM (
  'NOT_OPENED', 'OPENED', 'SUBMITTED', 'LATE', 'REVIEWED'
);

CREATE TYPE "ScheduleChangeRequestStatus" AS ENUM (
  'PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'
);

CREATE TYPE "ScheduleChangeRequestKind" AS ENUM (
  'RESCHEDULE', 'CHANGE_TEACHER', 'CHANGE_ROOM', 'CANCEL', 'OTHER'
);

ALTER TABLE "AvailabilityWindow" ADD COLUMN "locationId" UUID;
ALTER TABLE "AvailabilityWindow"
  ADD CONSTRAINT "AvailabilityWindow_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "AvailabilityWindow_locationId_weekday_idx"
  ON "AvailabilityWindow"("locationId", "weekday");

ALTER TABLE "Conversation" ADD COLUMN "directKey" TEXT;
CREATE UNIQUE INDEX "Conversation_directKey_key" ON "Conversation"("directKey");

CREATE TABLE "LessonCancellation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "scheduleSlotId" UUID NOT NULL,
  "cancelledById" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "notifyGroup" BOOLEAN NOT NULL DEFAULT true,
  "cancelledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonCancellation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LessonCancellation_reason_check" CHECK (char_length("reason") BETWEEN 5 AND 500)
);
CREATE UNIQUE INDEX "LessonCancellation_scheduleSlotId_key"
  ON "LessonCancellation"("scheduleSlotId");
CREATE INDEX "LessonCancellation_schoolId_cancelledAt_idx"
  ON "LessonCancellation"("schoolId", "cancelledAt");
CREATE INDEX "LessonCancellation_cancelledById_cancelledAt_idx"
  ON "LessonCancellation"("cancelledById", "cancelledAt");
ALTER TABLE "LessonCancellation"
  ADD CONSTRAINT "LessonCancellation_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonCancellation"
  ADD CONSTRAINT "LessonCancellation_scheduleSlotId_fkey"
  FOREIGN KEY ("scheduleSlotId") REFERENCES "ScheduleSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonCancellation"
  ADD CONSTRAINT "LessonCancellation_cancelledById_fkey"
  FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ScheduleChangeRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "scheduleSlotId" UUID NOT NULL,
  "requestedById" UUID NOT NULL,
  "reviewedById" UUID,
  "kind" "ScheduleChangeRequestKind" NOT NULL,
  "status" "ScheduleChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "proposedStartAt" TIMESTAMP(3),
  "proposedEndAt" TIMESTAMP(3),
  "proposedTeacherId" UUID,
  "proposedRoomId" UUID,
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduleChangeRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScheduleChangeRequest_reason_check" CHECK (char_length("reason") BETWEEN 5 AND 1000),
  CONSTRAINT "ScheduleChangeRequest_time_check" CHECK (
    "proposedStartAt" IS NULL OR "proposedEndAt" IS NULL OR "proposedStartAt" < "proposedEndAt"
  )
);
CREATE INDEX "ScheduleChangeRequest_schoolId_status_createdAt_idx"
  ON "ScheduleChangeRequest"("schoolId", "status", "createdAt");
CREATE INDEX "ScheduleChangeRequest_scheduleSlotId_status_idx"
  ON "ScheduleChangeRequest"("scheduleSlotId", "status");
CREATE INDEX "ScheduleChangeRequest_requestedById_createdAt_idx"
  ON "ScheduleChangeRequest"("requestedById", "createdAt");
CREATE INDEX "ScheduleChangeRequest_proposedTeacherId_idx"
  ON "ScheduleChangeRequest"("proposedTeacherId");
CREATE INDEX "ScheduleChangeRequest_proposedRoomId_idx"
  ON "ScheduleChangeRequest"("proposedRoomId");
ALTER TABLE "ScheduleChangeRequest"
  ADD CONSTRAINT "ScheduleChangeRequest_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleChangeRequest"
  ADD CONSTRAINT "ScheduleChangeRequest_scheduleSlotId_fkey"
  FOREIGN KEY ("scheduleSlotId") REFERENCES "ScheduleSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleChangeRequest"
  ADD CONSTRAINT "ScheduleChangeRequest_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleChangeRequest"
  ADD CONSTRAINT "ScheduleChangeRequest_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleChangeRequest"
  ADD CONSTRAINT "ScheduleChangeRequest_proposedTeacherId_fkey"
  FOREIGN KEY ("proposedTeacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleChangeRequest"
  ADD CONSTRAINT "ScheduleChangeRequest_proposedRoomId_fkey"
  FOREIGN KEY ("proposedRoomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LocationTravelRule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "fromLocationId" UUID NOT NULL,
  "toLocationId" UUID NOT NULL,
  "minutes" INTEGER NOT NULL,
  "note" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LocationTravelRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LocationTravelRule_values_check" CHECK (
    "fromLocationId" <> "toLocationId" AND "minutes" BETWEEN 0 AND 240
  )
);
CREATE UNIQUE INDEX "LocationTravelRule_schoolId_fromLocationId_toLocationId_key"
  ON "LocationTravelRule"("schoolId", "fromLocationId", "toLocationId");
CREATE INDEX "LocationTravelRule_schoolId_isActive_idx"
  ON "LocationTravelRule"("schoolId", "isActive");
CREATE INDEX "LocationTravelRule_fromLocationId_toLocationId_idx"
  ON "LocationTravelRule"("fromLocationId", "toLocationId");
ALTER TABLE "LocationTravelRule"
  ADD CONSTRAINT "LocationTravelRule_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LocationTravelRule"
  ADD CONSTRAINT "LocationTravelRule_fromLocationId_fkey"
  FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LocationTravelRule"
  ADD CONSTRAINT "LocationTravelRule_toLocationId_fkey"
  FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LearningMaterial" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "groupId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "storedFileId" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "externalUrl" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "LearningMaterial_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningMaterial_source_check" CHECK (
    ("storedFileId" IS NOT NULL)::int + ("externalUrl" IS NOT NULL)::int = 1
  )
);
CREATE INDEX "LearningMaterial_schoolId_publishedAt_idx" ON "LearningMaterial"("schoolId", "publishedAt");
CREATE INDEX "LearningMaterial_groupId_archivedAt_publishedAt_idx" ON "LearningMaterial"("groupId", "archivedAt", "publishedAt");
CREATE INDEX "LearningMaterial_createdById_createdAt_idx" ON "LearningMaterial"("createdById", "createdAt");
ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourseGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "HomeworkAssignment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "groupId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "HomeworkAssignment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HomeworkAssignment_schoolId_publishedAt_idx" ON "HomeworkAssignment"("schoolId", "publishedAt");
CREATE INDEX "HomeworkAssignment_groupId_archivedAt_dueAt_idx" ON "HomeworkAssignment"("groupId", "archivedAt", "dueAt");
CREATE INDEX "HomeworkAssignment_createdById_createdAt_idx" ON "HomeworkAssignment"("createdById", "createdAt");
ALTER TABLE "HomeworkAssignment" ADD CONSTRAINT "HomeworkAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HomeworkAssignment" ADD CONSTRAINT "HomeworkAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourseGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HomeworkAssignment" ADD CONSTRAINT "HomeworkAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "HomeworkSubmission" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "assignmentId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "reviewedById" UUID,
  "storedFileId" UUID,
  "status" "HomeworkSubmissionStatus" NOT NULL DEFAULT 'NOT_OPENED',
  "studentNote" TEXT,
  "teacherFeedback" TEXT,
  "openedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomeworkSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HomeworkSubmission_assignmentId_studentId_key" ON "HomeworkSubmission"("assignmentId", "studentId");
CREATE INDEX "HomeworkSubmission_schoolId_status_updatedAt_idx" ON "HomeworkSubmission"("schoolId", "status", "updatedAt");
CREATE INDEX "HomeworkSubmission_studentId_status_updatedAt_idx" ON "HomeworkSubmission"("studentId", "status", "updatedAt");
CREATE INDEX "HomeworkSubmission_reviewedById_reviewedAt_idx" ON "HomeworkSubmission"("reviewedById", "reviewedAt");
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "HomeworkAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StudentProgressObservation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "recordedById" UUID NOT NULL,
  "scheduleSlotId" UUID,
  "speaking" INTEGER NOT NULL,
  "listening" INTEGER NOT NULL,
  "reading" INTEGER NOT NULL,
  "writing" INTEGER NOT NULL,
  "vocabulary" INTEGER NOT NULL,
  "grammar" INTEGER NOT NULL,
  "engagement" INTEGER,
  "note" TEXT,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentProgressObservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentProgressObservation_scores_check" CHECK (
    "speaking" BETWEEN 1 AND 5 AND "listening" BETWEEN 1 AND 5
    AND "reading" BETWEEN 1 AND 5 AND "writing" BETWEEN 1 AND 5
    AND "vocabulary" BETWEEN 1 AND 5 AND "grammar" BETWEEN 1 AND 5
    AND ("engagement" IS NULL OR "engagement" BETWEEN 1 AND 5)
  )
);
CREATE UNIQUE INDEX "StudentProgressObservation_scheduleSlotId_studentId_key" ON "StudentProgressObservation"("scheduleSlotId", "studentId");
CREATE INDEX "StudentProgressObservation_schoolId_studentId_observedAt_idx" ON "StudentProgressObservation"("schoolId", "studentId", "observedAt");
CREATE INDEX "StudentProgressObservation_recordedById_observedAt_idx" ON "StudentProgressObservation"("recordedById", "observedAt");
ALTER TABLE "StudentProgressObservation" ADD CONSTRAINT "StudentProgressObservation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentProgressObservation" ADD CONSTRAINT "StudentProgressObservation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentProgressObservation" ADD CONSTRAINT "StudentProgressObservation_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentProgressObservation" ADD CONSTRAINT "StudentProgressObservation_scheduleSlotId_fkey" FOREIGN KEY ("scheduleSlotId") REFERENCES "ScheduleSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
