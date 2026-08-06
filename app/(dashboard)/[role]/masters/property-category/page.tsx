"use client";

import { Tags } from "lucide-react";
import { GlobalNameMasterPage, type GlobalNameMasterService } from "@/components/masters/GlobalNameMasterPage";
import {
  listPropertyCategories,
  createPropertyCategory,
  updatePropertyCategory,
  setPropertyCategoryActive,
  deletePropertyCategory,
  PropertyCategoriesApiError,
} from "@/lib/services/property-categories.service";
import type { PropertyCategory } from "@/types";

const service: GlobalNameMasterService<PropertyCategory> = {
  list: (options) => listPropertyCategories(options),
  create: (input) =>
    createPropertyCategory({
      propertyCategoryName: input.name,
      isActive: input.isActive,
      createdBy: input.createdBy,
    }),
  update: (key, input) =>
    updatePropertyCategory(key, {
      propertyCategoryName: input.name,
      isActive: input.isActive,
      modifiedBy: input.modifiedBy,
    }),
  setActive: setPropertyCategoryActive,
  remove: deletePropertyCategory,
  ApiError: PropertyCategoriesApiError,
};

export default function PropertyCategoryMasterPage() {
  return (
    <GlobalNameMasterPage
      config={{
        moduleKey: "propertyCategory",
        title: "Property Category",
        description: "Categories such as Luxury and Budget — global across all companies.",
        entityLabel: "Property category",
        nameLabel: "Property category name",
        namePlaceholder: "e.g. Luxury, Budget, Midscale",
        icon: Tags,
        addButtonLabel: "Add property category",
        service,
      }}
    />
  );
}
