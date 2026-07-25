"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticateByEmail, InvalidCredentialsError } from "@/lib/services/auth.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { roleHomePath } from "@/config/permissions";
import { MOCK_PASSWORD, users as demoUsers } from "@/mock/data/users";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";

/**
 * Phase 1 only: jump into seeded DB accounts (Super Admin / Tenant Admin).
 * DELETE once real auth replaces demo switcher.
 */
export function DevRoleSwitcher() {
  const t = useTranslations("auth.login");
  const login = useSessionStore((s) => s.login);
  const setTenant = useTenantStore((s) => s.setTenant);
  const roles = useRolesStore((s) => s.roles);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);

  /** Only roles that have a seeded Admin-DB login. */
  const demoRoles = roles.filter((roleDef) => demoUsers.some((u) => u.roleId === roleDef.id));

  async function signInAs(roleId: string) {
    const user = demoUsers.find((u) => u.roleId === roleId);
    const roleDef = roles.find((r) => r.id === roleId);
    if (!user || !roleDef) return;

    setPendingRoleId(roleId);
    try {
      const isSuperAdmin = roleId === SUPER_ADMIN_ROLE_ID || user.scope === "superAdmin";
      // Username+password only — do not send tenantCode (mismatch → 401).
      const authed = await authenticateByEmail(user.email, MOCK_PASSWORD);

      login(authed);
      if (isSuperAdmin) {
        router.push("/select-tenant");
        return;
      }
      setTenant(authed.tenantId);
      router.push(roleHomePath(roleDef));
    } catch (error) {
      toast.error(
        error instanceof InvalidCredentialsError
          ? error.message || "Invalid credentials (seeded password is 123456)"
          : "Login failed"
      );
    } finally {
      setPendingRoleId(null);
    }
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
          {demoRoles.map((roleDef) => (
            <Button
              key={roleDef.id}
              type="button"
              variant="outline"
              size="sm"
              className="justify-start text-xs"
              disabled={pendingRoleId !== null}
              onClick={() => void signInAs(roleDef.id)}
            >
              {pendingRoleId === roleDef.id ? "…" : roleDef.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
