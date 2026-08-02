import { createTenantCompanyNameListHandlers } from "@/lib/api/tenant-company-name-crud";

const handlers = createTenantCompanyNameListHandlers({
  model: "propertyCategory",
  idField: "propertyCategoryId",
  nameField: "propertyCategoryName",
  label: "property category",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
