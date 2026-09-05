import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultSiteContent } from "./default-content";
import { readSiteContent, writeSiteContent } from "./client-storage";
import { widgetClassName } from "./widget-style";

afterEach(() => vi.unstubAllGlobals());
describe("site content persistence", () => {
  it("reports a successful write even with blocked browser storage", async () => {
    vi.stubGlobal("window", { localStorage: { setItem() { throw new Error("blocked"); } } });
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true })); vi.stubGlobal("fetch", fetcher);
    await expect(writeSiteContent(defaultSiteContent)).resolves.toBeUndefined();
    expect(fetcher.mock.calls[0][1].redirect).toBe("error");
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
  it("rejects an HTML login page rather than claiming the save succeeded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Login</html>")));
    await expect(writeSiteContent(defaultSiteContent)).rejects.toThrow();
  });
  it("rejects an explicit failed save", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: false })));
    await expect(writeSiteContent(defaultSiteContent)).rejects.toThrow();
  });
  it("fails closed when the server is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await readSiteContent()).toEqual({ content: null, publicMode: "PRODUCT" });
  });
  it("requires an explicit school mode header", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(defaultSiteContent)));
    expect((await readSiteContent()).publicMode).toBe("PRODUCT");
  });
  it("uses dark text for navy cards with a transparent or tinted background", () => {
    const widget = { ...defaultSiteContent.widgets[0], tone: "navy" as const };
    expect(widgetClassName(widget)).toContain("home-widget-inverted");
    expect(widgetClassName({ ...widget, surface: "transparent" })).not.toContain("inverted");
    expect(widgetClassName({ ...widget, surface: "tint" })).not.toContain("inverted");
    expect(widgetClassName({ ...widget, opacity: "40" })).not.toContain("inverted");
  });
});
