"use client";

import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import { currencyMeta } from "@/mock/data/exchangeRates";

export function CurrencySwitcher() {
  const supportedCurrencies = useTenantStore((s) => s.tenant.supportedCurrencies);
  const currency = useUiPrefsStore((s) => s.currency);
  const setCurrency = useUiPrefsStore((s) => s.setCurrency);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="gap-1 px-2 text-xs font-medium" />}
      >
        <span>
          {currencyMeta[currency].symbol} {currency}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {supportedCurrencies.map((code) => (
          <DropdownMenuItem key={code} onClick={() => setCurrency(code)}>
            <span className="w-6 text-muted-foreground">{currencyMeta[code].symbol}</span>
            <span>
              {code} — {currencyMeta[code].name}
            </span>
            {code === currency && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
