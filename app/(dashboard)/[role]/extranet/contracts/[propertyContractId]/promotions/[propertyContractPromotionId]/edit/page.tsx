"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileSignature, Megaphone } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyContractPromotionForm } from "@/components/masters/PropertyContractPromotionForm";
import { getPropertyContract, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import {
  getPropertyContractPromotion,
  PropertyContractPromotionApiError,
} from "@/lib/services/property-contract-promotions.service";
import type { PropertyContract } from "@/types";
import type { PropertyContractPromotion } from "@/types/property-contract-promotion";

function EditContractPromotion() {
  const { role, propertyContractId, propertyContractPromotionId } = useParams<{
    role: string;
    propertyContractId: string;
    propertyContractPromotionId: string;
  }>();
  const [contract, setContract] = useState<PropertyContract | null>(null);
  const [entry, setEntry] = useState<PropertyContractPromotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const contractId = Number(propertyContractId);
    const promotionId = Number(propertyContractPromotionId);
    if (
      !Number.isFinite(contractId) ||
      contractId <= 0 ||
      !Number.isFinite(promotionId) ||
      promotionId <= 0
    ) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getPropertyContract(contractId), getPropertyContractPromotion(promotionId)])
      .then(([contractRow, promotionRow]) => {
        if (cancelled) return;
        if (promotionRow.propertyContractId !== contractRow.propertyContractKey) {
          setNotFound(true);
          setContract(null);
          setEntry(null);
          return;
        }
        setContract(contractRow);
        setEntry(promotionRow);
        setNotFound(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setContract(null);
          setEntry(null);
          setNotFound(
            (err instanceof PropertyContractsApiError ||
              err instanceof PropertyContractPromotionApiError) &&
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
  }, [propertyContractId, propertyContractPromotionId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !contract || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Megaphone}
          tone="muted"
          heading="Promotion not found"
          description="This promotion may have been removed or does not belong to this contract."
          action={
            <Button
              nativeButton={false}
              render={
                <Link href={`/${role}/extranet/contracts/${propertyContractId}?tab=promotions`} />
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
        title="Edit promotion"
        description={entry.promotionName || entry.promotionCode}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/${role}/extranet/contracts/${contract.propertyContractKey}?tab=promotions`}
              />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contract
          </Button>
        }
      />
      <PropertyContractPromotionForm lockedContract={contract} entry={entry} />
    </div>
  );
}

export default function EditContractPromotionPage() {
  return (
    <AccessGate module="contracts" action="edit">
      {() => <EditContractPromotion />}
    </AccessGate>
  );
}
