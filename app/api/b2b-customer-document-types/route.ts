import { createTenantCodeListHandlers } from "@/lib/api/tenant-code-crud";

const handlers = createTenantCodeListHandlers({
  model: "b2BCustomerDocumentType",
  idField: "documentTypeId",
  codeField: "documentTypeCode",
  nameField: "documentTypeName",
  label: "document type",
  nameMax: 150,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
