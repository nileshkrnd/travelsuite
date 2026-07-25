import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

const MAX_BYTES = 512 * 1024;
const ALLOWED_TYPES = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
  ["image/x-icon", ".ico"],
  ["image/vnd.microsoft.icon", ".ico"],
]);

/**
 * Saves a brand image under public/uploads and returns a short public path
 * suitable for CompanyLogo / CompanyFavIcon (VARCHAR 100).
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folderRaw = String(formData.get("folder") ?? "companies");
    const folder =
      folderRaw === "companies" || folderRaw === "employees" ? folderRaw : "misc";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be between 1 byte and 512 KB" }, { status: 400 });
    }

    const ext = ALLOWED_TYPES.get(file.type);
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PNG, JPG, WEBP, SVG, or ICO." },
        { status: 400 }
      );
    }

    const name = `${Date.now()}_${randomBytes(4).toString("hex")}${ext}`;
    const relative = `/uploads/${folder}/${name}`;
    if (relative.length > 100) {
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
