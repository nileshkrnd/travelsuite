"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Mail, MapPin, Phone } from "lucide-react";
import { SAAS_BRAND } from "@/config/saasBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 600));
    setSending(false);
    toast.success("Message received — we'll reply within one business day (prototype).");
    e.currentTarget.reset();
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-6">
        <ContactRow icon={Mail} label="Email" value={SAAS_BRAND.salesEmail} href={`mailto:${SAAS_BRAND.salesEmail}`} />
        <ContactRow icon={Phone} label="Phone" value={SAAS_BRAND.phone} href={`tel:${SAAS_BRAND.phone.replace(/\s/g, "")}`} />
        <ContactRow icon={MapPin} label="Office" value={SAAS_BRAND.address} />
        <p className="text-sm text-[#1a1814]/60">
          Prefer self-serve?{" "}
          <Link href="/register" className="font-medium text-[#c45c26] hover:underline">
            Start a trial
          </Link>{" "}
          or{" "}
          <Link href="/login" className="font-medium text-[#c45c26] hover:underline">
            sign in
          </Link>
          .
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[#1a1814]/10 bg-white/60 p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Full name" required />
          <Field id="email" label="Work email" type="email" required />
        </div>
        <Field id="company" label="Organization / holding" required />
        <div className="space-y-2">
          <Label htmlFor="message">How can we help?</Label>
          <Textarea
            id="message"
            name="message"
            required
            rows={5}
            className="bg-white"
            placeholder="Modules of interest, timeline, regions…"
          />
        </div>
        <Button type="submit" disabled={sending} className="rounded-full bg-[#c45c26] text-white hover:bg-[#a94c1d]">
          {sending ? "Sending…" : "Send message"}
        </Button>
      </form>
    </section>
  );
}

function Field({
  id,
  label,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} required={required} className="bg-white" />
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1814]/5">
        <Icon className="h-4 w-4 text-[#c45c26]" />
      </span>
      <span>
        <span className="block text-xs uppercase tracking-[0.12em] text-[#1a1814]/45">{label}</span>
        <span className="mt-0.5 block text-sm font-medium">{value}</span>
      </span>
    </>
  );
  if (href) {
    return (
      <a href={href} className="flex items-center gap-3 rounded-xl p-1 transition-colors hover:bg-[#1a1814]/[0.03]">
        {inner}
      </a>
    );
  }
  return <div className="flex items-center gap-3 p-1">{inner}</div>;
}
