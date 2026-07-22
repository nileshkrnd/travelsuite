"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Phase 1 ships a single light B2B theme (no dark-mode toggle in the UI yet).
 * Wired now so shadcn components that read the theme context (e.g. the
 * sonner Toaster) behave correctly; flip enableSystem/defaultTheme when a
 * dark mode setting is added.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} {...props}>
      {children}
    </NextThemesProvider>
  );
}
