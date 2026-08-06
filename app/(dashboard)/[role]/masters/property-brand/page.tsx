"use client";

import { Award } from "lucide-react";
import { GlobalNameMasterPage, type GlobalNameMasterService } from "@/components/masters/GlobalNameMasterPage";
import {
  listPropertyBrands,
  createPropertyBrand,
  updatePropertyBrand,
  setPropertyBrandActive,
  deletePropertyBrand,
  PropertyBrandsApiError,
} from "@/lib/services/property-brands.service";
import type { PropertyBrand } from "@/types";

const service: GlobalNameMasterService<PropertyBrand> = {
  list: (options) => listPropertyBrands(options),
  create: (input) =>
    createPropertyBrand({ propertyBrandName: input.name, isActive: input.isActive, createdBy: input.createdBy }),
  update: (key, input) =>
    updatePropertyBrand(key, {
      propertyBrandName: input.name,
      isActive: input.isActive,
      modifiedBy: input.modifiedBy,
    }),
  setActive: setPropertyBrandActive,
  remove: deletePropertyBrand,
  ApiError: PropertyBrandsApiError,
};

export default function PropertyBrandMasterPage() {
  return (
    <GlobalNameMasterPage
      config={{
        moduleKey: "propertyBrand",
        title: "Property Brand",
        description: "Brands such as Hilton and Accor — global across all companies.",
        entityLabel: "Property brand",
        nameLabel: "Property brand name",
        namePlaceholder: "e.g. Hilton, Accor, Marriott",
        icon: Award,
        addButtonLabel: "Add property brand",
        service,
      }}
    />
  );
}
