import type { Metadata } from "next";
import { TenantSelection } from "@/components/auth/TenantSelection";
import { SAAS_BRAND } from "@/config/saasBrand";

export const metadata: Metadata = { title: `Select workspace — ${SAAS_BRAND.name}` };

export default function SelectTenantPage() {
  return <TenantSelection />;
}
