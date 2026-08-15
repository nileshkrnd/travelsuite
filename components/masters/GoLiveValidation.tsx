"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { PropertyReadiness } from "@/types";

/**
 * Pass/fail validation checklist + the Go-Live action. Status is fully computed from the
 * checklist on every load (no separate "isLive" flag is stored) — the button below is a
 * confirmation, not a state mutation, and says so explicitly.
 */
export function GoLiveValidation({ validation }: { validation: PropertyReadiness["goLiveValidation"] }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div id="go-live" className="space-y-3">
      <h2 className="text-base font-semibold">Go-Live Validation</h2>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <ul className="space-y-2">
            {validation.checks.map((check) => (
              <li key={check.code} className="flex items-start gap-2 text-sm">
                {check.passed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : check.mandatory ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                )}
                <span>
                  {check.label}
                  {!check.passed && check.message && (
                    <span className="block text-xs text-muted-foreground">{check.message}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <Separator />

          {validation.isReady ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                All mandatory configuration has been completed for this property.
              </p>
              <Button
                onClick={() => {
                  setConfirmed(true);
                  toast.success("Property confirmed ready — commercially live for contract pricing.");
                }}
                disabled={confirmed}
              >
                {confirmed ? "Confirmed" : "Go LIVE"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-destructive">
              Property cannot go LIVE yet — complete the mandatory items above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
