CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "UserRole" AS ENUM ('DIRECTOR', 'TEACHER', 'PARENT', 'STUDENT');
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "CefrLevel" AS ENUM ('PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'MIXED');
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ScheduleStatus" AS ENUM ('PLANNED', 'COMPLETED', 'CANCELLED', 'SUBSTITUTE');
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'TRIAGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "FeedbackCategory" AS ENUM ('BUG', 'ACCESSIBILITY', 'DATA_PROBLEM', 'IDEA', 'OTHER');
CREATE TYPE "FeedbackPlatform" AS ENUM ('IOS', 'ANDROID', 'MACOS', 'WINDOWS', 'LINUX', 'OTHER');

CREATE TABLE "School" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/Warsaw',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherProfile" (
    "userId" UUID NOT NULL,
    "displayName" TEXT,
    "notes" TEXT,
    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "StudentProfile" (
    "userId" UUID NOT NULL,
    "birthDate" DATE,
    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "ParentChild" (
    "schoolId" UUID NOT NULL,
    "parentId" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParentChild_pkey" PRIMARY KEY ("parentId","childId")
);

CREATE TABLE "Room" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseGroup" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cefrLevel" "CefrLevel" NOT NULL DEFAULT 'MIXED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "CourseGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupTeacher" (
    "groupId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupTeacher_pkey" PRIMARY KEY ("groupId","teacherId")
);

CREATE TABLE "Enrollment" (
    "groupId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("groupId","studentId")
);

CREATE TABLE "ScheduleSlot" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/Warsaw',
    "recurrenceRule" TEXT,
    "seriesId" UUID,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PLANNED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "ScheduleSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddressHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeedbackReport" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "reporterId" UUID,
    "referenceCode" TEXT NOT NULL,
    "reporterRole" "UserRole" NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "category" "FeedbackCategory" NOT NULL DEFAULT 'BUG',
    "description" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "platform" "FeedbackPlatform" NOT NULL,
    "browser" TEXT,
    "appRelease" TEXT NOT NULL,
    "diagnosticMetadata" JSONB,
    "screenshotStorageKey" TEXT,
    "screenshotConsentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "FeedbackReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");
CREATE INDEX "User_schoolId_role_status_idx" ON "User"("schoolId", "role", "status");
CREATE INDEX "User_archivedAt_idx" ON "User"("archivedAt");
CREATE UNIQUE INDEX "User_schoolId_email_key" ON "User"("schoolId", "email");
CREATE INDEX "ParentChild_schoolId_childId_idx" ON "ParentChild"("schoolId", "childId");
CREATE INDEX "Room_schoolId_isActive_idx" ON "Room"("schoolId", "isActive");
CREATE UNIQUE INDEX "Room_schoolId_name_key" ON "Room"("schoolId", "name");
CREATE INDEX "CourseGroup_schoolId_isActive_idx" ON "CourseGroup"("schoolId", "isActive");
CREATE UNIQUE INDEX "CourseGroup_schoolId_name_key" ON "CourseGroup"("schoolId", "name");
CREATE INDEX "GroupTeacher_teacherId_idx" ON "GroupTeacher"("teacherId");
CREATE INDEX "Enrollment_studentId_status_idx" ON "Enrollment"("studentId", "status");
CREATE INDEX "ScheduleSlot_schoolId_startAt_endAt_idx" ON "ScheduleSlot"("schoolId", "startAt", "endAt");
CREATE INDEX "ScheduleSlot_roomId_startAt_endAt_idx" ON "ScheduleSlot"("roomId", "startAt", "endAt");
CREATE INDEX "ScheduleSlot_teacherId_startAt_endAt_idx" ON "ScheduleSlot"("teacherId", "startAt", "endAt");
CREATE INDEX "ScheduleSlot_groupId_startAt_endAt_idx" ON "ScheduleSlot"("groupId", "startAt", "endAt");
CREATE INDEX "ScheduleSlot_seriesId_idx" ON "ScheduleSlot"("seriesId");
CREATE INDEX "AuditLog_schoolId_createdAt_idx" ON "AuditLog"("schoolId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE UNIQUE INDEX "FeedbackReport_referenceCode_key" ON "FeedbackReport"("referenceCode");
CREATE INDEX "FeedbackReport_schoolId_status_createdAt_idx" ON "FeedbackReport"("schoolId", "status", "createdAt");
CREATE INDEX "FeedbackReport_reporterId_createdAt_idx" ON "FeedbackReport"("reporterId", "createdAt");
CREATE INDEX "FeedbackReport_appRelease_createdAt_idx" ON "FeedbackReport"("appRelease", "createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentChild" ADD CONSTRAINT "ParentChild_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentChild" ADD CONSTRAINT "ParentChild_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentChild" ADD CONSTRAINT "ParentChild_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseGroup" ADD CONSTRAINT "CourseGroup_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GroupTeacher" ADD CONSTRAINT "GroupTeacher_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourseGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GroupTeacher" ADD CONSTRAINT "GroupTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourseGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourseGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeedbackReport" ADD CONSTRAINT "FeedbackReport_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackReport" ADD CONSTRAINT "FeedbackReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
