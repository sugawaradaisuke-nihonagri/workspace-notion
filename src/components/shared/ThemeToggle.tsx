"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/theme-store";

export function ThemeToggle(): React.ReactElement {
  const { theme, toggle } = useThemeStore();

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center justify-center w-7 h-7 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
      aria-label={
        theme === "dark" ? "ライトモードに切替" : "ダークモードに切替"
      }
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
