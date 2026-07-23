"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticate } from "@/lib/services/auth.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { useUsersStore } from "@/lib/store/users.store";
import { roleHomePath } from "@/config/permissions";
import { MOCK_PASSWORD } from "@/mock/data/users";

/**
 * Phase 1 only: lets reviewers jump straight into any role's dashboard
 * without knowing mock credentials. In real auth, role is always derived
 * from the authenticated account — DELETE this component entirely once
 * Phase 2 wires real login (do not gate behind an env flag and ship it).
 */
export function DevRoleSwitcher() {
  const t = useTranslations("auth.login");
  const login = useSessionStore((s) => s.login);
  const roles = useRolesStore((s) => s.roles);
  const users = useUsersStore((s) => s.users);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);

  async function signInAs(roleId: string) {
    const user = users.find((u) => u.roleId === roleId);
    const roleDef = roles.find((r) => r.id === roleId);
    if (!user || !roleDef) return;
    setPendingRoleId(roleId);
    const authed = await authenticate(user.email, MOCK_PASSWORD);
    login(authed);
    router.push(roleHomePath(roleDef));
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
          {roles.map((roleDef) => {
            const hasUser = users.some((u) => u.roleId === roleDef.id);
            return (
              <Button
                key={roleDef.id}
                type="button"
                variant="outline"
                size="sm"
                className="justify-start text-xs"
                disabled={pendingRoleId !== null || !hasUser}
                onClick={() => signInAs(roleDef.id)}
              >
                {pendingRoleId === roleDef.id ? "…" : roleDef.name}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
