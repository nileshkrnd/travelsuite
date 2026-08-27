"use client";

import { Sofa } from "lucide-react";
import { GlobalCodeMasterPage, type GlobalCodeMasterService } from "@/components/masters/GlobalCodeMasterPage";
import { furnishedStatusesService } from "@/lib/services/global-code-lookup.service";
import type { FurnishedStatus } from "@/types";

const service: GlobalCodeMasterService<FurnishedStatus> = furnishedStatusesService;

export default function FurnishedStatusMasterPage() {
  return (
    <GlobalCodeMasterPage
      config={{
        moduleKey: "furnishedStatus",
        title: "Furnished Status",
        description: "Furnished, semi-furnished and unfurnished — global across all companies.",
        entityLabel: "Furnished status",
        codeLabel: "Furnished status code",
        nameLabel: "Furnished status name",
        codePlaceholder: "e.g. FURNISHED, UNFURNISHED",
        namePlaceholder: "e.g. Furnished, Unfurnished",
        icon: Sofa,
        addButtonLabel: "Add furnished status",
        service,
      }}
    />
  );
}
