export type ScheduleResource = {
  id: string;
  name: string;
  locationId?: string;
  locationName?: string;
  capacity?: number | null;
  studentIds?: string[];
  teacherIds?: string[];
};

export type ScheduleLocation = {
  id: string;
  name: string;
  isOnline: boolean;
};

export type ScheduleSlotView = {
  id: string;
  groupId: string;
  groupName: string;
  locationId: string;
  locationName: string;
  roomId: string;
  roomName: string;
  teacherId: string;
  teacherName: string;
  studentIds: string[];
  startAt: string;
  endAt: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: "PLANNED" | "COMPLETED" | "CANCELLED" | "SUBSTITUTE";
  topic: string | null;
  version: number;
  isLocked: boolean;
  cancellationReason: string | null;
  cancelledAt: string | null;
  canRequestChange: boolean;
  canReviewChange: boolean;
  pendingChangeRequest: {
    id: string;
    kind: "RESCHEDULE" | "CHANGE_TEACHER" | "CHANGE_ROOM" | "CANCEL" | "OTHER";
    reason: string;
    requestedByName: string;
    createdAt: string;
  } | null;
  canEditLesson: boolean;
  canConfirmArrival: boolean;
  checkInWindowOpen: boolean;
  students: Array<{
    id: string;
    name: string;
    attendanceStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | null;
    selfCheckedInAt: string | null;
  }>;
};

export type ScheduleActionState = {
  status: "idle" | "success" | "error";
  message: string;
  slotId?: string;
};

export type ScheduleRequirementView = {
  groupId: string;
  groupName: string;
  locationId: string;
  locationName: string;
  studentCount: number;
  teacherId: string | null;
  preferredRoomId: string | null;
  lessonsPerWeek: number;
  durationMinutes: number;
  allowedWeekdays: number[];
  preferredWeekdays: number[];
  earliestStartMinute: number;
  latestEndMinute: number;
  preferredStartMinute: number | null;
  configured: boolean;
};

export type TeacherAvailabilityView = {
  teacherId: string;
  teacherName: string;
  windows: Array<{
    weekday: number;
    startMinute: number;
    endMinute: number;
    locationId: string;
    locationName: string;
  }>;
  configured: boolean;
};

export type ScheduleGenerationView = {
  id: string;
  status: "READY" | "APPLIED" | "DISCARDED" | "FAILED";
  score: number;
  scopeLabel: string;
  rangeLabel: string;
  hardViolations: string[];
  suggestions: string[];
  existingSlots: number;
  proposals: Array<{
    id: string;
    groupName: string;
    roomName: string;
    teacherName: string;
    dateLabel: string;
    timeLabel: string;
    explanation: string | null;
  }>;
};
