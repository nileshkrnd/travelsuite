import { createGlobalNameItemHandlers } from "@/lib/api/global-name-crud";

const handlers = createGlobalNameItemHandlers({
  model: "propertyBrand",
  idField: "propertyBrandId",
  nameField: "propertyBrandName",
  label: "property brand",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
