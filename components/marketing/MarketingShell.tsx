"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { SAAS_BRAND } from "@/config/saasBrand";
import { API_PRODUCTS } from "@/config/marketingContent";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { href: "/products", label: "Products" },
  { href: "/api", label: "API", children: API_PRODUCTS.map((p) => ({ href: p.href, label: p.shortName })) },
  { href: "/partners", label: "Partners" },
  { href: "/blogs", label: "Blogs" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-shell flex min-h-dvh flex-col bg-[#f6f3ee] text-[#1a1814]">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingSiteFooter />
    </div>
  );
}

function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setApiOpen(false);
  }, [pathname]);

  const onDarkHero = pathname === "/";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background,box-shadow,backdrop-filter] duration-300",
        onDarkHero && !scrolled && !open
          ? "bg-transparent text-white"
          : "border-b border-[#1a1814]/10 bg-[#f6f3ee]/90 text-[#1a1814] shadow-sm backdrop-blur-md"
      )}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SAAS_BRAND.faviconUrl}
            alt=""
            className={cn(
              "h-8 w-8 rounded-md object-contain p-0.5",
              onDarkHero && !scrolled && !open ? "bg-white/95" : "bg-white"
            )}
          />
          <span className="text-lg font-semibold tracking-tight">{SAAS_BRAND.name}</span>
          <span
            className={cn(
              "hidden text-[10px] font-medium uppercase tracking-[0.14em] sm:inline",
              onDarkHero && !scrolled && !open ? "text-white/50" : "text-[#1a1814]/45"
            )}
          >
            platform
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {PRIMARY_NAV.map((item) =>
            item.children ? (
              <div key={item.href} className="relative">
                <button
                  type="button"
                  onClick={() => setApiOpen((v) => !v)}
                  onMouseEnter={() => setApiOpen(true)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/api")
                      ? "opacity-100"
                      : "opacity-70 hover:opacity-100"
                  )}
                >
                  {item.label}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", apiOpen && "rotate-180")} />
                </button>
                {apiOpen && (
                  <div
                    className="absolute start-0 top-full z-50 mt-1 w-56 rounded-xl border border-[#1a1814]/10 bg-[#f6f3ee] p-1.5 text-[#1a1814] shadow-lg"
                    onMouseLeave={() => setApiOpen(false)}
                  >
                    <Link
                      href="/api"
                      className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-[#1a1814]/5"
                    >
                      API overview
                    </Link>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block rounded-lg px-3 py-2 text-sm text-[#1a1814]/75 hover:bg-[#1a1814]/5 hover:text-[#1a1814]"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-opacity",
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "opacity-100"
                    : "opacity-70 hover:opacity-100"
                )}
              >
                {item.label}
              </Link>
            )
          )}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className={cn(
              "px-3 py-2 text-sm font-medium opacity-80 hover:opacity-100",
              onDarkHero && !scrolled ? "text-white" : "text-[#1a1814]"
            )}
          >
            Sign in
          </Link>
          <Button
            nativeButton={false}
            render={<Link href="/register" />}
            className="rounded-full bg-[#c45c26] px-4 text-white hover:bg-[#a94c1d]"
          >
            Start trial
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-current/15 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-[#1a1814]/10 bg-[#f6f3ee] px-4 py-4 text-[#1a1814] lg:hidden">
          <div className="flex flex-col gap-1">
            {PRIMARY_NAV.map((item) => (
              <div key={item.href}>
                <Link href={item.href} className="block rounded-lg px-3 py-2.5 text-sm font-medium">
                  {item.label}
                </Link>
                {item.children && (
                  <div className="ms-3 border-s border-[#1a1814]/10 ps-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block rounded-lg px-2 py-2 text-sm text-[#1a1814]/70"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-[#1a1814]/10 pt-3">
              <Link href="/login" className="rounded-lg px-3 py-2.5 text-sm font-medium">
                Sign in
              </Link>
              <Button
                nativeButton={false}
                render={<Link href="/register" />}
                className="rounded-full bg-[#c45c26] text-white hover:bg-[#a94c1d]"
              >
                Start trial
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MarketingSiteFooter() {
  return (
    <footer className="border-t border-[#1a1814]/10 bg-[#1a1814] text-[#f6f3ee]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <p className="text-lg font-semibold tracking-tight">{SAAS_BRAND.name}</p>
          <p className="mt-3 text-sm leading-relaxed text-[#f6f3ee]/65">{SAAS_BRAND.tagline}</p>
        </div>
        <FooterCol
          title="Product"
          links={[
            { href: "/products", label: "Products" },
            { href: "/api", label: "API" },
            { href: "/register", label: "Pricing / Trial" },
            { href: "/partners", label: "Partners" },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { href: "/about", label: "About us" },
            { href: "/blogs", label: "Blogs" },
            { href: "/contact", label: "Contact us" },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { href: "/terms", label: "Terms & conditions" },
            { href: "/privacy", label: "Privacy policy" },
          ]}
        />
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-[#f6f3ee]/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {SAAS_BRAND.legalName}. All rights reserved.
          </p>
          <p>{SAAS_BRAND.domainHint}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f6f3ee]/45">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-[#f6f3ee]/75 transition-colors hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketingPageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="border-b border-[#1a1814]/10 bg-[#1a1814] text-[#f6f3ee]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e8a87c]">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.1]">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#f6f3ee]/70 sm:text-lg">{description}</p>
      </div>
    </section>
  );
}
