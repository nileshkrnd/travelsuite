"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Layers, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type MenuItem } from "@/config/permissions";
import { ICONS } from "@/lib/icon-registry";
import { useSessionStore } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { useWorkspaceMenus } from "@/lib/hooks/useWorkspaceMenus";
import { menuItemHref } from "@/lib/menu-active-path";
import { normalizeMenuUrl } from "@/lib/normalize-menu-url";
import { Button } from "@/components/ui/button";

function flattenLeaves(items: MenuItem[]): MenuItem[] {
  return items.flatMap((item) => (item.children ? flattenLeaves(item.children) : [item]));
}

function itemLabel(item: MenuItem, t: (key: string) => string): string {
  if (item.label) return item.label;
  try {
    return t(item.key);
  } catch {
    return item.key;
  }
}

function ButtonIconSearch({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="md:hidden"
      aria-label={label}
      onClick={onClick}
    >
      <Search className="h-4 w-4" />
    </Button>
  );
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const params = useParams<{ role?: string }>();
  const topbar = useTranslations("topbar");
  const sidebar = useTranslations("sidebar");
  const user = useSessionStore((s) => s.user);
  const roles = useRolesStore((s) => s.roles);
  const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;
  const roleSlug =
    typeof params.role === "string" && params.role ? params.role : roleDef?.slug ?? "";
  const { items } = useWorkspaceMenus(roleDef);

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

  const searchableMenus = useMemo(() => flattenLeaves(items), [items]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return searchableMenus
      .filter((item) => {
        const label = itemLabel(item, sidebar).toLowerCase();
        const path = normalizeMenuUrl(item.path);
        return label.includes(q) || path.includes(q) || item.key.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [query, searchableMenus, sidebar]);

  function go(path: string) {
    if (!roleSlug) return;
    setOpen(false);
    setQuery("");
    router.push(menuItemHref(roleSlug, path));
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
                const Icon = ICONS[item.icon] ?? Layers;
                const path = normalizeMenuUrl(item.path);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => go(path)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{itemLabel(item, sidebar)}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {menuItemHref(roleSlug, path)}
                      </span>
                    </span>
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
