"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  downloadPropertyContractExcel,
  uploadPropertyContractExcel,
  PropertyContractExcelApiError,
} from "@/lib/services/property-contract-excel.service";

export function ContractExcelImportExport({
  propertyContractId,
  actorKey,
  canEdit,
  onImported,
}: {
  propertyContractId: number;
  actorKey: number;
  canEdit: boolean;
  onImported?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadPropertyContractExcel(propertyContractId);
      toast.success("Excel template downloaded");
    } catch (err) {
      toast.error(err instanceof PropertyContractExcelApiError ? err.message : "Could not download Excel");
    } finally {
      setDownloading(false);
    }
  }

  async function handleUpload(file: File | undefined) {
    if (!file || !canEdit) return;
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    setUploading(true);
    try {
      const result = await uploadPropertyContractExcel({
        propertyContractId,
        createdBy: actorKey,
        file,
      });
      const saved =
        result.rates.saved + result.inventory.saved + result.stopSales.saved + result.blackouts.saved;
      const deleted =
        result.rates.deleted +
        result.inventory.deleted +
        result.stopSales.deleted +
        result.blackouts.deleted;
      if (result.errors.length > 0) {
        const first = result.errors[0]!;
        toast.warning(
          `Imported ${saved} row${saved === 1 ? "" : "s"}${deleted ? `, deleted ${deleted}` : ""}. ${result.errors.length} error${result.errors.length === 1 ? "" : "s"} (first: ${first.sheet} row ${first.row} — ${first.message})`
        );
      } else if (saved === 0 && deleted === 0) {
        toast.message("No data rows found in the Excel file");
      } else {
        toast.success(
          `Excel imported: ${saved} saved${deleted ? `, ${deleted} deleted` : ""}`
        );
      }
      onImported?.();
    } catch (err) {
      toast.error(err instanceof PropertyContractExcelApiError ? err.message : "Could not upload Excel");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button
        type="button"
        variant="outline"
        disabled={downloading || uploading}
        onClick={() => void handleDownload()}
      >
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
        Download Excel
      </Button>
      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => void handleUpload(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            disabled={downloading || uploading || !actorKey}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload Excel
          </Button>
        </>
      )}
    </div>
  );
}
