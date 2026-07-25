import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MarketingPageHero } from "@/components/marketing/MarketingShell";
import { SAAS_BRAND } from "@/config/saasBrand";
import { API_PRODUCTS } from "@/config/marketingContent";
import { ICONS } from "@/lib/icon-registry";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: `API — ${SAAS_BRAND.name}`,
  description: "GDS, NDC, LCC, third-party integrations, and hotel mapping.",
};

export default function ApiOverviewPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="API"
        title="Distribution and content pipes your desk can trust."
        description="Connect GDS, NDC, and LCC content, third-party suppliers, and hotel identity mapping — with keys, sandboxes, and usage metering under the API module."
      />
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-4 md:grid-cols-2">
          {API_PRODUCTS.map((product) => {
            const Icon = ICONS[product.icon];
            return (
              <Link
                key={product.id}
                href={product.href}
                className="group flex flex-col rounded-2xl border border-[#1a1814]/10 bg-white/50 p-6 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a1814] text-[#f6f3ee]">
                    {Icon && <Icon className="h-5 w-5" />}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[#1a1814]/35 transition-colors group-hover:text-[#c45c26]" />
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#c45c26]">
                  {product.shortName}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">{product.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#1a1814]/65">{product.description}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {product.highlights.map((h) => (
                    <li
                      key={h}
                      className="rounded-full border border-[#1a1814]/10 px-2.5 py-1 text-[11px] text-[#1a1814]/70"
                    >
                      {h}
                    </li>
                  ))}
                </ul>
              </Link>
            );
          })}
        </div>
        <div className="mt-12 rounded-2xl bg-[#1a1814] px-6 py-8 text-[#f6f3ee] sm:px-8">
          <h2 className="text-xl font-semibold">Need the API subscription module?</h2>
          <p className="mt-2 max-w-xl text-sm text-[#f6f3ee]/65">
            Enable the API product in your tenant trial — then request sandbox credentials for GDS,
            NDC, or supplier adapters.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/register?modules=api" />}
            className="mt-5 rounded-full bg-[#c45c26] text-white hover:bg-[#a94c1d]"
          >
            Start trial with API
          </Button>
        </div>
      </section>
    </>
  );
}
