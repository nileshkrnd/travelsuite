import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { SAAS_PLANS } from "@/config/saasCatalog";
import { SAAS_BRAND } from "@/config/saasBrand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20 border-y border-border bg-muted/30 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Standard subscription</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Clear plans. Module-level control.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            {SAAS_BRAND.name} uses standard SaaS tiers. Start with Starter or Growth, then add B2C
            Mobile, CBT Mobile, Buy/Rent Property, or any other module. 14-day trial on every plan.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {SAAS_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6 sm:p-8",
                plan.popular ? "border-teal-600 shadow-lg shadow-teal-900/5" : "border-border"
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 start-6 rounded-full bg-teal-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">
                  ${plan.monthlyPrice}
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.highlights.map((item) => (
                  <li key={item} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                nativeButton={false}
                render={<Link href={`/register?plan=${plan.id}`} />}
                className={cn(
                  "mt-8 w-full",
                  plan.popular
                    ? "bg-teal-700 text-white hover:bg-teal-600"
                    : "bg-foreground text-background hover:bg-foreground/90"
                )}
              >
                Choose {plan.name}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
