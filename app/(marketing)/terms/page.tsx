import type { Metadata } from "next";
import { MarketingPageHero } from "@/components/marketing/MarketingShell";
import { SAAS_BRAND } from "@/config/saasBrand";

export const metadata: Metadata = {
  title: `Terms & conditions — ${SAAS_BRAND.name}`,
  description: `Terms governing use of the ${SAAS_BRAND.name} platform (prototype copy).`,
};

const SECTIONS = [
  {
    title: "1. Agreement",
    body: `By accessing ${SAAS_BRAND.name} (the “Service”), you agree to these Terms on behalf of your organization. If you do not agree, do not use the Service. This page is prototype legal copy for UI review — not binding counsel.`,
  },
  {
    title: "2. Subscriptions & modules",
    body: "Access is granted per tenant under a subscription plan. Modules may be included or added à la carte. Fees, trials, and renewals are described at checkout or in your order form.",
  },
  {
    title: "3. Acceptable use",
    body: "You may not misuse the Service, reverse engineer it except where permitted by law, or use it to violate travel, consumer, or data regulations applicable to your markets.",
  },
  {
    title: "4. Customer data",
    body: "You retain rights to data you submit. We process it to provide the Service as described in our Privacy Policy. You are responsible for lawful collection of passenger and customer data.",
  },
  {
    title: "5. APIs & credentials",
    body: "API keys, GDS/NDC credentials, and sandbox environments are confidential. You are responsible for activity under your keys and for complying with upstream supplier terms.",
  },
  {
    title: "6. Limitation of liability",
    body: "To the extent permitted by law, the Service is provided “as is” for this prototype. Production agreements will include negotiated SLAs and liability caps.",
  },
  {
    title: "7. Contact",
    body: `Questions about these Terms: ${SAAS_BRAND.supportEmail}.`,
  },
];

export default function TermsPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Legal"
        title="Terms & conditions"
        description={`Last updated ${new Date().toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })} · Prototype copy for stakeholder review.`}
      />
      <section className="mx-auto max-w-2xl space-y-8 px-4 py-14 sm:px-6 sm:py-16">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-lg font-semibold tracking-tight">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#1a1814]/70">{s.body}</p>
          </div>
        ))}
      </section>
    </>
  );
}
