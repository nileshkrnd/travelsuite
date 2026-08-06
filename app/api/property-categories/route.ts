import { createGlobalNameListHandlers } from "@/lib/api/global-name-crud";

const handlers = createGlobalNameListHandlers({
  model: "propertyCategory",
  idField: "propertyCategoryId",
  nameField: "propertyCategoryName",
  label: "property category",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
