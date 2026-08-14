import type { ContractExcelImportResult } from "@/lib/api/property-contract-excel-helpers";

export class PropertyContractExcelApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyContractExcelApiError";
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

export async function downloadPropertyContractExcel(propertyContractId: number): Promise<void> {
  const res = await fetch(`/api/property-contracts/${propertyContractId}/excel`, { cache: "no-store" });
  if (!res.ok) throw new PropertyContractExcelApiError(await parseError(res), res.status);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  link.href = url;
  link.download = match?.[1] ?? `contract-${propertyContractId}-excel.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function uploadPropertyContractExcel(options: {
  propertyContractId: number;
  createdBy: number;
  file: File;
}): Promise<ContractExcelImportResult> {
  const body = new FormData();
  body.append("file", options.file);
  body.append("createdBy", String(options.createdBy));
  const res = await fetch(`/api/property-contracts/${options.propertyContractId}/excel`, {
    method: "POST",
    body,
  });
  if (!res.ok) throw new PropertyContractExcelApiError(await parseError(res), res.status);
  return (await res.json()) as ContractExcelImportResult;
}
