"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export interface UploadedMediaFile {
  mediaUrl: string;
  fileName: string;
  fileType: string | null;
}

type Props = {
  id: string;
  label: string;
  onUploaded: (file: UploadedMediaFile) => void;
  disabled?: boolean;
};

/** Uploads multiple room media files (images or MP4 video), reporting each as it finishes. */
export function RoomMediaMultiUploadField({ id, label, onUploaded, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        try {
          const body = new FormData();
          body.append("file", file);
          body.append("folder", "room-media");
          const res = await fetch("/api/uploads", { method: "POST", body });
          const data = (await res.json()) as { path?: string; error?: string };
          if (!res.ok || !data.path) {
            throw new Error(data.error ?? "Upload failed");
          }
          const ext = file.name.split(".").pop()?.toUpperCase() ?? null;
          onUploaded({ mediaUrl: data.path, fileName: file.name, fileType: ext });
        } catch (err) {
          toast.error(`${file.name}: ${err instanceof Error ? err.message : "Upload failed"}`);
        }
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
          <ImagePlus className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs text-muted-foreground">
            Select multiple files at once · PNG, JPG, WEBP, SVG, or MP4 · max 20 MB each
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Uploading…" : "Add images"}
          </Button>
        </div>
        <input
          id={id}
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico,video/mp4,.mp4"
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
