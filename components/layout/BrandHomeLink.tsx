"use client";

import Link from "next/link";
import { roleHomePath } from "@/config/permissions";
import { useSessionStore } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { cn } from "@/lib/utils";

/** Logo / brand click target: home when logged out, role dashboard when logged in. */
export function BrandHomeLink({
  children,
  className,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const user = useSessionStore((s) => s.user);
  const roles = useRolesStore((s) => s.roles);
  const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;
  const href = roleDef ? roleHomePath(roleDef) : "/";

  return (
    <Link
      href={href}
      className={cn(className)}
      aria-label={ariaLabel ?? (roleDef ? "Go to dashboard" : "Go to home")}
    >
      {children}
    </Link>
  );
}
