"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const storageKey = "kla-color-theme";

function readTheme(): Theme {
  const saved = window.localStorage.getItem(storageKey);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("kla-theme-change", onStoreChange);
      return () => window.removeEventListener("kla-theme-change", onStoreChange);
    },
    readTheme,
    () => "light" as const,
  );

  function toggleTheme() {
    const nextTheme: Theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem(storageKey, nextTheme);
    window.dispatchEvent(new Event("kla-theme-change"));
  }

  const dark = theme === "dark";

  return (
    <button
      className="theme-trigger"
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Włącz jasny wygląd" : "Włącz ciemny wygląd"}
      title={dark ? "Jasny wygląd" : "Ciemny wygląd"}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      <span>{dark ? "Jasny" : "Ciemny"}</span>
    </button>
  );
}
