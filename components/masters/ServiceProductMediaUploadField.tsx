"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, Loader2, Upload, Film } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface UploadedFileInfo {
  mediaUrl: string;
  fileName: string;
  fileExtension: string;
  mimeType: string;
  fileSize: number;
}

type Props = {
  id: string;
  label: string;
  /** Selected Media Type name (e.g. "Image", "Video", "Virtual Tour") — narrows the accepted file picker. */
  mediaTypeName?: string;
  mediaUrl?: string | null;
  fileName?: string | null;
  onChange: (info: UploadedFileInfo | null) => void;
  error?: string;
  required?: boolean;
};

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico";
const VIDEO_ACCEPT = "video/mp4,.mp4";

export function acceptFor(mediaTypeName: string | undefined): string {
  const name = mediaTypeName?.toLowerCase() ?? "";
  if (name.includes("video")) return VIDEO_ACCEPT;
  if (name.includes("image")) return IMAGE_ACCEPT;
  return `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`;
}

function isVideoUrl(url: string) {
  return /\.(mp4)$/i.test(url);
}

/** Uploads a Service Product media asset (image or MP4 video); the accepted file types narrow to the selected Media Type. */
export function ServiceProductMediaUploadField({ id, label, mediaTypeName, mediaUrl, fileName, onChange, error, required }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const accept = acceptFor(mediaTypeName);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "service-product-media");
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = (await res.json()) as { path?: string; error?: string };
      if (!res.ok || !data.path) {
        throw new Error(data.error ?? "Upload failed");
      }
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      onChange({
        mediaUrl: data.path,
        fileName: file.name,
        fileExtension: extension,
        mimeType: file.type,
        fileSize: file.size,
      });
      toast.success("Media uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;

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
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
          {mediaUrl ? (
            isVideo ? (
              <Film className="h-5 w-5 text-muted-foreground" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- local upload path, not a static asset
              <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2 overflow-hidden">
          <p className="truncate text-xs text-muted-foreground">
            {mediaUrl ? fileName || "View uploaded media" : "PNG, JPG, WEBP, SVG, ICO, or MP4 · max 50 MB"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {mediaUrl ? "Replace" : "Upload"}
            </Button>
            {mediaUrl ? (
              <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={() => onChange(null)}>
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
          accept={accept}
          className="sr-only"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
