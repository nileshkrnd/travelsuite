import type { Region } from "@/types";

/** Legacy in-memory seed — Region master now reads from PostgreSQL. Kept for reference only. */
export const regions: Region[] = [
  {
    regionId: 1,
    tenantId: 1,
    companyId: 1,
    regionCode: "GCC",
    regionName: "Gulf Cooperation Council",
    createdBy: 2,
    createdDtTm: "2023-11-05T09:00:00.000Z",
    modifiedBy: null,
    modifiedDtTm: null,
  },
];
