"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Contact, CreditCard, FileCheck2, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  B2BCustomerRelatedApiError,
  createB2BCustomerAddress,
  createB2BCustomerContact,
  createB2BCustomerCredit,
  createB2BCustomerDocument,
  deleteB2BCustomerAddress,
  deleteB2BCustomerContact,
  deleteB2BCustomerCredit,
  deleteB2BCustomerDocument,
  listB2BCustomerAddresses,
  listB2BCustomerContacts,
  listB2BCustomerCredits,
  listB2BCustomerDocuments,
} from "@/lib/services/b2b-customer-related.service";
import type {
  B2BCustomerAddress,
  B2BCustomerContact,
  B2BCustomerCredit,
  B2BCustomerDocument,
  CommonStatus,
  Country,
  GlobalCodeLookup,
} from "@/types";
import { contactTypesForParty } from "@/types";

export function B2BCustomerRelatedSections({
  b2bCustomerId,
  contactTypes,
  addressTypes,
  documentTypes,
  creditStatuses,
  documentStatuses,
  countries,
  userKey,
  canEdit,
}: {
  b2bCustomerId: number;
  contactTypes: GlobalCodeLookup[];
  addressTypes: GlobalCodeLookup[];
  documentTypes: GlobalCodeLookup[];
  creditStatuses: GlobalCodeLookup[];
  documentStatuses: CommonStatus[];
  countries: Country[];
  userKey: number;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-4">
      <ContactsSection b2bCustomerId={b2bCustomerId} contactTypes={contactTypes} userKey={userKey} canEdit={canEdit} />
      <AddressesSection
        b2bCustomerId={b2bCustomerId}
        addressTypes={addressTypes}
        countries={countries}
        userKey={userKey}
        canEdit={canEdit}
      />
      <DocumentsSection
        b2bCustomerId={b2bCustomerId}
        documentTypes={documentTypes}
        documentStatuses={documentStatuses}
        userKey={userKey}
        canEdit={canEdit}
      />
      <CreditsSection
        b2bCustomerId={b2bCustomerId}
        creditStatuses={creditStatuses}
        userKey={userKey}
        canEdit={canEdit}
      />
    </div>
  );
}

function ContactsSection({
  b2bCustomerId,
  contactTypes,
  userKey,
  canEdit,
}: {
  b2bCustomerId: number;
  contactTypes: GlobalCodeLookup[];
  userKey: number;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<B2BCustomerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const types = contactTypesForParty(contactTypes, "CUSTOMER");

  async function load() {
    setLoading(true);
    try {
      setRows(await listB2BCustomerContacts(b2bCustomerId));
    } catch (error) {
      toast.error(error instanceof B2BCustomerRelatedApiError ? error.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b2bCustomerId]);

  async function add() {
    if (!typeId || !firstName.trim() || !lastName.trim()) {
      toast.error("Type, first name and last name are required");
      return;
    }
    setSaving(true);
    try {
      await createB2BCustomerContact({
        b2bCustomerId,
        contactTypeId: typeId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || null,
        isPrimary: rows.length === 0,
        createdBy: userKey,
      });
      setTypeId(null);
      setFirstName("");
      setLastName("");
      setEmail("");
      await load();
      toast.success("Contact added");
    } catch {
      toast.error("Could not add contact");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Contact className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Contacts</h3>
      </div>
      {canEdit && (
        <div className="mb-3 grid gap-2 sm:grid-cols-5 sm:items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={typeId ? String(typeId) : ""} onValueChange={(v) => setTypeId(v ? Number(v) : null)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {(value: string | null) => types.find((t) => String(t.key) === value)?.name ?? "Select"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.key} value={String(t.key)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">First name</Label>
            <Input className="h-9" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Last name</Label>
            <Input className="h-9" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input className="h-9" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="button" size="sm" onClick={() => void add()} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </Button>
        </div>
      )}
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No contacts yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((c) => (
            <li key={c.b2bCustomerContactId} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs">
              <span>
                <span className="font-medium">
                  {c.firstName} {c.lastName}
                </span>
                <span className="text-muted-foreground"> · {c.contactTypeName ?? "—"}</span>
                {c.email ? <span className="text-muted-foreground"> · {c.email}</span> : null}
                {c.isPrimary ? (
                  <Badge variant="outline" className="ms-1.5 text-[10px]">
                    Primary
                  </Badge>
                ) : null}
              </span>
              {canEdit && (
                <Button variant="ghost" size="icon-sm" onClick={() => void deleteB2BCustomerContact(c.b2bCustomerContactId).then(load)} aria-label="Remove">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AddressesSection({
  b2bCustomerId,
  addressTypes,
  countries,
  userKey,
  canEdit,
}: {
  b2bCustomerId: number;
  addressTypes: GlobalCodeLookup[];
  countries: Country[];
  userKey: number;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<B2BCustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [line1, setLine1] = useState("");
  const [countryId, setCountryId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await listB2BCustomerAddresses(b2bCustomerId));
    } catch (error) {
      toast.error(error instanceof B2BCustomerRelatedApiError ? error.message : "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b2bCustomerId]);

  async function add() {
    if (!typeId || !line1.trim() || !countryId) {
      toast.error("Type, address line 1 and country are required");
      return;
    }
    setSaving(true);
    try {
      await createB2BCustomerAddress({
        b2bCustomerId,
        addressTypeId: typeId,
        addressLine1: line1.trim(),
        countryId,
        isPrimary: rows.length === 0,
        createdBy: userKey,
      });
      setTypeId(null);
      setLine1("");
      setCountryId(null);
      await load();
      toast.success("Address added");
    } catch {
      toast.error("Could not add address");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Addresses</h3>
      </div>
      {canEdit && (
        <div className="mb-3 grid gap-2 sm:grid-cols-4 sm:items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={typeId ? String(typeId) : ""} onValueChange={(v) => setTypeId(v ? Number(v) : null)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {(value: string | null) => addressTypes.find((t) => String(t.key) === value)?.name ?? "Select"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {addressTypes.map((t) => (
                  <SelectItem key={t.key} value={String(t.key)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Address line 1</Label>
            <Input className="h-9" value={line1} onChange={(e) => setLine1(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Country</Label>
            <Select value={countryId ? String(countryId) : ""} onValueChange={(v) => setCountryId(v ? Number(v) : null)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {(value: string | null) => countries.find((c) => String(c.countryKey) === value)?.name ?? "Select"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.countryKey} value={String(c.countryKey)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" onClick={() => void add()} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </Button>
        </div>
      )}
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No addresses yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((a) => (
            <li key={a.b2bCustomerAddressId} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs">
              <span>
                <span className="font-medium">{a.addressTypeName ?? "Address"}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {a.addressLine1}
                  {a.countryName ? `, ${a.countryName}` : ""}
                </span>
                {a.isPrimary ? (
                  <Badge variant="outline" className="ms-1.5 text-[10px]">
                    Primary
                  </Badge>
                ) : null}
              </span>
              {canEdit && (
                <Button variant="ghost" size="icon-sm" onClick={() => void deleteB2BCustomerAddress(a.b2bCustomerAddressId).then(load)} aria-label="Remove">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DocumentsSection({
  b2bCustomerId,
  documentTypes,
  documentStatuses,
  userKey,
  canEdit,
}: {
  b2bCustomerId: number;
  documentTypes: GlobalCodeLookup[];
  documentStatuses: CommonStatus[];
  userKey: number;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<B2BCustomerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [number, setNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const pendingStatus = documentStatuses.find((s) => s.statusCode === "PENDING");

  async function load() {
    setLoading(true);
    try {
      setRows(await listB2BCustomerDocuments(b2bCustomerId));
    } catch (error) {
      toast.error(error instanceof B2BCustomerRelatedApiError ? error.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b2bCustomerId]);

  async function add() {
    if (!typeId || !number.trim()) {
      toast.error("Document type and number are required");
      return;
    }
    if (!pendingStatus) {
      toast.error("Document status lookup is not configured");
      return;
    }
    setSaving(true);
    try {
      await createB2BCustomerDocument({
        b2bCustomerId,
        documentTypeId: typeId,
        documentNumber: number.trim(),
        statusId: pendingStatus.commonStatusId,
        createdBy: userKey,
      });
      setTypeId(null);
      setNumber("");
      await load();
      toast.success("Document added");
    } catch {
      toast.error("Could not add document");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <FileCheck2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Documents</h3>
      </div>
      {canEdit && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={typeId ? String(typeId) : ""} onValueChange={(v) => setTypeId(v ? Number(v) : null)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {(value: string | null) => documentTypes.find((t) => String(t.key) === value)?.name ?? "Select"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((t) => (
                  <SelectItem key={t.key} value={String(t.key)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Document number</Label>
            <Input className="h-9" value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <Button type="button" size="sm" onClick={() => void add()} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </Button>
        </div>
      )}
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No documents yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((d) => (
            <li key={d.b2bCustomerDocumentId} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs">
              <span>
                <span className="font-medium">{d.documentTypeName}</span>
                <span className="font-mono text-muted-foreground"> {d.documentNumber}</span>
                <Badge variant="outline" className="ms-1.5 text-[10px]">
                  {d.statusName ?? "—"}
                </Badge>
              </span>
              {canEdit && (
                <Button variant="ghost" size="icon-sm" onClick={() => void deleteB2BCustomerDocument(d.b2bCustomerDocumentId).then(load)} aria-label="Remove">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function CreditsSection({
  b2bCustomerId,
  creditStatuses,
  userKey,
  canEdit,
}: {
  b2bCustomerId: number;
  creditStatuses: GlobalCodeLookup[];
  userKey: number;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<B2BCustomerCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState("");
  const [days, setDays] = useState("");
  const [statusId, setStatusId] = useState<number | null>(null);
  const [from, setFrom] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await listB2BCustomerCredits(b2bCustomerId));
    } catch (error) {
      toast.error(error instanceof B2BCustomerRelatedApiError ? error.message : "Failed to load credit");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b2bCustomerId]);

  async function add() {
    const creditLimit = Number(limit);
    const creditDays = Number(days);
    if (!Number.isFinite(creditLimit) || creditLimit < 0 || !Number.isInteger(creditDays) || creditDays < 0 || !statusId || !from) {
      toast.error("Limit, days, status and effective from are required");
      return;
    }
    setSaving(true);
    try {
      await createB2BCustomerCredit({
        b2bCustomerId,
        creditLimit,
        creditDays,
        b2bCustomerCreditStatusId: statusId,
        effectiveFrom: from,
        createdBy: userKey,
      });
      setLimit("");
      setDays("");
      setStatusId(null);
      setFrom("");
      await load();
      toast.success("Credit record added");
    } catch (error) {
      toast.error(error instanceof B2BCustomerRelatedApiError ? error.message : "Could not add credit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Credit</h3>
      </div>
      {canEdit && (
        <div className="mb-3 grid gap-2 sm:grid-cols-5 sm:items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Limit</Label>
            <Input className="h-9" type="number" min={0} value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Days</Label>
            <Input className="h-9" type="number" min={0} value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={statusId ? String(statusId) : ""} onValueChange={(v) => setStatusId(v ? Number(v) : null)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {(value: string | null) => creditStatuses.find((t) => String(t.key) === value)?.name ?? "Select"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {creditStatuses.map((t) => (
                  <SelectItem key={t.key} value={String(t.key)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Effective from</Label>
            <Input className="h-9" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <Button type="button" size="sm" onClick={() => void add()} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </Button>
        </div>
      )}
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No credit records yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((c) => (
            <li key={c.b2bCustomerCreditId} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs">
              <span>
                <span className="font-medium tabular-nums">{c.creditLimit.toLocaleString()}</span>
                <span className="text-muted-foreground"> · {c.creditDays} days · {c.creditStatusName ?? "—"}</span>
                <span className="text-muted-foreground"> · from {c.effectiveFrom}</span>
                {c.isActive ? (
                  <Badge className="ms-1.5 text-[10px]">Active</Badge>
                ) : (
                  <Badge variant="secondary" className="ms-1.5 text-[10px]">
                    Inactive
                  </Badge>
                )}
              </span>
              {canEdit && (
                <Button variant="ghost" size="icon-sm" onClick={() => void deleteB2BCustomerCredit(c.b2bCustomerCreditId).then(load)} aria-label="Remove">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
