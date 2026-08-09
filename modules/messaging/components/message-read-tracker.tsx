"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markMessagesReadAction } from "../actions";

export function MessageReadTracker({ messageIds, enabled }: { messageIds: string[]; enabled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (enabled && messageIds.length) void markMessagesReadAction(messageIds);
  }, [enabled, messageIds]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 15_000);
    return () => window.clearInterval(timer);
  }, [router]);
  return null;
}
