import { createTenantCodeListHandlers } from "@/lib/api/tenant-code-crud";

const handlers = createTenantCodeListHandlers({
  model: "b2BCustomerCreditStatus",
  idField: "b2bCustomerCreditStatusId",
  codeField: "creditStatusCode",
  nameField: "creditStatusName",
  label: "credit status",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
