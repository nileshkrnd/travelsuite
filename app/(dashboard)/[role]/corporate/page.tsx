"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CorporatePage() {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${role}/corporate/dashboard`);
  }, [role, router]);

  return null;
}
