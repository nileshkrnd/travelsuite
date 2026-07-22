"use client";

import { useEffect } from "react";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import { LOCALE_DIR } from "@/config/i18n/locales";

/**
 * Mirrors the whole app to RTL when an RTL locale (e.g. Arabic) is active.
 * Runs independently of translated content — next-intl still serves English
 * copy in Phase 1 (see config/i18n/request.ts), but the layout direction is
 * a structural concern that flips today so RTL readiness is visible now.
 */
export function DirectionSync() {
  const locale = useUiPrefsStore((s) => s.locale);

  useEffect(() => {
    document.documentElement.dir = LOCALE_DIR[locale] ?? "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
