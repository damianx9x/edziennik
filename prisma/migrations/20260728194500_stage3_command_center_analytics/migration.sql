CREATE TABLE "PageVisit" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "userId" UUID,
    "path" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PageVisit_schoolId_visitedAt_idx"
ON "PageVisit"("schoolId", "visitedAt");

CREATE INDEX "PageVisit_schoolId_path_visitedAt_idx"
ON "PageVisit"("schoolId", "path", "visitedAt");

CREATE INDEX "PageVisit_userId_visitedAt_idx"
ON "PageVisit"("userId", "visitedAt");

ALTER TABLE "PageVisit"
ADD CONSTRAINT "PageVisit_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PageVisit"
ADD CONSTRAINT "PageVisit_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
