"use client";

import { Award } from "lucide-react";
import { TenantCompanyNameMasterPage } from "@/components/masters/TenantCompanyNameMasterPage";

export default function PropertyBrandMasterPage() {
  return (
    <TenantCompanyNameMasterPage
      config={{
        moduleKey: "propertyBrand",
        title: "Property Brand",
        description: "Brands such as Hilton and Accor — scoped to the current company.",
        entityLabel: "Property brand",
        nameLabel: "Property brand name",
        idField: "propertyBrandId",
        nameField: "propertyBrandName",
        apiPath: "/api/property-brands",
        icon: Award,
        addButtonLabel: "Add property brand",
      }}
    />
  );
}
