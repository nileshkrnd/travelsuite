"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Baby, FileSignature } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyContractChildPolicyForm } from "@/components/masters/PropertyContractChildPolicyForm";
import { getPropertyContract, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import {
  getPropertyContractChildPolicy,
  PropertyContractChildPolicyApiError,
} from "@/lib/services/property-contract-child-policies.service";
import type { PropertyContract, PropertyContractChildPolicy } from "@/types";

function EditContractChildPolicy() {
  const { role, propertyContractId, propertyContractChildPolicyId } = useParams<{
    role: string;
    propertyContractId: string;
    propertyContractChildPolicyId: string;
  }>();
  const [contract, setContract] = useState<PropertyContract | null>(null);
  const [entry, setEntry] = useState<PropertyContractChildPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const contractId = Number(propertyContractId);
    const policyId = Number(propertyContractChildPolicyId);
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
    Promise.all([getPropertyContract(contractId), getPropertyContractChildPolicy(policyId)])
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
              err instanceof PropertyContractChildPolicyApiError) &&
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
  }, [propertyContractId, propertyContractChildPolicyId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !contract || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Baby}
          tone="muted"
          heading="Child policy not found"
          description="This policy may have been removed or does not belong to this contract."
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/extranet/contracts/${propertyContractId}?tab=child-policies`} />}
            >
              <FileSignature className="h-4 w-4" />
              Back to contract
            </Button>
          }
        />
      </div>
    );
  }

  const roomLabel = entry.roomName ?? entry.roomCode ?? "All rooms";

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Edit child policy"
        description={roomLabel}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/${role}/extranet/contracts/${contract.propertyContractKey}?tab=child-policies`} />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contract
          </Button>
        }
      />
      <PropertyContractChildPolicyForm lockedContract={contract} entry={entry} />
    </div>
  );
}

export default function EditContractChildPolicyPage() {
  return (
    <AccessGate module="contracts" action="edit">
      {() => <EditContractChildPolicy />}
    </AccessGate>
  );
}
