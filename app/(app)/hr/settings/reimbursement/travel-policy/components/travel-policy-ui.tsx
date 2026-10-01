"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { HrLetterCombobox } from "@/app/(app)/hr/hr-letters/components/HrLetterCombobox";

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} size="sm" />
    </div>
  );
}

export function Combo({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <HrLetterCombobox
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder || "Select…"}
      disabled={disabled}
    />
  );
}

export function ChipMultiSelect({
  values,
  onChange,
  options,
  placeholder,
  disabled,
  renderOption,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  options: { value: string; label: string; hint?: string }[];
  placeholder?: string;
  disabled?: boolean;
  renderOption?: (opt: { value: string; label: string; hint?: string }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options.filter((o) => values.includes(o.value));
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(t) ||
        (o.hint || "").toLowerCase().includes(t) ||
        o.value.toLowerCase().includes(t),
    );
  }, [options, q]);

  const toggle = (v: string) => {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  };

  return (
    <Popover open={disabled ? false : open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full min-h-9 px-2.5 py-1.5 text-left border border-border rounded-lg bg-white",
            "flex flex-wrap items-center gap-1",
            disabled && "bg-muted/40",
          )}
        >
          {selected.length === 0 ? (
            <span className="text-xs text-muted-foreground">{placeholder || "Select…"}</span>
          ) : (
            selected.map((s) => (
              <span
                key={s.value}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] bg-brand-50 border border-brand-200 text-brand-700 rounded-md"
              >
                {s.label}
                {!disabled ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(s.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") toggle(s.value);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </span>
                ) : null}
              </span>
            ))
          )}
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <div className="p-1.5 border-b border-border">
          <div className="flex h-8 items-center gap-2 rounded-md border px-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="flex-1 bg-transparent text-xs outline-none"
            />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No matches</p>
          ) : (
            filtered.map((o) => {
              const on = values.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "w-full flex items-start gap-2 px-2 py-1.5 text-left rounded-md text-xs hover:bg-muted/60",
                    on && "bg-brand-50",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    {renderOption ? renderOption(o) : <p className="font-medium">{o.label}</p>}
                    {o.hint && !renderOption ? (
                      <p className="text-[11px] text-muted-foreground">{o.hint}</p>
                    ) : null}
                  </div>
                  {on ? <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" /> : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SectionCard({
  title,
  hint,
  children,
  actions,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-border">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          {hint ? <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
