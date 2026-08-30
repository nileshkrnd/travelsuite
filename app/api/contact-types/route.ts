import { CONTACT_TYPE_CATEGORY_CODES } from "@/types";
import { createTenantCodeListHandlers } from "@/lib/api/tenant-code-crud";

const extraEnums = [
  {
    field: "contactTypeCategory",
    values: CONTACT_TYPE_CATEGORY_CODES,
    defaultValue: "BOTH",
  },
] as const;

const handlers = createTenantCodeListHandlers({
  model: "contactTypeMaster",
  idField: "contactTypeId",
  codeField: "contactTypeCode",
  nameField: "contactTypeName",
  label: "contact type",
  extraEnums: [...extraEnums],
});

export const GET = handlers.GET;
export const POST = handlers.POST;
