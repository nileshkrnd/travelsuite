import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Building2, Plane, Wrench, BedDouble } from "lucide-react";

const GROUP_NAME = "Nilesh Group Holding";

export const metadata: Metadata = {
  title: GROUP_NAME,
  description:
    "A diversified group building trusted, service-led businesses across travel, real estate, facilities management, and hospitality.",
};

const VERTICALS = [
  {
    name: "Travel",
    icon: Plane,
    accent: "bg-blue-500/10 text-blue-600",
    description:
      "End-to-end travel management for agencies, corporates, and suppliers — bookings, inventory, and billing in one platform.",
  },
  {
    name: "Real Estate",
    icon: Building2,
    accent: "bg-emerald-500/10 text-emerald-600",
    description:
      "Property development, leasing, and asset management across residential and commercial portfolios.",
  },
  {
    name: "Facilities Management",
    icon: Wrench,
    accent: "bg-amber-500/10 text-amber-600",
    description:
      "Integrated facilities and maintenance services that keep buildings and operations running smoothly.",
  },
  {
    name: "Hospitality",
    icon: BedDouble,
    accent: "bg-rose-500/10 text-rose-600",
    description:
      "Hotels and guest experiences built on consistent service standards and operational excellence.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="relative isolate overflow-hidden bg-slate-950">
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />

        <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <span className="text-sm font-semibold tracking-tight text-white">{GROUP_NAME}</span>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-white/90"
          >
            Sign in
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-16 sm:pb-32 sm:pt-24">
          <p className="text-sm font-medium text-blue-400">Multi-industry holding group</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl">
            {GROUP_NAME}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            A diversified group building trusted, service-led businesses across travel, real
            estate, facilities management, and hospitality.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-400"
            >
              Sign in to your workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-background">
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <h2 className="text-sm font-medium text-muted-foreground">Our businesses</h2>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Four industries, one group.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {VERTICALS.map(({ name, icon: Icon, accent, description }) => (
              <div
                key={name}
                className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">{name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {GROUP_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
