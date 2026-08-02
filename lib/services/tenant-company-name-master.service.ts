export class TenantCompanyNameMasterApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "TenantCompanyNameMasterApiError";
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

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export type TenantCompanyNameRow = {
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  tenantId: number;
  companyId: number;
  companyName?: string | null;
  [key: string]: unknown;
};

export type TenantCompanyNameEntity = {
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number;
  companyId: number;
  companyName?: string;
  [key: string]: unknown;
};

export function mapTenantCompanyNameRow(
  row: TenantCompanyNameRow,
  idField: string,
  nameField: string
): TenantCompanyNameEntity {
  return {
    [idField]: row[idField],
    [nameField]: row[nameField],
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    tenantId: row.tenantId,
    companyId: row.companyId,
    companyName: row.companyName ?? undefined,
  };
}

export function createTenantCompanyNameService(options: {
  apiPath: string;
  idField: string;
  nameField: string;
}) {
  const { apiPath, idField, nameField } = options;

  async function list(filters?: {
    tenantId?: number;
    companyId?: number;
    activeOnly?: boolean;
  }): Promise<TenantCompanyNameEntity[]> {
    const params = new URLSearchParams();
    if (filters?.tenantId !== undefined) params.set("tenantId", String(filters.tenantId));
    if (filters?.companyId !== undefined) params.set("companyId", String(filters.companyId));
    if (filters?.activeOnly) params.set("activeOnly", "true");
    const qs = params.toString();
    const res = await fetch(`${apiPath}${qs ? `?${qs}` : ""}`, { cache: "no-store" });
    if (!res.ok) throw new TenantCompanyNameMasterApiError(await parseError(res), res.status);
    return ((await res.json()) as TenantCompanyNameRow[]).map((row) =>
      mapTenantCompanyNameRow(row, idField, nameField)
    );
  }

  async function create(input: {
    name: string;
    tenantId: number;
    companyId: number;
    isActive?: boolean;
    createdBy: number;
  }): Promise<TenantCompanyNameEntity> {
    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [nameField]: input.name,
        tenantId: input.tenantId,
        companyId: input.companyId,
        isActive: input.isActive,
        createdBy: input.createdBy,
      }),
    });
    if (!res.ok) throw new TenantCompanyNameMasterApiError(await parseError(res), res.status);
    return mapTenantCompanyNameRow(await res.json(), idField, nameField);
  }

  async function update(
    id: number,
    input: {
      name: string;
      tenantId: number;
      companyId: number;
      isActive?: boolean;
      modifiedBy: number;
    }
  ): Promise<TenantCompanyNameEntity> {
    const res = await fetch(`${apiPath}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [nameField]: input.name,
        tenantId: input.tenantId,
        companyId: input.companyId,
        isActive: input.isActive,
        modifiedBy: input.modifiedBy,
      }),
    });
    if (!res.ok) throw new TenantCompanyNameMasterApiError(await parseError(res), res.status);
    return mapTenantCompanyNameRow(await res.json(), idField, nameField);
  }

  async function setActive(
    id: number,
    isActive: boolean,
    modifiedBy: number
  ): Promise<TenantCompanyNameEntity> {
    const res = await fetch(`${apiPath}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive, modifiedBy }),
    });
    if (!res.ok) throw new TenantCompanyNameMasterApiError(await parseError(res), res.status);
    return mapTenantCompanyNameRow(await res.json(), idField, nameField);
  }

  async function remove(id: number): Promise<void> {
    const res = await fetch(`${apiPath}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new TenantCompanyNameMasterApiError(await parseError(res), res.status);
  }

  return { list, create, update, setActive, remove };
}
