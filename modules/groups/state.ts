export type RecordActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const initialRecordActionState: RecordActionState = { status: "idle" };
