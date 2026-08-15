import { Card } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SetupChecklistItem } from "@/components/masters/SetupChecklistItem";
import type { ReadinessStep } from "@/types";

/** Groups a set of checklist items under a heading — used for "Property Setup" and "Contract & Pricing Setup". */
export function SetupSection({
  title,
  description,
  steps,
}: {
  title: string;
  description?: string;
  steps: ReadinessStep[];
}) {
  if (steps.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Status</TableHead>
              <TableHead>Configuration</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-28 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {steps.map((step) => (
              <SetupChecklistItem key={step.stepCode} step={step} />
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
