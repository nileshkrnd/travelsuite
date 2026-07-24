import Link from "next/link";
import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

export function UnknownTenant({ tenantSlug }: { tenantSlug: string }) {
  return (
    <EmptyState
      icon={Building2}
      tone="muted"
      heading="We don't recognize this organization"
      description={`No tenant is registered with the code "${tenantSlug}". Check the link, or sign in with your tenant code instead.`}
      action={
        <Button nativeButton={false} render={<Link href="/login" />}>
          Go to sign in
        </Button>
      }
    />
  );
}
