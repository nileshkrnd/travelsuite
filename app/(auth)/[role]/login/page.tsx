import { TenantScopedLogin } from "@/components/auth/TenantScopedLogin";

/**
 * NOTE: this folder is named [role] (not [tenantSlug]) because Next.js requires
 * dynamic segment names to match across route groups sharing the same top-level
 * URL position — the (dashboard) group already claims [role] for /{role}/dashboard
 * etc. The value here is actually a Tenant Code (slug), e.g. /horizonTravel/login.
 */
interface Props {
  params: Promise<{ role: string }>;
}

export default async function TenantScopedLoginPage({ params }: Props) {
  const { role: tenantSlug } = await params;
  return <TenantScopedLogin tenantSlug={tenantSlug} />;
}
