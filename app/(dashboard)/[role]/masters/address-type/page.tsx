"use client";

import { MapPin } from "lucide-react";
import { GlobalCodeMasterPage, type GlobalCodeMasterService } from "@/components/masters/GlobalCodeMasterPage";
import { addressTypesService } from "@/lib/services/global-code-lookup.service";
import type { GlobalCodeLookup } from "@/types";

const service: GlobalCodeMasterService<GlobalCodeLookup> = addressTypesService;

export default function AddressTypeMasterPage() {
  return (
    <GlobalCodeMasterPage
      config={{
        moduleKey: "addressType",
        title: "Address Type",
        description: "Registered, office, billing, mailing and other address kinds.",
        entityLabel: "Address type",
        codeLabel: "Address type code",
        nameLabel: "Address type name",
        codePlaceholder: "e.g. BILLING, OFFICE",
        namePlaceholder: "e.g. Billing, Office",
        icon: MapPin,
        addButtonLabel: "Add address type",
        service,
        scoped: true,
      }}
    />
  );
}
