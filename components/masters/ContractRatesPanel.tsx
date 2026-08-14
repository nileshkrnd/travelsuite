"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, BadgeDollarSign } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { ContractRateGroupCard } from "@/components/masters/ContractRateGroupCard";
import { useSessionStore } from "@/lib/store/session.store";
import {
  listPropertyContractRates,
  PropertyContractRatesApiError,
} from "@/lib/services/property-contract-rates.service";
import { groupContractRates } from "@/lib/contract-rate-groups";
import type { PropertyContract } from "@/types";

/** Contract rates grouped by season + rate plan type with expandable matrix preview. */
export function ContractRatesPanel({
  contract,
  canEdit,
  canCreate,
  canDelete: _canDelete,
}: {
  contract: PropertyContract;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const { role } = useParams<{ role: string }>();
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof listPropertyContractRates>>>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const base = `/${role}/extranet/contracts/${contract.propertyContractKey}`;

  function matrixHref(seasonPeriodId?: number, ratePlanTypeId?: number) {
    const params = new URLSearchParams();
    if (seasonPeriodId) params.set("seasonPeriodId", String(seasonPeriodId));
    if (ratePlanTypeId) params.set("ratePlanTypeId", String(ratePlanTypeId));
    const qs = params.toString();
    return qs ? `${base}/rates/new?${qs}` : `${base}/rates/new`;
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPropertyContractRates({ propertyContractId: contract.propertyContractKey })
      .then((rows) => {
        if (!cancelled) {
          setEntries(rows);
          const groups = groupContractRates(rows);
          setExpandedKey(groups.length === 1 ? groups[0]!.key : null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractRatesApiError ? err.message : "Failed to load contract rates"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contract.propertyContractKey]);

  const groups = useMemo(() => groupContractRates(entries), [entries]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading contract rates…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Contract rates</p>
          <p className="text-sm text-muted-foreground">
            Rates grouped by season and rate plan type for {contract.propertyName ?? "this property"}.
          </p>
        </div>
        {(canCreate || canEdit) && (
          <Button nativeButton={false} render={<Link href={matrixHref()} />}>
            <Plus className="h-4 w-4" />
            Enter rates
          </Button>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={BadgeDollarSign}
          tone="primary"
          heading="No contract rates yet"
          description="Enter rates by season, rate plan type, room type, and occupancy."
          size="compact"
          action={
            canCreate || canEdit ? (
              <Button nativeButton={false} render={<Link href={matrixHref()} />}>
                <Plus className="h-4 w-4" />
                Enter rates
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <ContractRateGroupCard
              key={group.key}
              group={group}
              currencyCode={contract.contractCurrencyCode}
              matrixHref={matrixHref(group.seasonPeriodId, group.ratePlanTypeId)}
              canEdit={canEdit}
              expanded={expandedKey === group.key}
              onToggle={() =>
                setExpandedKey((prev) => (prev === group.key ? null : group.key))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
