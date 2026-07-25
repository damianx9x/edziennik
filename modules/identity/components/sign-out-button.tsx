"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    try {
      await authClient.signOut();
      router.replace("/panel");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      className={compact ? "panel-signout panel-signout-compact" : "panel-signout"}
      type="button"
      onClick={signOut}
      disabled={isPending}
      aria-label={isPending ? "Wylogowywanie" : "Wyloguj"}
    >
      <LogOut aria-hidden="true" />
      <span>{isPending ? "Wylogowuję…" : "Wyloguj"}</span>
    </button>
  );
}
