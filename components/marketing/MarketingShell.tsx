"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { SAAS_BRAND } from "@/config/saasBrand";
import { API_PRODUCTS } from "@/config/marketingContent";
import { Button } from "@/components/ui/button";
import { GoToTopButton } from "@/components/marketing/GoToTopButton";
import { BrandHomeLink } from "@/components/layout/BrandHomeLink";
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
    <div className="marketing-shell flex min-h-dvh flex-col bg-[#F8F9FB] text-[#001C35]">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingSiteFooter />
      <GoToTopButton />
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

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-[#001C35]/10 bg-white transition-shadow duration-300",
        scrolled || open ? "shadow-sm" : "shadow-none"
      )}
    >
      <nav className="mx-auto flex h-[4.25rem] max-w-6xl items-center gap-4 px-4 sm:px-6">
        <BrandHomeLink
          className="flex min-w-0 shrink-0 items-center gap-3"
          ariaLabel={SAAS_BRAND.name}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SAAS_BRAND.logoUrl}
            alt={SAAS_BRAND.groupName}
            className="hidden h-10 w-auto object-contain object-left md:block"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SAAS_BRAND.faviconUrl}
            alt={SAAS_BRAND.groupName}
            className="h-9 w-9 object-contain md:hidden"
          />
          <span className="hidden h-8 w-px bg-[#001C35]/15 lg:block" aria-hidden />
          <span className="hidden flex-col leading-tight lg:flex">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#001C35]">
              Nexus
            </span>
            <span className="text-[10px] text-[#001C35]/50">Platform</span>
          </span>
        </BrandHomeLink>

        <div className="ms-auto hidden items-center gap-0.5 xl:flex">
          {PRIMARY_NAV.map((item) =>
            item.children ? (
              <div key={item.href} className="relative">
                <button
                  type="button"
                  onClick={() => setApiOpen((v) => !v)}
                  onMouseEnter={() => setApiOpen(true)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/api")
                      ? "bg-[#001C35]/08 text-[#001C35]"
                      : "text-[#001C35]/75 hover:bg-[#001C35]/05 hover:text-[#001C35]"
                  )}
                >
                  {item.label}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", apiOpen && "rotate-180")} />
                </button>
                {apiOpen && (
                  <div
                    className="absolute start-0 top-full z-50 mt-1 w-64 border border-[#001C35]/10 bg-white p-1.5 text-[#001C35] shadow-lg"
                    onMouseLeave={() => setApiOpen(false)}
                  >
                    <Link
                      href="/api"
                      className="block px-3 py-2 text-sm font-medium hover:bg-[#F8F9FB]"
                    >
                      API overview
                    </Link>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-3 py-2 text-sm text-[#001C35]/75 hover:bg-[#F8F9FB] hover:text-[#001C35]"
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
                  "rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-[#001C35]/08 text-[#001C35]"
                    : "text-[#001C35]/75 hover:bg-[#001C35]/05 hover:text-[#001C35]"
                )}
              >
                {item.label}
              </Link>
            )
          )}
        </div>

        <div className="hidden items-center gap-2 xl:flex">
          <Link
            href="/login"
            className="px-2.5 py-2 text-sm font-medium text-[#001C35]/75 transition-colors hover:text-[#001C35]"
          >
            Sign in
          </Link>
          <Button
            nativeButton={false}
            render={<Link href="/contact" />}
            className="rounded-none bg-[#001C35] px-4 text-white hover:bg-[#0A4A6E]"
          >
            Book demo
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <button
          type="button"
          className="ms-auto inline-flex h-10 w-10 items-center justify-center border border-[#001C35]/20 text-[#001C35] xl:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-[#001C35]/10 bg-white px-4 py-4 text-[#001C35] xl:hidden">
          <div className="flex flex-col gap-0.5">
            {PRIMARY_NAV.map((item) => (
              <div key={item.href}>
                <Link href={item.href} className="block px-3 py-2.5 text-sm font-medium hover:bg-[#F8F9FB]">
                  {item.label}
                </Link>
                {item.children && (
                  <div className="ms-3 border-s border-[#001C35]/10 ps-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-2 py-2 text-sm text-[#001C35]/70 hover:bg-[#F8F9FB]"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-[#001C35]/10 pt-3">
              <Link href="/login" className="px-3 py-2.5 text-sm font-medium hover:bg-[#F8F9FB]">
                Sign in
              </Link>
              <Button
                nativeButton={false}
                render={<Link href="/contact" />}
                className="rounded-none bg-[#001C35] text-white hover:bg-[#0A4A6E]"
              >
                Book demo
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
    <footer className="border-t border-[#001C35]/10 bg-white text-[#001C35]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <BrandHomeLink className="inline-flex" ariaLabel={SAAS_BRAND.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SAAS_BRAND.logoUrl}
              alt={SAAS_BRAND.groupName}
              className="h-11 w-auto object-contain object-left"
            />
          </BrandHomeLink>
          <p className="mt-4 text-sm font-semibold tracking-tight">{SAAS_BRAND.name}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#001C35]/60">{SAAS_BRAND.tagline}</p>
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
      <div className="border-t border-[#001C35]/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-[#001C35]/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#001C35]/45">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-[#001C35]/70 transition-colors hover:text-[#001C35]"
            >
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
    <section className="border-b border-[#001C35]/10 bg-white text-[#001C35]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A4A6E]">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl sm:leading-[1.15]">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#001C35]/65 sm:text-lg">
          {description}
        </p>
      </div>
    </section>
  );
}
