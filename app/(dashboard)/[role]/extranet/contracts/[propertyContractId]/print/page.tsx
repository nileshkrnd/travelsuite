"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileSignature, Printer } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { ContractPrintableDocument } from "@/components/masters/ContractPrintableDocument";
import { useTenantStore } from "@/lib/store/tenant.store";
import {
  getPropertyContract,
  PropertyContractsApiError,
} from "@/lib/services/property-contracts.service";
import type { PropertyContract } from "@/types";

function PropertyContractPrintView() {
  const { role, propertyContractId } = useParams<{ role: string; propertyContractId: string }>();
  const issuerName = useTenantStore((s) => s.tenant.branding.name);
  const [entry, setEntry] = useState<PropertyContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = Number(propertyContractId);
    if (!Number.isFinite(id) || id <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPropertyContract(id)
      .then((row) => {
        if (!cancelled) {
          setEntry(row);
          setNotFound(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEntry(null);
          setNotFound(err instanceof PropertyContractsApiError && err.status === 404);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyContractId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading contract…</div>;
  }

  if (notFound || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FileSignature}
          tone="muted"
          heading="Contract not found"
          description="This contract may have been removed."
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/extranet/contracts`} />}>
              Back to list
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 print:space-y-0 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/${role}/extranet/contracts/${entry.propertyContractKey}`} />}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contract
        </Button>
        <Button type="button" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>
      <ContractPrintableDocument contract={entry} issuerName={issuerName} />
    </div>
  );
}

export default function PropertyContractPrintPage() {
  return (
    <AccessGate module="contracts">
      {() => (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading contract…</div>}>
          <PropertyContractPrintView />
        </Suspense>
      )}
    </AccessGate>
  );
}
