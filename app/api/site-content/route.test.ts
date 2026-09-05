import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  requireDirector: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  db: {
    school: { findUnique: mocks.findUnique },
  },
}));

vi.mock("@/modules/identity/auth/session", () => ({
  requireDirector: mocks.requireDirector,
}));

vi.mock("@/modules/module-access/server", () => ({
  requireEnabledModule: vi.fn(),
}));

describe("public site content", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.requireDirector.mockReset();
    delete process.env.KLA_PUBLIC_PRESENTATION_MODE;
    delete process.env.KLA_PUBLIC_PRESENTATION_MODE_FILE;
    process.env.KLA_PUBLIC_SCHOOL_SLUG = "synthetic-school";
  });

  it("does not read school data in neutral product mode", async () => {
    process.env.KLA_PUBLIC_PRESENTATION_MODE = "product";
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.test/api/site-content"));

    expect(response.headers.get("x-kla-public-mode")).toBe("PRODUCT");
    expect(mocks.findUnique).not.toHaveBeenCalled();
    const serialized = JSON.stringify(await response.json());
    expect(serialized).not.toMatch(
      /King|533\s?730|facebook\.com|\/photos\/kla-/i,
    );
    expect(serialized).not.toContain("kingsjezykiobce@gmail.com");
  });

  it("reads only the explicitly configured school in school mode", async () => {
    process.env.KLA_PUBLIC_PRESENTATION_MODE = "school";
    mocks.findUnique.mockResolvedValue(null);
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.test/api/site-content"));

    expect(response.headers.get("x-kla-public-mode")).toBe("SCHOOL");
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { slug: "synthetic-school" },
      select: { siteContent: true },
    });
  });

  it("loads the signed-in director's school in editor scope even in product mode", async () => {
    process.env.KLA_PUBLIC_PRESENTATION_MODE = "product";
    mocks.requireDirector.mockResolvedValue({
      user: { id: "director-1", schoolId: "school-1" },
    });
    mocks.findUnique.mockResolvedValue(null);
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://example.test/api/site-content?scope=editor"),
    );

    expect(response.headers.get("x-kla-editor-scope")).toBe("school");
    expect(mocks.requireDirector).toHaveBeenCalledWith(
      "/panel/szkola/narzedzia/strona",
    );
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: "school-1" },
      select: { siteContent: true },
    });
  });
});
