"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptFor } from "@/components/masters/ServiceProductMediaUploadField";

export interface StagedMediaFile {
  tempId: string;
  mediaUrl: string;
  fileName: string;
  fileExtension: string;
  mimeType: string;
  fileSize: number;
}

type Props = {
  /** Selected Media Type name (e.g. "Image", "Video") — narrows the accepted file picker. */
  mediaTypeName?: string;
  onFilesUploaded: (files: StagedMediaFile[]) => void;
  disabled?: boolean;
};

/** Uploads one or more Service Product media files at once; each becomes its own staged row for title/description entry. */
export function ServiceProductMediaBulkUploadField({ mediaTypeName, onFilesUploaded, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const accept = acceptFor(mediaTypeName);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    const uploaded: StagedMediaFile[] = [];
    for (const file of Array.from(fileList)) {
      try {
        const body = new FormData();
        body.append("file", file);
        body.append("folder", "service-product-media");
        const res = await fetch("/api/uploads", { method: "POST", body });
        const data = (await res.json()) as { path?: string; error?: string };
        if (!res.ok || !data.path) {
          throw new Error(data.error ?? `Upload failed for ${file.name}`);
        }
        uploaded.push({
          tempId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          mediaUrl: data.path,
          fileName: file.name,
          fileExtension: file.name.split(".").pop()?.toLowerCase() ?? "",
          mimeType: file.type,
          fileSize: file.size,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Upload failed for ${file.name}`);
      }
    }
    if (uploaded.length > 0) {
      onFilesUploaded(uploaded);
      toast.success(`${uploaded.length} file${uploaded.length > 1 ? "s" : ""} uploaded`);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
      <input
        id="bulkMediaUpload"
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <Button type="button" variant="outline" disabled={uploading || disabled} onClick={() => inputRef.current?.click()}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? "Uploading…" : "Select files to upload"}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">PNG, JPG, WEBP, SVG, ICO, or MP4 · max 50 MB each · select multiple files at once</p>
    </div>
  );
}
