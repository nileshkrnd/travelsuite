import Link from "next/link";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SetupStatusBadge } from "@/components/masters/SetupStatusBadge";
import type { ReadinessStep } from "@/types";

/** One row of the setup checklist — status, name, detail/blocking reason, and a Configure/View action. */
export function SetupChecklistItem({ step }: { step: ReadinessStep }) {
  const actionLabel = step.status === "completed" ? "View" : "Configure";

  return (
    <TableRow>
      <TableCell className="w-44">
        <SetupStatusBadge status={step.status} />
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {step.stepName}
          {!step.isMandatory && (
            <Badge variant="outline" className="text-[10px] font-normal">
              Optional
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {step.detail}
        {step.blockingReason && <p className="text-xs text-amber-600 dark:text-amber-400">{step.blockingReason}</p>}
      </TableCell>
      <TableCell className="w-28 text-right">
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={step.route} />}>
          {actionLabel}
        </Button>
      </TableCell>
    </TableRow>
  );
}
