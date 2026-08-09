"use client";

import { ComingSoonPlaceholder } from "@/components/shared/ComingSoonPlaceholder";

export default function HelpdeskChannelsSmsPage() {
  return (
    <div className="p-6">
      <ComingSoonPlaceholder
        module="helpdeskChannelsSms"
        title="SMS channel configuration"
        phase="SMS gateway setup"
      />
    </div>
  );
}
