import { createGlobalCodeListHandlers } from "@/lib/api/global-code-crud";

const handlers = createGlobalCodeListHandlers({
  model: "furnishedStatus",
  idField: "furnishedStatusId",
  codeField: "furnishedStatusCode",
  nameField: "furnishedStatusName",
  label: "furnished status",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
