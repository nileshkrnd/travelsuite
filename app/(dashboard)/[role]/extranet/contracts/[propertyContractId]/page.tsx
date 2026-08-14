"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeDollarSign,
  Boxes,
  CalendarDays,
  FileSignature,
  Tags,
  Pencil,
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ContractSeasonPeriodsPanel } from "@/components/masters/ContractSeasonPeriodsPanel";
import { ContractRatePlansPanel } from "@/components/masters/ContractRatePlansPanel";
import { ContractRatesPanel } from "@/components/masters/ContractRatesPanel";
import { ContractInventoryPanel } from "@/components/masters/ContractInventoryPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSessionStore } from "@/lib/store/session.store";
import {
  getPropertyContract,
  setPropertyContractActive,
  PropertyContractsApiError,
} from "@/lib/services/property-contracts.service";
import { can } from "@/config/permissions";
import type { PropertyContract, RoleDef } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function PropertyContractView({ roleDef }: { roleDef: RoleDef }) {
  const { role, propertyContractId } = useParams<{ role: string; propertyContractId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionUser = useSessionStore((s) => s.user);
  const actorKey = sessionUser?.userKey ?? 0;
  const [entry, setEntry] = useState<PropertyContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const canEdit = can(roleDef, "contracts", "edit");
  const canCreate = can(roleDef, "contracts", "create");
  const canDelete = can(roleDef, "contracts", "delete");

  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "season-periods"
      ? "season-periods"
      : tabParam === "rate-plans"
        ? "rate-plans"
        : tabParam === "rates"
          ? "rates"
          : tabParam === "inventory"
            ? "inventory"
            : "details";

  useEffect(() => {
    const id = Number(propertyContractId);
    if (!Number.isFinite(id) || id <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPropertyContract(id)
      .then((row) => {
        if (!cancelled) {
          setEntry(row);
          setNotFound(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEntry(null);
          setNotFound(err instanceof PropertyContractsApiError && err.status === 404);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyContractId]);

  function setTab(next: string | null) {
    if (!next) return;
    const base = `/${role}/extranet/contracts/${propertyContractId}`;
    router.replace(next === "details" ? base : `${base}?tab=${next}`);
  }

  async function toggleStatus() {
    if (!entry || !actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertyContractActive(entry.propertyContractKey, !entry.isActive, actorKey);
      setEntry(saved);
      toast.success(saved.isActive ? "Contract activated" : "Contract deactivated");
    } catch (error) {
      toast.error(error instanceof PropertyContractsApiError ? error.message : "Could not update status");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading contract…</div>;
  }

  if (notFound || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FileSignature}
          tone="muted"
          heading="Contract not found"
          description="This contract may have been removed."
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/extranet/contracts`} />}>
              Back to list
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={entry.contractName}
        description="Property contract details, season periods, rate plans, and contracted rates."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/extranet/contracts`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={() => void toggleStatus()}>
                {entry.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                {entry.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            )}
            {canEdit && (
              <Button
                nativeButton={false}
                render={<Link href={`/${role}/extranet/contracts/${entry.propertyContractKey}/edit`} />}
              >
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setTab}>
        <div className="rounded-xl border border-border bg-muted/40 p-1.5">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1.5 bg-transparent p-0 group-data-horizontal/tabs:h-auto">
            <TabsTrigger value="details" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <FileSignature className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="season-periods" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <CalendarDays className="h-4 w-4" />
              Contract Season Periods
            </TabsTrigger>
            <TabsTrigger value="rate-plans" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <Tags className="h-4 w-4" />
              Rate Plans
            </TabsTrigger>
            <TabsTrigger value="rates" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <BadgeDollarSign className="h-4 w-4" />
              Contract Rates
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <Boxes className="h-4 w-4" />
              Inventory
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="details" className="mt-4">
          <Card className="max-w-2xl">
            <CardContent>
              <div className="mb-4">
                <p className="text-base font-semibold text-foreground">{entry.contractName}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.propertyName ?? `Property ${entry.propertyId}`} —{" "}
                  {entry.supplierName ?? `Supplier ${entry.supplierId}`}
                </p>
              </div>
              <dl>
                <DetailRow label="Property">{entry.propertyName ?? "—"}</DetailRow>
                <DetailRow label="Supplier">{entry.supplierName ?? "—"}</DetailRow>
                <DetailRow label="Contract number">{entry.contractNumber}</DetailRow>
                <DetailRow label="Contract type">{entry.contractTypeName ?? "—"}</DetailRow>
                <DetailRow label="Contract status">{entry.contractStatusName ?? "—"}</DetailRow>
                <DetailRow label="Currency">{entry.contractCurrencyCode ?? "—"}</DetailRow>
                <DetailRow label="Version">{entry.contractVersion}</DetailRow>
                <DetailRow label="Start date">{entry.startDate}</DetailRow>
                <DetailRow label="End date">{entry.endDate}</DetailRow>
                <DetailRow label="Signed date">{entry.signedDate ?? "—"}</DetailRow>
                <DetailRow label="Signed by">{entry.signedByEmployeeName ?? "—"}</DetailRow>
                <DetailRow label="Supplier contact">{entry.supplierContactName ?? "—"}</DetailRow>
                <DetailRow label="Payment terms">{entry.paymentTerms ?? "—"}</DetailRow>
                <DetailRow label="General terms">{entry.generalTerms ?? "—"}</DetailRow>
                <DetailRow label="Remarks">{entry.remarks ?? "—"}</DetailRow>
                <DetailRow label="Document">
                  {entry.contractFileUrl ? (
                    <a
                      href={entry.contractFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {entry.contractFileName || "View contract"}
                    </a>
                  ) : (
                    "—"
                  )}
                </DetailRow>
                <DetailRow label="Status">
                  <Badge variant={entry.isActive ? "default" : "outline"}>
                    {entry.isActive ? "active" : "inactive"}
                  </Badge>
                </DetailRow>
                <DetailRow label="Created">{new Date(entry.createdAt).toLocaleString()}</DetailRow>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="season-periods" className="mt-4">
          <ContractSeasonPeriodsPanel
            contract={entry}
            canEdit={canEdit}
            canCreate={canCreate}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="rate-plans" className="mt-4">
          <ContractRatePlansPanel
            contract={entry}
            canEdit={canEdit}
            canCreate={canCreate}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="rates" className="mt-4">
          <ContractRatesPanel
            contract={entry}
            canEdit={canEdit}
            canCreate={canCreate}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <ContractInventoryPanel
            contract={entry}
            canEdit={canEdit}
            canCreate={canCreate}
            canDelete={canDelete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PropertyContractViewPage() {
  return (
    <AccessGate module="contracts">
      {(roleDef) => (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading contract…</div>}>
          <PropertyContractView roleDef={roleDef} />
        </Suspense>
      )}
    </AccessGate>
  );
}
