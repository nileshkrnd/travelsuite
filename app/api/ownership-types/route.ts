import { createTenantCompanyNameListHandlers } from "@/lib/api/tenant-company-name-crud";

const handlers = createTenantCompanyNameListHandlers({
  model: "ownershipType",
  idField: "ownershipTypeId",
  nameField: "ownershipTypeName",
  label: "ownership type",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
