import type { ModuleKey } from "@/config/permissions";

export interface ActivityItem {
  id: string;
  tenantId: string;
  actorName: string;
  action: string;
  module: ModuleKey;
  timestamp: string;
}
