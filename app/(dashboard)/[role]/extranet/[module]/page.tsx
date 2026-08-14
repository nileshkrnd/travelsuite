"use client";

import { ModuleCatchAllView } from "@/components/shared/ModuleCatchAllView";

/** Prototype extranet screens (single URL segment). Dedicated modules use sibling folders (contracts/, seasons/, …). */
export default function ExtranetModulePage() {
  return <ModuleCatchAllView pathPrefix="extranet" />;
}
