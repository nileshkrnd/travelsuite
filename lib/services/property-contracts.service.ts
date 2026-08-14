import type { PropertyContract } from "@/types";
import { toAppPropertyContract, type PropertyContractRow } from "@/lib/mappers/property-contract.mapper";

export class PropertyContractsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyContractsApiError";
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

export interface PropertyContractWriteInput {
  tenantId: number;
  companyId: number;
  propertyId: number;
  supplierId: number;
  contractNumber: string;
  contractName: string;
  contractTypeId: number;
  startDate: string;
  endDate: string;
  contractCurrencyId: number;
  contractStatusId: number;
  contractVersion?: number;
  signedDate?: string | null;
  signedByEmployeeId?: number | null;
  supplierContactId?: number | null;
  paymentTerms?: string | null;
  generalTerms?: string | null;
  remarks?: string | null;
  contractFileUrl?: string | null;
  contractFileName?: string | null;
  isActive?: boolean;
}

export async function listPropertyContracts(options?: {
  tenantId?: number;
  companyId?: number;
  propertyId?: number;
  supplierId?: number;
  contractStatusId?: number;
  activeOnly?: boolean;
}): Promise<PropertyContract[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.supplierId !== undefined) params.set("supplierId", String(options.supplierId));
  if (options?.contractStatusId !== undefined) {
    params.set("contractStatusId", String(options.contractStatusId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-contracts${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyContractsApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyContractRow[]).map(toAppPropertyContract);
}

export async function getPropertyContract(propertyContractId: number): Promise<PropertyContract> {
  const res = await fetch(`/api/property-contracts/${propertyContractId}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyContractsApiError(await parseError(res), res.status);
  return toAppPropertyContract(await res.json());
}

export async function createPropertyContract(
  input: PropertyContractWriteInput & { createdBy: number }
): Promise<PropertyContract> {
  const res = await fetch("/api/property-contracts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractsApiError(await parseError(res), res.status);
  return toAppPropertyContract(await res.json());
}

export async function updatePropertyContract(
  propertyContractId: number,
  input: PropertyContractWriteInput & { modifiedBy: number }
): Promise<PropertyContract> {
  const res = await fetch(`/api/property-contracts/${propertyContractId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractsApiError(await parseError(res), res.status);
  return toAppPropertyContract(await res.json());
}

export async function setPropertyContractActive(
  propertyContractId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyContract> {
  const res = await fetch(`/api/property-contracts/${propertyContractId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyContractsApiError(await parseError(res), res.status);
  return toAppPropertyContract(await res.json());
}

export async function deletePropertyContract(propertyContractId: number): Promise<void> {
  const res = await fetch(`/api/property-contracts/${propertyContractId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyContractsApiError(await parseError(res), res.status);
}
