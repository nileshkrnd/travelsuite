"use client";

import { FileCheck2 } from "lucide-react";
import { GlobalCodeMasterPage, type GlobalCodeMasterService } from "@/components/masters/GlobalCodeMasterPage";
import { b2bCustomerDocumentTypesService } from "@/lib/services/global-code-lookup.service";
import type { GlobalCodeLookup } from "@/types";

const service: GlobalCodeMasterService<GlobalCodeLookup> = b2bCustomerDocumentTypesService;

export default function B2BCustomerDocumentTypePage() {
  return (
    <GlobalCodeMasterPage
      config={{
        moduleKey: "b2bCustomerDocumentType",
        title: "B2B Document Type",
        description: "Trade license, tax certificate, IATA and other commercial documents for B2B customers.",
        entityLabel: "Document type",
        codeLabel: "Document type code",
        nameLabel: "Document type name",
        codePlaceholder: "e.g. TRADE_LICENSE",
        namePlaceholder: "e.g. Trade License",
        icon: FileCheck2,
        addButtonLabel: "Add document type",
        service,
        scoped: true,
        nameMax: 150,
      }}
    />
  );
}
