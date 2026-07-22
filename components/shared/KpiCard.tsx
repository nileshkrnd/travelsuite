import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/shared/Money";
import type { Money as MoneyValue } from "@/types";
import type { KpiFormat } from "@/config/dashboardWidgets";

interface KpiCardProps {
  label: string;
  icon: LucideIcon;
  value: number | MoneyValue;
  format: KpiFormat;
  loading?: boolean;
}

export function KpiCard({ label, icon: Icon, value, format, loading }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {format === "money" && <Money money={value as MoneyValue} />}
              {format === "number" && new Intl.NumberFormat("en").format(value as number)}
              {format === "percent" && `${value}%`}
            </p>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
