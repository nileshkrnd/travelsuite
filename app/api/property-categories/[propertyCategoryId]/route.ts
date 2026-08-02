import { createTenantCompanyNameItemHandlers } from "@/lib/api/tenant-company-name-crud";

const handlers = createTenantCompanyNameItemHandlers({
  model: "propertyCategory",
  idField: "propertyCategoryId",
  nameField: "propertyCategoryName",
  label: "property category",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
