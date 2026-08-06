import { createGlobalNameItemHandlers } from "@/lib/api/global-name-crud";

const handlers = createGlobalNameItemHandlers({
  model: "propertyUsage",
  idField: "propertyUsageId",
  nameField: "propertyUsageName",
  label: "property usage",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
