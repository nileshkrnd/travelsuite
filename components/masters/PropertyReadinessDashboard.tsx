"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PropertyReadinessHeader } from "@/components/masters/PropertyReadinessHeader";
import { CompletionProgress } from "@/components/masters/CompletionProgress";
import { NextActionCard } from "@/components/masters/NextActionCard";
import { SetupSection } from "@/components/masters/SetupSection";
import { GoLiveValidation } from "@/components/masters/GoLiveValidation";
import { PropertySetupNotes } from "@/components/masters/PropertySetupNotes";
import { getPropertyReadiness, PropertyReadinessApiError } from "@/lib/services/property-readiness.service";
import type { PropertyReadiness } from "@/types";

function ReadinessSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded bg-muted" />
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="h-8 w-24 rounded bg-muted" />
          <div className="h-2 w-full rounded-full bg-muted" />
        </CardContent>
      </Card>
      <div className="h-20 rounded-lg bg-muted" />
      <div className="h-40 rounded-lg bg-muted" />
      <div className="h-40 rounded-lg bg-muted" />
    </div>
  );
}

/** Orchestrates the Property Readiness / Go-Live dashboard — fetches, then composes the reusable pieces. */
export function PropertyReadinessDashboard({
  propertyId,
  tenantId,
  companyId,
  role,
}: {
  propertyId: number;
  tenantId: number;
  companyId: number;
  role: string;
}) {
  const [data, setData] = useState<PropertyReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const result = await getPropertyReadiness({ propertyId, tenantId, companyId, role });
      setData(result);
    } catch (err) {
      setError(err instanceof PropertyReadinessApiError ? err.message : "Failed to load property readiness");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, tenantId, companyId, role]);

  if (loading) return <ReadinessSkeleton />;

  if (error || !data) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-center">
          <p className="text-sm text-destructive">{error ?? "Could not load property readiness."}</p>
          <Button variant="outline" onClick={() => void refresh()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const propertySteps = data.steps.filter((s) => s.category === "property");
  const contractSteps = data.steps.filter((s) => s.category === "contract");

  return (
    <div className="space-y-6">
      <PropertyReadinessHeader
        propertyName={data.propertyName}
        propertyCode={data.propertyCode}
        overallStatus={data.overallStatus}
      />

      <Card>
        <CardContent className="pt-6">
          <CompletionProgress
            percentage={data.completionPercentage}
            completedCount={data.completedSummary.length}
            totalCount={data.steps.length}
          />
        </CardContent>
      </Card>

      <NextActionCard nextAction={data.nextAction} />

      <SetupSection title="Property Setup" steps={propertySteps} />
      <SetupSection
        title="Contract & Pricing Setup"
        description={
          data.contractNumber
            ? `Evaluated against contract ${data.contractNumber}.`
            : "Create a contract to unlock these steps."
        }
        steps={contractSteps}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Completed / Updated</h2>
          <Card>
            <CardContent className="pt-6">
              {data.completedSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing configured yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.completedSummary.map((item) => (
                    <li key={item.stepCode} className="flex gap-2">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground">— {item.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Pending / Requires Action</h2>
          <Card>
            <CardContent className="pt-6">
              {data.pendingSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing pending.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.pendingSummary.map((item) => (
                    <li key={item.stepCode} className="flex gap-2">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground">— {item.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <GoLiveValidation validation={data.goLiveValidation} />

      <PropertySetupNotes propertyId={propertyId} tenantId={tenantId} companyId={companyId} />
    </div>
  );
}
