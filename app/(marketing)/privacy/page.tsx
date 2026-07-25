import type { Metadata } from "next";
import { MarketingPageHero } from "@/components/marketing/MarketingShell";
import { SAAS_BRAND } from "@/config/saasBrand";

export const metadata: Metadata = {
  title: `Privacy policy — ${SAAS_BRAND.name}`,
  description: `How ${SAAS_BRAND.name} handles personal and booking data (prototype copy).`,
};

const SECTIONS = [
  {
    title: "1. Who we are",
    body: `${SAAS_BRAND.legalName} (“we”) provides the ${SAAS_BRAND.name} platform. Contact: ${SAAS_BRAND.supportEmail}. This Privacy Policy is prototype copy for UI review.`,
  },
  {
    title: "2. Data we process",
    body: "Account data (name, email, organization), booking and passenger details you enter, usage logs, payment metadata via PSPs, and support communications.",
  },
  {
    title: "3. Why we process it",
    body: "To provide the Service, authenticate users, process bookings and payments, improve reliability, meet legal obligations, and respond to support requests.",
  },
  {
    title: "4. Sharing",
    body: "We share data with subprocessors (hosting, email, PSPs) and with travel/property suppliers you configure (GDS, NDC, hotels) as needed to fulfill bookings. We do not sell personal data.",
  },
  {
    title: "5. Retention & security",
    body: "We retain data for the life of your tenant plus legal retention periods. We apply industry-standard access controls; production security details appear in your DPA.",
  },
  {
    title: "6. Your rights",
    body: "Depending on your region, you may request access, correction, deletion, or portability. Contact your tenant admin or email us at the address above.",
  },
  {
    title: "7. Updates",
    body: "We may update this Policy; material changes will be posted on this page with a revised date.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Legal"
        title="Privacy policy"
        description={`Last updated ${new Date().toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })} · How we handle data across travel and property desks.`}
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
