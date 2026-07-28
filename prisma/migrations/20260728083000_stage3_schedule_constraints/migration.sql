ALTER TABLE "AvailabilityWindow"
ADD CONSTRAINT "AvailabilityWindow_exactly_one_resource_check"
CHECK (
  (CASE WHEN "teacherId" IS NULL THEN 0 ELSE 1 END) +
  (CASE WHEN "roomId" IS NULL THEN 0 ELSE 1 END) +
  (CASE WHEN "groupId" IS NULL THEN 0 ELSE 1 END) = 1
);

ALTER TABLE "AvailabilityWindow"
ADD CONSTRAINT "AvailabilityWindow_time_range_check"
CHECK (
  "weekday" BETWEEN 1 AND 7
  AND "startMinute" BETWEEN 0 AND 1439
  AND "endMinute" BETWEEN 1 AND 1440
  AND "startMinute" < "endMinute"
  AND "preference" BETWEEN -100 AND 100
);

ALTER TABLE "SchedulingRequirement"
ADD CONSTRAINT "SchedulingRequirement_values_check"
CHECK (
  "lessonsPerWeek" BETWEEN 1 AND 7
  AND "durationMinutes" BETWEEN 30 AND 180
  AND MOD("durationMinutes", 30) = 0
  AND "earliestStartMinute" BETWEEN 0 AND 1439
  AND "latestEndMinute" BETWEEN 1 AND 1440
  AND "earliestStartMinute" < "latestEndMinute"
  AND ("preferredStartMinute" IS NULL OR "preferredStartMinute" BETWEEN 0 AND 1439)
);

ALTER TABLE "ScheduleSlot"
ADD CONSTRAINT "ScheduleSlot_positive_interval_check"
CHECK ("startAt" < "endAt");

ALTER TABLE "ScheduleProposalSlot"
ADD CONSTRAINT "ScheduleProposalSlot_positive_interval_check"
CHECK ("startAt" < "endAt");
