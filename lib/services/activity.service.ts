import { mockDelay } from "@/lib/utils";
import { activity } from "@/mock/data/activity";
import type { ActivityItem } from "@/types";

export async function getRecentActivity(tenantId: string, limit = 8): Promise<ActivityItem[]> {
  // TODO(Phase 2): replace with `await fetch(`/api/tenants/${tenantId}/activity?limit=${limit}`).then(r => r.json())`
  await mockDelay();
  return activity.filter((a) => a.tenantId === tenantId).slice(0, limit);
}
