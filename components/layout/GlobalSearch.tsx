"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { flatMenuItems, getMenuForRole } from "@/config/permissions";
import { ICONS } from "@/lib/icon-registry";
import { useSessionStore } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { isPlatformMode, useTenantStore } from "@/lib/store/tenant.store";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const topbar = useTranslations("topbar");
  const sidebar = useTranslations("sidebar");
  const user = useSessionStore((s) => s.user);
  const roles = useRolesStore((s) => s.roles);
  const tenantId = useTenantStore((s) => s.tenantId);
  const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    if (!roleDef || !query.trim()) return [];
    const allowed = new Set(
      getMenuForRole(roleDef, { platformMode: isPlatformMode(tenantId) })
        .flatMap((item) => (item.children ? item.children : [item]))
        .map((i) => i.key)
    );
    const q = query.trim().toLowerCase();
    return flatMenuItems()
      .filter((item) => allowed.has(item.key))
      .filter((item) => {
        const label = sidebar(item.key).toLowerCase();
        return label.includes(q) || item.path.includes(q) || item.key.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [query, roleDef, sidebar, tenantId]);

  function go(path: string) {
    if (!roleDef) return;
    setOpen(false);
    setQuery("");
    router.push(`/${roleDef.slug}/${path}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-full max-w-xs items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted md:flex"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{topbar("searchPlaceholder")}</span>
        <kbd className="ms-auto hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline">
          ⌘K
        </kbd>
      </button>
      <ButtonIconSearch onClick={() => setOpen(true)} label={topbar("search")} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>{topbar("search")}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={topbar("searchPlaceholder")}
              className="h-12 border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {query.trim() ? "No matching pages" : "Start typing to search menus…"}
              </p>
            ) : (
              results.map((item) => {
                const Icon = ICONS[item.icon];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => go(item.path)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="flex-1 truncate font-medium">{sidebar(item.key)}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.path}</span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ButtonIconSearch({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
    >
      <Search className="h-4 w-4" />
    </button>
  );
}
