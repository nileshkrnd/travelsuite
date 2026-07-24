"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ReportsPage() {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${role}/reports/sales`);
  }, [role, router]);

  return null;
}
