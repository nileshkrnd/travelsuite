import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageHero } from "@/components/marketing/MarketingShell";
import { SAAS_BRAND } from "@/config/saasBrand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: `About us — ${SAAS_BRAND.name}`,
  description: `Who builds ${SAAS_BRAND.name} and why holdings choose a modular stack.`,
};

export default function AboutPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="About us"
        title="We build the operating system for travel & property holdings."
        description={`${SAAS_BRAND.name} is a modular SaaS platform — not a tour brand, not a single-desk CRM. We help groups run POS, mid office, OTA, property, payments, and partner APIs under one tenant.`}
      />
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Why we exist</h2>
            <p className="mt-4 text-base leading-relaxed text-[#1a1814]/70">
              Most holdings grow by acquisition and vertical expansion. Travel sits beside real
              estate. Agency portals sit beside consumer OTA. Legacy GDS sits beside NDC. Buying a
              separate tool for each desk creates reconciliation debt nobody wants to own.
            </p>
            <p className="mt-4 text-base leading-relaxed text-[#1a1814]/70">
              {SAAS_BRAND.name} is subscription-first: start with POS and accounts, add mid office,
              property, or mobile when the business is ready — without migrating tenants again.
            </p>
          </div>
          <div className="grid gap-4">
            {[
              ["Doha-rooted", "Built with GCC holding structures in mind — companies under a tenant."],
              ["Module honest", "You only pay for what you enable. Enterprise still means all modules."],
              ["Integration heavy", "GDS, NDC, LCC, hotel mapping, and payment gateways are first-class."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-[#1a1814]/10 bg-white/50 p-5">
                <p className="font-semibold">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#1a1814]/65">{body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-wrap gap-3">
          <Button
            nativeButton={false}
            render={<Link href="/contact" />}
            className="rounded-full bg-[#c45c26] text-white hover:bg-[#a94c1d]"
          >
            Talk to us
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/partners" />}
            variant="outline"
            className="rounded-full border-[#1a1814]/20"
          >
            Our partners
          </Button>
        </div>
      </section>
    </>
  );
}
