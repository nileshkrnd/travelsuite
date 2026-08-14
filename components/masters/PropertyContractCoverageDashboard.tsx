"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, CircleDashed, FileSignature, Globe2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { listPropertyContracts, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import type { PropertyContract } from "@/types";

function isExpired(entry: PropertyContract) {
  return entry.endDate < new Date().toISOString().slice(0, 10);
}

interface LocationStats {
  total: number;
  active: number;
  expired: number;
}

interface CountryGroup extends LocationStats {
  countryName: string;
  cities: Map<string, LocationStats>;
}

function bump(stats: LocationStats, entry: PropertyContract) {
  stats.total += 1;
  if (entry.isActive) stats.active += 1;
  if (isExpired(entry)) stats.expired += 1;
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Tenant-wide "how many contracts, for which countries/cities" overview — independent of the scoped property. */
export function PropertyContractCoverageDashboard({ tenantId }: { tenantId: number }) {
  const [contracts, setContracts] = useState<PropertyContract[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tenantId <= 0) {
      setContracts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listPropertyContracts({ tenantId })
      .then((rows) => {
        if (!cancelled) setContracts(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setContracts([]);
          toast.error(
            err instanceof PropertyContractsApiError ? err.message : "Failed to load contract coverage"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (loading || contracts === null) {
    return <p className="text-sm text-muted-foreground">Loading contract coverage…</p>;
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Globe2}
          tone="muted"
          heading="No contracts yet"
          description="Once contracts are added for any property, coverage by country and city will show here."
          size="compact"
        />
      </Card>
    );
  }

  const byCountry = new Map<string, CountryGroup>();
  for (const entry of contracts) {
    const countryName = entry.countryName ?? "Unspecified country";
    const cityName = entry.cityName ?? "Unspecified city";
    let country = byCountry.get(countryName);
    if (!country) {
      country = { countryName, total: 0, active: 0, expired: 0, cities: new Map() };
      byCountry.set(countryName, country);
    }
    bump(country, entry);
    let city = country.cities.get(cityName);
    if (!city) {
      city = { total: 0, active: 0, expired: 0 };
      country.cities.set(cityName, city);
    }
    bump(city, entry);
  }
  const countryRows = [...byCountry.values()].sort((a, b) => b.total - a.total);
  const totalActive = contracts.filter((c) => c.isActive).length;
  const totalExpired = contracts.filter(isExpired).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Contract coverage</h2>
        <p className="text-sm text-muted-foreground">
          Supplier contracts signed across every property in this tenant, grouped by location.
        </p>
      </div>

      <div className="grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile icon={FileSignature} label="Total contracts" value={contracts.length} />
        <StatTile icon={CheckCircle2} label="Active" value={totalActive} />
        <StatTile icon={CircleDashed} label="Expired" value={totalExpired} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Country</TableHead>
              <TableHead>City</TableHead>
              <TableHead className="text-right">Contracts</TableHead>
              <TableHead className="text-right">Active</TableHead>
              <TableHead className="text-right">Expired</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {countryRows.flatMap((country) => {
              const cityRows = [...country.cities.entries()].sort((a, b) => b[1].total - a[1].total);
              return cityRows.map(([cityName, stats], index) => (
                <TableRow key={`${country.countryName}-${cityName}`}>
                  {index === 0 && (
                    <TableCell rowSpan={cityRows.length} className="align-top font-medium">
                      <div className="flex items-center gap-2">
                        <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {country.countryName}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">{cityName}</TableCell>
                  <TableCell className="text-right tabular-nums">{stats.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{stats.active}</TableCell>
                  <TableCell className="text-right tabular-nums">{stats.expired}</TableCell>
                </TableRow>
              ));
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
