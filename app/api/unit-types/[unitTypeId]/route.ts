import { createGlobalCodeItemHandlers } from "@/lib/api/global-code-crud";

const handlers = createGlobalCodeItemHandlers({
  model: "unitType",
  idField: "unitTypeId",
  codeField: "unitTypeCode",
  nameField: "unitTypeName",
  label: "unit type",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
