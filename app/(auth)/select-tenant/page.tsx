import type { Metadata } from "next";
import { TenantSelection } from "@/components/auth/TenantSelection";

export const metadata: Metadata = { title: "Select workspace — Klyra" };

export default function SelectTenantPage() {
  return <TenantSelection />;
}
