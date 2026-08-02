import { createTenantCompanyNameItemHandlers } from "@/lib/api/tenant-company-name-crud";

const handlers = createTenantCompanyNameItemHandlers({
  model: "ownershipType",
  idField: "ownershipTypeId",
  nameField: "ownershipTypeName",
  label: "ownership type",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
