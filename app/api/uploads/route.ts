import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

const KNOWN_FOLDERS = new Set(["companies", "employees", "contracts", "room-media"]);

const IMAGE_TYPES = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
  ["image/x-icon", ".ico"],
  ["image/vnd.microsoft.icon", ".ico"],
]);
const DOCUMENT_TYPES = new Map<string, string>([["application/pdf", ".pdf"]]);
const VIDEO_TYPES = new Map<string, string>([["video/mp4", ".mp4"]]);

const FOLDER_TYPES: Record<string, Map<string, string>> = {
  companies: IMAGE_TYPES,
  employees: IMAGE_TYPES,
  contracts: DOCUMENT_TYPES,
  "room-media": new Map([...IMAGE_TYPES, ...VIDEO_TYPES]),
  misc: IMAGE_TYPES,
};
const FOLDER_MAX_BYTES: Record<string, number> = {
  companies: 512 * 1024,
  employees: 512 * 1024,
  contracts: 10 * 1024 * 1024,
  "room-media": 20 * 1024 * 1024,
  misc: 512 * 1024,
};
const FOLDER_TYPE_LABEL: Record<string, string> = {
  contracts: "PDF",
  "room-media": "PNG, JPG, WEBP, SVG, ICO, or MP4",
};

/**
 * Saves an uploaded asset under public/uploads and returns a short public path
 * suitable for storage in a VARCHAR column (CompanyLogo / ContractFileUrl / MediaURL).
 * Allowed file types and size limits are keyed by `folder`.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folderRaw = String(formData.get("folder") ?? "companies");
    const folder = KNOWN_FOLDERS.has(folderRaw) ? folderRaw : "misc";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const maxBytes = FOLDER_MAX_BYTES[folder] ?? FOLDER_MAX_BYTES.misc!;
    if (file.size <= 0 || file.size > maxBytes) {
      return NextResponse.json(
        { error: `File must be between 1 byte and ${Math.round(maxBytes / 1024)} KB` },
        { status: 400 }
      );
    }

    const allowedTypes = FOLDER_TYPES[folder] ?? FOLDER_TYPES.misc!;
    const ext = allowedTypes.get(file.type);
    if (!ext) {
      return NextResponse.json(
        { error: `Unsupported file type. Use ${FOLDER_TYPE_LABEL[folder] ?? "PNG, JPG, WEBP, SVG, or ICO"}.` },
        { status: 400 }
      );
    }

    const name = `${Date.now()}_${randomBytes(4).toString("hex")}${ext}`;
    const relative = `/uploads/${folder}/${name}`;
    if (relative.length > 1000) {
      return NextResponse.json({ error: "Generated path too long" }, { status: 500 });
    }

    const dir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, name), buffer);

    return NextResponse.json({ path: relative });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
