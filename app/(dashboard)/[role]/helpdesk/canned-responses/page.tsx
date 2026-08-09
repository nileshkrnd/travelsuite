"use client";

import { ComingSoonPlaceholder } from "@/components/shared/ComingSoonPlaceholder";

export default function HelpdeskCannedResponsesPage() {
  return (
    <div className="p-6">
      <ComingSoonPlaceholder
        module="helpdeskCannedResponses"
        title="Canned Responses"
        phase="the canned responses admin (macros already work in ticket reply)"
      />
    </div>
  );
}
