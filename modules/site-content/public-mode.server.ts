import { readFile } from "node:fs/promises";

import {
  getPublicPresentationMode,
  type PublicPresentationMode,
} from "./public-mode";

export async function resolvePublicPresentationMode(): Promise<PublicPresentationMode> {
  const modeFile = process.env.KLA_PUBLIC_PRESENTATION_MODE_FILE?.trim();
  if (!modeFile) {
    return getPublicPresentationMode(process.env.KLA_PUBLIC_PRESENTATION_MODE);
  }
  try {
    return getPublicPresentationMode(await readFile(modeFile, "utf8"));
  } catch {
    return "PRODUCT";
  }
}
