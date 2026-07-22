"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { BookingsTrendChart } from "@/components/dashboard/BookingsTrendChart";
import { RevenueByCurrencyChart } from "@/components/dashboard/RevenueByCurrencyChart";
import { TopDestinationsChart } from "@/components/dashboard/TopDestinationsChart";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ICONS } from "@/lib/icon-registry";
import { DASHBOARD_KPIS } from "@/config/dashboardWidgets";
import {
  getDashboardKpis,
  getBookingsTrend,
  getRevenueByCurrency,
  getTopDestinations,
  type DashboardKpis,
  type BookingsTrendPoint,
  type RevenueByCurrencyPoint,
  type TopDestinationPoint,
} from "@/lib/services/bookings.service";
import { getRecentActivity } from "@/lib/services/activity.service";
import type { ActivityItem } from "@/types";
import { ROLE_LABELS } from "@/types";

export default function DashboardPage() {
  const user = useSessionStore((s) => s.user);
  const tenantId = useTenantStore((s) => s.tenantId);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [trend, setTrend] = useState<BookingsTrendPoint[]>([]);
  const [revenue, setRevenue] = useState<RevenueByCurrencyPoint[]>([]);
  const [destinations, setDestinations] = useState<TopDestinationPoint[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    Promise.all([
      getDashboardKpis(tenantId, user.role, user.id),
      getBookingsTrend(tenantId, user.role, user.id),
      getRevenueByCurrency(tenantId, user.role, user.id),
      getTopDestinations(tenantId, user.role, user.id),
      getRecentActivity(tenantId),
    ]).then(([kpisRes, trendRes, revenueRes, destinationsRes, activityRes]) => {
      if (cancelled) return;
      setKpis(kpisRes);
      setTrend(trendRes);
      setRevenue(revenueRes);
      setDestinations(destinationsRes);
      setActivity(activityRes);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [tenantId, user]);

  if (!user) return null;

  const widgets = DASHBOARD_KPIS[user.role];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description={`${ROLE_LABELS[user.role]} · here's what's happening today`}
        actions={<QuickActions role={user.role} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {widgets.map((widget) => (
          <KpiCard
            key={widget.key}
            label={widget.label}
            icon={ICONS[widget.icon]}
            value={kpis ? kpis[widget.key] : 0}
            format={widget.format}
            loading={loading || !kpis}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BookingsTrendChart data={trend} loading={loading} />
        <RevenueByCurrencyChart data={revenue} loading={loading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopDestinationsChart data={destinations} loading={loading} />
        <ActivityFeed items={activity} loading={loading} />
      </div>
    </div>
  );
}
