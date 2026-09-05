import { siteContentSchema, type SiteContent } from "./schema";

export const SITE_CONTENT_SIGNAL = "kla-site-content-demo-v1";

// Server storage is authoritative. Browser storage is only a cross-tab signal;
// denied storage access must never turn a successful server write into failure.
export function signalSiteContentChange() {
  try {
    window.localStorage.setItem(SITE_CONTENT_SIGNAL, String(Date.now()));
  } catch {
    // Private browsing and storage quotas do not affect persistence on the server.
  }
}

export async function writeSiteContent(content?: SiteContent) {
  const response = await fetch("/api/site-content", {
    method: content ? "PUT" : "DELETE",
    headers: { "Content-Type": "application/json" },
    ...(content ? { body: JSON.stringify(content) } : {}),
    signal: AbortSignal.timeout(30_000),
    redirect: "error",
  });
  if (!response.ok || (await response.json()).ok !== true) {
    throw new Error("site-content-write-failed");
  }
  signalSiteContentChange();
}

export async function readSiteContent(): Promise<{
  content: SiteContent | null;
  publicMode: "SCHOOL" | "PRODUCT";
}> {
  try {
    const response = await fetch("/api/site-content", {
      cache: "no-store", signal: AbortSignal.timeout(15_000), redirect: "error",
    });
    if (!response.ok) throw new Error("site-content-load-failed");
    const content = siteContentSchema.parse(await response.json());
    const publicMode = response.headers.get("x-kla-public-mode") === "SCHOOL" ? "SCHOOL" : "PRODUCT";
    return { content, publicMode };
  } catch {
    // Never reveal a cached school presentation when the server cannot confirm
    // which public mode is active. In particular, do not wait on Safari IndexedDB.
    return { content: null, publicMode: "PRODUCT" };
  }
}
