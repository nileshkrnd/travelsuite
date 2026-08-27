"use client";

import { Layers } from "lucide-react";
import { GlobalCodeMasterPage, type GlobalCodeMasterService } from "@/components/masters/GlobalCodeMasterPage";
import { floorTypesService } from "@/lib/services/global-code-lookup.service";
import type { FloorType } from "@/types";

const service: GlobalCodeMasterService<FloorType> = floorTypesService;

export default function FloorTypeMasterPage() {
  return (
    <GlobalCodeMasterPage
      config={{
        moduleKey: "floorType",
        title: "Floor Type",
        description: "Ground, basement, mezzanine, roof and other floor kinds — global across all companies.",
        entityLabel: "Floor type",
        codeLabel: "Floor type code",
        nameLabel: "Floor type name",
        codePlaceholder: "e.g. GROUND, BASEMENT",
        namePlaceholder: "e.g. Ground Floor, Basement",
        icon: Layers,
        addButtonLabel: "Add floor type",
        service,
      }}
    />
  );
}
