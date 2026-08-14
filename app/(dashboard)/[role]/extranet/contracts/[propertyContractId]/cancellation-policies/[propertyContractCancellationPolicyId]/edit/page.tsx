"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Ban, FileSignature } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyContractCancellationPolicyForm } from "@/components/masters/PropertyContractCancellationPolicyForm";
import { getPropertyContract, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import {
  getPropertyContractCancellationPolicy,
  PropertyContractCancellationPolicyApiError,
} from "@/lib/services/property-contract-cancellation-policies.service";
import type { PropertyContract, PropertyContractCancellationPolicy } from "@/types";

function EditContractCancellationPolicy() {
  const { role, propertyContractId, propertyContractCancellationPolicyId } = useParams<{
    role: string;
    propertyContractId: string;
    propertyContractCancellationPolicyId: string;
  }>();
  const [contract, setContract] = useState<PropertyContract | null>(null);
  const [entry, setEntry] = useState<PropertyContractCancellationPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const contractId = Number(propertyContractId);
    const policyId = Number(propertyContractCancellationPolicyId);
    if (
      !Number.isFinite(contractId) ||
      contractId <= 0 ||
      !Number.isFinite(policyId) ||
      policyId <= 0
    ) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getPropertyContract(contractId), getPropertyContractCancellationPolicy(policyId)])
      .then(([contractRow, policyRow]) => {
        if (cancelled) return;
        if (policyRow.propertyContractId !== contractRow.propertyContractKey) {
          setNotFound(true);
          setContract(null);
          setEntry(null);
          return;
        }
        setContract(contractRow);
        setEntry(policyRow);
        setNotFound(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setContract(null);
          setEntry(null);
          setNotFound(
            (err instanceof PropertyContractsApiError ||
              err instanceof PropertyContractCancellationPolicyApiError) &&
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
  }, [propertyContractId, propertyContractCancellationPolicyId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !contract || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Ban}
          tone="muted"
          heading="Cancellation policy not found"
          description="This policy may have been removed or does not belong to this contract."
          action={
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/${role}/extranet/contracts/${propertyContractId}?tab=cancellation-policies`}
                />
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
        title="Edit cancellation policy"
        description={entry.policyName}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/${role}/extranet/contracts/${contract.propertyContractKey}?tab=cancellation-policies`}
              />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contract
          </Button>
        }
      />
      <PropertyContractCancellationPolicyForm lockedContract={contract} entry={entry} />
    </div>
  );
}

export default function EditContractCancellationPolicyPage() {
  return (
    <AccessGate module="contracts" action="edit">
      {() => <EditContractCancellationPolicy />}
    </AccessGate>
  );
}
