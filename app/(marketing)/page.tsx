import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SAAS_BRAND } from "@/config/saasBrand";
import { NEXUS_PLATFORM_STEPS, NEXUS_PRODUCTS } from "@/config/nexusCatalog";
import { Button } from "@/components/ui/button";
import { ICONS } from "@/lib/icon-registry";
import { NexusLiveCanvas } from "@/components/marketing/NexusLiveCanvas";

export const metadata: Metadata = {
  title: `${SAAS_BRAND.name} — ${SAAS_BRAND.tagline}`,
  description: SAAS_BRAND.description,
};

export default function HomePage() {
  const travel = NEXUS_PRODUCTS.find((p) => p.id === "travel")!;

  return (
    <>
      {/* Hero — light, logo-led */}
      <section className="relative overflow-hidden border-b border-[#001C35]/10 bg-white text-[#001C35]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 100% 0%, rgba(10,74,110,0.08), transparent 55%)",
          }}
          aria-hidden
        />

        <div className="relative mx-auto grid min-h-[calc(100svh-4.25rem)] max-w-6xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center px-4 py-14 sm:px-6 lg:py-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SAAS_BRAND.logoUrl}
              alt={SAAS_BRAND.groupName}
              className="h-12 w-auto object-contain object-left sm:h-14"
            />
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0A4A6E]">
              {SAAS_BRAND.groupName} · Platform
            </p>
            <h1 className="mt-4 max-w-[14ch] text-[clamp(2.4rem,6vw,4.25rem)] font-semibold leading-[0.98] tracking-tight text-[#001C35]">
              {SAAS_BRAND.name}
            </h1>
            <p className="mt-5 max-w-lg text-xl font-medium leading-snug text-[#001C35]/90 sm:text-2xl">
              {SAAS_BRAND.tagline}
            </p>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-[#001C35]/60">
              A multi-company operating system for travel, property, hospitality, finance, people,
              fleet and service — licensed by product, governed from one administration layer.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button
                nativeButton={false}
                render={<Link href="/contact" />}
                size="lg"
                className="rounded-none bg-[#001C35] px-6 text-white hover:bg-[#0A4A6E]"
              >
                Request a demonstration
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                nativeButton={false}
                render={<Link href="/login" />}
                size="lg"
                variant="outline"
                className="rounded-none border-[#001C35]/25 bg-transparent text-[#001C35] hover:bg-[#F8F9FB]"
              >
                Sign in to platform
              </Button>
            </div>
          </div>

          <div className="relative min-h-[340px] border-t border-[#001C35]/10 bg-[#F8F9FB] lg:min-h-0 lg:border-s lg:border-t-0">
            <NexusLiveCanvas />
          </div>
        </div>
      </section>

      {/* Platform */}
      <section className="border-b border-[#001C35]/10 bg-[#F8F9FB]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0A4A6E]">
              Platform
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#001C35] sm:text-[2.5rem] sm:leading-tight">
              {SAAS_BRAND.tagline}
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-[#001C35]/65">
              Al Asmakh Nexus is the holding platform where each operating company licenses the
              products it needs. Administration remains common. Module Access determines what appears
              in the application. Channel products such as B2B, B2C, CBT and API are available under
              Travel without cluttering day-to-day administration menus.
            </p>
          </div>

          <ol className="mt-14 grid gap-10 border-t border-[#001C35]/10 pt-10 md:grid-cols-3 md:gap-8">
            {NEXUS_PLATFORM_STEPS.map((step, index) => (
              <li key={step.title}>
                <p className="font-mono text-xs tabular-nums text-[#0A4A6E]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-[#001C35]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#001C35]/65">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Product catalogue */}
      <section className="border-b border-[#001C35]/10 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0A4A6E]">
                Product catalogue
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#001C35] sm:text-4xl">
                Products aligned to how the businesses operate
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#001C35]/65">
                Each product maps to a standard industry function. Modules inside a product can be
                licensed independently where the catalogue separates channels or sub-domains.
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#001C35] hover:text-[#0A4A6E]"
            >
              Full product list <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 divide-y divide-[#001C35]/10 border-y border-[#001C35]/10">
            {NEXUS_PRODUCTS.map((product) => {
              const Icon = ICONS[product.icon];
              return (
                <article
                  key={product.id}
                  className="grid gap-8 py-10 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr_1fr]"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      {Icon && <Icon className="h-5 w-5 shrink-0 text-[#001C35]" />}
                      <h3 className="text-lg font-semibold text-[#001C35]">{product.name}</h3>
                    </div>
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-[#001C35]/45">
                      {product.industry}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm leading-relaxed text-[#001C35]/70">{product.summary}</p>
                    <ul className="mt-4 space-y-2">
                      {product.outcomes.map((outcome) => (
                        <li key={outcome} className="flex gap-2 text-sm leading-snug text-[#001C35]/80">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[#001C35]" />
                          {outcome}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-5">
                    {product.modules.map((mod) => (
                      <div key={mod.name}>
                        <p className="text-sm font-semibold text-[#001C35]">{mod.name}</p>
                        <p className="mt-1 text-sm leading-relaxed text-[#001C35]/60">{mod.summary}</p>
                        <p className="mt-2 text-xs leading-relaxed text-[#001C35]/45">
                          {mod.capabilities.join(" · ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Travel deep-dive */}
      <section className="border-b border-[#001C35]/10 bg-[#F8F9FB]">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[0.85fr_1.15fr] md:py-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0A4A6E]">
              Travel product
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#001C35] sm:text-4xl">
              Retail desk, trade, corporate and digital — one Travel product
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#001C35]/65">{travel.summary}</p>
          </div>
          <ol className="divide-y divide-[#001C35]/10 border-y border-[#001C35]/10 bg-white px-5">
            {travel.modules.map((mod, i) => (
              <li key={mod.name} className="grid gap-2 py-5 sm:grid-cols-[3rem_1fr] sm:gap-4">
                <span className="font-mono text-sm tabular-nums text-[#0A4A6E]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-semibold text-[#001C35]">{mod.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#001C35]/65">{mod.summary}</p>
                  <p className="mt-2 text-xs text-[#001C35]/45">{mod.capabilities.join(" · ")}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0A4A6E]">
              Engagement
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#001C35] sm:text-4xl">
              Review the platform with your operating companies in scope
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#001C35]/65">
              A structured demonstration covers tenant setup, Module Access, Travel channels, Finance
              postings and the shared Administration layer — using the same application the business
              will run.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              nativeButton={false}
              render={<Link href="/contact" />}
              size="lg"
              className="rounded-none bg-[#001C35] px-6 text-white hover:bg-[#0A4A6E]"
            >
              Schedule demonstration
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/register" />}
              size="lg"
              variant="outline"
              className="rounded-none border-[#001C35]/25 text-[#001C35] hover:bg-[#F8F9FB]"
            >
              Create trial tenant
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
