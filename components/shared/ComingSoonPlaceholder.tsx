"use client";

import { Construction, ShieldAlert } from "lucide-react";
import { useSessionStore } from "@/lib/store/session.store";
import { can, type ModuleKey } from "@/config/permissions";

interface ComingSoonPlaceholderProps {
  module: ModuleKey;
  title: string;
  /** Which build step ships the real screen. */
  phase?: string;
}

export function ComingSoonPlaceholder({ module, title, phase = "a later step" }: ComingSoonPlaceholderProps) {
  const user = useSessionStore((s) => s.user);
  const allowed = user ? can(user.role, module, "view") : false;

  if (!allowed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 p-6 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Access restricted</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your role doesn&apos;t have access to {title}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 p-6 text-center">
      <Construction className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">This module ships in {phase}.</p>
    </div>
  );
}
