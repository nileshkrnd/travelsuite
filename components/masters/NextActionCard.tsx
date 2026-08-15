import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReadinessNextAction } from "@/types";

/** "What should I do next" CTA — the single most important element on the readiness dashboard. */
export function NextActionCard({ nextAction }: { nextAction: ReadinessNextAction | null }) {
  if (!nextAction) {
    return (
      <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
        <CardContent className="flex items-center gap-3 py-5">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-300">All set — ready to go live</p>
            <p className="text-sm text-emerald-800/80 dark:text-emerald-400/80">
              Every required (and recommended) configuration item is complete for this property.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div className="flex items-start gap-3">
          <ArrowRight className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Next recommended action
            </p>
            <p className="font-semibold">{nextAction.label}</p>
            <p className="text-sm text-muted-foreground">{nextAction.description}</p>
          </div>
        </div>
        <Button nativeButton={false} render={<Link href={nextAction.route} />}>
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
