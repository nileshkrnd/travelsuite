"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface SearchableMultiSelectOption {
  value: number;
  label: string;
  sublabel?: string;
}

/**
 * A search-filterable multi-select. Stays open across picks so several options can be
 * checked in one pass; selected items show as removable chips below the input.
 */
export function SearchableMultiSelect({
  values,
  onChange,
  options,
  placeholder = "Search…",
  emptyLabel = "No matches found.",
  disabled,
}: {
  values: number[];
  onChange: (values: number[]) => void;
  options: SearchableMultiSelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(values), [values]);
  const selectedOptions = useMemo(
    () => options.filter((o) => selectedSet.has(o.value)),
    [options, selectedSet]
  );

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

  function toggle(value: number) {
    if (selectedSet.has(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
        <Input
          value={open ? query : values.length > 0 ? `${values.length} selected` : ""}
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
          className="h-10 ps-9"
        />
      </div>
      {selectedOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedOptions.map((o) => (
            <span
              key={o.value}
              className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs"
            >
              {o.label}
              <button
                type="button"
                onClick={() => toggle(o.value)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${o.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
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
                    "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-sm hover:bg-muted",
                    selectedSet.has(o.value) && "bg-muted"
                  )}
                  onClick={() => toggle(o.value)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Checkbox checked={selectedSet.has(o.value)} onCheckedChange={() => toggle(o.value)} />
                    <span className="min-w-0 truncate">{o.label}</span>
                  </span>
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
