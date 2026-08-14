"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileSignature, Tags } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyContractRatePlanForm } from "@/components/masters/PropertyContractRatePlanForm";
import { getPropertyContract, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import {
  getPropertyContractRatePlan,
  PropertyContractRatePlansApiError,
} from "@/lib/services/property-contract-rate-plans.service";
import type { PropertyContract, PropertyContractRatePlan } from "@/types";

function EditContractRatePlan() {
  const { role, propertyContractId, propertyContractRatePlanId } = useParams<{
    role: string;
    propertyContractId: string;
    propertyContractRatePlanId: string;
  }>();
  const [contract, setContract] = useState<PropertyContract | null>(null);
  const [entry, setEntry] = useState<PropertyContractRatePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const contractId = Number(propertyContractId);
    const ratePlanId = Number(propertyContractRatePlanId);
    if (!Number.isFinite(contractId) || contractId <= 0 || !Number.isFinite(ratePlanId) || ratePlanId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getPropertyContract(contractId), getPropertyContractRatePlan(ratePlanId)])
      .then(([contractRow, ratePlanRow]) => {
        if (cancelled) return;
        if (ratePlanRow.propertyContractId !== contractRow.propertyContractKey) {
          setNotFound(true);
          setContract(null);
          setEntry(null);
          return;
        }
        setContract(contractRow);
        setEntry(ratePlanRow);
        setNotFound(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setContract(null);
          setEntry(null);
          setNotFound(
            (err instanceof PropertyContractsApiError ||
              err instanceof PropertyContractRatePlansApiError) &&
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
  }, [propertyContractId, propertyContractRatePlanId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !contract || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Tags}
          tone="muted"
          heading="Rate plan not found"
          description="This rate plan may have been removed or does not belong to this contract."
          action={
            <Button
              nativeButton={false}
              render={
                <Link href={`/${role}/extranet/contracts/${propertyContractId}?tab=rate-plans`} />
              }
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
        title="Modify rate plan"
        description={`Update ${entry.ratePlanName} on ${contract.contractName}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/${role}/extranet/contracts/${contract.propertyContractKey}?tab=rate-plans`} />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contract
          </Button>
        }
      />
      <PropertyContractRatePlanForm entry={entry} lockedContract={contract} />
    </div>
  );
}

export default function EditContractRatePlanPage() {
  return (
    <AccessGate module="contracts" action="edit">
      {() => <EditContractRatePlan />}
    </AccessGate>
  );
}
