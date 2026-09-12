CREATE INDEX "PageVisit_visitedAt_idx" ON "PageVisit"("visitedAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "RateLimit_lastRequest_idx" ON "RateLimit"("lastRequest");
