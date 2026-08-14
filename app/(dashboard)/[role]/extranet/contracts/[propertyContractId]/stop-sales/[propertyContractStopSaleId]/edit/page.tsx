"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CircleOff, FileSignature } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyContractStopSaleForm } from "@/components/masters/PropertyContractStopSaleForm";
import { getPropertyContract, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import {
  getPropertyContractStopSale,
  PropertyContractStopSaleApiError,
} from "@/lib/services/property-contract-stop-sales.service";
import type { PropertyContract } from "@/types";
import type { PropertyContractStopSale } from "@/types/property-contract-stop-sale";

function EditContractStopSale() {
  const { role, propertyContractId, propertyContractStopSaleId } = useParams<{
    role: string;
    propertyContractId: string;
    propertyContractStopSaleId: string;
  }>();
  const [contract, setContract] = useState<PropertyContract | null>(null);
  const [entry, setEntry] = useState<PropertyContractStopSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const contractId = Number(propertyContractId);
    const stopSaleId = Number(propertyContractStopSaleId);
    if (
      !Number.isFinite(contractId) ||
      contractId <= 0 ||
      !Number.isFinite(stopSaleId) ||
      stopSaleId <= 0
    ) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getPropertyContract(contractId), getPropertyContractStopSale(stopSaleId)])
      .then(([contractRow, stopSaleRow]) => {
        if (cancelled) return;
        if (stopSaleRow.propertyContractId !== contractRow.propertyContractKey) {
          setNotFound(true);
          setContract(null);
          setEntry(null);
          return;
        }
        setContract(contractRow);
        setEntry(stopSaleRow);
        setNotFound(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setContract(null);
          setEntry(null);
          setNotFound(
            (err instanceof PropertyContractsApiError ||
              err instanceof PropertyContractStopSaleApiError) &&
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
  }, [propertyContractId, propertyContractStopSaleId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !contract || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={CircleOff}
          tone="muted"
          heading="Stop sale not found"
          description="This stop sale may have been removed or does not belong to this contract."
          action={
            <Button
              nativeButton={false}
              render={
                <Link href={`/${role}/extranet/contracts/${propertyContractId}?tab=stop-sales`} />
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

  const description = `${entry.fromDate} – ${entry.toDate}`;

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Edit stop sale"
        description={description}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/${role}/extranet/contracts/${contract.propertyContractKey}?tab=stop-sales`}
              />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contract
          </Button>
        }
      />
      <PropertyContractStopSaleForm lockedContract={contract} entry={entry} />
    </div>
  );
}

export default function EditContractStopSalePage() {
  return (
    <AccessGate module="contracts" action="edit">
      {() => <EditContractStopSale />}
    </AccessGate>
  );
}
