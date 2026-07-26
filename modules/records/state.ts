export type RecordUpdateState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialRecordUpdateState: RecordUpdateState = {
  status: "idle",
  message: "",
};
