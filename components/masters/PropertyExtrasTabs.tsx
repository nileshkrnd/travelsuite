"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Upload,
  X,
  Plus,
  Trash2,
  Wifi,
  Dumbbell,
  Sparkles,
  UtensilsCrossed,
  ParkingCircle,
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

type MediaKind = "image" | "video";

type MediaItem = {
  id: string;
  url: string;
  name: string;
  imageType: string;
  mediaType: MediaKind;
  description: string;
};

/** Media tab — categorized photo/video gallery, client-side preview only (object URLs, nothing uploaded). */
export function MediaTab() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [imageType, setImageType] = useState(IMAGE_TYPE_OPTIONS[0]!);
  const [mediaType, setMediaType] = useState<MediaKind>("image");
  const [description, setDescription] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const next = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(file),
      name: file.name,
      imageType,
      mediaType,
      description: description.trim(),
    }));
    setItems((prev) => [...prev, ...next]);
    setDescription("");
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <Section icon={ImageIcon} title="Media" description="Photos and videos shown on the property listing and channels.">
      <div className="space-y-4">
        <PreviewNotice />

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
            <Select value={mediaType} onValueChange={(v) => setMediaType((v as MediaKind) ?? "image")}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue>{(value: string | null) => (value === "video" ? "Video" : "Image")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="mediaDescription">Description</Label>
            <Input
              id="mediaDescription"
              placeholder="e.g. Deluxe room with king bed and city view"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <input
              ref={inputRef}
              type="file"
              accept={mediaType === "video" ? "video/*" : "image/*"}
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">
                Click to upload {mediaType === "video" ? "videos" : "photos"}
              </p>
              <p className="text-xs text-muted-foreground">
                Tagged as <span className="font-medium text-foreground">{imageType}</span> — or drag and drop
              </p>
            </button>
          </div>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item, i) => (
              <div key={item.id} className="group relative overflow-hidden rounded-lg border border-border">
                <div className="relative aspect-square">
                  {item.mediaType === "video" ? (
                    <video src={item.url} className="h-full w-full object-cover" muted controls />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                  )}
                  {i === 0 && (
                    <Badge className="absolute left-1.5 top-1.5" variant="default">
                      Cover
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove media"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1 p-2">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{item.imageType}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {item.mediaType}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No media added yet. The first photo becomes the cover.</p>
        )}
        <SaveSectionButton label="Media" />
      </div>
    </Section>
  );
}

const AMENITY_GROUPS: { label: string; options: { id: string; label: string; icon?: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    label: "General",
    options: [
      { id: "wifi", label: "Free WiFi", icon: Wifi },
      { id: "ac", label: "Air Conditioning" },
      { id: "frontdesk", label: "24-Hour Front Desk", icon: Clock },
      { id: "nonsmoking", label: "Non-Smoking Rooms" },
      { id: "elevator", label: "Elevator" },
    ],
  },
  {
    label: "Recreation",
    options: [
      { id: "pool", label: "Swimming Pool" },
      { id: "gym", label: "Fitness Center", icon: Dumbbell },
      { id: "spa", label: "Spa", icon: Sparkles },
      { id: "bar", label: "Bar" },
    ],
  },
  {
    label: "Dining",
    options: [
      { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed },
      { id: "roomservice", label: "Room Service" },
      { id: "breakfast", label: "Breakfast Included" },
    ],
  },
  {
    label: "Convenience",
    options: [
      { id: "parking", label: "Parking", icon: ParkingCircle },
      { id: "shuttle", label: "Airport Shuttle" },
      { id: "laundry", label: "Laundry Service" },
      { id: "concierge", label: "Concierge" },
      { id: "petfriendly", label: "Pet Friendly", icon: PawPrint },
    ],
  },
];

export function AmenitiesTab() {
  const [selected, setSelected] = useState<string[]>(["wifi", "ac", "pool"]);
  return (
    <Section icon={Sparkles} title="Amenities" description="Guest-facing amenities shown on the property page.">
      <div className="space-y-5">
        <PreviewNotice />
        {AMENITY_GROUPS.map((group) => (
          <div key={group.label} className="space-y-2">
            <Label>{group.label}</Label>
            <ChipToggleGroup
              options={group.options}
              value={selected}
              onChange={setSelected}
            />
          </div>
        ))}
        <SaveSectionButton label="Amenities" />
      </div>
    </Section>
  );
}

const FACILITY_OPTIONS = [
  { id: "conference", label: "Conference Room" },
  { id: "banquet", label: "Banquet Hall" },
  { id: "business", label: "Business Center" },
  { id: "kidsclub", label: "Kids Club" },
  { id: "rooftop", label: "Rooftop Terrace" },
  { id: "garden", label: "Garden" },
  { id: "evcharging", label: "EV Charging Station" },
  { id: "wheelchair", label: "Wheelchair Accessible" },
  { id: "luggage", label: "Luggage Storage" },
  { id: "currency", label: "Currency Exchange" },
  { id: "atm", label: "ATM on Site" },
  { id: "giftshop", label: "Gift Shop" },
];

export function FacilitiesTab() {
  const [selected, setSelected] = useState<string[]>(["business", "wheelchair"]);
  return (
    <Section icon={Wrench} title="Facilities" description="On-site facilities available to guests and events.">
      <div className="space-y-4">
        <PreviewNotice />
        <ChipToggleGroup options={FACILITY_OPTIONS} value={selected} onChange={setSelected} />
        <SaveSectionButton label="Facilities" />
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
