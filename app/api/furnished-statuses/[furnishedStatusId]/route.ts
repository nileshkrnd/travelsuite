import { createGlobalCodeItemHandlers } from "@/lib/api/global-code-crud";

const handlers = createGlobalCodeItemHandlers({
  model: "furnishedStatus",
  idField: "furnishedStatusId",
  codeField: "furnishedStatusCode",
  nameField: "furnishedStatusName",
  label: "furnished status",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
