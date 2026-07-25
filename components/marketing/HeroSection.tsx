import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAAS_BRAND } from "@/config/saasBrand";

export function HeroSection({ moduleCount }: { moduleCount: number }) {
  return (
    <section className="relative isolate min-h-[92vh] overflow-hidden bg-slate-950 text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(45,212,191,0.22),transparent_50%),radial-gradient(ellipse_at_80%_10%,rgba(14,165,233,0.18),transparent_45%),radial-gradient(ellipse_at_70%_80%,rgba(15,118,110,0.25),transparent_40%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-y-0 end-0 hidden w-[48%] lg:block" aria-hidden>
        <svg className="h-full w-full opacity-40" viewBox="0 0 640 720" fill="none">
          <path
            d="M80 520 C180 420, 260 380, 340 300 S520 140, 600 80"
            stroke="rgba(45,212,191,0.55)"
            strokeWidth="2"
            strokeDasharray="6 10"
            className="motion-safe:animate-[ts-route_20s_linear_infinite]"
          />
          <path
            d="M40 200 C160 240, 240 320, 320 400 S480 560, 600 620"
            stroke="rgba(56,189,248,0.35)"
            strokeWidth="1.5"
            strokeDasharray="4 12"
          />
          <circle cx="340" cy="300" r="6" fill="#2dd4bf" className="motion-safe:animate-pulse" />
          <circle cx="180" cy="450" r="4" fill="#38bdf8" />
          <circle cx="520" cy="160" r="5" fill="#5eead4" />
          <circle cx="480" cy="540" r="4" fill="#7dd3fc" />
        </svg>
      </div>

      <div className="relative mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-center px-6 pb-20 pt-28">
        <p className="animate-in fade-in slide-in-from-bottom-2 text-sm font-medium tracking-wide text-teal-300 duration-700">
          Multi-vertical SaaS · Standard subscription
        </p>
        <h1 className="mt-4 max-w-3xl animate-in fade-in slide-in-from-bottom-3 text-4xl font-semibold leading-[1.08] tracking-tight duration-700 sm:text-6xl">
          {SAAS_BRAND.name}
        </h1>
        <p className="mt-3 max-w-2xl animate-in fade-in slide-in-from-bottom-4 text-xl font-medium text-white/90 duration-700 sm:text-2xl">
          {SAAS_BRAND.tagline}
        </p>
        <p className="mt-5 max-w-xl animate-in fade-in slide-in-from-bottom-5 text-base leading-relaxed text-slate-300 duration-700">
          One platform for travel ERP, B2C OTA, real-estate buy & rent, CRM, and branded mobile apps
          (B2C, B2B, CBT). Subscribe only to the modules your holding needs — then expand as you grow.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <Button
            nativeButton={false}
            render={<Link href="/register" />}
            size="lg"
            className="bg-teal-400 text-slate-950 hover:bg-teal-300"
          >
            Start subscription trial
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            nativeButton={false}
            render={<a href="#modules" />}
            size="lg"
            variant="outline"
            className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Browse {moduleCount} modules
          </Button>
        </div>

        <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/10 pt-8 text-sm animate-in fade-in duration-1000">
          <div>
            <dt className="text-slate-400">Modules</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{moduleCount}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Trial</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">14 days</dd>
          </div>
          <div>
            <dt className="text-slate-400">Verticals</dt>
            <dd className="mt-1 text-2xl font-semibold">Travel + Property</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
