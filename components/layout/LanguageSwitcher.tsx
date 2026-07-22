"use client";

import { Globe, Check } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import { LOCALE_LABELS } from "@/config/i18n/locales";

export function LanguageSwitcher() {
  const supportedLocales = useTenantStore((s) => s.tenant.supportedLocales);
  const locale = useUiPrefsStore((s) => s.locale);
  const setLocale = useUiPrefsStore((s) => s.setLocale);
  const common = useTranslations("common");
  const topbar = useTranslations("topbar");

  function handleSelect(code: string) {
    // Direction (LTR/RTL) flips immediately via DirectionSync regardless of
    // locale — that's a structural layout concern. Translated copy is a
    // separate, still-Phase-2 concern: Phase 1 ships English content only,
    // so non-English selections still get a "coming soon" notice.
    setLocale(code);
    if (code !== "en") {
      toast.info(common("comingSoon", { label: LOCALE_LABELS[code] ?? code }));
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={topbar("language")} />}>
        <Globe className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {supportedLocales.map((code) => (
          <DropdownMenuItem key={code} onClick={() => handleSelect(code)}>
            <span>{LOCALE_LABELS[code] ?? code}</span>
            {code === locale && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
