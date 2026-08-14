import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  buildPropertyContractWorkbook,
  importPropertyContractWorkbook,
} from "@/lib/api/property-contract-excel-helpers";

const idSchema = z.coerce.number().int().positive();
const actorSchema = z.coerce.number().int().positive();

type RouteContext = { params: Promise<{ propertyContractId: string }> };

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { propertyContractId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid contract id" }, { status: 400 });

    const contract = await prisma.propertyContract.findUnique({
      where: { propertyContractId: BigInt(id.data) },
      select: { contractNumber: true, contractName: true },
    });
    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

    const buffer = await buildPropertyContractWorkbook(id.data);
    const safeNumber = contract.contractNumber.replace(/[^\w.-]+/g, "_");
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="contract-${safeNumber}-excel.xlsx"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NOT_FOUND:")) {
      return NextResponse.json({ error: error.message.slice(10) }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { propertyContractId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid contract id" }, { status: 400 });

    const formData = await request.formData();
    const actor = actorSchema.safeParse(formData.get("createdBy"));
    if (!actor.success) {
      return NextResponse.json({ error: "createdBy is required" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Excel file is required" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "Upload an .xlsx Excel file" }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Excel file is larger than 8 MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importPropertyContractWorkbook({
      propertyContractId: id.data,
      actorKey: actor.data,
      buffer,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NOT_FOUND:")) {
      return NextResponse.json({ error: error.message.slice(10) }, { status: 404 });
    }
    if (error instanceof Error && error.message.startsWith("BAD_REQUEST:")) {
      return NextResponse.json({ error: error.message.slice(12) }, { status: 400 });
    }
    return dbUnavailable(error);
  }
}
