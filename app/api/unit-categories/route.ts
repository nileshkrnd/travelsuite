import { createGlobalCodeListHandlers } from "@/lib/api/global-code-crud";

const handlers = createGlobalCodeListHandlers({
  model: "unitCategory",
  idField: "unitCategoryId",
  codeField: "unitCategoryCode",
  nameField: "unitCategoryName",
  label: "unit category",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
