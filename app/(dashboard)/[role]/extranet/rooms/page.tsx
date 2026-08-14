"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  BedDouble,
  MoreHorizontal,
  Search,
  Eye,
  Pencil,
  Power,
  PowerOff,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExtranetPropertyScope } from "@/components/shared/ExtranetPropertyScope";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useExtranetPropertyScopeStore } from "@/lib/store/extranet-property-scope.store";
import {
  listPropertyRooms,
  setPropertyRoomActive,
  deletePropertyRoom,
  PropertyRoomsApiError,
} from "@/lib/services/property-rooms.service";
import { can } from "@/config/permissions";
import type { Property, PropertyRoom, RoleDef } from "@/types";

type SortKey = "roomCode" | "roomName" | "roomType" | "occupancy" | "status";

function StatCard({
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

function PropertyRoomList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const scope = useExtranetPropertyScopeStore();
  const propertyId = scope.propertyId;
  const propertyLabel = scope.propertyLabel;

  useEffect(() => {
    if (scope.propertyId) return;
    const urlPropertyId = Number(searchParams.get("propertyId") ?? 0);
    if (Number.isFinite(urlPropertyId) && urlPropertyId > 0) {
      scope.setProperty({ propertyId: urlPropertyId, propertyLabel: null });
    }
    // seed from URL only when the sticky scope is still empty — one-time on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [entries, setEntries] = useState<PropertyRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>("roomName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "propertyRooms", "edit");
  const canCreate = can(roleDef, "propertyRooms", "create");
  const canDelete = can(roleDef, "propertyRooms", "delete");

  function selectProperty(id: number | null, property: Property | null) {
    scope.setProperty({
      propertyId: id,
      propertyLabel: property
        ? property.propertyDisplayName || property.propertyName || property.propertyCode
        : null,
      countryId: property?.countryId ?? null,
      stateId: property?.stateId ?? null,
      cityId: property?.cityId ?? null,
      areaId: property?.areaId ?? null,
    });
    router.replace(`/${role}/extranet/rooms`);
  }

  useEffect(() => {
    if (tenantKey <= 0 || !propertyId || propertyId <= 0) {
      setEntries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listPropertyRooms({ tenantId: tenantKey, propertyId })
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof PropertyRoomsApiError ? err.message : "Failed to load rooms");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, propertyId]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = entries;
    if (term) {
      result = result.filter((e) => {
        return (
          e.roomCode.toLowerCase().includes(term) ||
          e.roomName.toLowerCase().includes(term) ||
          (e.roomTypeName ?? "").toLowerCase().includes(term) ||
          (e.roomTypeCode ?? "").toLowerCase().includes(term)
        );
      });
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortKey === "roomCode") cmp = a.roomCode.localeCompare(b.roomCode);
        else if (sortKey === "roomName") cmp = a.roomName.localeCompare(b.roomName);
        else if (sortKey === "roomType") cmp = (a.roomTypeName ?? "").localeCompare(b.roomTypeName ?? "");
        else if (sortKey === "occupancy") cmp = a.maxOccupancy - b.maxOccupancy;
        else cmp = Number(a.isActive) - Number(b.isActive);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [entries, search, sortKey, sortDirection]);

  const activeCount = entries.filter((e) => e.isActive).length;

  async function toggleStatus(entry: PropertyRoom) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertyRoomActive(entry.propertyRoomKey, !entry.isActive, actorKey);
      setEntries((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      toast.success(saved.isActive ? "Room activated" : "Room deactivated");
    } catch (error) {
      toast.error(error instanceof PropertyRoomsApiError ? error.message : "Could not update status");
    }
  }

  async function removeEntry(entry: PropertyRoom) {
    try {
      await deletePropertyRoom(entry.propertyRoomKey);
      setEntries((prev) => prev.filter((r) => r.id !== entry.id));
      toast.success("Room removed");
    } catch (error) {
      toast.error(error instanceof PropertyRoomsApiError ? error.message : "Could not remove room");
    }
  }

  function goToView(entry: PropertyRoom) {
    router.push(`/${role}/extranet/rooms/${entry.propertyRoomKey}`);
  }

  const newHref =
    propertyId && propertyId > 0
      ? `/${role}/extranet/rooms/new?propertyId=${propertyId}`
      : `/${role}/extranet/rooms/new`;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Property Rooms"
        description="Select a property first, then map supplier room codes and names to system room types."
        actions={
          canCreate && propertyId && propertyId > 0 ? (
            <Button nativeButton={false} render={<Link href={newHref} />}>
              <Plus className="h-4 w-4" />
              New room
            </Button>
          ) : undefined
        }
      />

      <ExtranetPropertyScope
        tenantId={tenantKey}
        propertyId={propertyId}
        propertyLabel={propertyLabel}
        initialCountryId={scope.countryId}
        initialStateId={scope.stateId}
        initialCityId={scope.cityId}
        initialAreaId={scope.areaId}
        onPropertyChange={selectProperty}
        emptyHeading="Select a property to manage rooms"
        emptyDescription="Filter by country and city, then choose the property."
      >
        {loading && <p className="text-sm text-muted-foreground">Loading rooms…</p>}

        {entries.length > 0 && (
          <div className="grid max-w-md grid-cols-2 gap-4">
            <StatCard icon={BedDouble} label="Total rooms" value={entries.length} />
            <StatCard icon={CheckCircle2} label="Active" value={activeCount} />
          </div>
        )}

        {entries.length > 0 && (
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search code, name, room type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
        )}

        <Card>
          {entries.length === 0 && !loading ? (
            <EmptyState
              icon={BedDouble}
              tone="primary"
              heading="No rooms yet"
              description="Create the first supplier room mapping for this property."
              size="compact"
              action={
                canCreate ? (
                  <Button nativeButton={false} render={<Link href={newHref} />}>
                    <Plus className="h-4 w-4" />
                    New room
                  </Button>
                ) : undefined
              }
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Search}
              tone="muted"
              heading="No matching rooms"
              description="Try a different search term."
              size="compact"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Sr. No</TableHead>
                  <SortableTableHead sortKey="roomCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                    Code
                  </SortableTableHead>
                  <SortableTableHead sortKey="roomName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                    Name
                  </SortableTableHead>
                  <SortableTableHead sortKey="roomType" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                    Room type
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="occupancy"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  >
                    Occupancy
                  </SortableTableHead>
                  <SortableTableHead sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                    Status
                  </SortableTableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((entry, index) => (
                  <TableRow key={entry.id} className="cursor-pointer" onClick={() => goToView(entry)}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.roomCode}</TableCell>
                    <TableCell className="font-medium">{entry.roomName}</TableCell>
                    <TableCell>{entry.roomTypeName ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">
                      {entry.maxAdult}/{entry.maxChild}/{entry.maxOccupancy}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.isActive ? "default" : "secondary"}>
                        {entry.isActive ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => goToView(entry)}>
                            <Eye className="h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => router.push(`/${role}/extranet/rooms/${entry.propertyRoomKey}/edit`)}
                            >
                              <Pencil className="h-4 w-4" />
                              Modify
                            </DropdownMenuItem>
                          )}
                          {canEdit && (
                            <DropdownMenuItem onClick={() => void toggleStatus(entry)}>
                              {entry.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                              {entry.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem onClick={() => void removeEntry(entry)}>
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
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
      </ExtranetPropertyScope>
    </div>
  );
}

export default function PropertyRoomPage() {
  return (
    <AccessGate module="propertyRooms">
      {(roleDef) => (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
          <PropertyRoomList roleDef={roleDef} />
        </Suspense>
      )}
    </AccessGate>
  );
}
