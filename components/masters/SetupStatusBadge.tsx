import { AlertCircle, AlertTriangle, CheckCircle2, Circle, Lock, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReadinessStatus } from "@/types";

const STATUS_META: Record<ReadinessStatus, { icon: typeof CheckCircle2; label: string; className: string }> = {
  completed: { icon: CheckCircle2, label: "Completed", className: "text-emerald-600 dark:text-emerald-400" },
  inProgress: { icon: AlertTriangle, label: "In Progress", className: "text-amber-600 dark:text-amber-400" },
  pending: { icon: AlertCircle, label: "Pending", className: "text-red-600 dark:text-red-400" },
  blocked: { icon: Lock, label: "Blocked", className: "text-muted-foreground" },
  optional: { icon: Circle, label: "Optional", className: "text-muted-foreground" },
  notApplicable: { icon: MinusCircle, label: "Not applicable", className: "text-muted-foreground" },
};

/** Icon + text status indicator — never color-only, per the readiness dashboard's visual language. */
export function SetupStatusBadge({ status, size = "default" }: { status: ReadinessStatus; size?: "default" | "sm" }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium", size === "sm" ? "text-xs" : "text-sm", meta.className)}>
      <Icon className={size === "sm" ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0"} />
      {meta.label}
    </span>
  );
}
