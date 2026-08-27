"use client";

import { Building2 } from "lucide-react";
import { GlobalCodeMasterPage, type GlobalCodeMasterService } from "@/components/masters/GlobalCodeMasterPage";
import { unitTypesService } from "@/lib/services/global-code-lookup.service";
import type { UnitType } from "@/types";

const service: GlobalCodeMasterService<UnitType> = unitTypesService;

export default function UnitTypeMasterPage() {
  return (
    <GlobalCodeMasterPage
      config={{
        moduleKey: "unitType",
        title: "Unit Type",
        description: "Apartment, office, shop, villa and other unit kinds — global across all companies.",
        entityLabel: "Unit type",
        codeLabel: "Unit type code",
        nameLabel: "Unit type name",
        codePlaceholder: "e.g. APARTMENT, OFFICE",
        namePlaceholder: "e.g. Apartment, Office",
        icon: Building2,
        addButtonLabel: "Add unit type",
        service,
      }}
    />
  );
}
