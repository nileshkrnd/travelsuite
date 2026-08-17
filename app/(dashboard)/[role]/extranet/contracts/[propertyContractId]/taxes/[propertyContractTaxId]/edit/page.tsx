"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileSignature, Landmark } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyContractTaxForm } from "@/components/masters/PropertyContractTaxForm";
import { getPropertyContract, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import {
  getPropertyContractTax,
  PropertyContractTaxApiError,
} from "@/lib/services/property-contract-taxes.service";
import type { PropertyContract, PropertyContractTax } from "@/types";

function EditContractTax() {
  const { role, propertyContractId, propertyContractTaxId } = useParams<{
    role: string;
    propertyContractId: string;
    propertyContractTaxId: string;
  }>();
  const [contract, setContract] = useState<PropertyContract | null>(null);
  const [entry, setEntry] = useState<PropertyContractTax | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const contractId = Number(propertyContractId);
    const taxId = Number(propertyContractTaxId);
    if (!Number.isFinite(contractId) || contractId <= 0 || !Number.isFinite(taxId) || taxId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getPropertyContract(contractId), getPropertyContractTax(taxId)])
      .then(([contractRow, taxRow]) => {
        if (cancelled) return;
        if (taxRow.propertyContractId !== contractRow.propertyContractKey) {
          setNotFound(true);
          setContract(null);
          setEntry(null);
          return;
        }
        setContract(contractRow);
        setEntry(taxRow);
        setNotFound(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setContract(null);
          setEntry(null);
          setNotFound(
            (err instanceof PropertyContractsApiError || err instanceof PropertyContractTaxApiError) &&
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
  }, [propertyContractId, propertyContractTaxId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !contract || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Landmark}
          tone="muted"
          heading="Contract tax not found"
          description="This tax may have been removed or does not belong to this contract."
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/extranet/contracts/${propertyContractId}?tab=taxes`} />}
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
        title="Edit tax"
        description={`${contract.contractName} · ${contract.contractNumber ?? "Contract"}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/extranet/contracts/${contract.propertyContractKey}?tab=taxes`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contract
          </Button>
        }
      />
      <PropertyContractTaxForm lockedContract={contract} entry={entry} />
    </div>
  );
}

export default function EditContractTaxPage() {
  return (
    <AccessGate module="contracts" action="edit">
      {() => <EditContractTax />}
    </AccessGate>
  );
}
