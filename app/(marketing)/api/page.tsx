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
  description:
    "Flight, Hotel, Transfer, Rail, Insurance, Payment Gateway, Third-Party API, and Hotel Mapping.",
};

export default function ApiOverviewPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="API"
        title="Content and payment connectivity for every channel."
        description="Flight, hotel, transfer, rail, insurance and payments — plus third-party adapters and hotel mapping — under the Travel API module in Al Asmakh Nexus."
      />
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-4 md:grid-cols-2">
          {API_PRODUCTS.map((product) => {
            const Icon = ICONS[product.icon];
            return (
              <Link
                key={product.id}
                href={product.href}
                className="group flex flex-col border border-[#001C35]/10 bg-white p-6 transition-colors hover:border-[#001C35]/25 hover:bg-[#F8F9FB]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center border border-[#001C35]/12 bg-[#F8F9FB] text-[#001C35]">
                    {Icon && <Icon className="h-5 w-5" />}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[#001C35]/35 transition-colors group-hover:text-[#0A4A6E]" />
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#0A4A6E]">
                  {product.shortName}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#001C35]">
                  {product.name}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#001C35]/65">{product.description}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {product.highlights.map((h) => (
                    <li
                      key={h}
                      className="border border-[#001C35]/10 px-2.5 py-1 text-[11px] text-[#001C35]/70"
                    >
                      {h}
                    </li>
                  ))}
                </ul>
              </Link>
            );
          })}
        </div>
        <div className="mt-12 border border-[#001C35]/10 bg-[#F8F9FB] px-6 py-8 sm:px-8">
          <h2 className="text-xl font-semibold text-[#001C35]">Need the API subscription module?</h2>
          <p className="mt-2 max-w-xl text-sm text-[#001C35]/65">
            Enable the Travel API product in your tenant — then request sandbox credentials for
            Flight, Hotel, Transfer and the other connectors.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/register?modules=api" />}
            className="mt-5 rounded-none bg-[#001C35] text-white hover:bg-[#0A4A6E]"
          >
            Start trial with API
          </Button>
        </div>
      </section>
    </>
  );
}
