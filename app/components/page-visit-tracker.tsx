"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { isTrackedPagePath } from "@/modules/observability/page-visits";

export function PageVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isTrackedPagePath(pathname)) return;
    const key = `kla-visit:${pathname}`;
    const last = Number(window.sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < 30_000) return;
    window.sessionStorage.setItem(key, String(Date.now()));

    void fetch("/api/statystyki/odwiedziny", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    });
  }, [pathname]);

  return null;
}
