import { createGlobalCodeListHandlers } from "@/lib/api/global-code-crud";

const handlers = createGlobalCodeListHandlers({
  model: "floorType",
  idField: "floorTypeId",
  codeField: "floorTypeCode",
  nameField: "floorTypeName",
  label: "floor type",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
