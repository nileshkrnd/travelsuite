import { CONTACT_TYPE_CATEGORY_CODES } from "@/types";
import { createTenantCodeItemHandlers } from "@/lib/api/tenant-code-crud";

const handlers = createTenantCodeItemHandlers({
  model: "contactTypeMaster",
  idField: "contactTypeId",
  codeField: "contactTypeCode",
  nameField: "contactTypeName",
  label: "contact type",
  extraEnums: [
    {
      field: "contactTypeCategory",
      values: CONTACT_TYPE_CATEGORY_CODES,
      defaultValue: "BOTH",
    },
  ],
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
