"use client";

import { Building2 } from "lucide-react";
import { GlobalNameMasterPage, type GlobalNameMasterService } from "@/components/masters/GlobalNameMasterPage";
import {
  listPropertyTypes,
  createPropertyType,
  updatePropertyType,
  setPropertyTypeActive,
  deletePropertyType,
  PropertyTypesApiError,
} from "@/lib/services/property-types.service";
import type { PropertyType } from "@/types";

const service: GlobalNameMasterService<PropertyType> = {
  list: (options) => listPropertyTypes(options),
  create: (input) =>
    createPropertyType({ propertyTypeName: input.name, isActive: input.isActive, createdBy: input.createdBy }),
  update: (key, input) =>
    updatePropertyType(key, { propertyTypeName: input.name, isActive: input.isActive, modifiedBy: input.modifiedBy }),
  setActive: setPropertyTypeActive,
  remove: deletePropertyType,
  ApiError: PropertyTypesApiError,
};

export default function PropertyTypeMasterPage() {
  return (
    <GlobalNameMasterPage
      config={{
        moduleKey: "propertyType",
        title: "Property Type",
        description: "Types such as Hotel, Apartment, and Villa — global across all companies.",
        entityLabel: "Property type",
        nameLabel: "Property type name",
        namePlaceholder: "e.g. Hotel, Apartment, Villa",
        icon: Building2,
        addButtonLabel: "Add property type",
        service,
      }}
    />
  );
}
