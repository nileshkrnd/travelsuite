"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Boxes, FileSignature } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyContractInventoryForm } from "@/components/masters/PropertyContractInventoryForm";
import { getPropertyContract, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import {
  getPropertyContractInventory,
  PropertyContractInventoryApiError,
} from "@/lib/services/property-contract-inventories.service";
import type { PropertyContract, PropertyContractInventory } from "@/types";

function EditContractInventory() {
  const { role, propertyContractId, propertyContractInventoryId } = useParams<{
    role: string;
    propertyContractId: string;
    propertyContractInventoryId: string;
  }>();
  const [contract, setContract] = useState<PropertyContract | null>(null);
  const [entry, setEntry] = useState<PropertyContractInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const contractId = Number(propertyContractId);
    const inventoryId = Number(propertyContractInventoryId);
    if (
      !Number.isFinite(contractId) ||
      contractId <= 0 ||
      !Number.isFinite(inventoryId) ||
      inventoryId <= 0
    ) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getPropertyContract(contractId), getPropertyContractInventory(inventoryId)])
      .then(([contractRow, inventoryRow]) => {
        if (cancelled) return;
        if (inventoryRow.propertyContractId !== contractRow.propertyContractKey) {
          setNotFound(true);
          setContract(null);
          setEntry(null);
          return;
        }
        setContract(contractRow);
        setEntry(inventoryRow);
        setNotFound(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setContract(null);
          setEntry(null);
          setNotFound(
            (err instanceof PropertyContractsApiError ||
              err instanceof PropertyContractInventoryApiError) &&
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
  }, [propertyContractId, propertyContractInventoryId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !contract || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Boxes}
          tone="muted"
          heading="Contract inventory not found"
          description="This inventory row may have been removed or does not belong to this contract."
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/extranet/contracts/${propertyContractId}?tab=inventory`} />}
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
        title="Modify contract inventory"
        description={`Update inventory on ${contract.contractName}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/${role}/extranet/contracts/${contract.propertyContractKey}?tab=inventory`} />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contract
          </Button>
        }
      />
      <PropertyContractInventoryForm lockedContract={contract} entry={entry} />
    </div>
  );
}

export default function EditContractInventoryPage() {
  return (
    <AccessGate module="contracts" action="edit">
      {() => <EditContractInventory />}
    </AccessGate>
  );
}
