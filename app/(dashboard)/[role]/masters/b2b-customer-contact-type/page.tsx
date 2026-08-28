"use client";

import { Contact } from "lucide-react";
import { GlobalCodeMasterPage, type GlobalCodeMasterService } from "@/components/masters/GlobalCodeMasterPage";
import { b2bCustomerContactTypesService } from "@/lib/services/global-code-lookup.service";
import type { GlobalCodeLookup } from "@/types";

const service: GlobalCodeMasterService<GlobalCodeLookup> = b2bCustomerContactTypesService;

export default function B2BCustomerContactTypePage() {
  return (
    <GlobalCodeMasterPage
      config={{
        moduleKey: "b2bCustomerContactType",
        title: "B2B Contact Type",
        description: "Management, sales, reservations and other contact kinds for B2B customers.",
        entityLabel: "Contact type",
        codeLabel: "Contact type code",
        nameLabel: "Contact type name",
        codePlaceholder: "e.g. SALES, ACCOUNTS",
        namePlaceholder: "e.g. Sales, Accounts",
        icon: Contact,
        addButtonLabel: "Add contact type",
        service,
        scoped: true,
      }}
    />
  );
}
