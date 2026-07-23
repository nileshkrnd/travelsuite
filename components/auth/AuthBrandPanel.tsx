"use client";

import { useTenantStore } from "@/lib/store/tenant.store";
import { contrastForeground } from "@/lib/color";
import { TenantLogo } from "@/components/layout/TenantLogo";
import { CalendarCheck, Globe2, Wallet } from "lucide-react";

const HIGHLIGHTS = [
  { icon: CalendarCheck, text: "Bookings, inventory and approvals in one workspace" },
  { icon: Wallet, text: "Multi-currency billing with real-time totals" },
  { icon: Globe2, text: "Built for every partner: hoteliers, agents, suppliers" },
];

export function AuthBrandPanel() {
  const tenant = useTenantStore((s) => s.tenant);
  const foreground = contrastForeground(tenant.branding.primaryColor);
  const isDark = foreground === "#fafafa";

  return (
    <div
      className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex"
      style={{ backgroundColor: tenant.branding.primaryColor, color: foreground }}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full blur-3xl"
        style={{ backgroundColor: `${foreground}22` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(${foreground} 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />
      <TenantLogo
        branding={{ ...tenant.branding, primaryColor: isDark ? "#ffffff33" : "#00000014" }}
        size="md"
        showName
        className="relative"
      />
      <div className="relative space-y-9">
        <p className="text-3xl leading-[1.15] font-semibold tracking-tight">
          The admin panel that keeps every partner in {tenant.branding.name.split(" ")[0]}&apos;s
          network moving.
        </p>
        <ul className="space-y-4">
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm opacity-90">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${foreground}1a` }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="relative text-xs opacity-70">
        © {new Date().getFullYear()} {tenant.branding.name}. All rights reserved.
      </p>
    </div>
  );
}
