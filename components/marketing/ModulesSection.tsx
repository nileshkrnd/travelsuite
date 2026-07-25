"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { SAAS_BRAND } from "@/config/saasBrand";
import {
  MODULE_CATEGORIES,
  SAAS_MODULES,
  type SaasModule,
  type SaasModuleId,
} from "@/config/saasCatalog";
import { ICONS } from "@/lib/icon-registry";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ModulesSection() {
  const [active, setActive] = useState<SaasModuleId | null>(SAAS_MODULES[0]?.id ?? null);
  const selected = SAAS_MODULES.find((m) => m.id === active) ?? SAAS_MODULES[0];

  return (
    <section id="modules" className="scroll-mt-20 bg-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Product modules</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Travel, property, CRM & apps — modular by design.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Every capability is a subscription module inside {SAAS_BRAND.name}. Turn on OTA,
            mobile apps, buy/rent property, or CRM when you need them — no unused monolith.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap gap-2">
          {MODULE_CATEGORIES.map((cat) => (
            <span
              key={cat.id}
              className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {cat.label}
            </span>
          ))}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {SAAS_MODULES.map((mod) => (
              <ModuleListItem
                key={mod.id}
                module={mod}
                active={selected?.id === mod.id}
                onSelect={() => setActive(mod.id)}
              />
            ))}
          </ul>

          {selected && <ModuleDetail module={selected} />}
        </div>
      </div>
    </section>
  );
}

function ModuleListItem({
  module,
  active,
  onSelect,
}: {
  module: SaasModule;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = ICONS[module.icon];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
        active
          ? "border-teal-600/40 bg-teal-50 text-foreground dark:bg-teal-950/40"
          : "border-transparent hover:border-border hover:bg-muted/50"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          active ? "bg-teal-600 text-white" : "bg-muted text-muted-foreground"
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{module.name}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{module.tagline}</span>
      </span>
    </button>
  );
}

function ModuleDetail({ module }: { module: SaasModule }) {
  const Icon = ICONS[module.icon];
  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white">
            {Icon && <Icon className="h-5 w-5" />}
          </span>
          <div>
            <h3 className="text-xl font-semibold tracking-tight">{module.name}</h3>
            <p className="text-sm text-muted-foreground">{module.tagline}</p>
          </div>
        </div>
        <p className="shrink-0 text-right text-sm">
          <span className="block text-xs text-muted-foreground">From</span>
          <span className="text-lg font-semibold tabular-nums">${module.monthlyPrice}</span>
          <span className="text-xs text-muted-foreground">/mo</span>
        </p>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{module.description}</p>

      <ul className="mt-6 space-y-2.5">
        {module.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        nativeButton={false}
        render={<Link href={`/register?modules=${module.id}`} />}
        className="mt-8 bg-teal-700 text-white hover:bg-teal-600"
      >
        Add to subscription
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
