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
      <div className="relative space-y-8">
        <p className="text-2xl font-medium leading-snug">
          The admin panel that keeps every partner in {tenant.branding.name.split(" ")[0]}&apos;s
          network moving.
        </p>
        <ul className="space-y-4">
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm opacity-90">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
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
