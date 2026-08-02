"use client";

import { KeyRound } from "lucide-react";
import { TenantCompanyNameMasterPage } from "@/components/masters/TenantCompanyNameMasterPage";

export default function PropertyUsageMasterPage() {
  return (
    <TenantCompanyNameMasterPage
      config={{
        moduleKey: "propertyUsage",
        title: "Property Usage",
        description: "Usage modes such as Rental, Owned, and Leasing — scoped to the current company.",
        entityLabel: "Property usage",
        nameLabel: "Property usage name",
        idField: "propertyUsageId",
        nameField: "propertyUsageName",
        apiPath: "/api/property-usages",
        icon: KeyRound,
        addButtonLabel: "Add property usage",
      }}
    />
  );
}
