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
  flight: "flight",
  hotel: "hotel",
  transfer: "transfer",
  rail: "rail",
  insurance: "insurance",
  "payment-gateway": "paymentGateway",
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
            <div className="flex h-12 w-12 items-center justify-center border border-[#001C35]/15 bg-[#F8F9FB] text-[#001C35]">
              {Icon && <Icon className="h-5 w-5" />}
            </div>
            <p className="mt-6 text-lg font-medium text-[#001C35]/80">{product.tagline}</p>
            <ul className="mt-8 space-y-3">
              {product.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#001C35]/85">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0A4A6E]" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button
                nativeButton={false}
                render={<Link href="/register?modules=api" />}
                className="rounded-none bg-[#001C35] text-white hover:bg-[#0A4A6E]"
              >
                Enable in trial
              </Button>
              <Button
                nativeButton={false}
                render={<Link href="/contact" />}
                variant="outline"
                className="rounded-none border-[#001C35]/25 text-[#001C35]"
              >
                Request sandbox
              </Button>
            </div>
          </div>
          <aside className="border border-[#001C35]/10 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#001C35]/45">
              Related APIs
            </p>
            <ul className="mt-4 space-y-3">
              {others.map((p) => (
                <li key={p.id}>
                  <Link href={p.href} className="text-sm font-medium text-[#0A4A6E] hover:underline">
                    {p.shortName}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/api" className="text-sm text-[#001C35]/55 hover:text-[#001C35]">
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
