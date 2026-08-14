"use client";

import { useRef, useState } from "react";
import { FileText, Trash2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  label: string;
  fileUrl?: string | null;
  fileName?: string | null;
  onChange: (fileUrl: string | null, fileName: string | null) => void;
  error?: string;
  required?: boolean;
};

/** Uploads the signed contract PDF and tracks both its storage path and original filename. */
export function ContractFileUploadField({ id, label, fileUrl, fileName, onChange, error, required }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "contracts");
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = (await res.json()) as { path?: string; error?: string };
      if (!res.ok || !data.path) {
        throw new Error(data.error ?? "Upload failed");
      }
      onChange(data.path, file.name);
      toast.success("Contract document uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div
        className={cn(
          "flex min-w-0 items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3",
          error && "border-destructive"
        )}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-background">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1 space-y-2 overflow-hidden">
          <p className="truncate text-xs text-muted-foreground">
            {fileUrl ? (
              <a href={fileUrl} target="_blank" rel="noreferrer" className="text-foreground hover:underline">
                {fileName || "View uploaded contract"}
              </a>
            ) : (
              "PDF · max 10 MB"
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {fileUrl ? "Replace" : "Upload"}
            </Button>
            {fileUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={() => onChange(null, null)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
