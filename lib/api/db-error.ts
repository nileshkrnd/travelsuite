import { NextResponse } from "next/server";

function formatDbErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Database error";
  if (/reading 'findMany'|reading 'findFirst'|reading 'create'|reading 'update'|reading 'delete'|reading 'count'/i.test(message)) {
    return `${message}. The Prisma client is likely out of date — run \`npm run db:generate\`, then restart the Next.js dev server.`;
  }
  return message;
}

export function dbUnavailable(error: unknown) {
  const message = formatDbErrorMessage(error);
  return NextResponse.json(
    {
      error: `Database unavailable: ${message}. Ensure PostgreSQL is running and ADMINCNX_URL / BASECNX_URL / ACCOUNTSCNX_URL / HELPDESKCNX_URL are set.`,
    },
    { status: 503 }
  );
}
