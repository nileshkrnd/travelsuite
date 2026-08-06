import { createGlobalNameItemHandlers } from "@/lib/api/global-name-crud";

const handlers = createGlobalNameItemHandlers({
  model: "propertyCategory",
  idField: "propertyCategoryId",
  nameField: "propertyCategoryName",
  label: "property category",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
