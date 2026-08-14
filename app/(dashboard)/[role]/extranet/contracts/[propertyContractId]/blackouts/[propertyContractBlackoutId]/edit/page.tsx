"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarOff, FileSignature } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyContractBlackoutForm } from "@/components/masters/PropertyContractBlackoutForm";
import { getPropertyContract, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import {
  getPropertyContractBlackout,
  PropertyContractBlackoutApiError,
} from "@/lib/services/property-contract-blackouts.service";
import type { PropertyContract } from "@/types";
import type { PropertyContractBlackout } from "@/types/property-contract-blackout";

function EditContractBlackout() {
  const { role, propertyContractId, propertyContractBlackoutId } = useParams<{
    role: string;
    propertyContractId: string;
    propertyContractBlackoutId: string;
  }>();
  const [contract, setContract] = useState<PropertyContract | null>(null);
  const [entry, setEntry] = useState<PropertyContractBlackout | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const contractId = Number(propertyContractId);
    const blackoutId = Number(propertyContractBlackoutId);
    if (
      !Number.isFinite(contractId) ||
      contractId <= 0 ||
      !Number.isFinite(blackoutId) ||
      blackoutId <= 0
    ) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getPropertyContract(contractId), getPropertyContractBlackout(blackoutId)])
      .then(([contractRow, blackoutRow]) => {
        if (cancelled) return;
        if (blackoutRow.propertyContractId !== contractRow.propertyContractKey) {
          setNotFound(true);
          setContract(null);
          setEntry(null);
          return;
        }
        setContract(contractRow);
        setEntry(blackoutRow);
        setNotFound(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setContract(null);
          setEntry(null);
          setNotFound(
            (err instanceof PropertyContractsApiError ||
              err instanceof PropertyContractBlackoutApiError) &&
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
  }, [propertyContractId, propertyContractBlackoutId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !contract || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={CalendarOff}
          tone="muted"
          heading="Blackout not found"
          description="This blackout may have been removed or does not belong to this contract."
          action={
            <Button
              nativeButton={false}
              render={
                <Link href={`/${role}/extranet/contracts/${propertyContractId}?tab=blackouts`} />
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
        title="Edit blackout"
        description={`${entry.fromDate} – ${entry.toDate}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/${role}/extranet/contracts/${contract.propertyContractKey}?tab=blackouts`}
              />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contract
          </Button>
        }
      />
      <PropertyContractBlackoutForm lockedContract={contract} entry={entry} />
    </div>
  );
}

export default function EditContractBlackoutPage() {
  return (
    <AccessGate module="contracts" action="edit">
      {() => <EditContractBlackout />}
    </AccessGate>
  );
}
