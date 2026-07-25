"use client";

import { useEffect, useState } from "react";
import { Building2, GitBranch, Target, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TargetVsActualChart } from "@/components/dashboard/TargetVsActualChart";
import { YoYComparisonChart } from "@/components/dashboard/YoYComparisonChart";
import { PerformanceTable } from "@/components/dashboard/PerformanceTable";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import {
  getTenantPerformance,
  type TenantPerformanceSummary,
} from "@/lib/services/performance.service";
import { getRecentActivity } from "@/lib/services/activity.service";
import type { ActivityItem, RoleDef, User } from "@/types";

function moneyValue(n: number) {
  return { value: Math.round(n), currencyCode: "USD" as const };
}

export function TenantAdminDashboard({
  user,
  roleDef,
  tenantId,
  subtitle,
}: {
  user: User;
  roleDef: RoleDef;
  tenantId: string;
  /** Overrides the default role line under the welcome title. */
  subtitle?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [perf, setPerf] = useState<TenantPerformanceSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getTenantPerformance(tenantId), getRecentActivity(tenantId)]).then(
      ([perfRes, activityRes]) => {
        if (cancelled) return;
        setPerf(perfRes);
        setActivity(activityRes);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description={subtitle ?? "Tenant Admin · all companies and branches under your tenant"}
        actions={<QuickActions roleDef={roleDef} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Actual revenue"
          icon={TrendingUp}
          value={moneyValue(perf?.actualRevenue ?? 0)}
          format="money"
          loading={loading || !perf}
        />
        <KpiCard
          label="Target revenue"
          icon={Target}
          value={moneyValue(perf?.targetRevenue ?? 0)}
          format="money"
          loading={loading || !perf}
        />
        <KpiCard
          label="Attainment"
          icon={Building2}
          value={perf?.attainmentPct ?? 0}
          format="percent"
          loading={loading || !perf}
        />
        <KpiCard
          label="vs last year"
          icon={GitBranch}
          value={perf?.yoyGrowthPct ?? 0}
          format="percent"
          loading={loading || !perf}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TargetVsActualChart data={perf?.monthly ?? []} loading={loading} />
        <YoYComparisonChart data={perf?.monthly ?? []} loading={loading} />
      </div>

      <PerformanceTable
        title="Company performance"
        description="Actual vs target and last-year comparison by company"
        rows={perf?.companies ?? []}
        loading={loading}
      />

      <PerformanceTable
        title="Branch performance"
        description="How each branch is tracking against plan"
        rows={perf?.branches ?? []}
        loading={loading}
        showCompany
      />

      <ActivityFeed items={activity} loading={loading} />
    </div>
  );
}
