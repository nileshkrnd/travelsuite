import { createGlobalNameListHandlers } from "@/lib/api/global-name-crud";

const handlers = createGlobalNameListHandlers({
  model: "propertyUsage",
  idField: "propertyUsageId",
  nameField: "propertyUsageName",
  label: "property usage",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
