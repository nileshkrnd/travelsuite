import type { Metadata } from "next";
import { MarketingPageHero } from "@/components/marketing/MarketingShell";
import { SAAS_BRAND } from "@/config/saasBrand";
import { ContactForm } from "@/components/marketing/ContactForm";

export const metadata: Metadata = {
  title: `Contact us — ${SAAS_BRAND.name}`,
  description: "Sales, partnerships, and support for Klyra holdings.",
};

export default function ContactPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Contact us"
        title="Tell us what you're running. We'll map the modules."
        description={`Sales, partnerships, and support — one inbox for holdings evaluating ${SAAS_BRAND.name}.`}
      />
      <ContactForm />
    </>
  );
}
