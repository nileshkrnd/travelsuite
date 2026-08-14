"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import type { RoleDef } from "@/types";

export function AppShell({ roleDef, children }: { roleDef: RoleDef; children: React.ReactNode }) {
  const mobileDrawerOpen = useUiPrefsStore((s) => s.mobileDrawerOpen);
  const setMobileDrawerOpen = useUiPrefsStore((s) => s.setMobileDrawerOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/50 print:block print:h-auto print:overflow-visible print:bg-white">
      <Sidebar roleDef={roleDef} className="hidden lg:flex print:hidden" />

      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent side="left" className="w-72 p-0 sm:max-w-72 print:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar roleDef={roleDef} mobile onNavigate={() => setMobileDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col print:block">
        <Topbar />
        <main className="flex-1 overflow-y-auto print:overflow-visible">{children}</main>
      </div>
    </div>
  );
}
