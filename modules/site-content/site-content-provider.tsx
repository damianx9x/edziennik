"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultSiteContent } from "./default-content";
import { siteContentSchema, type SiteContent } from "./schema";
import { readSiteContent, SITE_CONTENT_SIGNAL, writeSiteContent } from "./client-storage";

type SaveResult = { ok: boolean; message: string };
type SiteContentContextValue = {
  content: SiteContent; isReady: boolean; publicMode: "SCHOOL" | "PRODUCT";
  saveContent: (content: SiteContent) => Promise<SaveResult>;
  resetContent: () => Promise<void>;
};
const SiteContentContext = createContext<SiteContentContextValue | null>(null);
export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [isReady, setIsReady] = useState(false);
  const [publicMode, setPublicMode] = useState<"SCHOOL" | "PRODUCT">("PRODUCT");
  useEffect(() => {
    let active = true;
    async function load() {
      const result = await readSiteContent();
      if (!active) return;
      setContent(result.content ?? defaultSiteContent);
      setPublicMode(result.publicMode);
      setIsReady(true);
    }
    void load();
    function synchronize(event: StorageEvent) {
      if (event.key === SITE_CONTENT_SIGNAL) void load();
    }
    window.addEventListener("storage", synchronize);
    return () => { active = false; window.removeEventListener("storage", synchronize); };
  }, []);
  const saveContent = useCallback(async (next: SiteContent): Promise<SaveResult> => {
    const parsed = siteContentSchema.safeParse(next);
    if (!parsed.success) return { ok: false, message: "Sprawdź puste lub zbyt długie pola i adresy odnośników." };
    try {
      await writeSiteContent(parsed.data);
      setContent(parsed.data);
      return { ok: true, message: "Zmiany i zdjęcia zapisane w systemie szkoły i objęte backupem." };
    } catch {
      return { ok: false, message: "Nie potwierdzono zapisu. Pobierz kopię treści. Sprawdź połączenie i zalogowanie, a następnie spróbuj ponownie." };
    }
  }, []);
  const resetContent = useCallback(async () => {
    await writeSiteContent();
    setContent(defaultSiteContent);
  }, []);
  const value = useMemo(() => ({ content, isReady, publicMode, saveContent, resetContent }), [content, isReady, publicMode, saveContent, resetContent]);
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}
export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (!context) throw new Error("useSiteContent must be used inside SiteContentProvider");
  return context;
}
