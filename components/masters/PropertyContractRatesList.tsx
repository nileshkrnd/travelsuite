"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { BadgeDollarSign, FileSignature, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { ContractRateGroupCard } from "@/components/masters/ContractRateGroupCard";
import {
  listPropertyContractRates,
  PropertyContractRatesApiError,
} from "@/lib/services/property-contract-rates.service";
import { listPropertyContracts, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import { groupContractRates } from "@/lib/contract-rate-groups";
import type { PropertyContract, PropertyContractRate } from "@/types";

/** Property-scoped contract rates — all contracts for the selected property. */
export function PropertyContractRatesList({
  tenantId,
  propertyId,
  canEdit,
  canCreate,
}: {
  tenantId: number;
  propertyId: number;
  canEdit: boolean;
  canCreate: boolean;
}) {
  const { role } = useParams<{ role: string }>();
  const [rates, setRates] = useState<PropertyContractRate[]>([]);
  const [contracts, setContracts] = useState<PropertyContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId <= 0 || propertyId <= 0) {
      setRates([]);
      setContracts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listPropertyContractRates({ tenantId, propertyId }),
      listPropertyContracts({ tenantId, propertyId }),
    ])
      .then(([rateRows, contractRows]) => {
        if (!cancelled) {
          setRates(rateRows);
          setContracts(contractRows);
          const firstContract = contractRows[0];
          if (firstContract) {
            const groups = groupContractRates(
              rateRows.filter((r) => r.propertyContractId === firstContract.propertyContractKey)
            );
            setExpandedKey(groups[0]?.key ?? null);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractRatesApiError || err instanceof PropertyContractsApiError
              ? err.message
              : "Failed to load contract rates"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, propertyId]);

  const byContract = useMemo(() => {
    const contractMap = new Map(contracts.map((c) => [c.propertyContractKey, c]));
    const rateByContract = new Map<number, PropertyContractRate[]>();
    for (const rate of rates) {
      const list = rateByContract.get(rate.propertyContractId) ?? [];
      list.push(rate);
      rateByContract.set(rate.propertyContractId, list);
    }

    return [...rateByContract.entries()]
      .map(([contractId, contractRates]) => ({
        contract: contractMap.get(contractId),
        contractId,
        groups: groupContractRates(contractRates),
      }))
      .filter((row) => row.contract)
      .sort((a, b) =>
        (a.contract!.contractName ?? "").localeCompare(b.contract!.contractName ?? "")
      );
  }, [rates, contracts]);

  function matrixHref(contractId: number, seasonPeriodId?: number, ratePlanTypeId?: number) {
    const base = `/${role}/extranet/contracts/${contractId}/rates/new`;
    const params = new URLSearchParams();
    if (seasonPeriodId) params.set("seasonPeriodId", String(seasonPeriodId));
    if (ratePlanTypeId) params.set("ratePlanTypeId", String(ratePlanTypeId));
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading contract rates…</p>;
  }

  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        tone="primary"
        heading="No contracts for this property"
        description="Create a property contract first, then enter rates from the contract or here."
        action={
          canCreate ? (
            <Button nativeButton={false} render={<Link href={`/${role}/extranet/contracts`} />}>
              <Plus className="h-4 w-4" />
              Go to contracts
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (rates.length === 0) {
    return (
      <EmptyState
        icon={BadgeDollarSign}
        tone="primary"
        heading="No contract rates yet"
        description="Enter rates by season, rate plan type, room type, and occupancy."
        action={
          canCreate || canEdit ? (
            <Button
              nativeButton={false}
              render={
                <Link href={matrixHref(contracts[0]!.propertyContractKey)} />
              }
            >
              <Plus className="h-4 w-4" />
              Enter rates
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      {byContract.map(({ contract, contractId, groups }) => (
        <div key={contractId} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{contract!.contractName}</p>
              <p className="text-sm text-muted-foreground">{contract!.contractNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <Link href={`/${role}/extranet/contracts/${contractId}?tab=rates`} />
                }
              >
                View contract
              </Button>
              {(canCreate || canEdit) && (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href={matrixHref(contractId)} />}
                >
                  <Plus className="h-4 w-4" />
                  Enter rates
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {groups.map((group) => (
              <ContractRateGroupCard
                key={`${contractId}-${group.key}`}
                group={group}
                currencyCode={contract!.contractCurrencyCode}
                matrixHref={matrixHref(contractId, group.seasonPeriodId, group.ratePlanTypeId)}
                canEdit={canEdit}
                expanded={expandedKey === `${contractId}-${group.key}`}
                onToggle={() =>
                  setExpandedKey((prev) =>
                    prev === `${contractId}-${group.key}` ? null : `${contractId}-${group.key}`
                  )
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
