"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, KeyRound } from "lucide-react";
import { users, MOCK_PASSWORD } from "@/mock/data/users";
import { useRolesStore } from "@/lib/store/roles.store";

/**
 * Phase 1 only: surfaces the seeded demo accounts so reviewers can sign in
 * without digging through mock data. Every account shares MOCK_PASSWORD —
 * DELETE this component entirely once Phase 2 wires real auth.
 */
export function DemoCredentials() {
  const t = useTranslations("auth.login");
  const roles = useRolesStore((s) => s.roles);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground"
      >
        <span className="flex items-center gap-1.5">
          <KeyRound className="h-3.5 w-3.5" />
          {t("demoCredentialsLabel")}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">{t("demoCredentialsHint", { password: MOCK_PASSWORD })}</p>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
            {users.map((user) => {
              const roleName = roles.find((r) => r.id === user.roleId)?.name ?? user.roleId;
              return (
                <li key={user.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1">
                  <span className="truncate font-mono text-foreground">{user.email}</span>
                  <span className="shrink-0 text-muted-foreground">{roleName}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
