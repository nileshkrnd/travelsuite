"use client";

import { FileCheck2 } from "lucide-react";
import { GlobalCodeMasterPage, type GlobalCodeMasterService } from "@/components/masters/GlobalCodeMasterPage";
import { documentTypesService } from "@/lib/services/global-code-lookup.service";
import type { GlobalCodeLookup } from "@/types";

const service: GlobalCodeMasterService<GlobalCodeLookup> = documentTypesService;

export default function DocumentTypeMasterPage() {
  return (
    <GlobalCodeMasterPage
      config={{
        moduleKey: "documentType",
        title: "Document Type",
        description: "Trade license, tax certificate, IATA and other commercial document kinds.",
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
