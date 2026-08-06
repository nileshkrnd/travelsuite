import { createGlobalNameListHandlers } from "@/lib/api/global-name-crud";

const handlers = createGlobalNameListHandlers({
  model: "propertyBrand",
  idField: "propertyBrandId",
  nameField: "propertyBrandName",
  label: "property brand",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
