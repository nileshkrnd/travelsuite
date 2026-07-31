import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { toAppUser } from "@/lib/mappers/user.mapper";

const schema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  /** Optional tenant code — required for non–Super Admin when provided. */
  tenantCode: z.string().trim().optional(),
});

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    {
      error: `Database unavailable: ${message}. Ensure PostgreSQL is running and ADMINCNX_URL points to the admin database.`,
    },
    { status: 503 }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const username = parsed.data.username.trim().toLowerCase();
    const row = await adminDb.user.findUnique({
      where: { username },
      include: { employee: { select: { employeeImage: true, isActive: true } } },
    });
    if (!row || !row.isActive || !verifyPassword(parsed.data.password, row.passwordHash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    let tenantUid: string | undefined;
    if (row.tenantId > 0) {
      const tenant = await adminDb.tenant.findUnique({
        where: { tenantId: row.tenantId },
        select: { tenantUid: true, tenantCode: true, status: true },
      });
      if (!tenant || tenant.status !== "active") {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
      if (parsed.data.tenantCode) {
        if (tenant.tenantCode.toLowerCase() !== parsed.data.tenantCode.toLowerCase()) {
          return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }
      }
      tenantUid = tenant.tenantUid;
    }
    // Super Admin (TenantID=0): tenant code is ignored when present.

    await adminDb.user.update({
      where: { userId: row.userId },
      data: { lastLoggedInDtTm: new Date() },
    });

    const tenantUidByKey = new Map<number, string>();
    if (row.tenantId > 0 && tenantUid) tenantUidByKey.set(row.tenantId, tenantUid);

    const avatarUrl =
      row.employee?.isActive && row.employee.employeeImage?.trim()
        ? row.employee.employeeImage.trim()
        : null;
    const user = toAppUser(row, { tenantUidByKey, avatarUrl });
    return NextResponse.json(user);
  } catch (error) {
    return dbUnavailable(error);
  }
}
