import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-start gap-3 border-b border-border pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
