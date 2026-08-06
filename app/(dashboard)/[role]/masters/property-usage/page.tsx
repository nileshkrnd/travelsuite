"use client";

import { KeyRound } from "lucide-react";
import { GlobalNameMasterPage, type GlobalNameMasterService } from "@/components/masters/GlobalNameMasterPage";
import {
  listPropertyUsages,
  createPropertyUsage,
  updatePropertyUsage,
  setPropertyUsageActive,
  deletePropertyUsage,
  PropertyUsagesApiError,
} from "@/lib/services/property-usages.service";
import type { PropertyUsage } from "@/types";

const service: GlobalNameMasterService<PropertyUsage> = {
  list: (options) => listPropertyUsages(options),
  create: (input) =>
    createPropertyUsage({ propertyUsageName: input.name, isActive: input.isActive, createdBy: input.createdBy }),
  update: (key, input) =>
    updatePropertyUsage(key, {
      propertyUsageName: input.name,
      isActive: input.isActive,
      modifiedBy: input.modifiedBy,
    }),
  setActive: setPropertyUsageActive,
  remove: deletePropertyUsage,
  ApiError: PropertyUsagesApiError,
};

export default function PropertyUsageMasterPage() {
  return (
    <GlobalNameMasterPage
      config={{
        moduleKey: "propertyUsage",
        title: "Property Usage",
        description: "Usage modes such as Rental, Owned, and Leasing — global across all companies.",
        entityLabel: "Property usage",
        nameLabel: "Property usage name",
        namePlaceholder: "e.g. Rental, Owned, Leasing",
        icon: KeyRound,
        addButtonLabel: "Add property usage",
        service,
      }}
    />
  );
}
