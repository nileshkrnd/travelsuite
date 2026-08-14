"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ContractSeasonPeriodDetailRedirectPage() {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/${role}/extranet/contracts`);
  }, [role, router]);
  return <div className="p-6 text-sm text-muted-foreground">Redirecting to contracts…</div>;
}
