import { createTenantCodeItemHandlers } from "@/lib/api/tenant-code-crud";

const handlers = createTenantCodeItemHandlers({
  model: "b2BCustomerDocumentType",
  idField: "documentTypeId",
  codeField: "documentTypeCode",
  nameField: "documentTypeName",
  label: "document type",
  nameMax: 150,
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
