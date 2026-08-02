"use client";

import { Tags } from "lucide-react";
import { TenantCompanyNameMasterPage } from "@/components/masters/TenantCompanyNameMasterPage";

export default function PropertyCategoryMasterPage() {
  return (
    <TenantCompanyNameMasterPage
      config={{
        moduleKey: "propertyCategory",
        title: "Property Category",
        description: "Categories such as Luxury and Budget — scoped to the current company.",
        entityLabel: "Property category",
        nameLabel: "Property category name",
        idField: "propertyCategoryId",
        nameField: "propertyCategoryName",
        apiPath: "/api/property-categories",
        icon: Tags,
        addButtonLabel: "Add property category",
      }}
    />
  );
}
