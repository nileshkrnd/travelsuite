"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticate } from "@/lib/services/auth.service";
import { useSessionStore } from "@/lib/store/session.store";
import { roleHomePath } from "@/config/permissions";
import { MOCK_PASSWORD, users } from "@/mock/data/users";
import { ROLES, ROLE_LABELS } from "@/types";

/**
 * Phase 1 only: lets reviewers jump straight into any role's dashboard
 * without knowing mock credentials. In real auth, role is always derived
 * from the authenticated account — DELETE this component entirely once
 * Phase 2 wires real login (do not gate behind an env flag and ship it).
 */
export function DevRoleSwitcher() {
  const t = useTranslations("auth.login");
  const login = useSessionStore((s) => s.login);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  async function signInAs(role: (typeof ROLES)[number]) {
    const user = users.find((u) => u.role === role);
    if (!user) return;
    setPendingRole(role);
    const authed = await authenticate(user.email, MOCK_PASSWORD);
    login(authed);
    router.push(roleHomePath(authed.role));
  }

  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground"
      >
        <span className="flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5" />
          {t("devRoleSwitcherLabel")}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {ROLES.map((role) => (
            <Button
              key={role}
              type="button"
              variant="outline"
              size="sm"
              className="justify-start text-xs"
              disabled={pendingRole !== null}
              onClick={() => signInAs(role)}
            >
              {pendingRole === role ? "…" : ROLE_LABELS[role]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
