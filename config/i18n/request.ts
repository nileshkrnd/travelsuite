import { getRequestConfig } from "next-intl/server";

// Phase 1 ships English only. The topbar language switcher (Step 2) changes a
// client-side preference and shows a "coming soon" state for other locales;
// it does not affect server rendering yet. Phase 2/later: read the active
// locale from a cookie/session here once more locales are translated.
const DEFAULT_LOCALE = "en";

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
