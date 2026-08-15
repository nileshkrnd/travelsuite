import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PropertyReadinessOverallStatus } from "@/types";

const OVERALL_META: Record<
  PropertyReadinessOverallStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  notReady: {
    label: "NOT READY",
    icon: XCircle,
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400",
  },
  readyForReview: {
    label: "READY FOR REVIEW",
    icon: AlertTriangle,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
  },
  readyToGoLive: {
    label: "READY TO GO LIVE",
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
};

export function PropertyReadinessHeader({
  propertyName,
  propertyCode,
  overallStatus,
}: {
  propertyName: string;
  propertyCode: string;
  overallStatus: PropertyReadinessOverallStatus;
}) {
  const meta = OVERALL_META[overallStatus];
  const Icon = meta.icon;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{propertyName}</h1>
        <p className="text-sm text-muted-foreground">Property Code: {propertyCode}</p>
      </div>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold",
          meta.className
        )}
      >
        <Icon className="h-4 w-4" />
        {meta.label}
      </span>
    </div>
  );
}
