import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageHero } from "@/components/marketing/MarketingShell";
import { SAAS_BRAND } from "@/config/saasBrand";
import { MODULE_CATEGORIES, SAAS_MODULES } from "@/config/saasCatalog";
import { ICONS } from "@/lib/icon-registry";

export const metadata: Metadata = {
  title: `Products — ${SAAS_BRAND.name}`,
  description: "Subscribe to POS, operations, OTA, property, CRM, fleet, payments, and more.",
};

export default function ProductsPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Products"
        title="Every module is a subscription you can turn on."
        description={`${SAAS_MODULES.length} products across travel operations, digital channels, real estate, mobility, and platform services.`}
      />
      <section className="mx-auto max-w-6xl space-y-14 px-4 py-16 sm:px-6 sm:py-20">
        {MODULE_CATEGORIES.map((cat) => {
          const modules = SAAS_MODULES.filter((m) => m.category === cat.id);
          if (!modules.length) return null;
          return (
            <div key={cat.id}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c45c26]">
                {cat.label}
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((mod) => {
                  const Icon = ICONS[mod.icon];
                  return (
                    <article
                      key={mod.id}
                      className="flex flex-col rounded-2xl border border-[#1a1814]/10 bg-white/50 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1814]/5">
                          {Icon && <Icon className="h-4 w-4 text-[#c45c26]" />}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">${mod.monthlyPrice}/mo</span>
                      </div>
                      <h3 className="mt-4 font-semibold">{mod.name}</h3>
                      <p className="mt-1 text-sm text-[#1a1814]/65">{mod.tagline}</p>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-[#1a1814]/55">
                        {mod.description}
                      </p>
                      <Link
                        href={`/register?modules=${mod.id}`}
                        className="mt-4 text-sm font-medium text-[#c45c26] hover:underline"
                      >
                        Add to trial →
                      </Link>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
