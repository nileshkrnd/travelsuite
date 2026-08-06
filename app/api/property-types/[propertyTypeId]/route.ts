import { createGlobalNameItemHandlers } from "@/lib/api/global-name-crud";

const handlers = createGlobalNameItemHandlers({
  model: "propertyType",
  idField: "propertyTypeId",
  nameField: "propertyTypeName",
  label: "property type",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
