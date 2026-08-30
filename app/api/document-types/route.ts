import { createTenantCodeListHandlers } from "@/lib/api/tenant-code-crud";

const handlers = createTenantCodeListHandlers({
  model: "documentTypeMaster",
  idField: "documentTypeId",
  codeField: "documentTypeCode",
  nameField: "documentTypeName",
  label: "document type",
  nameMax: 150,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
