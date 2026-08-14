"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BadgeDollarSign, FileSignature } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyContractRateForm } from "@/components/masters/PropertyContractRateForm";
import { getPropertyContract, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import {
  getPropertyContractRate,
  PropertyContractRatesApiError,
} from "@/lib/services/property-contract-rates.service";
import type { PropertyContract, PropertyContractRate } from "@/types";

function EditContractRate() {
  const { role, propertyContractId, propertyContractRateId } = useParams<{
    role: string;
    propertyContractId: string;
    propertyContractRateId: string;
  }>();
  const [contract, setContract] = useState<PropertyContract | null>(null);
  const [entry, setEntry] = useState<PropertyContractRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const contractId = Number(propertyContractId);
    const rateId = Number(propertyContractRateId);
    if (!Number.isFinite(contractId) || contractId <= 0 || !Number.isFinite(rateId) || rateId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getPropertyContract(contractId), getPropertyContractRate(rateId)])
      .then(([contractRow, rateRow]) => {
        if (cancelled) return;
        if (rateRow.propertyContractId !== contractRow.propertyContractKey) {
          setNotFound(true);
          setContract(null);
          setEntry(null);
          return;
        }
        setContract(contractRow);
        setEntry(rateRow);
        setNotFound(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setContract(null);
          setEntry(null);
          setNotFound(
            (err instanceof PropertyContractsApiError || err instanceof PropertyContractRatesApiError) &&
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
  }, [propertyContractId, propertyContractRateId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !contract || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={BadgeDollarSign}
          tone="muted"
          heading="Contract rate not found"
          description="This rate may have been removed or does not belong to this contract."
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/extranet/contracts/${propertyContractId}?tab=rates`} />}
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
        title="Modify contract rate"
        description={`Update rate on ${contract.contractName}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/${role}/extranet/contracts/${contract.propertyContractKey}?tab=rates`} />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contract
          </Button>
        }
      />
      <PropertyContractRateForm entry={entry} lockedContract={contract} />
    </div>
  );
}

export default function EditContractRatePage() {
  return (
    <AccessGate module="contracts" action="edit">
      {() => <EditContractRate />}
    </AccessGate>
  );
}
