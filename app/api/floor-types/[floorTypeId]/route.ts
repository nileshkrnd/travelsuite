import { createGlobalCodeItemHandlers } from "@/lib/api/global-code-crud";

const handlers = createGlobalCodeItemHandlers({
  model: "floorType",
  idField: "floorTypeId",
  codeField: "floorTypeCode",
  nameField: "floorTypeName",
  label: "floor type",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
