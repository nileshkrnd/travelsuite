"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Contact, CreditCard, FileCheck2, Landmark, MapPin } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { B2BCustomerHeaderActions, b2bCustomerPaths } from "@/components/masters/B2BCustomerForm";
import {
  B2B_CUSTOMER_RELATED_TABS,
  B2BCustomerRelatedSections,
  type B2BCustomerRelatedTab,
} from "@/components/masters/B2BCustomerRelatedSections";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { getB2BCustomer, B2BCustomersApiError } from "@/lib/services/b2b-customers.service";
import { listCountries } from "@/lib/services/countries.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import {
  addressTypesService,
  contactTypesService,
  documentTypesService,
  b2bCustomerCreditStatusesService,
} from "@/lib/services/global-code-lookup.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { B2BCustomer, CommonStatus, Country, GlobalCodeLookup, RoleDef } from "@/types";

function B2BCustomerDetails({ roleDef }: { roleDef: RoleDef }) {
  const { role, b2bCustomerId } = useParams<{ role: string; b2bCustomerId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(b2bCustomerId);
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const tenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);
  const companyId = resolveSessionCompanyKey(user) ?? 0;
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;
  const canEdit = can(roleDef, "b2bCustomer", "edit");

  const tabParam = searchParams.get("tab");
  const urlTab: B2BCustomerRelatedTab = B2B_CUSTOMER_RELATED_TABS.includes(tabParam as B2BCustomerRelatedTab)
    ? (tabParam as B2BCustomerRelatedTab)
    : "contacts";
  const [activeTab, setActiveTab] = useState<B2BCustomerRelatedTab>(urlTab);

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  const [row, setRow] = useState<B2BCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [contactTypes, setContactTypes] = useState<GlobalCodeLookup[]>([]);
  const [addressTypes, setAddressTypes] = useState<GlobalCodeLookup[]>([]);
  const [documentTypes, setDocumentTypes] = useState<GlobalCodeLookup[]>([]);
  const [creditStatuses, setCreditStatuses] = useState<GlobalCodeLookup[]>([]);
  const [documentStatuses, setDocumentStatuses] = useState<CommonStatus[]>([]);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Invalid customer id");
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const customer = await getB2BCustomer(id);
        if (cancelled) return;
        setRow(customer);
        const scopeTenant = tenantId > 0 ? tenantId : customer.tenantId;
        const scopeCompany = companyId > 0 ? companyId : customer.companyId;
        const [countryRows, contactTypeRows, addressTypeRows, documentTypeRows, creditStatusRows, statusTypeRows] =
          await Promise.all([
            listCountries({ activeOnly: true }),
            contactTypesService.list({ tenantId: scopeTenant, companyId: scopeCompany, activeOnly: true }),
            addressTypesService.list({ tenantId: scopeTenant, companyId: scopeCompany, activeOnly: true }),
            documentTypesService.list({ tenantId: scopeTenant, companyId: scopeCompany, activeOnly: true }),
            b2bCustomerCreditStatusesService.list({ tenantId: scopeTenant, companyId: scopeCompany, activeOnly: true }),
            listCommonStatusTypes({ tenantId: scopeTenant, activeOnly: true }),
          ]);
        if (cancelled) return;
        setCountries(countryRows);
        setContactTypes(contactTypeRows);
        setAddressTypes(addressTypeRows);
        setDocumentTypes(documentTypeRows);
        setCreditStatuses(creditStatusRows);
        const docStatusType = statusTypeRows.find((t) => t.statusTypeCode === "B2B_CUSTOMER_DOCUMENT");
        setDocumentStatuses(
          docStatusType
            ? await listCommonStatuses({
                tenantId: scopeTenant,
                commonStatusTypeId: docStatusType.commonStatusTypeId,
                activeOnly: true,
              })
            : []
        );
      } catch (err) {
        if (!cancelled) {
          setRow(null);
          setError(err instanceof B2BCustomersApiError ? err.message : "Failed to load customer");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, tenantId, companyId]);

  function setTab(next: string | number | null) {
    const value = String(next ?? "");
    if (!B2B_CUSTOMER_RELATED_TABS.includes(value as B2BCustomerRelatedTab)) return;
    const tab = value as B2BCustomerRelatedTab;
    setActiveTab(tab);
    const base = b2bCustomerPaths(role, id).details;
    router.replace(tab === "contacts" ? base : `${base}?tab=${tab}`);
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading customer details…</div>;
  }

  if (error || !row) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Landmark}
          tone="muted"
          heading="Customer not found"
          description={error ?? "This customer may have been removed."}
          action={
            <Button nativeButton={false} render={<Link href={b2bCustomerPaths(role).list} />}>
              Back to list
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={row.b2bCustomerName}
        description={`${row.b2bCustomerCode} — contacts, addresses, documents, and credit.`}
        actions={<B2BCustomerHeaderActions role={role} id={row.b2bCustomerId} current="details" canEdit={canEdit} />}
      />

      <Tabs value={activeTab} onValueChange={(next) => setTab(next)}>
        <div className="rounded-xl border border-border bg-muted/40 p-1.5">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1.5 bg-transparent p-0 group-data-horizontal/tabs:h-auto">
            <TabsTrigger value="contacts" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <Contact className="h-4 w-4" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="addresses" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Address
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <FileCheck2 className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="credits" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              Credit
            </TabsTrigger>
          </TabsList>
        </div>

        {B2B_CUSTOMER_RELATED_TABS.map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <B2BCustomerRelatedSections
              b2bCustomerId={row.b2bCustomerId}
              contactTypes={contactTypes}
              addressTypes={addressTypes}
              documentTypes={documentTypes}
              creditStatuses={creditStatuses}
              documentStatuses={documentStatuses}
              countries={countries}
              userKey={userKey}
              canEdit={canEdit}
              section={tab}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default function B2BCustomerDetailsPage() {
  return (
    <AccessGate module="b2bCustomer">
      {(roleDef) => (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
          <B2BCustomerDetails roleDef={roleDef} />
        </Suspense>
      )}
    </AccessGate>
  );
}
