export type ScheduleResource = {
  id: string;
  name: string;
  capacity?: number | null;
  studentIds?: string[];
  teacherIds?: string[];
};

export type ScheduleSlotView = {
  id: string;
  groupId: string;
  groupName: string;
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
};

export type ScheduleActionState = {
  status: "idle" | "success" | "error";
  message: string;
  slotId?: string;
};

export type ScheduleRequirementView = {
  groupId: string;
  groupName: string;
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
  weekdays: number[];
  startMinute: number;
  endMinute: number;
  configured: boolean;
};

export type ScheduleGenerationView = {
  id: string;
  status: "READY" | "APPLIED" | "DISCARDED" | "FAILED";
  score: number;
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
