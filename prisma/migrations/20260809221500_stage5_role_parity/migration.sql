ALTER TYPE "StoredFilePurpose" ADD VALUE IF NOT EXISTS 'MESSAGE_ATTACHMENT';

ALTER TABLE "Message"
ADD COLUMN "requiresAcknowledgement" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "MessageAcknowledgement" (
  "messageId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageAcknowledgement_pkey" PRIMARY KEY ("messageId", "userId")
);

CREATE TABLE "MessageAttachment" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "messageId" UUID NOT NULL,
  "storedFileId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationState" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "notificationKey" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "snoozedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingProgress" (
  "userId" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "completedAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "MessageAttachment_storedFileId_idx" ON "MessageAttachment"("storedFileId");
CREATE INDEX "MessageAcknowledgement_schoolId_acknowledgedAt_idx" ON "MessageAcknowledgement"("schoolId", "acknowledgedAt");
CREATE INDEX "MessageAcknowledgement_userId_acknowledgedAt_idx" ON "MessageAcknowledgement"("userId", "acknowledgedAt");
CREATE INDEX "MessageAttachment_schoolId_createdAt_idx" ON "MessageAttachment"("schoolId", "createdAt");
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");
CREATE UNIQUE INDEX "NotificationState_userId_notificationKey_key" ON "NotificationState"("userId", "notificationKey");
CREATE INDEX "NotificationState_schoolId_updatedAt_idx" ON "NotificationState"("schoolId", "updatedAt");
CREATE INDEX "NotificationState_userId_snoozedUntil_idx" ON "NotificationState"("userId", "snoozedUntil");
CREATE INDEX "OnboardingProgress_schoolId_updatedAt_idx" ON "OnboardingProgress"("schoolId", "updatedAt");

ALTER TABLE "MessageAcknowledgement" ADD CONSTRAINT "MessageAcknowledgement_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageAcknowledgement" ADD CONSTRAINT "MessageAcknowledgement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageAcknowledgement" ADD CONSTRAINT "MessageAcknowledgement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationState" ADD CONSTRAINT "NotificationState_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationState" ADD CONSTRAINT "NotificationState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
