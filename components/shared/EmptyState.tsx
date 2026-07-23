import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  tone: "primary" | "muted";
  heading: string;
  description: string;
  /** Full-page centering vs a compact block inside a Card. */
  size?: "page" | "compact";
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, tone, heading, description, size = "page", action }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-6 text-center",
        size === "page" ? "min-h-[60vh]" : "py-12"
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full",
          tone === "primary" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{heading}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
