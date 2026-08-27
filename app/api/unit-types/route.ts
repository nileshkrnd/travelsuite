import { createGlobalCodeListHandlers } from "@/lib/api/global-code-crud";

const handlers = createGlobalCodeListHandlers({
  model: "unitType",
  idField: "unitTypeId",
  codeField: "unitTypeCode",
  nameField: "unitTypeName",
  label: "unit type",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
