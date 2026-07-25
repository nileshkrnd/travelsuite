import { SAAS_BRAND } from "@/config/saasBrand";

const STEPS = [
  {
    step: "01",
    title: "Register your organization",
    body: `Create a ${SAAS_BRAND.name} tenant with company profile, admin contact, and holding group.`,
  },
  {
    step: "02",
    title: "Pick modules & plan",
    body: "Choose travel ERP, CRM, B2C OTA, mobile apps, buy/rent property, and more — only what you need.",
  },
  {
    step: "03",
    title: "Start your trial",
    body: "Get a sandbox workspace in minutes. Configure companies and users, then go live on a standard subscription.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-teal-700 dark:text-teal-400">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            From signup to live workspace in three steps.
          </h2>
        </div>

        <ol className="mt-14 grid gap-10 md:grid-cols-3">
          {STEPS.map((item, index) => (
            <li key={item.step} className="relative">
              {index < STEPS.length - 1 && (
                <div
                  className="pointer-events-none absolute top-5 start-[3.25rem] hidden h-px w-[calc(100%-1rem)] bg-border md:block"
                  aria-hidden
                />
              )}
              <p className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-400">
                {item.step}
              </p>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
