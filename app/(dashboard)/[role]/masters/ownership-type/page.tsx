"use client";

import { Landmark } from "lucide-react";
import { TenantCompanyNameMasterPage } from "@/components/masters/TenantCompanyNameMasterPage";

export default function OwnershipTypeMasterPage() {
  return (
    <TenantCompanyNameMasterPage
      config={{
        moduleKey: "ownershipType",
        title: "Ownership Type",
        description: "Ownership such as Company Owned and Third Party — scoped to the current company.",
        entityLabel: "Ownership type",
        nameLabel: "Ownership type name",
        idField: "ownershipTypeId",
        nameField: "ownershipTypeName",
        apiPath: "/api/ownership-types",
        icon: Landmark,
        addButtonLabel: "Add ownership type",
      }}
    />
  );
}
