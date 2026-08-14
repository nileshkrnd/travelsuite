"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatContractPeriodDate,
  formatRateAmount,
  groupContractRates,
  rateCellAmount,
} from "@/lib/contract-rate-groups";
import { FALLBACK_DAYS_OF_WEEK } from "@/lib/constants/day-of-week-fallback";
import { listPropertyContractSeasonPeriods } from "@/lib/services/property-contract-season-periods.service";
import { listPropertyContractRatePlans } from "@/lib/services/property-contract-rate-plans.service";
import { listPropertyContractRates } from "@/lib/services/property-contract-rates.service";
import { listPropertyContractInventories } from "@/lib/services/property-contract-inventories.service";
import { listPropertyContractSupplements } from "@/lib/services/property-contract-supplements.service";
import { listPropertyContractChildPolicies } from "@/lib/services/property-contract-child-policies.service";
import { listPropertyContractCancellationPolicies } from "@/lib/services/property-contract-cancellation-policies.service";
import { listPropertyContractPromotions } from "@/lib/services/property-contract-promotions.service";
import { listPropertyContractStopSales } from "@/lib/services/property-contract-stop-sales.service";
import { listPropertyContractBlackouts } from "@/lib/services/property-contract-blackouts.service";
import type { PropertyContract } from "@/types";
import type { PropertyContractSeasonPeriod } from "@/types";
import type { PropertyContractRatePlan } from "@/types";
import type { PropertyContractRate } from "@/types";
import type { PropertyContractInventory } from "@/types";
import type { PropertyContractSupplement } from "@/types";
import type { PropertyContractChildPolicy } from "@/types";
import type { PropertyContractCancellationPolicy } from "@/types";
import type { PropertyContractPromotion } from "@/types/property-contract-promotion";
import type { PropertyContractStopSale } from "@/types/property-contract-stop-sale";
import type { PropertyContractBlackout } from "@/types/property-contract-blackout";

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

function formatDays(ids: number[]): string {
  if (!ids.length) return "All days";
  return ids
    .map((id) => FALLBACK_DAYS_OF_WEEK.find((d) => d.dayOfWeekId === id)?.shortName ?? String(id))
    .join(", ");
}

function closureScope(entry: {
  stopSaleTypeCode?: string;
  blackoutTypeCode?: string;
  roomName?: string;
  roomCode?: string;
  ratePlanName?: string;
  ratePlanCode?: string;
  stopSaleTypeName?: string;
  blackoutTypeName?: string;
}): string {
  const typeCode = (entry.stopSaleTypeCode ?? entry.blackoutTypeCode ?? "").toUpperCase();
  if (typeCode === "PROPERTY") return "Entire property";
  if (typeCode === "ROOM_TYPE") return entry.roomName ?? entry.roomCode ?? "Room type";
  if (typeCode === "RATE_PLAN") return entry.ratePlanName ?? entry.ratePlanCode ?? "Rate plan";
  if (typeCode === "ROOM_RATE_PLAN") {
    const room = entry.roomName ?? entry.roomCode ?? "Room";
    const plan = entry.ratePlanName ?? entry.ratePlanCode ?? "Plan";
    return `${room} · ${plan}`;
  }
  return entry.stopSaleTypeName ?? entry.blackoutTypeName ?? "—";
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="break-inside-avoid space-y-3 border-t border-border pt-6">
      <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function MetaGrid({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[9rem_1fr] gap-3 text-sm">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="font-medium text-foreground">{row.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function PrintTable({
  headers,
  children,
}: {
  headers: React.ReactNode[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {headers.map((header, i) => (
              <th key={i} className="px-2 py-1.5 text-left font-medium text-foreground">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function ContractPrintableDocument({
  contract,
  issuerName,
}: {
  contract: PropertyContract;
  issuerName?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<PropertyContractSeasonPeriod[]>([]);
  const [ratePlans, setRatePlans] = useState<PropertyContractRatePlan[]>([]);
  const [rates, setRates] = useState<PropertyContractRate[]>([]);
  const [inventory, setInventory] = useState<PropertyContractInventory[]>([]);
  const [supplements, setSupplements] = useState<PropertyContractSupplement[]>([]);
  const [childPolicies, setChildPolicies] = useState<PropertyContractChildPolicy[]>([]);
  const [cancellations, setCancellations] = useState<PropertyContractCancellationPolicy[]>([]);
  const [promotions, setPromotions] = useState<PropertyContractPromotion[]>([]);
  const [stopSales, setStopSales] = useState<PropertyContractStopSale[]>([]);
  const [blackouts, setBlackouts] = useState<PropertyContractBlackout[]>([]);

  const contractId = contract.propertyContractKey;
  const currency = contract.contractCurrencyCode ?? "";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const opts = { propertyContractId: contractId };
    Promise.allSettled([
      listPropertyContractSeasonPeriods(opts),
      listPropertyContractRatePlans(opts),
      listPropertyContractRates(opts),
      listPropertyContractInventories(opts),
      listPropertyContractSupplements(opts),
      listPropertyContractChildPolicies(opts),
      listPropertyContractCancellationPolicies(opts),
      listPropertyContractPromotions(opts),
      listPropertyContractStopSales(opts),
      listPropertyContractBlackouts(opts),
    ]).then((results) => {
      if (cancelled) return;
      setSeasons(settledValue(results[0], []));
      setRatePlans(settledValue(results[1], []));
      setRates(settledValue(results[2], []));
      setInventory(settledValue(results[3], []));
      setSupplements(settledValue(results[4], []));
      setChildPolicies(settledValue(results[5], []));
      setCancellations(settledValue(results[6], []));
      setPromotions(settledValue(results[7], []));
      setStopSales(settledValue(results[8], []));
      setBlackouts(settledValue(results[9], []));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  const rateGroups = useMemo(() => groupContractRates(rates), [rates]);
  const printedAt = useMemo(
    () =>
      new Date().toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Preparing contract review…</p>;
  }

  return (
    <article className="mx-auto max-w-5xl space-y-8 bg-background p-6 text-foreground print:max-w-none print:p-0">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {issuerName || "TravelSuite"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{contract.contractName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Property contract · {contract.contractNumber}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Version {contract.contractVersion}</p>
            <p>{contract.isActive ? "Active" : "Inactive"}</p>
            <p>Printed {printedAt}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Preamble</h2>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            This contract sets out the commercial terms between the contracting company and the
            supplier for the named property, including rates, inventory, supplements, child
            policies, promotions, stop sales, and blackout dates for the validity period below.
          </p>
          <MetaGrid
            rows={[
              { label: "Property", value: contract.propertyName ?? `Property ${contract.propertyId}` },
              { label: "Supplier", value: contract.supplierName ?? `Supplier ${contract.supplierId}` },
              { label: "Contract type", value: contract.contractTypeName },
              { label: "Status", value: contract.contractStatusName },
              { label: "Currency", value: contract.contractCurrencyCode },
              { label: "Validity", value: `${contract.startDate} → ${contract.endDate}` },
              { label: "Signed date", value: contract.signedDate },
              { label: "Signed by", value: contract.signedByEmployeeName },
              { label: "Supplier contact", value: contract.supplierContactName },
              {
                label: "Location",
                value: [contract.cityName, contract.countryName].filter(Boolean).join(", "),
              },
            ]}
          />
        </div>

        {(contract.paymentTerms || contract.generalTerms || contract.remarks) && (
          <div className="space-y-3 text-sm">
            {contract.paymentTerms && (
              <div>
                <p className="font-medium">Payment terms</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{contract.paymentTerms}</p>
              </div>
            )}
            {contract.generalTerms && (
              <div>
                <p className="font-medium">General terms</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{contract.generalTerms}</p>
              </div>
            )}
            {contract.remarks && (
              <div>
                <p className="font-medium">Remarks</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{contract.remarks}</p>
              </div>
            )}
          </div>
        )}
      </header>

      <Section title="Season periods">
        {seasons.length === 0 ? (
          <EmptyNote>No season periods recorded.</EmptyNote>
        ) : (
          <PrintTable headers={["Season", "From", "To", "Status"]}>
            {seasons.map((row) => (
              <tr key={row.propertyContractSeasonPeriodKey} className="border-b border-border">
                <td className="px-2 py-1.5">{row.seasonName ?? row.seasonCode}</td>
                <td className="px-2 py-1.5 font-mono">{row.fromDate}</td>
                <td className="px-2 py-1.5 font-mono">{row.toDate}</td>
                <td className="px-2 py-1.5">{row.isActive ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </PrintTable>
        )}
      </Section>

      <Section title="Rate plans">
        {ratePlans.length === 0 ? (
          <EmptyNote>No rate plans recorded.</EmptyNote>
        ) : (
          <PrintTable headers={["Code", "Name", "Type", "Meal plan", "Basis", "Status"]}>
            {ratePlans.map((row) => (
              <tr key={row.propertyContractRatePlanKey} className="border-b border-border">
                <td className="px-2 py-1.5 font-mono">{row.ratePlanCode}</td>
                <td className="px-2 py-1.5">{row.ratePlanName}</td>
                <td className="px-2 py-1.5">{row.ratePlanTypeName ?? row.ratePlanTypeCode}</td>
                <td className="px-2 py-1.5">{row.mealPlanName ?? row.mealPlanCode}</td>
                <td className="px-2 py-1.5">{row.rateBasisName ?? row.rateBasisCode}</td>
                <td className="px-2 py-1.5">{row.isActive ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </PrintTable>
        )}
      </Section>

      <Section title={`Rates${currency ? ` (${currency})` : ""}`}>
        {rateGroups.length === 0 ? (
          <EmptyNote>No contracted rates recorded.</EmptyNote>
        ) : (
          <div className="space-y-6">
            {rateGroups.map((group) => {
              const period =
                group.fromDate && group.toDate
                  ? `${formatContractPeriodDate(group.fromDate)} → ${formatContractPeriodDate(group.toDate)}`
                  : "";
              return (
                <div key={group.key} className="break-inside-avoid space-y-2">
                  <p className="text-sm font-medium">
                    {group.seasonName}
                    {period ? ` · ${period}` : ""} · {group.ratePlanTypeName}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-2 py-1.5 text-left font-medium" rowSpan={2}>
                            Room type
                          </th>
                          {group.ratePlans.map((plan, idx) => (
                            <th
                              key={plan.id}
                              colSpan={group.occupancies.length}
                              className="border-l border-border px-2 py-1.5 text-center font-medium"
                            >
                              {group.mealPlanLabels[idx] ?? plan.label}
                            </th>
                          ))}
                        </tr>
                        <tr className="border-b border-border bg-muted/20">
                          {group.ratePlans.map((plan) =>
                            group.occupancies.map((occ) => (
                              <th
                                key={`${plan.id}-${occ.id}`}
                                className="border-l border-border px-2 py-1 text-center font-medium"
                              >
                                {occ.short}
                              </th>
                            ))
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {group.roomTypes.map((room) => (
                          <tr key={room.id} className="border-b border-border">
                            <td className="px-2 py-1.5 font-medium">{room.name}</td>
                            {group.ratePlans.map((plan) =>
                              group.occupancies.map((occ) => {
                                const amount = rateCellAmount(group.entries, plan.id, room.id, occ.id);
                                return (
                                  <td
                                    key={`${plan.id}-${room.id}-${occ.id}`}
                                    className="border-l border-border px-2 py-1.5 text-right font-mono tabular-nums"
                                  >
                                    {amount != null ? formatRateAmount(amount) : "—"}
                                  </td>
                                );
                              })
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Inventory">
        {inventory.length === 0 ? (
          <EmptyNote>No inventory allotment recorded.</EmptyNote>
        ) : (
          <PrintTable
            headers={["Season", "Room", "Type", "Allotment", "Release days", "Stop sell", "Closed"]}
          >
            {inventory.map((row) => (
              <tr key={row.propertyContractInventoryKey} className="border-b border-border">
                <td className="px-2 py-1.5">
                  {row.seasonName ?? row.seasonCode}
                  {row.fromDate && row.toDate ? (
                    <span className="block font-mono text-[10px] text-muted-foreground">
                      {row.fromDate} → {row.toDate}
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-1.5">{row.roomName ?? row.roomCode}</td>
                <td className="px-2 py-1.5">{row.inventoryTypeName ?? row.inventoryTypeCode}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{row.allotmentQty}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{row.releaseDays}</td>
                <td className="px-2 py-1.5">{row.isStopSell ? "Yes" : "No"}</td>
                <td className="px-2 py-1.5">{row.isClosed ? "Yes" : "No"}</td>
              </tr>
            ))}
          </PrintTable>
        )}
      </Section>

      <Section title="Supplements">
        {supplements.length === 0 ? (
          <EmptyNote>No supplements recorded.</EmptyNote>
        ) : (
          <PrintTable headers={["Code", "Name", "Type", "Room", "Basis", "Amount", "Mandatory", "Periods"]}>
            {supplements.map((row) => (
              <tr key={row.propertyContractSupplementKey} className="border-b border-border">
                <td className="px-2 py-1.5 font-mono">{row.supplementCode}</td>
                <td className="px-2 py-1.5">{row.supplementName}</td>
                <td className="px-2 py-1.5">{row.supplementTypeName ?? row.supplementTypeCode}</td>
                <td className="px-2 py-1.5">{row.roomName ?? row.roomCode ?? "All rooms"}</td>
                <td className="px-2 py-1.5">{row.rateBasisName ?? row.rateBasisCode}</td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {row.amount}
                  {currency ? ` ${currency}` : ""}
                </td>
                <td className="px-2 py-1.5">{row.isMandatory ? "Yes" : "No"}</td>
                <td className="px-2 py-1.5">
                  {row.periods.length
                    ? row.periods.map((p) => `${p.fromDate} → ${p.toDate}`).join("; ")
                    : "—"}
                </td>
              </tr>
            ))}
          </PrintTable>
        )}
      </Section>

      <Section title="Child policies">
        {childPolicies.length === 0 ? (
          <EmptyNote>No child policies recorded.</EmptyNote>
        ) : (
          <PrintTable headers={["Room", "Max children", "Counts in occupancy", "Age bands"]}>
            {childPolicies.map((row) => (
              <tr key={row.propertyContractChildPolicyKey} className="border-b border-border">
                <td className="px-2 py-1.5">{row.roomName ?? row.roomCode ?? "All rooms"}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{row.maxChild}</td>
                <td className="px-2 py-1.5">{row.childCountsInOccupancy ? "Yes" : "No"}</td>
                <td className="px-2 py-1.5">
                  {row.ageBands.length
                    ? row.ageBands
                        .map((b) => {
                          const type = b.childPolicyTypeName ?? b.childPolicyTypeCode ?? "—";
                          const rate = b.rateValue != null ? ` (${b.rateValue})` : "";
                          return `${b.fromAge}–${b.toAge}: ${type}${rate}`;
                        })
                        .join("; ")
                    : "—"}
                </td>
              </tr>
            ))}
          </PrintTable>
        )}
      </Section>

      <Section title="Cancellation">
        {cancellations.length === 0 ? (
          <EmptyNote>No cancellation policies recorded.</EmptyNote>
        ) : (
          <PrintTable headers={["Code", "Name", "Room", "Rate plan", "Rules"]}>
            {cancellations.map((row) => (
              <tr key={row.propertyContractCancellationPolicyKey} className="border-b border-border">
                <td className="px-2 py-1.5 font-mono">{row.policyCode}</td>
                <td className="px-2 py-1.5">{row.policyName}</td>
                <td className="px-2 py-1.5">{row.roomName ?? row.roomCode ?? "All rooms"}</td>
                <td className="px-2 py-1.5">{row.ratePlanName ?? row.ratePlanCode ?? "All plans"}</td>
                <td className="px-2 py-1.5">
                  {row.rules.length
                    ? row.rules
                        .map((r) => {
                          const type = r.cancellationPolicyTypeName ?? r.cancellationPolicyTypeCode ?? "—";
                          const window =
                            r.toDaysBefore != null
                              ? `${r.fromDaysBefore}–${r.toDaysBefore} days`
                              : `${r.fromDaysBefore}+ days`;
                          return `${window}: ${type}${r.penaltyValue ? ` (${r.penaltyValue})` : ""}`;
                        })
                        .join("; ")
                    : "—"}
                </td>
              </tr>
            ))}
          </PrintTable>
        )}
      </Section>

      <Section title="Promotions">
        {promotions.length === 0 ? (
          <EmptyNote>No promotions recorded.</EmptyNote>
        ) : (
          <PrintTable headers={["Code", "Name", "Type", "Scope", "Stackable", "Periods / benefit"]}>
            {promotions.map((row) => (
              <tr key={row.propertyContractPromotionKey} className="border-b border-border">
                <td className="px-2 py-1.5 font-mono">{row.promotionCode}</td>
                <td className="px-2 py-1.5">{row.promotionName || "—"}</td>
                <td className="px-2 py-1.5">{row.promotionTypeName ?? row.promotionTypeCode}</td>
                <td className="px-2 py-1.5">
                  {row.roomName ?? row.roomCode ?? "All rooms"}
                  {" · "}
                  {row.ratePlanName ?? row.ratePlanCode ?? "All plans"}
                </td>
                <td className="px-2 py-1.5">{row.isStackable ? "Yes" : "No"}</td>
                <td className="px-2 py-1.5">
                  {row.periods
                    .map((p) => `Book ${p.bookingFromDate}–${p.bookingToDate}; stay ${p.stayFromDate}–${p.stayToDate}`)
                    .join("; ") || "—"}
                  {row.benefits.length
                    ? ` · ${row.benefits
                        .map((b) => b.promotionBenefitTypeName ?? b.promotionBenefitTypeCode ?? "Benefit")
                        .join(", ")}`
                    : ""}
                </td>
              </tr>
            ))}
          </PrintTable>
        )}
      </Section>

      <Section title="Stop sales">
        {stopSales.length === 0 ? (
          <EmptyNote>No stop sales recorded.</EmptyNote>
        ) : (
          <PrintTable headers={["Type", "Scope", "From", "To", "Days", "Reason"]}>
            {stopSales.map((row) => (
              <tr key={row.propertyContractStopSaleKey} className="border-b border-border">
                <td className="px-2 py-1.5">{row.stopSaleTypeName ?? row.stopSaleTypeCode}</td>
                <td className="px-2 py-1.5">{closureScope(row)}</td>
                <td className="px-2 py-1.5 font-mono">{row.fromDate}</td>
                <td className="px-2 py-1.5 font-mono">{row.toDate}</td>
                <td className="px-2 py-1.5">{formatDays(row.dayOfWeekIds)}</td>
                <td className="px-2 py-1.5">{row.stopSaleReasonName ?? row.stopSaleReasonCode ?? "—"}</td>
              </tr>
            ))}
          </PrintTable>
        )}
      </Section>

      <Section title="Blackouts">
        {blackouts.length === 0 ? (
          <EmptyNote>No blackouts recorded.</EmptyNote>
        ) : (
          <PrintTable headers={["Type", "Scope", "From", "To", "Days", "Reason"]}>
            {blackouts.map((row) => (
              <tr key={row.propertyContractBlackoutKey} className="border-b border-border">
                <td className="px-2 py-1.5">{row.blackoutTypeName ?? row.blackoutTypeCode}</td>
                <td className="px-2 py-1.5">{closureScope(row)}</td>
                <td className="px-2 py-1.5 font-mono">{row.fromDate}</td>
                <td className="px-2 py-1.5 font-mono">{row.toDate}</td>
                <td className="px-2 py-1.5">{formatDays(row.dayOfWeekIds)}</td>
                <td className="px-2 py-1.5">{row.blackoutReasonName ?? row.blackoutReasonCode ?? "—"}</td>
              </tr>
            ))}
          </PrintTable>
        )}
      </Section>

      <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
        End of contract review · {contract.contractNumber} · {contract.contractName}
      </footer>
    </article>
  );
}
