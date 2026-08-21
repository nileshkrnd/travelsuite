"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Star,
  Users,
  BedDouble,
  Eye,
  Image as ImageIcon,
  ShieldCheck,
  Baby,
  Ticket,
  Tag,
  Building2,
  Info,
  ChevronRight,
  PackageSearch,
  Sparkles,
  Layers,
  Navigation,
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { getProperty, PropertiesApiError } from "@/lib/services/properties.service";
import { listPropertyMedia } from "@/lib/services/property-media.service";
import { listPropertyAmenities } from "@/lib/services/property-amenities.service";
import { listPropertyFacilities } from "@/lib/services/property-facilities.service";
import { listPropertyRooms } from "@/lib/services/property-rooms.service";
import { listPropertyRoomTypeBeds } from "@/lib/services/property-room-type-beds.service";
import { listPropertyRoomTypeViews } from "@/lib/services/property-room-type-views.service";
import { listPropertyRoomTypeMedia } from "@/lib/services/property-room-type-media.service";
import { listPropertyRoomTypeExtraBeds } from "@/lib/services/property-room-type-extra-beds.service";
import { listPropertyContracts } from "@/lib/services/property-contracts.service";
import { listPropertyContractRates } from "@/lib/services/property-contract-rates.service";
import { listPropertyContractCancellationPolicies } from "@/lib/services/property-contract-cancellation-policies.service";
import { listPropertyContractChildPolicies } from "@/lib/services/property-contract-child-policies.service";
import type { PropertyAmenityOption } from "@/lib/services/property-amenities.service";
import type { PropertyFacilityOption } from "@/lib/services/property-facilities.service";
import type {
  Property,
  PropertyMedia,
  PropertyRoom,
  PropertyRoomTypeBed,
  PropertyRoomTypeView,
  PropertyRoomTypeMedia,
  PropertyRoomTypeExtraBed,
  PropertyContract,
  PropertyContractRate,
  PropertyContractCancellationPolicy,
  PropertyContractChildPolicy,
  RoleDef,
} from "@/types";

interface RoomBundle {
  room: PropertyRoom;
  beds: PropertyRoomTypeBed[];
  views: PropertyRoomTypeView[];
  media: PropertyRoomTypeMedia[];
  extraBeds: PropertyRoomTypeExtraBed[];
}

interface DetailData {
  property: Property;
  media: PropertyMedia[];
  amenities: PropertyAmenityOption[];
  facilities: PropertyFacilityOption[];
  rooms: RoomBundle[];
  contracts: PropertyContract[];
  rates: PropertyContractRate[];
  cancellationPolicies: PropertyContractCancellationPolicy[];
  childPolicies: PropertyContractChildPolicy[];
}

function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function displayName(p: Property) {
  return p.propertyDisplayName || p.propertyName || p.propertyCode;
}

function SectionCard({
  id,
  icon: Icon,
  title,
  count,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20 p-0">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {count !== undefined && (
          <Badge variant="outline" className="ms-1">
            {count}
          </Badge>
        )}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function PropertyDetail({ roleDef: _roleDef }: { roleDef: RoleDef }) {
  const { role, propertyId } = useParams<{ role: string; propertyId: string }>();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const id = Number(propertyId);
      if (!id) return;
      setLoading(true);
      setLoadError(null);
      try {
        const [property, media, amenities, facilities, rooms, contracts, rates, cancellationPolicies, childPolicies] =
          await Promise.all([
            getProperty(id),
            listPropertyMedia(id, { activeOnly: true }),
            listPropertyAmenities(id),
            listPropertyFacilities(id),
            listPropertyRooms({ propertyId: id, activeOnly: true }),
            listPropertyContracts({ propertyId: id, activeOnly: true }),
            listPropertyContractRates({ propertyId: id, activeOnly: true }),
            listPropertyContractCancellationPolicies({ propertyId: id, activeOnly: true }),
            listPropertyContractChildPolicies({ propertyId: id, activeOnly: true }),
          ]);

        const roomBundles = await Promise.all(
          rooms.map(async (room) => {
            const [beds, views, roomMedia, extraBeds] = await Promise.all([
              listPropertyRoomTypeBeds({ propertyRoomId: room.propertyRoomKey }),
              listPropertyRoomTypeViews({ propertyRoomId: room.propertyRoomKey }),
              listPropertyRoomTypeMedia({ propertyRoomId: room.propertyRoomKey }),
              listPropertyRoomTypeExtraBeds({ propertyRoomId: room.propertyRoomKey }),
            ]);
            return { room, beds, views, media: roomMedia, extraBeds };
          })
        );

        setData({
          property,
          media,
          amenities,
          facilities,
          rooms: roomBundles,
          contracts,
          rates,
          cancellationPolicies,
          childPolicies,
        });
      } catch (error) {
        setLoadError(error instanceof PropertiesApiError ? error.message : "Failed to load property details");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="aspect-[21/9] w-full animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="p-6">
        <EmptyState
          icon={PackageSearch}
          tone="muted"
          heading="Property not found"
          description={loadError ?? "This property could not be loaded."}
          action={
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/sales/property-catalog`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to catalog
            </Button>
          }
        />
      </div>
    );
  }

  const { property, media, amenities, facilities, rooms, contracts, rates, cancellationPolicies, childPolicies } = data;

  const heroImage = media[0];
  const galleryImages = media.slice(1);
  const location = [property.addressLine1, property.cityName, property.countryName].filter(Boolean).join(", ");
  const currencyByContract = new Map(contracts.map((c) => [c.propertyContractKey, c.contractCurrencyCode]));
  const managedBySupplier = contracts.find((c) => c.supplierName)?.supplierName;

  const amenitiesByCategory = groupByCategory(amenities, (a) => a.categoryName);
  const facilitiesByCategory = groupByCategory(facilities, (f) => f.categoryName);

  const sections = [
    { id: "overview", label: "Overview" },
    galleryImages.length > 0 ? { id: "gallery", label: "Gallery" } : null,
    amenities.length > 0 || facilities.length > 0 ? { id: "amenities", label: "Amenities & Facilities" } : null,
    rooms.length > 0 ? { id: "rooms", label: "Room Types" } : null,
    rates.length > 0 ? { id: "rates", label: "Pricing" } : null,
    childPolicies.length > 0 ? { id: "children", label: "Child Policy" } : null,
    cancellationPolicies.length > 0 ? { id: "cancellation", label: "Cancellation Policy" } : null,
  ].filter((s): s is { id: string; label: string } => s !== null);

  return (
    <div className="space-y-6 pb-16">
      {activeImage && (
        <button
          type="button"
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
        >
          <img src={activeImage} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </button>
      )}

      <div className="relative">
        <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted sm:aspect-[3/1]">
          {heroImage ? (
            <img src={heroImage.url} alt={displayName(property)} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#001C35] via-[#0a3558] to-[#1a5a7a]">
              <Building2 className="h-12 w-12 text-white/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute inset-x-0 top-0 p-4 sm:p-6">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/90 shadow-sm backdrop-blur"
              nativeButton={false}
              render={<Link href={`/${role}/sales/property-catalog`} />}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to catalog
            </Button>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {property.propertyTypeNames.map((t) => (
                <Badge key={t} variant="secondary" className="bg-white/15 text-white ring-1 ring-white/30">
                  {t}
                </Badge>
              ))}
              {property.propertyCategoryNames.map((c) => (
                <Badge key={c} variant="secondary" className="bg-white/15 text-white ring-1 ring-white/30">
                  {c}
                </Badge>
              ))}
              {property.isFeatured && (
                <Badge className="gap-1 bg-amber-500 text-white">
                  <Star className="h-3 w-3 fill-current" />
                  Featured
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl font-semibold leading-tight sm:text-3xl">{displayName(property)}</h1>
              {property.starRating != null && property.starRating > 0 && (
                <span className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: property.starRating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
              <span className="font-mono text-xs">{property.propertyCode}</span>
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </span>
              )}
              {managedBySupplier && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {managedBySupplier}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
        <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <BedDouble className="h-4 w-4 text-primary" />
            {rooms.length} room {rooms.length === 1 ? "type" : "types"}
          </div>
          {amenities.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              {amenities.length} amenities
            </div>
          )}
          {property.propertyUsageName && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <Layers className="h-4 w-4 text-primary" />
              {property.propertyUsageName}
            </div>
          )}
          {property.googleMapUrl && (
            <a
              href={property.googleMapUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-primary hover:bg-muted"
            >
              <Navigation className="h-4 w-4" />
              View on map
            </a>
          )}
        </div>

        {sections.length > 1 && (
          <div className="flex flex-wrap gap-1 border-b border-border pb-1">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <SectionCard id="overview" icon={Info} title="Overview">
              {property.description || property.shortDescription ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                  {stripHtml(property.description) || stripHtml(property.shortDescription)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description provided yet.</p>
              )}
            </SectionCard>

            {galleryImages.length > 0 && (
              <SectionCard id="gallery" icon={ImageIcon} title="Gallery" count={galleryImages.length}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {galleryImages.map((m) => (
                    <button
                      key={m.propertyMediaKey}
                      type="button"
                      onClick={() => setActiveImage(m.url)}
                      className="group aspect-square overflow-hidden rounded-lg bg-muted"
                    >
                      <img
                        src={m.url}
                        alt={m.description ?? displayName(property)}
                        className="h-full w-full cursor-zoom-in object-cover transition-transform group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              </SectionCard>
            )}

            {(amenities.length > 0 || facilities.length > 0) && (
              <SectionCard id="amenities" icon={Sparkles} title="Amenities & Facilities">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amenities</p>
                    {amenities.length === 0 ? (
                      <p className="text-sm text-muted-foreground">—</p>
                    ) : (
                      Array.from(amenitiesByCategory.entries()).map(([cat, items]) => (
                        <div key={cat} className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">{cat}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {items.map((a) => (
                              <Badge key={a.amenityId} variant="outline">
                                {a.amenityName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Facilities</p>
                    {facilities.length === 0 ? (
                      <p className="text-sm text-muted-foreground">—</p>
                    ) : (
                      Array.from(facilitiesByCategory.entries()).map(([cat, items]) => (
                        <div key={cat} className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">{cat}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {items.map((f) => (
                              <Badge key={f.facilityId} variant="outline">
                                {f.facilityName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </SectionCard>
            )}

            {rooms.length > 0 && (
              <SectionCard id="rooms" icon={BedDouble} title="Room Types" count={rooms.length}>
                <div className="space-y-4">
                  {rooms.map(({ room, beds, views, media: roomMedia, extraBeds }) => (
                    <div key={room.propertyRoomKey} className="overflow-hidden rounded-lg border border-border">
                      <div className="flex flex-col sm:flex-row">
                        {roomMedia[0] && (
                          <div className="h-40 shrink-0 bg-muted sm:h-auto sm:w-48">
                            <img
                              src={roomMedia[0].thumbnailUrl || roomMedia[0].mediaUrl}
                              alt={room.roomName}
                              className="h-full w-full cursor-zoom-in object-cover"
                              onClick={() => setActiveImage(roomMedia[0].mediaUrl)}
                            />
                          </div>
                        )}
                        <div className="flex-1 p-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-medium">{room.roomName}</p>
                            <span className="font-mono text-[10px] text-muted-foreground">{room.roomCode}</span>
                            {room.roomTypeName && (
                              <Badge variant="outline" className="text-[10px]">
                                {room.roomTypeName}
                              </Badge>
                            )}
                          </div>
                          {room.description && <p className="mt-1 text-xs text-muted-foreground">{stripHtml(room.description)}</p>}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {room.maxAdult} adults, {room.maxChild} children (max {room.maxOccupancy})
                            </span>
                            {room.roomSize != null && (
                              <span>
                                {room.roomSize} {room.roomSizeUnitName ?? ""}
                              </span>
                            )}
                            {views.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {views.map((v) => v.viewTypeName).filter(Boolean).join(", ")}
                              </span>
                            )}
                          </div>
                          {beds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {beds.map((b) => (
                                <Badge key={b.propertyRoomTypeBedKey} variant="secondary" className="text-[10px]">
                                  {b.bedCount}× {b.bedTypeName}
                                </Badge>
                              ))}
                              {extraBeds.length > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  Extra bed available
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {childPolicies.length > 0 && (
              <SectionCard id="children" icon={Baby} title="Child Policy" count={childPolicies.length}>
                <div className="space-y-4">
                  {childPolicies.map((policy) => (
                    <div key={policy.propertyContractChildPolicyKey} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium">{policy.roomName ?? "All room types"}</p>
                        <Badge variant="outline" className="text-[10px]">
                          Max {policy.maxChild} children
                        </Badge>
                        {policy.childCountsInOccupancy && (
                          <Badge variant="outline" className="text-[10px]">
                            Counts in occupancy
                          </Badge>
                        )}
                      </div>
                      {policy.ageBands.length > 0 && (
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border text-muted-foreground">
                                <th className="py-1.5 pe-4 text-left font-medium">Age band</th>
                                <th className="py-1.5 pe-4 text-left font-medium">Type</th>
                                <th className="py-1.5 text-left font-medium">Rate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {policy.ageBands.map((band) => (
                                <tr key={band.propertyContractChildPolicyAgeKey} className="border-b border-border/50 last:border-0">
                                  <td className="py-1.5 pe-4">
                                    {band.fromAge}–{band.toAge} yrs
                                  </td>
                                  <td className="py-1.5 pe-4">{band.childPolicyTypeName ?? "—"}</td>
                                  <td className="py-1.5 font-medium">{band.rateValue != null ? band.rateValue : "Free"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {cancellationPolicies.length > 0 && (
              <SectionCard id="cancellation" icon={ShieldCheck} title="Cancellation Policy" count={cancellationPolicies.length}>
                <div className="space-y-4">
                  {cancellationPolicies.map((policy) => (
                    <div key={policy.propertyContractCancellationPolicyKey} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium">{policy.policyName}</p>
                        {policy.roomName && (
                          <Badge variant="outline" className="text-[10px]">
                            {policy.roomName}
                          </Badge>
                        )}
                        {policy.ratePlanName && (
                          <Badge variant="outline" className="text-[10px]">
                            {policy.ratePlanName}
                          </Badge>
                        )}
                        {policy.seasonName && (
                          <Badge variant="outline" className="text-[10px]">
                            {policy.seasonName}
                          </Badge>
                        )}
                      </div>
                      {policy.rules.length > 0 && (
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border text-muted-foreground">
                                <th className="py-1.5 pe-4 text-left font-medium">Window before arrival</th>
                                <th className="py-1.5 pe-4 text-left font-medium">Type</th>
                                <th className="py-1.5 text-left font-medium">Penalty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {policy.rules.map((rule) => (
                                <tr key={rule.propertyContractCancellationPolicyRuleKey} className="border-b border-border/50 last:border-0">
                                  <td className="py-1.5 pe-4">
                                    {rule.fromDaysBefore}
                                    {rule.toDaysBefore != null ? `–${rule.toDaysBefore}` : "+"} days
                                  </td>
                                  <td className="py-1.5 pe-4">{rule.cancellationPolicyTypeName ?? "—"}</td>
                                  <td className="py-1.5 font-medium">{rule.penaltyValue}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          <div className="space-y-6">
            {rates.length > 0 && (
              <SectionCard id="rates" icon={Ticket} title="Pricing" count={rates.length}>
                <div className="space-y-3">
                  {rates.map((rate) => (
                    <div key={rate.propertyContractRateKey} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{rate.roomName ?? "Room"}</p>
                        <p className="text-base font-semibold tabular-nums">
                          {currencyByContract.get(rate.propertyContractId) ?? ""} {rate.rateAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {rate.ratePlanName && (
                          <Badge variant="outline" className="text-[10px]">
                            {rate.ratePlanName}
                          </Badge>
                        )}
                        {rate.mealPlanName && <span>{rate.mealPlanName}</span>}
                        {rate.occupancyTypeName && <span>· {rate.occupancyTypeName}</span>}
                        {rate.seasonName && <span>· {rate.seasonName}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <SectionCard id="meta" icon={Tag} title="Property Details">
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Code</dt>
                  <dd className="font-mono text-xs">{property.propertyCode}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <Badge variant={property.isActive ? "default" : "secondary"}>{property.isActive ? "Active" : "Inactive"}</Badge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Published</dt>
                  <dd>{property.isPublished ? "Yes" : "No"}</dd>
                </div>
                {property.propertyBrandName && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Brand</dt>
                    <dd className="text-right">{property.propertyBrandName}</dd>
                  </div>
                )}
                {property.ownershipTypeName && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Ownership</dt>
                    <dd className="text-right">{property.ownershipTypeName}</dd>
                  </div>
                )}
                {location && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Location</dt>
                    <dd className="text-right">{location}</dd>
                  </div>
                )}
              </dl>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                nativeButton={false}
                render={<Link href={`/${role}/masters/property/${property.propertyId}`} />}
              >
                Open in Property Master
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function groupByCategory<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

export default function PropertyCatalogDetailPage() {
  return <AccessGate module="propertyCatalog">{(roleDef) => <PropertyDetail roleDef={roleDef} />}</AccessGate>;
}
