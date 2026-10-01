"use client";

import { useMemo, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Check, ChevronsUpDown, Paperclip, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PolicyCheckLevel, PolicyCheckRow } from "./travel-claim-engine";
import type { AttachmentKind, ClaimAttachment, EmployeeClaimStatus, ReimbursementProcessStatus } from "./travel-claim-data";
import { CLAIM_STATUS_LABEL, reimbursementStatusLabel } from "./travel-claim-data";

export function ClaimStatusPill({ status }: { status: EmployeeClaimStatus }) {
  const map: Record<EmployeeClaimStatus, { bg: string; text: string; dot: string }> = {
    draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
    submitted: { bg: "bg-navy-50", text: "text-navy-700", dot: "bg-navy-500" },
    under_review: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
    approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    partially_approved: { bg: "bg-teal-100", text: "text-teal-700", dot: "bg-teal-500" },
    rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
    returned: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
  };
  const cfg = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-semibold", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {CLAIM_STATUS_LABEL[status]}
    </span>
  );
}

export function ReimbursementStatusPill({ status }: { status: ReimbursementProcessStatus }) {
  const tone =
    status === "paid" || status === "processed"
      ? { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" }
      : status === "on_hold"
        ? { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" }
        : status === "sent_to_accounts" || status === "ready_for_accounts"
          ? { bg: "bg-navy-50", text: "text-navy-700", dot: "bg-navy-500" }
          : status === "queued_for_payroll"
            ? { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" }
            : { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  if (!status || status === "not_ready") return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-semibold", tone.bg, tone.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", tone.dot)} />
      {reimbursementStatusLabel(status)}
    </span>
  );
}

export function PolicyGuidanceCard({
  rows,
  groupName,
}: {
  rows: { label: string; value: string }[];
  groupName?: string | null;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="rounded-[14px] border border-brand-200 bg-brand-50/70 p-3.5 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-800">Your Entitlement</p>
      {groupName ? <p className="text-xs font-semibold text-navy-700">{groupName}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <div key={`${r.label}-${r.value}`} className="min-w-0">
            <p className="text-[10px] text-muted-foreground font-medium">{r.label}</p>
            <p className="text-xs font-semibold text-foreground leading-snug">{r.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const CHECK_ICON: Record<PolicyCheckLevel, string> = {
  ok: "✓",
  warn: "⚠",
  exception: "⚠",
  block: "✕",
};

const CHECK_COLOR: Record<PolicyCheckLevel, string> = {
  ok: "text-emerald-700",
  warn: "text-amber-700",
  exception: "text-orange-700",
  block: "text-red-700",
};

export function PolicyCheckPanel({ rows }: { rows: PolicyCheckRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="rounded-[14px] border border-border bg-white p-3.5 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Policy Check</p>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.id} className={cn("flex items-start gap-2 text-xs", CHECK_COLOR[r.level])}>
            <span className="font-bold w-4 flex-shrink-0 mt-px">{CHECK_ICON[r.level]}</span>
            <span className="min-w-0">
              <span className="font-medium">{r.label}</span>
              {r.detail ? <span className="block text-[11px] text-muted-foreground font-normal">{r.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AmountStrip({
  claimed,
  eligible,
  excess,
}: {
  claimed: string;
  eligible: string;
  excess: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-[14px] border border-border bg-white p-3">
      <div>
        <p className="text-[10px] text-muted-foreground font-medium">Claimed</p>
        <p className="text-sm font-bold text-foreground">{claimed}</p>
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground font-medium">Eligible</p>
        <p className="text-sm font-bold text-leaf-700">{eligible}</p>
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground font-medium">Excess</p>
        <p className="text-sm font-bold text-red-700">{excess}</p>
      </div>
    </div>
  );
}

export function FieldBlock({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      {hint && !error ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const fieldClass =
  "w-full h-11 px-3 text-sm rounded-[10px] border border-border bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400 disabled:bg-muted/40 disabled:text-muted-foreground";

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, props.className)} />;
}

export function AreaField(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className={cn(
        "w-full px-3 py-2.5 text-sm rounded-[10px] border border-border bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 min-h-[72px]",
        props.className,
      )}
    />
  );
}

export function SearchSelect({
  value,
  placeholder,
  options,
  onChange,
  disabled,
}: {
  value: string;
  placeholder: string;
  options: { value: string; label: string; hint?: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return options;
    return options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(n));
  }, [options, q]);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(fieldClass, "flex items-center justify-between text-left")}
        >
          <span className={cn("truncate", selected ? "text-foreground" : "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0 max-h-72 overflow-hidden">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-3 py-1.5 text-sm focus:outline-none bg-transparent"
            />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-4">No matches</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQ("");
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left rounded-[10px] hover:bg-muted/60",
                  value === o.value && "bg-brand-50",
                )}
              >
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.hint ? <span className="block text-[11px] text-muted-foreground truncate">{o.hint}</span> : null}
                </span>
                {value === o.value ? <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" /> : null}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AttachmentList({
  items,
  onRemove,
  readOnly,
}: {
  items: ClaimAttachment[];
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-[11px] text-muted-foreground">No files attached. Files stay in this browser only.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((a) => (
        <li
          key={a.id}
          className="flex items-center gap-2 rounded-[10px] border border-border bg-muted/20 px-3 py-2"
        >
          <Paperclip className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{a.fileName}</p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {a.kind} · {a.sizeLabel}
            </p>
          </div>
          {!readOnly && onRemove ? (
            <button type="button" onClick={() => onRemove(a.id)} className="p-1.5 rounded-md hover:bg-muted">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function kindLabel(kind: AttachmentKind): string {
  if (kind === "bill") return "Bill";
  if (kind === "ticket") return "Ticket";
  if (kind === "approval") return "Approval";
  return "Other";
}

export function SectionHead({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-border">
      <span className="w-6 h-6 rounded-full bg-navy-700 text-white text-[11px] font-bold inline-flex items-center justify-center">
        {n}
      </span>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
    </div>
  );
}
