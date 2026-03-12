"use client";

import { create } from "zustand";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("workspace-theme") as Theme) ?? "dark";
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "dark", // SSR-safe default, hydrated in ThemeProvider
  toggle: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("workspace-theme", next);
      return { theme: next };
    }),
  setTheme: (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("workspace-theme", theme);
    set({ theme });
  },
}));

/** Call once on mount to sync stored preference to DOM */
export function hydrateTheme() {
  const stored = getInitialTheme();
  if (stored === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  }
  useThemeStore.setState({ theme: stored });
}
