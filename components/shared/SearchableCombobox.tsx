"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchableComboboxOption {
  value: number;
  label: string;
  sublabel?: string;
}

/**
 * A search-filterable single-select input. The dropdown list is rendered in a portal
 * (position: fixed, tracked to the input's bounding rect) so it always renders above
 * sibling content and is never clipped by an ancestor's `overflow-hidden` (e.g. Card).
 */
export function SearchableCombobox({
  value,
  onChange,
  options,
  placeholder = "Search…",
  emptyLabel = "No matches found.",
  disabled,
  ariaInvalid,
}: {
  value: number | null;
  onChange: (value: number) => void;
  options: SearchableComboboxOption[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  ariaInvalid?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(term) || (o.sublabel ?? "").toLowerCase().includes(term)
    );
  }, [options, query]);

  function updateRect() {
    const el = wrapperRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }

  useEffect(() => {
    if (!open) return;
    updateRect();
    const onScrollOrResize = () => updateRect();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
        <Input
          value={open ? query : (selected?.label ?? "")}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className="h-10 ps-9"
        />
      </div>
      {open &&
        !disabled &&
        rect &&
        createPortal(
          <div
            ref={listRef}
            style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 9999 }}
            className="max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-start text-sm hover:bg-muted",
                    value === o.value && "bg-muted"
                  )}
                  onClick={() => {
                    onChange(o.value);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 truncate">{o.label}</span>
                  {o.sublabel && (
                    <span className="ms-2 shrink-0 font-mono text-xs text-muted-foreground">{o.sublabel}</span>
                  )}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
