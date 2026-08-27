"use client";

import { CircleDot } from "lucide-react";
import { GlobalCodeMasterPage, type GlobalCodeMasterService } from "@/components/masters/GlobalCodeMasterPage";
import { unitStatusesService } from "@/lib/services/global-code-lookup.service";
import type { UnitStatus } from "@/types";

const service: GlobalCodeMasterService<UnitStatus> = unitStatusesService;

export default function UnitStatusMasterPage() {
  return (
    <GlobalCodeMasterPage
      config={{
        moduleKey: "unitStatus",
        title: "Unit Status",
        description: "Available, occupied, reserved and other occupancy states — global across all companies.",
        entityLabel: "Unit status",
        codeLabel: "Status code",
        nameLabel: "Status name",
        codePlaceholder: "e.g. AVAILABLE, OCCUPIED",
        namePlaceholder: "e.g. Available, Occupied",
        icon: CircleDot,
        addButtonLabel: "Add unit status",
        service,
      }}
    />
  );
}
