import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageHero } from "@/components/marketing/MarketingShell";
import { SAAS_BRAND } from "@/config/saasBrand";
import { PARTNERS } from "@/config/marketingContent";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: `Our partners — ${SAAS_BRAND.name}`,
  description: "Airlines, hotels, payments, DMCs, and property partners on Klyra.",
};

export default function PartnersPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Our partners"
        title="The network that shows up in your booking desk."
        description="Airlines, hotel groups, ground transport, payments, DMCs, and property desks — connected through Klyra modules and APIs."
      />
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PARTNERS.map((partner) => (
            <article
              key={partner.id}
              className="rounded-2xl border border-[#1a1814]/10 bg-white/50 p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#c45c26]">
                {partner.category}
              </p>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">{partner.name}</h2>
              <p className="mt-1 text-xs text-[#1a1814]/45">{partner.region}</p>
              <p className="mt-3 text-sm leading-relaxed text-[#1a1814]/65">{partner.blurb}</p>
            </article>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#1a1814]/10 bg-[#efeae2] px-6 py-6">
          <div>
            <p className="font-semibold">Want to partner with {SAAS_BRAND.name}?</p>
            <p className="mt-1 text-sm text-[#1a1814]/65">
              Airlines, suppliers, PSPs, and regional DMCs — we&apos;ll map the right connector.
            </p>
          </div>
          <Button
            nativeButton={false}
            render={<Link href="/contact" />}
            className="rounded-full bg-[#c45c26] text-white hover:bg-[#a94c1d]"
          >
            Become a partner
          </Button>
        </div>
      </section>
    </>
  );
}
