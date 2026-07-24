"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Coins, MoreHorizontal, X, Search } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrenciesStore } from "@/lib/store/currencies.store";
import { can } from "@/config/permissions";
import type { Currency, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "code" | "name" | "smallCurrencyName" | "significantDigit" | "status" | "createdAt";
type StatusFilter = "all" | "active" | "inactive";

function useCurrencySchema(currencies: Currency[], currentId?: string) {
  return z.object({
    code: z
      .string()
      .min(1, "Currency code is required")
      .max(5, "Currency code must be 5 characters or fewer")
      .refine(
        (value) =>
          !currencies.some((c) => c.id !== currentId && c.code.toLowerCase() === value.trim().toLowerCase()),
        "This currency code is already in use"
      ),
    name: z.string().min(1, "Currency name is required"),
    smallCurrencyName: z.string().min(1, "Small currency name is required"),
    significantDigit: z
      .number({ error: "Significant digit is required" })
      .int("Significant digit must be a whole number")
      .min(0, "Significant digit cannot be negative")
      .max(6, "Significant digit must be 6 or fewer"),
  });
}

type FormValues = z.infer<ReturnType<typeof useCurrencySchema>>;

function CurrencyPanel({
  mode,
  currency,
  currencies,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  currency?: Currency;
  currencies: Currency[];
  onClose: () => void;
}) {
  const addCurrency = useCurrenciesStore((s) => s.addCurrency);
  const updateCurrency = useCurrenciesStore((s) => s.updateCurrency);
  const schema = useCurrencySchema(currencies, currency?.id);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      code: currency?.code ?? "",
      name: currency?.name ?? "",
      smallCurrencyName: currency?.smallCurrencyName ?? "",
      significantDigit: currency?.significantDigit ?? 2,
    },
  });

  async function onSubmit(values: FormValues) {
    if (mode === "edit" && currency) {
      updateCurrency(currency.id, {
        code: values.code.trim(),
        name: values.name.trim(),
        smallCurrencyName: values.smallCurrencyName.trim(),
        significantDigit: values.significantDigit,
      });
      toast.success("Currency updated");
    } else if (mode === "create") {
      addCurrency({
        code: values.code.trim(),
        name: values.name.trim(),
        smallCurrencyName: values.smallCurrencyName.trim(),
        significantDigit: values.significantDigit,
      });
      toast.success("Currency created");
    }
    onClose();
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add currency" : mode === "edit" ? "Edit currency" : "Currency details"}
          </h2>
          {mode === "view" && currency && (
            <p className="text-sm text-muted-foreground">
              Created {new Date(currency.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currencyCode">Currency code</Label>
          <Input
            id="currencyCode"
            autoFocus={mode !== "view"}
            disabled={isReadOnly}
            aria-invalid={!!errors.code}
            {...register("code")}
          />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currencyName">Currency name</Label>
          <Input
            id="currencyName"
            disabled={isReadOnly}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="smallCurrencyName">Small currency name</Label>
          <Input
            id="smallCurrencyName"
            disabled={isReadOnly}
            aria-invalid={!!errors.smallCurrencyName}
            {...register("smallCurrencyName")}
          />
          {errors.smallCurrencyName && (
            <p className="text-sm text-destructive">{errors.smallCurrencyName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="significantDigit">Significant digit</Label>
          <Input
            id="significantDigit"
            type="number"
            min={0}
            max={6}
            step={1}
            disabled={isReadOnly}
            aria-invalid={!!errors.significantDigit}
            {...register("significantDigit", { valueAsNumber: true })}
          />
          {errors.significantDigit && (
            <p className="text-sm text-destructive">{errors.significantDigit.message}</p>
          )}
        </div>

        {mode === "view" && currency && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Status</Label>
            <div>
              <Badge variant={currency.status === "active" ? "default" : "secondary"}>{currency.status}</Badge>
            </div>
          </div>
        )}

        {!isReadOnly && (
          <div className="flex items-center gap-2 sm:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {mode === "edit" ? "Save" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

function CurrencyList({ roleDef }: { roleDef: RoleDef }) {
  const currencies = useCurrenciesStore((s) => s.currencies);
  const updateCurrency = useCurrenciesStore((s) => s.updateCurrency);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<Currency | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canEdit = can(roleDef, "currency", "edit");
  const canCreate = can(roleDef, "currency", "create");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visibleCurrencies = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = currencies;
    if (term) {
      result = result.filter((c) => c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term));
    }
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [currencies, search, statusFilter, sortKey, sortDirection]);

  function openCreate() {
    setTarget(undefined);
    setPanelMode("create");
  }
  function openEdit(currency: Currency) {
    setTarget(currency);
    setPanelMode("edit");
  }
  function openView(currency: Currency) {
    setTarget(currency);
    setPanelMode("view");
  }
  function closePanel() {
    setPanelMode("closed");
    setTarget(undefined);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Currency"
        description="Currencies available for pricing and billing across your tenant."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add currency
            </Button>
          ) : undefined
        }
      />

      {panelMode !== "closed" && (
        <CurrencyPanel mode={panelMode} currency={target} currencies={currencies} onClose={closePanel} />
      )}

      {currencies.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter((value as StatusFilter) ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        {currencies.length === 0 ? (
          <EmptyState
            icon={Coins}
            tone="primary"
            heading="No currencies yet"
            description="Add your first currency to get started."
            size="compact"
          />
        ) : visibleCurrencies.length === 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching currencies"
            description="Try a different search term or status filter."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <SortableTableHead sortKey="code" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Name
                </SortableTableHead>
                <SortableTableHead
                  sortKey="smallCurrencyName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Small currency name
                </SortableTableHead>
                <SortableTableHead
                  sortKey="significantDigit"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Significant digit
                </SortableTableHead>
                <SortableTableHead
                  sortKey="status"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Status
                </SortableTableHead>
                <SortableTableHead
                  sortKey="createdAt"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Created
                </SortableTableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCurrencies.map((currency, index) => (
                <TableRow key={currency.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{currency.code}</TableCell>
                  <TableCell>{currency.name}</TableCell>
                  <TableCell>{currency.smallCurrencyName}</TableCell>
                  <TableCell>{currency.significantDigit}</TableCell>
                  <TableCell>
                    <Badge variant={currency.status === "active" ? "default" : "secondary"}>
                      {currency.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(currency.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openView(currency)}>View</DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem onClick={() => openEdit(currency)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateCurrency(currency.id, {
                                  status: currency.status === "active" ? "inactive" : "active",
                                })
                              }
                            >
                              {currency.status === "active" ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export default function CurrencyMasterPage() {
  return <AccessGate module="currency">{(roleDef) => <CurrencyList roleDef={roleDef} />}</AccessGate>;
}
