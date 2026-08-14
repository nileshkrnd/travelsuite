"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileSignature } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyContractForm } from "@/components/masters/PropertyContractForm";
import { getPropertyContract, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import type { PropertyContract } from "@/types";

function EditPropertyContract() {
  const { role, propertyContractId } = useParams<{ role: string; propertyContractId: string }>();
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
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
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
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Modify property contract"
        description={`Update terms and validity for ${entry.contractName}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/extranet/contracts/${entry.propertyContractKey}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <PropertyContractForm entry={entry} />
    </div>
  );
}

export default function EditPropertyContractPage() {
  return (
    <AccessGate module="contracts" action="edit">
      {() => <EditPropertyContract />}
    </AccessGate>
  );
}
