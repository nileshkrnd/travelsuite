"use client";

import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SAAS_BRAND } from "@/config/saasBrand";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#modules", label: "Modules" },
  { href: "#pricing", label: "Pricing" },
  { href: "#how-it-works", label: "How it works" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-40">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-base font-semibold tracking-tight text-white">
          {SAAS_BRAND.name}
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            nativeButton={false}
            render={<Link href="/login" />}
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
          >
            Sign in
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/register" />}
            className="bg-teal-400 text-slate-950 hover:bg-teal-300"
          >
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <div
        className={cn(
          "border-t border-white/10 bg-slate-950/95 px-6 py-4 backdrop-blur md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <div className="flex flex-col gap-3">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="text-sm text-white/80"
            >
              {item.label}
            </a>
          ))}
          <Link href="/login" className="text-sm text-white/80" onClick={() => setOpen(false)}>
            Sign in
          </Link>
          <Button nativeButton={false} render={<Link href="/register" />} className="bg-teal-400 text-slate-950">
            Start free trial
          </Button>
        </div>
      </div>
    </header>
  );
}
