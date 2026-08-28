import { createTenantCodeItemHandlers } from "@/lib/api/tenant-code-crud";

const handlers = createTenantCodeItemHandlers({
  model: "b2BCustomerCreditStatus",
  idField: "b2bCustomerCreditStatusId",
  codeField: "creditStatusCode",
  nameField: "creditStatusName",
  label: "credit status",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
