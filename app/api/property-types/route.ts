import { createGlobalNameListHandlers } from "@/lib/api/global-name-crud";

const handlers = createGlobalNameListHandlers({
  model: "propertyType",
  idField: "propertyTypeId",
  nameField: "propertyTypeName",
  label: "property type",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
