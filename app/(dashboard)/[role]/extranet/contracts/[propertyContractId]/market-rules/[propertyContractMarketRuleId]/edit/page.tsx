"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileSignature, Globe } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyContractMarketRuleForm } from "@/components/masters/PropertyContractMarketRuleForm";
import { getPropertyContract, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import {
  getPropertyContractMarketRule,
  PropertyContractMarketRuleApiError,
} from "@/lib/services/property-contract-market-rules.service";
import type { PropertyContract, PropertyContractMarketRule } from "@/types";

function EditContractMarketRule() {
  const { role, propertyContractId, propertyContractMarketRuleId } = useParams<{
    role: string;
    propertyContractId: string;
    propertyContractMarketRuleId: string;
  }>();
  const [contract, setContract] = useState<PropertyContract | null>(null);
  const [entry, setEntry] = useState<PropertyContractMarketRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const contractId = Number(propertyContractId);
    const ruleId = Number(propertyContractMarketRuleId);
    if (!Number.isFinite(contractId) || contractId <= 0 || !Number.isFinite(ruleId) || ruleId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getPropertyContract(contractId), getPropertyContractMarketRule(ruleId)])
      .then(([contractRow, ruleRow]) => {
        if (cancelled) return;
        if (ruleRow.propertyContractId !== contractRow.propertyContractKey) {
          setNotFound(true);
          setContract(null);
          setEntry(null);
          return;
        }
        setContract(contractRow);
        setEntry(ruleRow);
        setNotFound(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setContract(null);
          setEntry(null);
          setNotFound(
            (err instanceof PropertyContractsApiError || err instanceof PropertyContractMarketRuleApiError) &&
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
  }, [propertyContractId, propertyContractMarketRuleId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !contract || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Globe}
          tone="muted"
          heading="Market rule not found"
          description="This rule may have been removed or does not belong to this contract."
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/extranet/contracts/${propertyContractId}?tab=market-rules`} />}
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
        title="Edit market rule"
        description={`${contract.contractName} · ${contract.contractNumber ?? "Contract"}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/extranet/contracts/${contract.propertyContractKey}?tab=market-rules`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contract
          </Button>
        }
      />
      <PropertyContractMarketRuleForm lockedContract={contract} entry={entry} />
    </div>
  );
}

export default function EditContractMarketRulePage() {
  return (
    <AccessGate module="contracts" action="edit">
      {() => <EditContractMarketRule />}
    </AccessGate>
  );
}
