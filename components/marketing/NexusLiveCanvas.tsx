"use client";

import { useEffect, useState } from "react";
import { NEXUS_KPIS, NEXUS_LIVE_EVENTS, NEXUS_PRODUCTS } from "@/config/nexusCatalog";
import { SAAS_BRAND } from "@/config/saasBrand";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function useLiveFeed() {
  const [index, setIndex] = useState(0);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % NEXUS_LIVE_EVENTS.length);
      setPulse((p) => p + 1);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  const visible = [
    NEXUS_LIVE_EVENTS[index]!,
    NEXUS_LIVE_EVENTS[(index + 1) % NEXUS_LIVE_EVENTS.length]!,
    NEXUS_LIVE_EVENTS[(index + 2) % NEXUS_LIVE_EVENTS.length]!,
  ];

  return { visible, pulse };
}

function useCountingKpis() {
  const [ticks, setTicks] = useState(NEXUS_KPIS.map((k) => k.value));

  useEffect(() => {
    const id = window.setInterval(() => {
      setTicks((prev) =>
        prev.map((v, i) => {
          if (i === 2) return v + (Math.random() > 0.55 ? 1 : 0);
          return v;
        })
      );
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  return ticks;
}

export function NexusLiveCanvas() {
  const now = useClock();
  const { visible, pulse } = useLiveFeed();
  const kpiValues = useCountingKpis();
  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const date = now.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  return (
    <div className="relative h-full min-h-[320px] w-full border border-[#001C35]/12 bg-white text-[#001C35]">
      <div className="relative flex h-full flex-col p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3 border-b border-[#001C35]/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0A4A6E] opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0A4A6E]" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0A4A6E]">
              Platform activity
            </span>
          </div>
          <div className="font-mono text-[11px] tabular-nums text-[#001C35]/50">
            {date} · {time} AST
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {NEXUS_KPIS.map((kpi, i) => (
            <div key={kpi.label} className="min-w-0">
              <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-[#001C35] sm:text-3xl">
                {kpiValues[i]}
                {kpi.suffix}
              </p>
              <p className="mt-1 truncate text-[11px] uppercase tracking-[0.1em] text-[#001C35]/45">
                {kpi.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-[#001C35]/10 pt-4">
          <p className="text-[11px] font-medium text-[#001C35]/50">
            {NEXUS_PRODUCTS.length} products · shared Administration · Module Access per company
          </p>
          <p className="mt-1 text-[11px] text-[#001C35]/40">{SAAS_BRAND.groupName}</p>
        </div>

        <div className="mt-auto pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#001C35]/40">
            Recent cross-company events
          </p>
          <ul className="mt-3 space-y-2.5" key={pulse}>
            {visible.map((event, i) => (
              <li
                key={`${pulse}-${event.text}`}
                className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both text-sm leading-snug"
                style={{ animationDelay: `${i * 80}ms`, animationDuration: "500ms" }}
              >
                <span className="font-semibold text-[#0A4A6E]">{event.product}</span>
                <span className="text-[#001C35]/30"> · </span>
                <span className="text-[#001C35]/80">{event.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
