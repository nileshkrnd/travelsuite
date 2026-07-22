"use client";

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: { value?: number }[];
  formatter?: (value: number) => string;
}

export function ChartTooltip({ active, label, payload, formatter }: ChartTooltipProps) {
  if (!active || !payload?.length || payload[0].value === undefined) return null;
  const value = payload[0].value;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md ring-1 ring-foreground/10">
      {label && <p className="font-medium text-popover-foreground">{label}</p>}
      <p className="text-muted-foreground">{formatter ? formatter(value) : value}</p>
    </div>
  );
}
