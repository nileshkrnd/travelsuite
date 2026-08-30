"use client";

import { Contact } from "lucide-react";
import { GlobalCodeMasterPage, type GlobalCodeMasterService } from "@/components/masters/GlobalCodeMasterPage";
import { contactTypesService } from "@/lib/services/global-code-lookup.service";
import { CONTACT_TYPE_CATEGORY_OPTIONS, type GlobalCodeLookup } from "@/types";

const service: GlobalCodeMasterService<GlobalCodeLookup> = contactTypesService;

export default function ContactTypeMasterPage() {
  return (
    <GlobalCodeMasterPage
      config={{
        moduleKey: "contactType",
        title: "Contact Type",
        description: "Management, sales, reservations and other contact kinds for customers, suppliers, or both.",
        entityLabel: "Contact type",
        codeLabel: "Contact type code",
        nameLabel: "Contact type name",
        codePlaceholder: "e.g. SALES, ACCOUNTS",
        namePlaceholder: "e.g. Sales, Accounts",
        icon: Contact,
        addButtonLabel: "Add contact type",
        service,
        scoped: true,
        enumField: {
          key: "contactTypeCategory",
          label: "Contact Type Category",
          options: [...CONTACT_TYPE_CATEGORY_OPTIONS],
          defaultValue: "BOTH",
        },
      }}
    />
  );
}
