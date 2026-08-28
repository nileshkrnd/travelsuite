import { toAppGlobalCodeLookup, type GlobalCodeLookupRow } from "@/lib/mappers/global-code-lookup.mapper";
import type { GlobalCodeLookup } from "@/types";

export class GlobalCodeLookupApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "GlobalCodeLookupApiError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

export type GlobalCodeLookupServiceConfig = {
  path: string;
  idField: string;
  codeField: string;
  nameField: string;
};

export type GlobalCodeLookupWriteInput = {
  code: string;
  name: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
};

function toPayload(config: GlobalCodeLookupServiceConfig, input: GlobalCodeLookupWriteInput) {
  return {
    [config.codeField]: input.code,
    [config.nameField]: input.name,
    description: input.description ?? null,
    displayOrder: input.displayOrder,
    isActive: input.isActive,
  };
}

export function createGlobalCodeLookupService(config: GlobalCodeLookupServiceConfig) {
  async function list(options?: {
    activeOnly?: boolean;
    tenantId?: number;
    companyId?: number;
  }): Promise<GlobalCodeLookup[]> {
    const params = new URLSearchParams();
    if (options?.activeOnly) params.set("activeOnly", "true");
    if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
    if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
    const qs = params.toString();
    const res = await fetch(`${config.path}${qs ? `?${qs}` : ""}`, { cache: "no-store" });
    if (!res.ok) throw new GlobalCodeLookupApiError(await parseError(res), res.status);
    return ((await res.json()) as GlobalCodeLookupRow[]).map((row) =>
      toAppGlobalCodeLookup(row, config.idField, config.codeField, config.nameField)
    );
  }

  async function create(
    input: GlobalCodeLookupWriteInput & { createdBy: number; tenantId?: number; companyId?: number }
  ): Promise<GlobalCodeLookup> {
    const res = await fetch(config.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...toPayload(config, input),
        createdBy: input.createdBy,
        tenantId: input.tenantId,
        companyId: input.companyId,
      }),
    });
    if (!res.ok) throw new GlobalCodeLookupApiError(await parseError(res), res.status);
    return toAppGlobalCodeLookup(await res.json(), config.idField, config.codeField, config.nameField);
  }

  async function update(
    id: number,
    input: GlobalCodeLookupWriteInput & { modifiedBy: number }
  ): Promise<GlobalCodeLookup> {
    const res = await fetch(`${config.path}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...toPayload(config, input), modifiedBy: input.modifiedBy }),
    });
    if (!res.ok) throw new GlobalCodeLookupApiError(await parseError(res), res.status);
    return toAppGlobalCodeLookup(await res.json(), config.idField, config.codeField, config.nameField);
  }

  async function setActive(id: number, isActive: boolean, modifiedBy: number): Promise<GlobalCodeLookup> {
    const res = await fetch(`${config.path}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive, modifiedBy }),
    });
    if (!res.ok) throw new GlobalCodeLookupApiError(await parseError(res), res.status);
    return toAppGlobalCodeLookup(await res.json(), config.idField, config.codeField, config.nameField);
  }

  async function remove(id: number): Promise<void> {
    const res = await fetch(`${config.path}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new GlobalCodeLookupApiError(await parseError(res), res.status);
  }

  return { list, create, update, setActive, remove, ApiError: GlobalCodeLookupApiError };
}

export const floorTypesService = createGlobalCodeLookupService({
  path: "/api/floor-types",
  idField: "floorTypeId",
  codeField: "floorTypeCode",
  nameField: "floorTypeName",
});

export const unitTypesService = createGlobalCodeLookupService({
  path: "/api/unit-types",
  idField: "unitTypeId",
  codeField: "unitTypeCode",
  nameField: "unitTypeName",
});

export const unitCategoriesService = createGlobalCodeLookupService({
  path: "/api/unit-categories",
  idField: "unitCategoryId",
  codeField: "unitCategoryCode",
  nameField: "unitCategoryName",
});

export const unitStatusesService = createGlobalCodeLookupService({
  path: "/api/unit-statuses",
  idField: "unitStatusId",
  codeField: "statusCode",
  nameField: "statusName",
});

export const furnishedStatusesService = createGlobalCodeLookupService({
  path: "/api/furnished-statuses",
  idField: "furnishedStatusId",
  codeField: "furnishedStatusCode",
  nameField: "furnishedStatusName",
});

export const b2bCustomerContactTypesService = createGlobalCodeLookupService({
  path: "/api/b2b-customer-contact-types",
  idField: "b2bCustomerContactTypeId",
  codeField: "contactTypeCode",
  nameField: "contactTypeName",
});

export const addressTypesService = createGlobalCodeLookupService({
  path: "/api/address-types",
  idField: "addressTypeId",
  codeField: "addressTypeCode",
  nameField: "addressTypeName",
});

export const b2bCustomerDocumentTypesService = createGlobalCodeLookupService({
  path: "/api/b2b-customer-document-types",
  idField: "documentTypeId",
  codeField: "documentTypeCode",
  nameField: "documentTypeName",
});

export const b2bCustomerCreditStatusesService = createGlobalCodeLookupService({
  path: "/api/b2b-customer-credit-statuses",
  idField: "b2bCustomerCreditStatusId",
  codeField: "creditStatusCode",
  nameField: "creditStatusName",
});
