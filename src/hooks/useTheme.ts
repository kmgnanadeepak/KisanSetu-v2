import { useState, useEffect, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "auto";

const STORAGE_KEY = "app-theme";
const LEGACY_STORAGE_KEY = "kisansetu-theme";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  const stored =
    (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ||
    (localStorage.getItem(LEGACY_STORAGE_KEY) as ThemeMode | null);
  return stored || "auto";
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => getInitialMode());

  const resolvedTheme = mode === "auto" ? getSystemTheme() : mode;

  const applyTheme = useCallback((theme: "light" | "dark") => {
    const root = document.documentElement;
    root.style.transition = "background-color 250ms ease, color 250ms ease";

    // Set data-theme attribute for CSS variable switching
    root.setAttribute("data-theme", theme);

    // Keep .dark class for existing Tailwind-based dark styles
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    setTimeout(() => {
      root.style.transition = "";
    }, 300);
  }, []);

  useEffect(() => {
    applyTheme(resolvedTheme);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode, resolvedTheme, applyTheme]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, applyTheme]);

  return { mode, setMode, resolvedTheme };
}
