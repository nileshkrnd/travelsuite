import { createGlobalCodeItemHandlers } from "@/lib/api/global-code-crud";

const handlers = createGlobalCodeItemHandlers({
  model: "unitStatus",
  idField: "unitStatusId",
  codeField: "statusCode",
  nameField: "statusName",
  label: "unit status",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
