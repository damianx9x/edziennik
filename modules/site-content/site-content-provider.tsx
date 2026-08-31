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
const DATABASE_NAME = "kla-site-content";
const STORE_NAME = "settings";

type SaveResult = {
  ok: boolean;
  message: string;
};

type SiteContentContextValue = {
  content: SiteContent;
  isReady: boolean;
  publicMode: "SCHOOL" | "PRODUCT";
  saveContent: (nextContent: SiteContent) => Promise<SaveResult>;
  resetContent: () => Promise<void>;
};

const SiteContentContext = createContext<SiteContentContextValue | null>(null);

export function SiteContentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [isReady, setIsReady] = useState(false);
  // Fail closed: until the server confirms SCHOOL, never render a cached school
  // presentation. This prevents an offline browser cache from leaking school
  // marketing content while the neutral mode is active.
  const [publicMode, setPublicMode] = useState<"SCHOOL" | "PRODUCT">("PRODUCT");

  useEffect(() => {
    const loadTimer = window.setTimeout(async () => {
      const result = await readStoredContent();
      if (result.content) setContent(result.content);
      setPublicMode(result.publicMode);
      setIsReady(true);
    }, 0);

    async function synchronize(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      const result = await readStoredContent();
      setContent(result.content ?? defaultSiteContent);
      setPublicMode(result.publicMode);
    }

    window.addEventListener("storage", synchronize);
    return () => {
      window.clearTimeout(loadTimer);
      window.removeEventListener("storage", synchronize);
    };
  }, []);

  const saveContent = useCallback(async (nextContent: SiteContent): Promise<SaveResult> => {
    const result = siteContentSchema.safeParse(nextContent);
    if (!result.success) {
      return {
        ok: false,
        message: "Nie udało się zapisać. Sprawdź puste lub zbyt długie pola.",
      };
    }

    try {
      const response = await fetch("/api/site-content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result.data) });
      if (!response.ok) throw new Error("remote-save-failed");
      // Cache przeglądarki jest wyłącznie dodatkiem. Safari może wstrzymać
      // IndexedDB (np. w trybie prywatnym), więc nie może blokować zapisu na
      // serwerze ani informacji zwrotnej dla użytkownika.
      void writeIndexedContent(result.data).catch(() => undefined);
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setContent(result.data);
      return {
        ok: true,
        message: "Zmiany i zdjęcia zapisane w systemie szkoły i objęte backupem.",
      };
    } catch {
      return {
        ok: false,
        message:
          "Nie udało się zapisać zdjęć. Pobierz kopię i spróbuj ponownie.",
      };
    }
  }, []);

  const resetContent = useCallback(async () => {
    const response = await fetch("/api/site-content", { method: "DELETE" });
    if (!response.ok) throw new Error("remote-reset-failed");
    void deleteIndexedContent().catch(() => undefined);
    window.localStorage.removeItem(STORAGE_KEY);
    setContent(defaultSiteContent);
  }, []);

  const value = useMemo(
    () => ({ content, isReady, publicMode, saveContent, resetContent }),
    [content, isReady, publicMode, resetContent, saveContent],
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

async function readStoredContent(): Promise<{ content: SiteContent | null; publicMode: "SCHOOL" | "PRODUCT" }> {
  try {
    const response = await fetch("/api/site-content", { cache: "no-store" });
    if (response.ok) {
      const publicMode = response.headers.get("x-kla-public-mode") === "PRODUCT" ? "PRODUCT" : "SCHOOL";
      const remote = siteContentSchema.safeParse(await response.json());
      if (remote.success) {
        // Najpierw renderujemy potwierdzoną treść serwera. Pomocniczy cache
        // nie może zatrzymać strony na ekranie ładowania.
        void writeIndexedContent(remote.data).catch(() => undefined);
        return { content: remote.data, publicMode };
      }
    }
    const indexed = await readIndexedContent();
    if (indexed) return { content: indexed, publicMode: "PRODUCT" };

    const legacy = window.localStorage.getItem(STORAGE_KEY);
    if (!legacy || !legacy.startsWith("{")) return { content: null, publicMode: "PRODUCT" };
    const result = siteContentSchema.safeParse(JSON.parse(legacy));
    if (!result.success) return { content: null, publicMode: "PRODUCT" };
    await writeIndexedContent(result.data);
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    return { content: result.data, publicMode: "PRODUCT" };
  } catch {
    return { content: null, publicMode: "PRODUCT" };
  }
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readIndexedContent(): Promise<SiteContent | null> {
  const database = await openDatabase();
  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).get("content");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result = siteContentSchema.safeParse(value);
    return result.success ? result.data : null;
  } finally {
    database.close();
  }
}

async function writeIndexedContent(content: SiteContent) {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(content, "content");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

async function deleteIndexedContent() {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete("content");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}
