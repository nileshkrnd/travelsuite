"use client";

import { Tags } from "lucide-react";
import { GlobalCodeMasterPage, type GlobalCodeMasterService } from "@/components/masters/GlobalCodeMasterPage";
import { unitCategoriesService } from "@/lib/services/global-code-lookup.service";
import type { UnitCategory } from "@/types";

const service: GlobalCodeMasterService<UnitCategory> = unitCategoriesService;

export default function UnitCategoryMasterPage() {
  return (
    <GlobalCodeMasterPage
      config={{
        moduleKey: "unitCategory",
        title: "Unit Category",
        description: "Studio, 1BR, 2BR and other unit categories — global across all companies.",
        entityLabel: "Unit category",
        codeLabel: "Unit category code",
        nameLabel: "Unit category name",
        codePlaceholder: "e.g. STUDIO, 1BR",
        namePlaceholder: "e.g. Studio, 1 Bedroom",
        icon: Tags,
        addButtonLabel: "Add unit category",
        service,
      }}
    />
  );
}
