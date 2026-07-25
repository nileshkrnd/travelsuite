import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SAAS_BRAND } from "@/config/saasBrand";
import { API_PRODUCTS, BLOG_POSTS } from "@/config/marketingContent";
import { SAAS_MODULES, SAAS_PLANS } from "@/config/saasCatalog";
import { Button } from "@/components/ui/button";
import { ICONS } from "@/lib/icon-registry";

export const metadata: Metadata = {
  title: `${SAAS_BRAND.name} — Travel, property & partner SaaS`,
  description: SAAS_BRAND.description,
};

export default function HomePage() {
  const featuredModules = SAAS_MODULES.filter((m) =>
    ["sales", "operations", "b2cOta", "crm", "propertyBuy", "api", "paymentGateway", "fleetManagement"].includes(
      m.id
    )
  );

  return (
    <>
      {/* Hero — brand-first, full-bleed dark plane */}
      <section className="relative -mt-[4.25rem] min-h-[100svh] overflow-hidden bg-[#1a1814] text-[#f6f3ee]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 50% at 10% 20%, rgba(196,92,38,0.35), transparent), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(232,168,124,0.12), transparent)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#f6f3ee 1px, transparent 1px), linear-gradient(90deg, #f6f3ee 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
          aria-hidden
        />

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-16 pt-32 sm:px-6 sm:pb-24">
          <p className="animate-in fade-in slide-in-from-bottom-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#e8a87c] duration-700">
            Modular SaaS for holdings
          </p>
          <h1 className="mt-5 max-w-[14ch] animate-in fade-in slide-in-from-bottom-3 text-[clamp(2.75rem,8vw,5.5rem)] font-semibold leading-[0.95] tracking-tight duration-700">
            {SAAS_BRAND.name}
          </h1>
          <p className="mt-6 max-w-xl animate-in fade-in slide-in-from-bottom-4 text-lg leading-relaxed text-[#f6f3ee]/72 duration-700 sm:text-xl">
            {SAAS_BRAND.tagline} POS, mid office, OTA, property, payments, and APIs — subscribe by
            module.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <Button
              nativeButton={false}
              render={<Link href="/register" />}
              size="lg"
              className="rounded-full bg-[#c45c26] px-6 text-white hover:bg-[#a94c1d]"
            >
              Start 14-day trial
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/products" />}
              size="lg"
              variant="outline"
              className="rounded-full border-[#f6f3ee]/25 bg-transparent text-[#f6f3ee] hover:bg-[#f6f3ee]/10 hover:text-white"
            >
              View products
            </Button>
          </div>
        </div>
      </section>

      {/* One job: what we cover */}
      <section className="border-b border-[#1a1814]/10">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.2fr] md:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c45c26]">Coverage</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for groups that run more than one desk.
            </h2>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              ["Travel ERP", "POS, mid office, back office, HRMS, accounts"],
              ["Digital", "B2C OTA, B2C / B2B / CBT mobile apps"],
              ["Property", "Buy and rent property under the same tenant"],
              ["Platform", "GDS, NDC, LCC, hotel mapping, payments, API"],
            ].map(([title, body]) => (
              <li key={title} className="border-t border-[#1a1814]/15 pt-4">
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#1a1814]/65">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Products strip */}
      <section className="border-b border-[#1a1814]/10 bg-[#efeae2]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c45c26]">Products</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Modules you can subscribe to</h2>
            </div>
            <Link href="/products" className="inline-flex items-center gap-1 text-sm font-medium text-[#c45c26]">
              All products <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[#1a1814]/10 bg-[#1a1814]/10 sm:grid-cols-2 lg:grid-cols-4">
            {featuredModules.map((mod) => {
              const Icon = ICONS[mod.icon];
              return (
                <Link
                  key={mod.id}
                  href="/products"
                  className="group bg-[#f6f3ee] p-5 transition-colors hover:bg-white"
                >
                  {Icon && <Icon className="h-5 w-5 text-[#c45c26]" />}
                  <p className="mt-4 text-sm font-semibold">{mod.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#1a1814]/60">{mod.tagline}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* API */}
      <section className="border-b border-[#1a1814]/10">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c45c26]">API</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                GDS, NDC, LCC, and hotel identity — one integration desk.
              </h2>
            </div>
            <Link href="/api" className="inline-flex items-center gap-1 text-sm font-medium text-[#c45c26]">
              API overview <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {API_PRODUCTS.map((api) => (
              <Link
                key={api.id}
                href={api.href}
                className="min-w-[220px] shrink-0 rounded-2xl border border-[#1a1814]/12 bg-white/60 p-5 transition-transform hover:-translate-y-0.5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c45c26]">
                  {api.shortName}
                </p>
                <p className="mt-3 font-semibold">{api.name}</p>
                <p className="mt-2 text-sm text-[#1a1814]/65">{api.tagline}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing peek */}
      <section className="border-b border-[#1a1814]/10 bg-[#1a1814] text-[#f6f3ee]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e8a87c]">Subscription</p>
          <h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight">
            Standard plans. Add modules when you need them.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {SAAS_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 ${
                  plan.popular ? "border-[#c45c26] bg-[#241f1a]" : "border-white/10 bg-transparent"
                }`}
              >
                <p className="font-semibold">{plan.name}</p>
                <p className="mt-4 text-3xl font-semibold tabular-nums">
                  ${plan.monthlyPrice}
                  <span className="text-sm font-normal text-[#f6f3ee]/50">/mo</span>
                </p>
                <p className="mt-3 text-sm text-[#f6f3ee]/60">{plan.description}</p>
                <Link
                  href={`/register?plan=${plan.id}`}
                  className="mt-6 inline-flex text-sm font-medium text-[#e8a87c] hover:text-white"
                >
                  Choose {plan.name} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c45c26]">Blogs</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Notes from the product floor</h2>
            </div>
            <Link href="/blogs" className="inline-flex items-center gap-1 text-sm font-medium text-[#c45c26]">
              All posts <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 divide-y divide-[#1a1814]/10 border-y border-[#1a1814]/10">
            {BLOG_POSTS.slice(0, 3).map((post) => (
              <Link
                key={post.slug}
                href={`/blogs/${post.slug}`}
                className="grid gap-2 py-6 transition-colors hover:bg-[#1a1814]/[0.03] sm:grid-cols-[140px_1fr_auto] sm:items-baseline sm:gap-8"
              >
                <span className="text-xs text-[#1a1814]/45">
                  {new Date(post.date).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span>
                  <span className="font-semibold">{post.title}</span>
                  <span className="mt-1 block text-sm text-[#1a1814]/60">{post.excerpt}</span>
                </span>
                <span className="text-xs font-medium text-[#c45c26]">{post.category}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
