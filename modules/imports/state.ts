import type { ImportPreview } from "./parser";

export type ImportActionState = {
  status: "idle" | "preview" | "success" | "error";
  message?: string;
  batchId?: string;
  preview?: ImportPreview;
};

export const initialImportActionState: ImportActionState = { status: "idle" };
