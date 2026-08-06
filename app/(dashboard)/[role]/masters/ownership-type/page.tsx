"use client";

import { Landmark } from "lucide-react";
import { GlobalNameMasterPage, type GlobalNameMasterService } from "@/components/masters/GlobalNameMasterPage";
import {
  listOwnershipTypes,
  createOwnershipType,
  updateOwnershipType,
  setOwnershipTypeActive,
  deleteOwnershipType,
  OwnershipTypesApiError,
} from "@/lib/services/ownership-types.service";
import type { OwnershipType } from "@/types";

const service: GlobalNameMasterService<OwnershipType> = {
  list: (options) => listOwnershipTypes(options),
  create: (input) =>
    createOwnershipType({ ownershipTypeName: input.name, isActive: input.isActive, createdBy: input.createdBy }),
  update: (key, input) =>
    updateOwnershipType(key, {
      ownershipTypeName: input.name,
      isActive: input.isActive,
      modifiedBy: input.modifiedBy,
    }),
  setActive: setOwnershipTypeActive,
  remove: deleteOwnershipType,
  ApiError: OwnershipTypesApiError,
};

export default function OwnershipTypeMasterPage() {
  return (
    <GlobalNameMasterPage
      config={{
        moduleKey: "ownershipType",
        title: "Ownership Type",
        description: "Ownership such as Company Owned and Third Party — global across all companies.",
        entityLabel: "Ownership type",
        nameLabel: "Ownership type name",
        namePlaceholder: "e.g. Company Owned, Third Party",
        icon: Landmark,
        addButtonLabel: "Add ownership type",
        service,
      }}
    />
  );
}
