"use client";

import React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

export const PROC = {
  pageBg: "#F0F2F8",
  cardBg: "#FFFFFF",
  cardBorder: "#DDE3EF",
  textPrimary: "#0A1628",
  textSecondary: "#3D5473",
  textMuted: "#6B80A0",
  link: "#B85508",
  headerBg: "#F7F9FC",
  rowHover: "#F4F7FE",
  rowBorder: "#F0F3FA",
  focusRing: "#FFF3E8",
  accentBrand: "#D96A10",
  accentGreen: "#1E9E61",
  tabActive: "#B85508",
  tabBorder: "#D96A10",
} as const;

const BADGE_MAP: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  draft: { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1", dot: "#94A3B8", label: "Draft" },
  pending_approval: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", dot: "#F59E0B", label: "Pending Approval" },
  pending: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", dot: "#F59E0B", label: "Pending" },
  approved: { bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7", dot: "#10B981", label: "Approved" },
  rejected: { bg: "#FEF2F2", text: "#991B1B", border: "#FCA5A5", dot: "#EF4444", label: "Rejected" },
  invoice_uploaded: { bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7", dot: "#10B981", label: "Invoice Uploaded" },
  short_closed: { bg: "#F5F3FF", text: "#5B21B6", border: "#C4B5FD", dot: "#8B5CF6", label: "Short Closed" },
  closed: { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1", dot: "#64748B", label: "Closed" },
  cancelled: { bg: "#FEF2F2", text: "#991B1B", border: "#FCA5A5", dot: "#EF4444", label: "Cancelled" },
  partially_converted: { bg: "#EFF6FF", text: "#1E40AF", border: "#93C5FD", dot: "#3B82F6", label: "Partially Converted" },
  fully_converted: { bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7", dot: "#10B981", label: "Fully Converted" },
  not_created: { bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1", dot: "#94A3B8", label: "Not Created" },
  not_uploaded: { bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1", dot: "#94A3B8", label: "Not Uploaded" },
  uploaded: { bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7", dot: "#10B981", label: "Uploaded" },
  grn_list_pending: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", dot: "#F59E0B", label: "Pending" },
  grn_partial: { bg: "#EFF6FF", text: "#1E40AF", border: "#93C5FD", dot: "#3B82F6", label: "Partially Received" },
  grn_full: { bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7", dot: "#10B981", label: "Fully Received" },
  matched: { bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7", dot: "#10B981", label: "Matched" },
  partial_match: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", dot: "#F59E0B", label: "Partial Match" },
  mismatch: { bg: "#FEF2F2", text: "#991B1B", border: "#FCA5A5", dot: "#EF4444", label: "Mismatch" },
  no_followup: { bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1", dot: "#94A3B8", label: "No Follow-up" },
  followup_available: { bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7", dot: "#10B981", label: "Follow-up Available" },
};

export function ProcBadge({ status }: { status: string }) {
  const cfg = BADGE_MAP[status] ?? BADGE_MAP.draft;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

type BtnVariant = "primary" | "success" | "outline" | "ghost" | "danger";

export function ProcButton({
  variant = "outline",
  size = "md",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" }) {
  const h = size === "sm" ? "h-[33px]" : size === "lg" ? "h-[44px]" : "h-[38px]";
  const base = cn("inline-flex items-center justify-center gap-1.5 rounded-[9px] text-[13px] font-semibold transition-colors px-3.5", h, className);
  if (variant === "primary") {
    return (
      <button
        type="button"
        className={cn(base, "text-white shadow-sm bg-brand-gradient hover:opacity-95")}
        {...props}
      >
        {children}
      </button>
    );
  }
  if (variant === "success") {
    return (
      <button
        type="button"
        className={cn(base, "text-white shadow-sm bg-brand-600 hover:bg-brand-700")}
        {...props}
      >
        {children}
      </button>
    );
  }
  if (variant === "ghost") {
    return (
      <button type="button" className={cn(base, "border-0 bg-transparent text-[#3D5473] hover:bg-[#F4F7FE]")} {...props}>
        {children}
      </button>
    );
  }
  if (variant === "danger") {
    return (
      <button
        type="button"
        className={cn(base, "bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]")}
        {...props}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={cn(base, "bg-white text-[#3D5473] border border-[#DDE3EF] hover:bg-[#F7F9FC]")}
      {...props}
    >
      {children}
    </button>
  );
}

export function FLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={cn("block text-[12px] font-semibold text-[#6B80A0] mb-1", className)}>{children}</label>;
}

export function ProcInput({
  className,
  style,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-[38px] px-2.5 text-[13px] rounded-[9px] border-[1.5px] border-[#DDE3EF] bg-white text-[#0A1628] outline-none",
        "focus:border-brand-600 focus:shadow-[0_0_0_3px_#FFF3E8]",
        "disabled:bg-[#F7F9FC] disabled:text-[#6B80A0]",
        className,
      )}
      style={style}
      {...props}
    />
  );
}

export function ProcTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full px-2.5 py-2 text-[13px] rounded-[9px] border-[1.5px] border-[#DDE3EF] bg-white text-[#0A1628] outline-none resize-none",
        "focus:border-brand-600 focus:shadow-[0_0_0_3px_#FFF3E8]",
        className,
      )}
      {...props}
    />
  );
}

export function ProcDivider({ className }: { className?: string }) {
  return <div className={cn("w-px self-stretch bg-[#DDE3EF] mx-1", className)} />;
}

export function ProcCardSection({
  accent = "navy",
  icon,
  title,
  badge,
  children,
  className,
}: {
  accent?: "navy" | "green" | "amber";
  icon?: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const accentColor = accent === "green" ? "#1E9E61" : accent === "amber" ? "#D97706" : "#D96A10";
  return (
    <section
      className={cn("rounded-[13px] border border-[#DDE3EF] bg-white overflow-hidden shadow-sm", className)}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b border-[#DDE3EF]"
        style={{ backgroundColor: PROC.headerBg }}
      >
        <div className="w-[3px] h-4 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
        {icon}
        <span className="text-[12px] font-bold uppercase tracking-[0.3px] text-[#0A1628]">{title}</span>
        {badge && <span className="ml-1">{badge}</span>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function ProcAvatar({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
  return (
    <span className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold shrink-0 uppercase">
      {initials.slice(0, 2)}
    </span>
  );
}

export function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#FEF3C7] text-inherit rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export function PrefixInput({
  prefix,
  value,
  width = 190,
  readOnly,
}: {
  prefix: string;
  value: string;
  width?: number;
  readOnly?: boolean;
}) {
  return (
    <div className="flex rounded-[9px] border-[1.5px] border-[#DDE3EF] overflow-hidden bg-white h-[38px]" style={{ width }}>
      <span className="px-2 flex items-center text-[12px] font-semibold text-[#6B80A0] bg-[#F7F9FC] border-r border-[#DDE3EF]">
        {prefix}
      </span>
      <ProcInput readOnly={readOnly} value={value} className="border-0 rounded-none shadow-none focus:shadow-none h-[36px] flex-1" />
    </div>
  );
}

export function SearchableSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled,
  width,
  dropdownMinWidth = 240,
}: {
  label?: string;
  placeholder: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  width?: number;
  /** Minimum width of the dropdown panel (avoids clipping long labels). */
  dropdownMinWidth?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [menuPos, setMenuPos] = React.useState({ top: 0, left: 0, width: 240 });
  const rootRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const updateMenuPos = React.useCallback(() => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, dropdownMinWidth),
    });
  }, [dropdownMinWidth]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updateMenuPos();
    window.addEventListener("scroll", updateMenuPos, true);
    window.addEventListener("resize", updateMenuPos);
    return () => {
      window.removeEventListener("scroll", updateMenuPos, true);
      window.removeEventListener("resize", updateMenuPos);
    };
  }, [open, updateMenuPos]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = options.filter(
    (o) => !q || o.label.toLowerCase().includes(q.toLowerCase()) || o.value.toLowerCase().includes(q.toLowerCase()),
  );
  const selected = options.find((o) => o.value === value);

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-[9px] border border-[#DDE3EF] bg-white shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
          >
            <div className="p-1.5 border-b border-[#DDE3EF]">
              <ProcInput placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8" />
            </div>
            <ul className="max-h-[240px] overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-2.5 py-2 text-[12px] text-[#6B80A0]">No matches</li>
              ) : (
                filtered.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      className="w-full px-2.5 py-1.5 text-[13px] text-left hover:bg-[#F4F7FE] flex items-center justify-between gap-2 whitespace-nowrap"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                        setQ("");
                      }}
                    >
                      <span className="truncate">{opt.label}</span>
                      {value === opt.value && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative" style={width ? { width } : undefined} ref={rootRef}>
      {label && <FLabel>{label}</FLabel>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (!open) updateMenuPos();
          setOpen((o) => !o);
        }}
        className={cn(
          "w-full h-[38px] px-2.5 text-[13px] rounded-[9px] border-[1.5px] border-[#DDE3EF] bg-white text-left flex items-center justify-between gap-1 text-[#3D5473] min-w-0",
          disabled && "opacity-60 cursor-not-allowed bg-[#F7F9FC]",
        )}
      >
        <span className="truncate min-w-0 flex-1 text-left">{selected?.label ?? placeholder}</span>
        <span className="flex items-center gap-1 shrink-0 ml-1">
          {value && !disabled && (
            <X
              className="w-3.5 h-3.5 text-[#6B80A0] hover:text-[#0A1628]"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            />
          )}
          <span className="text-[10px]">▾</span>
        </span>
      </button>
      {menu}
    </div>
  );
}

export function SearchableMultiSelect({
  label,
  placeholder,
  options,
  values,
  onChange,
  searchable = true,
}: {
  label: string;
  placeholder: string;
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const filtered = options.filter((o) => !q || o.toLowerCase().includes(q.toLowerCase()));
  const triggerLabel =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? values[0]
        : `${label.split(" ")[0]} (${values.length})`;

  const toggle = (opt: string) => {
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  };

  return (
    <div className="relative">
      <FLabel>{label}</FLabel>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-9 px-2.5 text-[13px] rounded-[9px] border-[1.5px] border-[#DDE3EF] bg-white text-left flex items-center justify-between text-[#3D5473]"
      >
        <span className="truncate">{triggerLabel}</span>
        <span className="flex items-center gap-1">
          {values.length > 0 && (
            <X
              className="w-3.5 h-3.5 text-[#6B80A0] hover:text-[#0A1628]"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            />
          )}
          <span className="text-[10px]">▾</span>
        </span>
      </button>
      {open && (
        <div className="absolute z-[400] mt-1 w-full rounded-[9px] border border-[#DDE3EF] bg-white shadow-lg">
          {searchable && (
            <div className="p-1.5 border-b border-[#DDE3EF]">
              <ProcInput placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8" />
            </div>
          )}
          <ul className="max-h-[200px] overflow-y-auto py-1">
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  className="w-full px-2.5 py-1.5 text-[13px] text-left hover:bg-[#F4F7FE] flex items-center justify-between"
                  onClick={() => toggle(opt)}
                >
                  {opt}
                  {values.includes(opt) && <Check className="w-3.5 h-3.5 text-brand-600" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
