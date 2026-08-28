import { createTenantCodeItemHandlers } from "@/lib/api/tenant-code-crud";

const handlers = createTenantCodeItemHandlers({
  model: "b2BCustomerContactType",
  idField: "b2bCustomerContactTypeId",
  codeField: "contactTypeCode",
  nameField: "contactTypeName",
  label: "contact type",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
