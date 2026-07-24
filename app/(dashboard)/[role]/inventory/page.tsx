"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InventoryPage() {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${role}/inventory/dashboard`);
  }, [role, router]);

  return null;
}
