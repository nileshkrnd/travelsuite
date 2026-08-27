import { createGlobalCodeItemHandlers } from "@/lib/api/global-code-crud";

const handlers = createGlobalCodeItemHandlers({
  model: "unitCategory",
  idField: "unitCategoryId",
  codeField: "unitCategoryCode",
  nameField: "unitCategoryName",
  label: "unit category",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
