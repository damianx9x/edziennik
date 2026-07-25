"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { defaultSiteContent } from "./default-content";
import { siteContentSchema, type SiteContent } from "./schema";

const STORAGE_KEY = "kla-site-content-demo-v1";

type SaveResult = {
  ok: boolean;
  message: string;
};

type SiteContentContextValue = {
  content: SiteContent;
  isReady: boolean;
  saveContent: (nextContent: SiteContent) => SaveResult;
  resetContent: () => void;
};

const SiteContentContext = createContext<SiteContentContextValue | null>(null);

export function SiteContentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const parsed = readStoredContent();
      if (parsed) setContent(parsed);
      setIsReady(true);
    }, 0);

    function synchronize(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      const parsed = readStoredContent();
      setContent(parsed ?? defaultSiteContent);
    }

    window.addEventListener("storage", synchronize);
    return () => {
      window.clearTimeout(loadTimer);
      window.removeEventListener("storage", synchronize);
    };
  }, []);

  const saveContent = useCallback((nextContent: SiteContent): SaveResult => {
    const result = siteContentSchema.safeParse(nextContent);
    if (!result.success) {
      return {
        ok: false,
        message: "Nie udało się zapisać. Sprawdź puste lub zbyt długie pola.",
      };
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
      setContent(result.data);
      return {
        ok: true,
        message: "Zmiany zapisane w tej przeglądarce.",
      };
    } catch {
      return {
        ok: false,
        message:
          "Brakuje miejsca w przeglądarce. Usuń jedno zdjęcie lub wgraj mniejszy plik.",
      };
    }
  }, []);

  const resetContent = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setContent(defaultSiteContent);
  }, []);

  const value = useMemo(
    () => ({ content, isReady, saveContent, resetContent }),
    [content, isReady, resetContent, saveContent],
  );

  return (
    <SiteContentContext.Provider value={value}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (!context) {
    throw new Error("useSiteContent must be used inside SiteContentProvider");
  }
  return context;
}

function readStoredContent(): SiteContent | null {
  try {
    const rawContent = window.localStorage.getItem(STORAGE_KEY);
    if (!rawContent) return null;
    const result = siteContentSchema.safeParse(JSON.parse(rawContent));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
