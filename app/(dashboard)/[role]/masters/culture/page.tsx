"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Globe2, MoreHorizontal, X, Search } from "lucide-react";
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
import {
  createCulture,
  listCultures,
  setCultureActive,
  updateCulture,
  CulturesApiError,
} from "@/lib/services/cultures.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { can } from "@/config/permissions";
import type { Culture, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "code" | "name" | "direction" | "isActive" | "createdAt";
type StatusFilter = "all" | "active" | "inactive";

function useCultureSchema(cultures: Culture[], currentId?: string) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(2, "Culture code is required")
      .max(10, "Culture code must be 10 characters or fewer")
      .regex(/^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/, "Use a code like en, ar, or es")
      .refine(
        (value) =>
          !cultures.some(
            (c) => c.id !== currentId && c.code.toLowerCase() === value.trim().toLowerCase()
          ),
        "This culture code is already in use"
      ),
    name: z.string().trim().min(1, "Culture name is required"),
    direction: z.enum(["ltr", "rtl"]),
  });
}

type FormValues = z.infer<ReturnType<typeof useCultureSchema>>;

function CulturePanel({
  mode,
  culture,
  cultures,
  actorKey,
  onSaved,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  culture?: Culture;
  cultures: Culture[];
  actorKey: number;
  onSaved: (culture: Culture) => void;
  onClose: () => void;
}) {
  const schema = useCultureSchema(cultures, culture?.id);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      code: culture?.code ?? "",
      name: culture?.name ?? "",
      direction: culture?.direction ?? "ltr",
    },
  });

  const direction = watch("direction");

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      if (mode === "edit" && culture) {
        const saved = await updateCulture(culture.cultureKey, {
          cultureCode: values.code.trim().toLowerCase(),
          cultureName: values.name.trim(),
          direction: values.direction,
          isActive: culture.isActive,
          modifiedBy: actorKey,
        });
        onSaved(saved);
        toast.success("Culture updated");
      } else if (mode === "create") {
        const created = await createCulture({
          cultureCode: values.code.trim().toLowerCase(),
          cultureName: values.name.trim(),
          direction: values.direction,
          createdBy: actorKey,
        });
        onSaved(created);
        toast.success("Culture created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof CulturesApiError ? error.message : "Could not save culture");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add culture" : mode === "edit" ? "Edit culture" : "Culture details"}
          </h2>
          {mode === "view" && culture && (
            <p className="text-sm text-muted-foreground">
              Created {new Date(culture.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isReadOnly && culture ? (
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Code</dt>
            <dd className="font-mono text-sm font-medium">{culture.code}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Name</dt>
            <dd className="text-sm font-medium">{culture.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Direction</dt>
            <dd className="text-sm font-medium uppercase">{culture.direction}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd>
              <Badge variant={culture.isActive ? "default" : "secondary"}>
                {culture.isActive ? "active" : "inactive"}
              </Badge>
            </dd>
          </div>
        </dl>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-2">
            <Label htmlFor="code" required>
              Culture code
            </Label>
            <Input
              id="code"
              placeholder="e.g. en"
              disabled={mode === "edit"}
              aria-invalid={!!errors.code}
              {...register("code")}
            />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name" required>
              Culture name
            </Label>
            <Input
              id="name"
              placeholder="e.g. English"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label required>Direction</Label>
            <Select
              value={direction}
              onValueChange={(v) => setValue("direction", (v as "ltr" | "rtl") ?? "ltr", { shouldValidate: true })}
            >
              <SelectTrigger className="h-10 w-full max-w-xs">
                <SelectValue>
                  {(value: string | null) =>
                    value === "rtl" ? "RTL — Right to left" : "LTR — Left to right"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ltr">LTR — Left to right</SelectItem>
                <SelectItem value="rtl">RTL — Right to left</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {mode === "edit" ? "Save changes" : "Create culture"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function CultureList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;
  const canCreate = can(roleDef, "culture", "create");
  const canEdit = can(roleDef, "culture", "edit");

  const [rows, setRows] = useState<Culture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [panel, setPanel] = useState<PanelMode>("closed");
  const [selected, setSelected] = useState<Culture | undefined>();

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setRows(await listCultures());
    } catch (err) {
      setError(err instanceof CulturesApiError ? err.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    if (term) {
      result = result.filter(
        (r) => r.code.toLowerCase().includes(term) || r.name.toLowerCase().includes(term)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = sortKey === "isActive" ? String(a.isActive) : String(a[sortKey === "createdAt" ? "createdAt" : sortKey === "code" ? "code" : sortKey === "name" ? "name" : "direction"]);
        const bv = sortKey === "isActive" ? String(b.isActive) : String(b[sortKey === "createdAt" ? "createdAt" : sortKey === "code" ? "code" : sortKey === "name" ? "name" : "direction"]);
        const cmp = av.localeCompare(bv);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, statusFilter, sortKey, sortDirection]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  async function toggleActive(row: Culture) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setCultureActive(row.cultureKey, !row.isActive, actorKey);
      setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      toast.success(saved.isActive ? "Culture activated" : "Culture deactivated");
    } catch (err) {
      toast.error(err instanceof CulturesApiError ? err.message : "Could not update status");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Culture"
        description="Languages and text directions tenants can use for multi-culture data."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setSelected(undefined);
                setPanel("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add culture
            </Button>
          ) : undefined
        }
      />

      {panel !== "closed" && (
        <CulturePanel
          mode={panel}
          culture={selected}
          cultures={rows}
          actorKey={actorKey}
          onSaved={(saved) => {
            setRows((prev) => {
              const idx = prev.findIndex((r) => r.id === saved.id);
              if (idx === -1) return [...prev, saved].sort((a, b) => a.code.localeCompare(b.code));
              return prev.map((r) => (r.id === saved.id ? saved : r));
            });
          }}
          onClose={() => {
            setPanel("closed");
            setSelected(undefined);
          }}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v as StatusFilter) ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string | null) =>
                value === "active" ? "Active" : value === "inactive" ? "Inactive" : "All statuses"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading cultures…</div>
        ) : error ? (
          <EmptyState icon={Globe2} tone="muted" heading="Could not load cultures" description={error} size="compact" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Globe2}
            tone="primary"
            heading="No cultures yet"
            description="Add English, Arabic, Spanish, and other cultures for tenants."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr.</TableHead>
                <SortableTableHead sortKey="code" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Name
                </SortableTableHead>
                <SortableTableHead
                  sortKey="direction"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Direction
                </SortableTableHead>
                <SortableTableHead
                  sortKey="isActive"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Status
                </SortableTableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelected(row);
                    setPanel("view");
                  }}
                >
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-mono text-sm">{row.code}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="uppercase text-muted-foreground">{row.direction}</TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? "default" : "secondary"}>
                      {row.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelected(row);
                            setPanel("view");
                          }}
                        >
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelected(row);
                                setPanel("edit");
                              }}
                            >
                              Modify
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleActive(row)}>
                              {row.isActive ? "Deactivate" : "Activate"}
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

export default function CultureMasterPage() {
  return (
    <AccessGate module="culture">
      {(roleDef) => <CultureList roleDef={roleDef} />}
    </AccessGate>
  );
}
