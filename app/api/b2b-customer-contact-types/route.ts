import { createTenantCodeListHandlers } from "@/lib/api/tenant-code-crud";

const handlers = createTenantCodeListHandlers({
  model: "b2BCustomerContactType",
  idField: "b2bCustomerContactTypeId",
  codeField: "contactTypeCode",
  nameField: "contactTypeName",
  label: "contact type",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
