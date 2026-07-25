import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { MarketingPageHero } from "@/components/marketing/MarketingShell";
import { SAAS_BRAND } from "@/config/saasBrand";
import { API_PRODUCTS, type ApiProductId } from "@/config/marketingContent";
import { Button } from "@/components/ui/button";
import { ICONS } from "@/lib/icon-registry";

const SLUG_TO_ID: Record<string, ApiProductId> = {
  gds: "gds",
  ndc: "ndc",
  lcc: "lcc",
  "third-party": "thirdParty",
  "hotel-mapping": "hotelMapping",
};

export function generateStaticParams() {
  return Object.keys(SLUG_TO_ID).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = API_PRODUCTS.find((p) => p.id === SLUG_TO_ID[slug]);
  if (!product) return { title: `API — ${SAAS_BRAND.name}` };
  return {
    title: `${product.name} — ${SAAS_BRAND.name}`,
    description: product.description,
  };
}

export default async function ApiProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = SLUG_TO_ID[slug];
  const product = API_PRODUCTS.find((p) => p.id === id);
  if (!product) notFound();
  const Icon = ICONS[product.icon];
  const others = API_PRODUCTS.filter((p) => p.id !== product.id);

  return (
    <>
      <MarketingPageHero eyebrow="API" title={product.name} description={product.description} />
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a1814] text-[#f6f3ee]">
              {Icon && <Icon className="h-5 w-5" />}
            </div>
            <p className="mt-6 text-lg font-medium text-[#1a1814]/80">{product.tagline}</p>
            <ul className="mt-8 space-y-3">
              {product.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#c45c26]" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button
                nativeButton={false}
                render={<Link href="/register?modules=api" />}
                className="rounded-full bg-[#c45c26] text-white hover:bg-[#a94c1d]"
              >
                Enable in trial
              </Button>
              <Button
                nativeButton={false}
                render={<Link href="/contact" />}
                variant="outline"
                className="rounded-full border-[#1a1814]/20"
              >
                Request sandbox
              </Button>
            </div>
          </div>
          <aside className="rounded-2xl border border-[#1a1814]/10 bg-white/50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1a1814]/45">
              Related APIs
            </p>
            <ul className="mt-4 space-y-3">
              {others.map((p) => (
                <li key={p.id}>
                  <Link href={p.href} className="text-sm font-medium text-[#c45c26] hover:underline">
                    {p.shortName} — {p.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/api" className="text-sm text-[#1a1814]/60 hover:text-[#1a1814]">
                  ← All APIs
                </Link>
              </li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}
