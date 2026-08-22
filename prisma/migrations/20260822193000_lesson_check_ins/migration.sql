CREATE TABLE "LessonCheckIn" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "scheduleSlotId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonCheckIn_scheduleSlotId_studentId_key"
ON "LessonCheckIn"("scheduleSlotId", "studentId");

CREATE INDEX "LessonCheckIn_schoolId_studentId_checkedInAt_idx"
ON "LessonCheckIn"("schoolId", "studentId", "checkedInAt");

ALTER TABLE "LessonCheckIn"
ADD CONSTRAINT "LessonCheckIn_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LessonCheckIn"
ADD CONSTRAINT "LessonCheckIn_scheduleSlotId_fkey"
FOREIGN KEY ("scheduleSlotId") REFERENCES "ScheduleSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LessonCheckIn"
ADD CONSTRAINT "LessonCheckIn_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
