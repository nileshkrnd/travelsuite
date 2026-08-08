"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Upload,
  X,
  Plus,
  Trash2,
  Star,
  Sparkles,
  Wrench,
  CreditCard,
  Banknote,
  Landmark as BankIcon,
  MapPin,
  Compass,
  Clock,
  Cigarette,
  PawPrint,
  HelpCircle,
  Save,
  Loader2,
} from "lucide-react";
import { Section } from "@/components/masters/PropertyFormSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ICONS } from "@/lib/icon-registry";
import {
  listPropertyMedia,
  uploadPropertyMedia,
  updatePropertyMedia,
  setCoverPropertyMedia,
  deletePropertyMedia,
  PropertyMediaApiError,
} from "@/lib/services/property-media.service";
import { listAmenities } from "@/lib/services/amenities.service";
import { listFacilities } from "@/lib/services/facilities.service";
import {
  listPropertyAmenities,
  savePropertyAmenities,
  PropertyAmenitiesApiError,
} from "@/lib/services/property-amenities.service";
import {
  listPropertyFacilities,
  savePropertyFacilities,
  PropertyFacilitiesApiError,
} from "@/lib/services/property-facilities.service";
import type { PropertyMedia, PropertyMediaKind } from "@/types";

/** Preview-only note shown on every mock tab — saves stay local to this session only. */
function PreviewNotice() {
  return (
    <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      This section saves locally for this session only — it isn&apos;t connected to the database yet.
    </p>
  );
}

/** Mock "save this tab" action — simulates a save (no backend call) so each section can be saved independently. */
function SaveSectionButton({ label }: { label: string }) {
  const [saving, setSaving] = useState(false);
  function handleSave() {
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      toast.success(`${label} saved`);
    }, 400);
  }
  return (
    <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Save {label.toLowerCase()}
    </Button>
  );
}

function ChipToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string; icon?: React.ComponentType<{ className?: string }> }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const checked = value.includes(opt.id);
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
              checked
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted/50"
            )}
          >
            <Checkbox checked={checked} onCheckedChange={() => toggle(opt.id)} />
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const IMAGE_TYPE_OPTIONS = [
  "Rooms",
  "Bathroom",
  "Amenities",
  "Pool",
  "Common Areas",
  "Dining",
  "Others",
];

/** Media tab — real, database-backed photo/video gallery for a property (PropertyMedia master). */
export function MediaTab({
  propertyId,
  actorKey,
  onCoverChange,
}: {
  propertyId: number;
  actorKey: number;
  onCoverChange?: (url: string | null) => void;
}) {
  const [items, setItems] = useState<PropertyMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageType, setImageType] = useState(IMAGE_TYPE_OPTIONS[0]!);
  const [mediaType, setMediaType] = useState<PropertyMediaKind>("image");
  const [uploading, setUploading] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  function setBusy(id: string, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function notifyCover(rows: PropertyMedia[]) {
    onCoverChange?.(rows.find((r) => r.isCover)?.url ?? null);
  }

  async function refresh() {
    setLoading(true);
    try {
      const rows = await listPropertyMedia(propertyId);
      setItems(rows);
      notifyCover(rows);
    } catch (error) {
      toast.error(error instanceof PropertyMediaApiError ? error.message : "Failed to load media");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!actorKey) {
      toast.error("Missing user key — sign in again before uploading.");
      return;
    }
    setUploading(true);
    let uploaded = 0;
    let failed = 0;
    const newlyCreated: PropertyMedia[] = [];
    for (const file of Array.from(files)) {
      try {
        const created = await uploadPropertyMedia(file, {
          propertyId,
          mediaType,
          imageType,
          createdBy: actorKey,
        });
        newlyCreated.push(created);
        setItems((prev) => [...prev, created]);
        uploaded += 1;
      } catch (error) {
        failed += 1;
        toast.error(
          error instanceof PropertyMediaApiError ? error.message : `Could not upload ${file.name}`
        );
      }
    }
    setUploading(false);
    if (newlyCreated.length > 0) notifyCover([...items, ...newlyCreated]);
    if (uploaded > 0) toast.success(`${uploaded} file${uploaded > 1 ? "s" : ""} uploaded`);
    if (failed > 0 && uploaded === 0) return;
  }

  async function removeItem(id: string) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    setBusy(id, true);
    try {
      await deletePropertyMedia(Number(id), actorKey);
      await refresh();
      toast.success("Media removed");
    } catch (error) {
      toast.error(error instanceof PropertyMediaApiError ? error.message : "Could not remove media");
    } finally {
      setBusy(id, false);
    }
  }

async function saveDescription(id: string, description: string) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    setBusy(id, true);
    try {
      const saved = await updatePropertyMedia(Number(id), { description, modifiedBy: actorKey });
      setItems((prev) => prev.map((item) => (item.id === id ? saved : item)));
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("Description saved");
    } catch (error) {
      toast.error(error instanceof PropertyMediaApiError ? error.message : "Could not save description");
    } finally {
      setBusy(id, false);
    }
  }

  function updateDescriptionLocal(id: string, description: string) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, description } : item)));
    setDirtyIds((prev) => new Set(prev).add(id));
  }

  async function makeCover(id: string) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    setBusy(id, true);
    try {
      await setCoverPropertyMedia(Number(id), actorKey);
      await refresh();
      toast.success("Cover image updated");
    } catch (error) {
      toast.error(error instanceof PropertyMediaApiError ? error.message : "Could not set cover image");
    } finally {
      setBusy(id, false);
    }
  }

  return (
    <Section icon={ImageIcon} title="Media" description="Photos and videos shown on the property listing and channels.">
      <div className="space-y-4">
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Uploads save immediately — the property&apos;s cover image is used on its card in the property list.
        </p>

        <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Image type</Label>
            <Select value={imageType} onValueChange={(v) => setImageType(v ?? IMAGE_TYPE_OPTIONS[0]!)}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Media type</Label>
            <Select
              value={mediaType}
              onValueChange={(v) => setMediaType((v as PropertyMediaKind) ?? "image")}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue>{(value: string | null) => (value === "video" ? "Video" : "Image")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <input
              ref={inputRef}
              type="file"
              accept={mediaType === "video" ? "video/*" : "image/*"}
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">
                {uploading
                  ? "Uploading…"
                  : `Click to upload ${mediaType === "video" ? "videos" : "photos"} — select multiple files at once`}
              </p>
              <p className="text-xs text-muted-foreground">
                Tagged as <span className="font-medium text-foreground">{imageType}</span> — or drag and drop
              </p>
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading media…</p>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const busy = busyIds.has(item.id);
              return (
                <div key={item.id} className="group relative overflow-hidden rounded-lg border border-border">
                  <div className="relative aspect-square">
                    {item.mediaType === "video" ? (
                      <video src={item.url} className="h-full w-full object-cover" muted controls />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt={item.fileName ?? ""} className="h-full w-full object-cover" />
                    )}
                    {item.isCover && (
                      <Badge className="absolute left-1.5 top-1.5" variant="default">
                        Cover
                      </Badge>
                    )}
                    <div className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {!item.isCover && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void makeCover(item.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
                          aria-label="Make cover image"
                          title="Make cover image"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeItem(item.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
                        aria-label="Remove media"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 p-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{item.imageType}</Badge>
                      <Badge variant="outline" className="capitalize">
                        {item.mediaType}
                      </Badge>
                    </div>
                    <Textarea
                      rows={2}
                      placeholder="Add a description…"
                      value={item.description ?? ""}
                      onChange={(e) => updateDescriptionLocal(item.id, e.target.value)}
                      className="min-h-0 resize-none text-xs"
                    />
                    {dirtyIds.has(item.id) && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 w-full text-xs"
                        disabled={busy}
                        onClick={() => void saveDescription(item.id, item.description ?? "")}
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save description
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No media added yet. The first upload becomes the cover.</p>
        )}
      </div>
    </Section>
  );
}

type LinkableOption = {
  id: number;
  name: string;
  icon: string | null;
  categoryName?: string;
};

/** Grouped checkbox picker for a linked master (Amenity/Facility), grouped by category. */
function GroupedLinkPicker({
  options,
  selected,
  onToggle,
}: {
  options: LinkableOption[];
  selected: Set<number>;
  onToggle: (id: number) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, LinkableOption[]>();
    for (const opt of options) {
      const key = opt.categoryName ?? "Other";
      const list = map.get(key) ?? [];
      list.push(opt);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [options]);

  return (
    <div className="space-y-4">
      {groups.map(([category, items]) => (
        <div key={category} className="space-y-2">
          <Label>{category}</Label>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => {
              const checked = selected.has(item.id);
              const Icon = item.icon ? ICONS[item.icon] : undefined;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    checked
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => onToggle(item.id)} />
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Amenities tab — selects from the real Amenity master, persisted via PropertyAmenity links. */
export function AmenitiesTab({ propertyId, actorKey }: { propertyId: number; actorKey: number }) {
  const [options, setOptions] = useState<LinkableOption[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listAmenities({ activeOnly: true }), listPropertyAmenities(propertyId)])
      .then(([amenities, linked]) => {
        if (cancelled) return;
        setOptions(
          amenities.map((a) => ({ id: a.amenityKey, name: a.name, icon: a.icon, categoryName: a.categoryName }))
        );
        setSelected(new Set(linked.map((l) => l.amenityId)));
        setDirty(false);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof PropertyAmenitiesApiError ? error.message : "Failed to load amenities");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setDirty(true);
  }

  async function handleSave() {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    setSaving(true);
    try {
      await savePropertyAmenities(propertyId, [...selected]);
      setDirty(false);
      toast.success("Amenities saved");
    } catch (error) {
      toast.error(error instanceof PropertyAmenitiesApiError ? error.message : "Could not save amenities");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      icon={Sparkles}
      title="Amenities"
      description="Guest-facing amenities offered by this property, selected from the Amenity master."
    >
      <div className="space-y-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading amenities…</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No amenities defined yet — add them under Masters → Amenity.
          </p>
        ) : (
          <GroupedLinkPicker options={options} selected={selected} onToggle={toggle} />
        )}
        <Button type="button" size="sm" disabled={saving || !dirty} onClick={() => void handleSave()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save amenities
        </Button>
      </div>
    </Section>
  );
}

/** Facilities tab — selects from the real Facility master, persisted via PropertyFacility links. */
export function FacilitiesTab({ propertyId, actorKey }: { propertyId: number; actorKey: number }) {
  const [options, setOptions] = useState<LinkableOption[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listFacilities({ activeOnly: true }), listPropertyFacilities(propertyId)])
      .then(([facilities, linked]) => {
        if (cancelled) return;
        setOptions(
          facilities.map((f) => ({ id: f.facilityKey, name: f.name, icon: f.icon, categoryName: f.categoryName }))
        );
        setSelected(new Set(linked.map((l) => l.facilityId)));
        setDirty(false);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof PropertyFacilitiesApiError ? error.message : "Failed to load facilities");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setDirty(true);
  }

  async function handleSave() {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    setSaving(true);
    try {
      await savePropertyFacilities(propertyId, [...selected]);
      setDirty(false);
      toast.success("Facilities saved");
    } catch (error) {
      toast.error(error instanceof PropertyFacilitiesApiError ? error.message : "Could not save facilities");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      icon={Wrench}
      title="Facilities"
      description="On-site facilities offered by this property, selected from the Facility master."
    >
      <div className="space-y-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading facilities…</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No facilities defined yet — add them under Masters → Facility.
          </p>
        ) : (
          <GroupedLinkPicker options={options} selected={selected} onToggle={toggle} />
        )}
        <Button type="button" size="sm" disabled={saving || !dirty} onClick={() => void handleSave()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save facilities
        </Button>
      </div>
    </Section>
  );
}

const CARD_OPTIONS = [
  { id: "visa", label: "Visa" },
  { id: "mastercard", label: "Mastercard" },
  { id: "amex", label: "American Express" },
  { id: "discover", label: "Discover" },
  { id: "diners", label: "Diners Club" },
  { id: "unionpay", label: "UnionPay" },
  { id: "jcb", label: "JCB" },
  { id: "maestro", label: "Maestro" },
];

const OTHER_PAYMENT_OPTIONS = [
  { id: "cash", label: "Cash Accepted", icon: Banknote },
  { id: "banktransfer", label: "Bank Transfer", icon: BankIcon },
  { id: "payatproperty", label: "Pay at Property" },
];

export function SupportedCardPaymentTab() {
  const [cards, setCards] = useState<string[]>(["visa", "mastercard"]);
  const [other, setOther] = useState<string[]>(["payatproperty"]);
  return (
    <Section icon={CreditCard} title="Supported Card Payment" description="Payment methods accepted at this property.">
      <div className="space-y-5">
        <PreviewNotice />
        <div className="space-y-2">
          <Label>Card networks</Label>
          <ChipToggleGroup options={CARD_OPTIONS} value={cards} onChange={setCards} />
        </div>
        <div className="space-y-2">
          <Label>Other payment options</Label>
          <ChipToggleGroup options={OTHER_PAYMENT_OPTIONS} value={other} onChange={setOther} />
        </div>
        <SaveSectionButton label="Payment methods" />
      </div>
    </Section>
  );
}

type PlaceRow = { id: string; name: string; distance: string; category: string };

function PlacesEditor({
  rows,
  setRows,
  categories,
  nameLabel,
  distanceLabel,
}: {
  rows: PlaceRow[];
  setRows: React.Dispatch<React.SetStateAction<PlaceRow[]>>;
  categories: string[];
  nameLabel: string;
  distanceLabel: string;
}) {
  function update(id: string, patch: Partial<PlaceRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: "", distance: "", category: categories[0]! },
    ]);
  }
  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_140px_160px_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">{nameLabel}</Label>
            <Input
              className="h-9"
              value={row.name}
              onChange={(e) => update(row.id, { name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{distanceLabel}</Label>
            <Input
              className="h-9"
              placeholder="e.g. 2.5 km"
              value={row.distance}
              onChange={(e) => update(row.id, { distance: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={row.category} onValueChange={(v) => update(row.id, { category: v ?? categories[0]! })}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeRow(row.id)} aria-label="Remove">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4" />
        Add row
      </Button>
    </div>
  );
}

export function NearByAreaTab() {
  const [rows, setRows] = useState<PlaceRow[]>([
    { id: "seed-1", name: "City Center", distance: "2.5 km", category: "Landmark" },
    { id: "seed-2", name: "International Airport", distance: "18 km", category: "Airport" },
  ]);
  return (
    <Section icon={MapPin} title="Near By Area" description="Landmarks and points of interest close to the property.">
      <div className="space-y-4">
        <PreviewNotice />
        <PlacesEditor
          rows={rows}
          setRows={setRows}
          categories={["Landmark", "Airport", "Train Station", "Mall", "Beach", "Business District"]}
          nameLabel="Place name"
          distanceLabel="Distance"
        />
        <SaveSectionButton label="Nearby areas" />
      </div>
    </Section>
  );
}

export function NearByActivitiesTab() {
  const [rows, setRows] = useState<PlaceRow[]>([
    { id: "seed-1", name: "Desert Safari", distance: "30 min drive", category: "Adventure" },
    { id: "seed-2", name: "Souq Waqif", distance: "10 min walk", category: "Cultural" },
  ]);
  return (
    <Section icon={Compass} title="Near By Activities" description="Things guests can do around the property.">
      <div className="space-y-4">
        <PreviewNotice />
        <PlacesEditor
          rows={rows}
          setRows={setRows}
          categories={["Adventure", "Cultural", "Shopping", "Nature", "Nightlife", "Family"]}
          nameLabel="Activity name"
          distanceLabel="Distance / duration"
        />
        <SaveSectionButton label="Nearby activities" />
      </div>
    </Section>
  );
}

export function PoliciesTab() {
  const [checkIn, setCheckIn] = useState("14:00");
  const [checkOut, setCheckOut] = useState("12:00");
  const [cancellation, setCancellation] = useState("");
  const [children, setChildren] = useState("");
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [petPolicy, setPetPolicy] = useState("");
  const [smoking, setSmoking] = useState("nonSmoking");
  const [extraBed, setExtraBed] = useState("");

  return (
    <Section icon={Clock} title="Policies" description="Check-in/out times and stay policies shown to guests.">
      <div className="space-y-5">
        <PreviewNotice />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="checkIn">Check-in time</Label>
            <Input id="checkIn" type="time" className="h-10" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkOut">Check-out time</Label>
            <Input id="checkOut" type="time" className="h-10" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cancellation">Cancellation policy</Label>
            <Textarea
              id="cancellation"
              rows={3}
              placeholder="e.g. Free cancellation up to 48 hours before check-in."
              value={cancellation}
              onChange={(e) => setCancellation(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="children">Child policy</Label>
            <Textarea
              id="children"
              rows={2}
              placeholder="e.g. Children of all ages are welcome."
              value={children}
              onChange={(e) => setChildren(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={petsAllowed} onCheckedChange={(c) => setPetsAllowed(c === true)} />
              <PawPrint className="h-4 w-4" />
              Pets allowed
            </label>
            {petsAllowed && (
              <Textarea
                rows={2}
                placeholder="e.g. Pets up to 10kg, additional charges may apply."
                value={petPolicy}
                onChange={(e) => setPetPolicy(e.target.value)}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Smoking policy</Label>
            <Select value={smoking} onValueChange={(v) => setSmoking(v ?? "nonSmoking")}>
              <SelectTrigger className="h-10 w-full">
                <Cigarette className="h-4 w-4 text-muted-foreground" />
                <SelectValue>
                  {(value: string | null) => {
                    if (value === "smokingRooms") return "Smoking rooms available";
                    if (value === "designatedAreas") return "Designated smoking areas";
                    return "Non-smoking property";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nonSmoking">Non-smoking property</SelectItem>
                <SelectItem value="smokingRooms">Smoking rooms available</SelectItem>
                <SelectItem value="designatedAreas">Designated smoking areas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="extraBed">Extra bed policy</Label>
            <Input
              id="extraBed"
              className="h-10"
              placeholder="e.g. Available on request, charges apply"
              value={extraBed}
              onChange={(e) => setExtraBed(e.target.value)}
            />
          </div>
        </div>
        <SaveSectionButton label="Policies" />
      </div>
    </Section>
  );
}

type FaqRow = { id: string; question: string; answer: string };

export function FrequentlyAskedQuestionsTab() {
  const [rows, setRows] = useState<FaqRow[]>([
    {
      id: "seed-1",
      question: "Is breakfast included in the room rate?",
      answer: "Breakfast is included for select rate plans — check the rate details at booking.",
    },
  ]);

  function update(id: string, patch: Partial<FaqRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { id: `faq-${Date.now()}-${Math.random().toString(36).slice(2)}`, question: "", answer: "" }]);
  }
  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <Section icon={HelpCircle} title="Frequently Asked Questions" description="Common guest questions shown on the property page.">
      <div className="space-y-4">
        <PreviewNotice />
        {rows.map((row, i) => (
          <div key={row.id} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Question {i + 1}</Label>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeRow(row.id)} aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Input
              className="h-9"
              placeholder="Question"
              value={row.question}
              onChange={(e) => update(row.id, { question: e.target.value })}
            />
            <Textarea
              rows={2}
              placeholder="Answer"
              value={row.answer}
              onChange={(e) => update(row.id, { answer: e.target.value })}
            />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Add question
        </Button>
        <SaveSectionButton label="FAQs" />
      </div>
    </Section>
  );
}
