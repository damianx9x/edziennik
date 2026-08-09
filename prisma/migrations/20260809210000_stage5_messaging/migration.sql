CREATE TYPE "MessageKind" AS ENUM ('CHAT', 'ANNOUNCEMENT');
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED');
CREATE TYPE "ConversationAccessPurpose" AS ENUM ('SAFETY', 'COMPLAINT', 'LEGAL', 'SUPPORT', 'OTHER');

CREATE TABLE "Conversation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "groupId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Announcement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "clientRequestId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "announcementId" UUID,
  "kind" "MessageKind" NOT NULL DEFAULT 'CHAT',
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "clientRequestId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageRead" (
  "messageId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageRead_pkey" PRIMARY KEY ("messageId", "userId")
);

CREATE TABLE "EmailDelivery" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "messageId" UUID NOT NULL,
  "recipientId" UUID NOT NULL,
  "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "idempotencyKey" TEXT NOT NULL,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastErrorCode" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DirectorConversationAccess" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "directorId" UUID NOT NULL,
  "purpose" "ConversationAccessPurpose" NOT NULL,
  "reason" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DirectorConversationAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversation_groupId_key" ON "Conversation"("groupId");
CREATE INDEX "Conversation_schoolId_updatedAt_idx" ON "Conversation"("schoolId", "updatedAt");
CREATE INDEX "Conversation_schoolId_archivedAt_idx" ON "Conversation"("schoolId", "archivedAt");
CREATE UNIQUE INDEX "Announcement_authorId_clientRequestId_key" ON "Announcement"("authorId", "clientRequestId");
CREATE INDEX "Announcement_schoolId_createdAt_idx" ON "Announcement"("schoolId", "createdAt");
CREATE UNIQUE INDEX "Message_authorId_clientRequestId_key" ON "Message"("authorId", "clientRequestId");
CREATE INDEX "Message_schoolId_createdAt_idx" ON "Message"("schoolId", "createdAt");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_announcementId_idx" ON "Message"("announcementId");
CREATE INDEX "MessageRead_schoolId_readAt_idx" ON "MessageRead"("schoolId", "readAt");
CREATE INDEX "MessageRead_userId_readAt_idx" ON "MessageRead"("userId", "readAt");
CREATE UNIQUE INDEX "EmailDelivery_idempotencyKey_key" ON "EmailDelivery"("idempotencyKey");
CREATE UNIQUE INDEX "EmailDelivery_messageId_recipientId_key" ON "EmailDelivery"("messageId", "recipientId");
CREATE INDEX "EmailDelivery_schoolId_status_nextAttemptAt_idx" ON "EmailDelivery"("schoolId", "status", "nextAttemptAt");
CREATE INDEX "EmailDelivery_recipientId_createdAt_idx" ON "EmailDelivery"("recipientId", "createdAt");
CREATE INDEX "DirectorConversationAccess_schoolId_createdAt_idx" ON "DirectorConversationAccess"("schoolId", "createdAt");
CREATE INDEX "DirectorConversationAccess_conversationId_directorId_expiresAt_idx" ON "DirectorConversationAccess"("conversationId", "directorId", "expiresAt");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourseGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DirectorConversationAccess" ADD CONSTRAINT "DirectorConversationAccess_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DirectorConversationAccess" ADD CONSTRAINT "DirectorConversationAccess_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DirectorConversationAccess" ADD CONSTRAINT "DirectorConversationAccess_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Conversation" ("id", "schoolId", "groupId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "schoolId", "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "CourseGroup"
WHERE "archivedAt" IS NULL
ON CONFLICT ("groupId") DO NOTHING;
