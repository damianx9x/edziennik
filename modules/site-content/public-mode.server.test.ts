import { afterEach, describe, expect, it } from "vitest";

import { resolvePublicPresentationMode } from "./public-mode.server";

const originalFile = process.env.KLA_PUBLIC_PRESENTATION_MODE_FILE;
const originalMode = process.env.KLA_PUBLIC_PRESENTATION_MODE;

afterEach(() => {
  if (originalFile === undefined) delete process.env.KLA_PUBLIC_PRESENTATION_MODE_FILE;
  else process.env.KLA_PUBLIC_PRESENTATION_MODE_FILE = originalFile;
  if (originalMode === undefined) delete process.env.KLA_PUBLIC_PRESENTATION_MODE;
  else process.env.KLA_PUBLIC_PRESENTATION_MODE = originalMode;
});

describe("server public presentation mode", () => {
  it("fails closed to product mode when the configured mode file cannot be read", async () => {
    process.env.KLA_PUBLIC_PRESENTATION_MODE = "school";
    process.env.KLA_PUBLIC_PRESENTATION_MODE_FILE = "/definitely/missing/kla-public-mode";

    await expect(resolvePublicPresentationMode()).resolves.toBe("PRODUCT");
  });

  it("uses the environment only when no runtime mode file is configured", async () => {
    delete process.env.KLA_PUBLIC_PRESENTATION_MODE_FILE;
    process.env.KLA_PUBLIC_PRESENTATION_MODE = "school";

    await expect(resolvePublicPresentationMode()).resolves.toBe("SCHOOL");
  });
});
