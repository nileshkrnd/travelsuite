import { createTenantCodeListHandlers } from "@/lib/api/tenant-code-crud";

const handlers = createTenantCodeListHandlers({
  model: "addressTypeMaster",
  idField: "addressTypeId",
  codeField: "addressTypeCode",
  nameField: "addressTypeName",
  label: "address type",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
