"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Headphones, Ticket } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function HelpdeskDashboard() {
  const { role } = useParams<{ role: string }>();
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Helpdesk"
        description="Email-driven support tickets from Microsoft 365."
      />
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Support Tickets</p>
              <p className="text-sm text-muted-foreground">
                Sync the mailbox and manage conversation threads as tickets.
              </p>
            </div>
          </div>
          <Button nativeButton={false} render={<Link href={`/${role}/helpdesk/tickets`} />}>
            <Ticket className="h-4 w-4" />
            Open tickets
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function HelpdeskDashboardPage() {
  return (
    <AccessGate module="helpdeskDashboard">{() => <HelpdeskDashboard />}</AccessGate>
  );
}
