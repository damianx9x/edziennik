ALTER TABLE "Conversation"
  ALTER COLUMN "groupId" DROP NOT NULL,
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'GROUP',
  ADD COLUMN "title" TEXT,
  ADD COLUMN "createdById" UUID;

ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ConversationParticipant" (
  "conversationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "addedById" UUID,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("conversationId", "userId"),
  CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ConversationParticipant_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ConversationParticipant_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ConversationParticipant_schoolId_userId_archivedAt_idx"
  ON "ConversationParticipant"("schoolId", "userId", "archivedAt");
CREATE INDEX "ConversationParticipant_addedById_addedAt_idx"
  ON "ConversationParticipant"("addedById", "addedAt");
