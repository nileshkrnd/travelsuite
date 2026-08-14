"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, FileSignature } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyContractSeasonPeriodForm } from "@/components/masters/PropertyContractSeasonPeriodForm";
import { getPropertyContract, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import {
  getPropertyContractSeasonPeriod,
  PropertyContractSeasonPeriodsApiError,
} from "@/lib/services/property-contract-season-periods.service";
import type { PropertyContract, PropertyContractSeasonPeriod } from "@/types";

function EditContractSeasonPeriod() {
  const { role, propertyContractId, propertyContractSeasonPeriodId } = useParams<{
    role: string;
    propertyContractId: string;
    propertyContractSeasonPeriodId: string;
  }>();
  const [contract, setContract] = useState<PropertyContract | null>(null);
  const [entry, setEntry] = useState<PropertyContractSeasonPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const contractId = Number(propertyContractId);
    const periodId = Number(propertyContractSeasonPeriodId);
    if (!Number.isFinite(contractId) || contractId <= 0 || !Number.isFinite(periodId) || periodId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getPropertyContract(contractId), getPropertyContractSeasonPeriod(periodId)])
      .then(([contractRow, periodRow]) => {
        if (cancelled) return;
        if (periodRow.propertyContractId !== contractRow.propertyContractKey) {
          setNotFound(true);
          setContract(null);
          setEntry(null);
          return;
        }
        setContract(contractRow);
        setEntry(periodRow);
        setNotFound(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setContract(null);
          setEntry(null);
          setNotFound(
            (err instanceof PropertyContractsApiError ||
              err instanceof PropertyContractSeasonPeriodsApiError) &&
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
  }, [propertyContractId, propertyContractSeasonPeriodId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !contract || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={CalendarDays}
          tone="muted"
          heading="Season period not found"
          description="This period may have been removed or does not belong to this contract."
          action={
            <Button
              nativeButton={false}
              render={
                <Link href={`/${role}/extranet/contracts/${propertyContractId}?tab=season-periods`} />
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
        title="Modify season period"
        description={`Update period for ${entry.seasonName ?? "season"} on ${contract.contractName}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/${role}/extranet/contracts/${contract.propertyContractKey}?tab=season-periods`} />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contract
          </Button>
        }
      />
      <PropertyContractSeasonPeriodForm entry={entry} lockedContract={contract} />
    </div>
  );
}

export default function EditContractSeasonPeriodPage() {
  return (
    <AccessGate module="contracts" action="edit">
      {() => <EditContractSeasonPeriod />}
    </AccessGate>
  );
}
