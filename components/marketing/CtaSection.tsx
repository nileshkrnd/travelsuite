import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAAS_BRAND } from "@/config/saasBrand";

export function CtaSection() {
  return (
    <section className="relative isolate overflow-hidden bg-slate-950 py-20 text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(45,212,191,0.2),transparent_60%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Ready to run travel and property on one stack?
        </h2>
        <p className="mt-4 text-base text-slate-300">
          Register a {SAAS_BRAND.name} tenant, pick your modules, and start a 14-day trial — standard
          SaaS subscription, no credit card in this prototype.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            nativeButton={false}
            render={<Link href="/register" />}
            size="lg"
            className="bg-teal-400 text-slate-950 hover:bg-teal-300"
          >
            Create tenant account
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/login" />}
            size="lg"
            variant="outline"
            className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Sign in to existing workspace
          </Button>
        </div>
      </div>
    </section>
  );
}
