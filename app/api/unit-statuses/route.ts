import { createGlobalCodeListHandlers } from "@/lib/api/global-code-crud";

const handlers = createGlobalCodeListHandlers({
  model: "unitStatus",
  idField: "unitStatusId",
  codeField: "statusCode",
  nameField: "statusName",
  label: "unit status",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
