/** Display names for locales referenced by tenant.supportedLocales. Only "en" ships translated content in Phase 1. */
export const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
  hi: "हिन्दी",
};

/** Reading direction per locale — drives document.dir so RTL locales mirror the layout immediately, even before translated copy ships. */
export const LOCALE_DIR: Record<string, "ltr" | "rtl"> = {
  en: "ltr",
  fr: "ltr",
  ar: "rtl",
  hi: "ltr",
};
