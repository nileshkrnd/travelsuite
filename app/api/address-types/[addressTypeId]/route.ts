import { createTenantCodeItemHandlers } from "@/lib/api/tenant-code-crud";

const handlers = createTenantCodeItemHandlers({
  model: "addressTypeMaster",
  idField: "addressTypeId",
  codeField: "addressTypeCode",
  nameField: "addressTypeName",
  label: "address type",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
