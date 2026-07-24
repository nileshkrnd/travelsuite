import type { Tenant } from "@/types";

export interface TenantGroup {
  groupName: string;
  tenants: Tenant[];
}

/** Groups tenants under their holding company, preserving first-seen group order. */
export function groupTenants(tenants: Tenant[]): TenantGroup[] {
  const order: string[] = [];
  const map = new Map<string, Tenant[]>();

  for (const tenant of tenants) {
    const key = tenant.groupName || tenant.branding.name;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(tenant);
  }

  return order.map((groupName) => ({
    groupName,
    tenants: map.get(groupName)!,
  }));
}

/** Case-insensitive match on tenant name, group, slug, city, or country. */
export function filterTenants(tenants: Tenant[], query: string): Tenant[] {
  const q = query.trim().toLowerCase();
  if (!q) return tenants;
  return tenants.filter((tenant) => {
    const haystack = [
      tenant.branding.name,
      tenant.groupName,
      tenant.slug,
      tenant.address.city,
      tenant.address.country,
      tenant.contact.email,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
