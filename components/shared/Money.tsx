"use client";

import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import { exchangeRatesToUsd } from "@/mock/data/exchangeRates";
import type { Money as MoneyValue } from "@/types";
import { cn } from "@/lib/utils";

interface MoneyProps {
  money: MoneyValue;
  /** Convert into the user's active display currency using the mock FX table. Defaults to true. */
  convert?: boolean;
  className?: string;
}

/**
 * Single formatting surface for every monetary amount in the app. All amounts
 * flow through here so Phase 2 can swap the mock FX table for a live rates
 * feed without touching call sites.
 */
export function Money({ money, convert = true, className }: MoneyProps) {
  const displayCurrency = useUiPrefsStore((s) => s.currency);
  const targetCurrency = convert ? displayCurrency : money.currencyCode;

  const amountInUsd = money.value / exchangeRatesToUsd[money.currencyCode];
  const amount =
    targetCurrency === money.currencyCode
      ? money.value
      : amountInUsd * exchangeRatesToUsd[targetCurrency];

  const formatted = new Intl.NumberFormat("en", {
    style: "currency",
    currency: targetCurrency,
  }).format(amount);

  return <span className={cn(className)}>{formatted}</span>;
}
