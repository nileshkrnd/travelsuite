"use client";

import { BadgeCheck } from "lucide-react";
import { GlobalCodeMasterPage, type GlobalCodeMasterService } from "@/components/masters/GlobalCodeMasterPage";
import { b2bCustomerCreditStatusesService } from "@/lib/services/global-code-lookup.service";
import type { GlobalCodeLookup } from "@/types";

const service: GlobalCodeMasterService<GlobalCodeLookup> = b2bCustomerCreditStatusesService;

export default function B2BCustomerCreditStatusPage() {
  return (
    <GlobalCodeMasterPage
      config={{
        moduleKey: "b2bCustomerCreditStatus",
        title: "B2B Credit Status",
        description: "Pending, approved, suspended and other credit facility statuses.",
        entityLabel: "Credit status",
        codeLabel: "Credit status code",
        nameLabel: "Credit status name",
        codePlaceholder: "e.g. APPROVED, SUSPENDED",
        namePlaceholder: "e.g. Approved, Suspended",
        icon: BadgeCheck,
        addButtonLabel: "Add credit status",
        service,
        scoped: true,
      }}
    />
  );
}
