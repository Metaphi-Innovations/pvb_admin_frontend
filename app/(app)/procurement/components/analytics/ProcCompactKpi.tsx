"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENTS = {
  brand: { bg: "#FFF3E8", icon: "#D96A10", border: "#FFCB90" },
  navy: { bg: "#EEF2FF", icon: "#1A3A96", border: "#B8C9FF" },
  amber: { bg: "#FFFBEB", icon: "#D97706", border: "#FDE68A" },
  green: { bg: "#ECFDF5", icon: "#059669", border: "#A7F3D0" },
  red: { bg: "#FEF2F2", icon: "#DC2626", border: "#FECACA" },
  blue: { bg: "#EFF6FF", icon: "#2563EB", border: "#BFDBFE" },
  purple: { bg: "#F5F3FF", icon: "#7C3AED", border: "#DDD6FE" },
  slate: { bg: "#F8FAFC", icon: "#64748B", border: "#E2E8F0" },
} as const;

export type ProcKpiAccent = keyof typeof ACCENTS;

export function ProcCompactKpi({
  label,
  value,
  icon: Icon,
  accent = "brand",
  hint,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: ProcKpiAccent;
  hint?: string;
}) {
  const c = ACCENTS[accent];
  return (
    <div
      className="bg-white rounded-[11px] border border-[#DDE3EF] p-3 flex items-center gap-2.5 min-w-0 shadow-sm"
      style={{ borderLeftWidth: 3, borderLeftColor: c.border }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: c.bg }}
      >
        <Icon className="w-4 h-4" style={{ color: c.icon }} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B80A0] truncate">{label}</p>
        <p className="text-xl font-bold text-[#0A1628] leading-tight tabular-nums">{value}</p>
        {hint && <p className="text-[10px] text-[#9AAAC5] truncate">{hint}</p>}
      </div>
    </div>
  );
}

export function ProcCompactKpiGrid({ children, cols }: { children: React.ReactNode; cols?: number }) {
  return (
    <div
      className={cn(
        "grid gap-2.5",
        cols === 6
          ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
          : cols === 5
            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}
