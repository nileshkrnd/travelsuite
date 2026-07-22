import { BarChart3 } from "lucide-react";

export function EmptyChartState({ label, height = 260 }: { label: string; height?: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground"
      style={{ height }}
    >
      <BarChart3 className="h-6 w-6" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
