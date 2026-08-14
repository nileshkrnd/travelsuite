"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileSignature, PlusCircle } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyContractSupplementForm } from "@/components/masters/PropertyContractSupplementForm";
import { getPropertyContract, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import {
  getPropertyContractSupplement,
  PropertyContractSupplementApiError,
} from "@/lib/services/property-contract-supplements.service";
import type { PropertyContract, PropertyContractSupplement } from "@/types";

function EditContractSupplement() {
  const { role, propertyContractId, propertyContractSupplementId } = useParams<{
    role: string;
    propertyContractId: string;
    propertyContractSupplementId: string;
  }>();
  const [contract, setContract] = useState<PropertyContract | null>(null);
  const [entry, setEntry] = useState<PropertyContractSupplement | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const contractId = Number(propertyContractId);
    const supplementId = Number(propertyContractSupplementId);
    if (
      !Number.isFinite(contractId) ||
      contractId <= 0 ||
      !Number.isFinite(supplementId) ||
      supplementId <= 0
    ) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getPropertyContract(contractId), getPropertyContractSupplement(supplementId)])
      .then(([contractRow, supplementRow]) => {
        if (cancelled) return;
        if (supplementRow.propertyContractId !== contractRow.propertyContractKey) {
          setNotFound(true);
          setContract(null);
          setEntry(null);
          return;
        }
        setContract(contractRow);
        setEntry(supplementRow);
        setNotFound(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setContract(null);
          setEntry(null);
          setNotFound(
            (err instanceof PropertyContractsApiError ||
              err instanceof PropertyContractSupplementApiError) &&
              err.status === 404
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyContractId, propertyContractSupplementId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !contract || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={PlusCircle}
          tone="muted"
          heading="Contract supplement not found"
          description="This supplement may have been removed or does not belong to this contract."
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/extranet/contracts/${propertyContractId}?tab=supplements`} />}
            >
              <FileSignature className="h-4 w-4" />
              Back to contract
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Edit contract supplement"
        description={entry.supplementName}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/${role}/extranet/contracts/${contract.propertyContractKey}?tab=supplements`} />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contract
          </Button>
        }
      />
      <PropertyContractSupplementForm lockedContract={contract} entry={entry} />
    </div>
  );
}

export default function EditContractSupplementPage() {
  return (
    <AccessGate module="contracts" action="edit">
      {() => <EditContractSupplement />}
    </AccessGate>
  );
}
