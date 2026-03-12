"use client";

import { useEffect } from "react";
import { hydrateTheme } from "@/stores/theme-store";

export function ThemeHydrator(): null {
  useEffect(() => {
    hydrateTheme();
  }, []);

  return null;
}
