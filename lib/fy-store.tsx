"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
export type FYStatus = "upcoming" | "live" | "closed" | "archived";

export interface FinancialYear {
  id: string;
  label: string;
  start: string;
  end: string;
  status: FYStatus;
}

// ── Mock Financial Years ───────────────────────────────────────────────────────
export const FINANCIAL_YEARS: FinancialYear[] = [
  {
    id: "2022-23",
    label: "FY 2022-23",
    start: "Apr 1, 2022",
    end: "Mar 31, 2023",
    status: "archived",
  },
  {
    id: "2023-24",
    label: "FY 2023-24",
    start: "Apr 1, 2023",
    end: "Mar 31, 2024",
    status: "closed",
  },
  {
    id: "2024-25",
    label: "FY 2024-25",
    start: "Apr 1, 2024",
    end: "Mar 31, 2025",
    status: "closed",
  },
  {
    id: "2025-26",
    label: "FY 2025-26",
    start: "Apr 1, 2025",
    end: "Mar 31, 2026",
    status: "closed",
  },
  {
    id: "2026-27",
    label: "FY 2026-27",
    start: "Apr 1, 2026",
    end: "Mar 31, 2027",
    status: "live",
  },
];

export const FY_STATUS_CONFIG: Record<
  FYStatus,
  { label: string; bg: string; color: string; dot: string; border: string }
> = {
  live: {
    label: "Live",
    bg: "bg-green-50",
    color: "text-green-700",
    dot: "bg-green-500",
    border: "border-green-200",
  },
  upcoming: {
    label: "Upcoming",
    bg: "bg-blue-50",
    color: "text-blue-700",
    dot: "bg-blue-500",
    border: "border-blue-200",
  },
  closed: {
    label: "Closed",
    bg: "bg-slate-100",
    color: "text-slate-600",
    dot: "bg-slate-400",
    border: "border-slate-200",
  },
  archived: {
    label: "Archived",
    bg: "bg-rose-50",
    color: "text-rose-700",
    dot: "bg-rose-400",
    border: "border-rose-200",
  },
};

const FY_STORAGE_KEY = "dharitrisutra_selected_fy";

const DEFAULT_FY =
  FINANCIAL_YEARS.find((f) => f.status === "live") ?? FINANCIAL_YEARS[0];

function readStoredFY(): FinancialYear {
  if (typeof window === "undefined") return DEFAULT_FY;
  try {
    const stored = localStorage.getItem(FY_STORAGE_KEY);
    if (!stored) return DEFAULT_FY;
    return FINANCIAL_YEARS.find((f) => f.id === stored) ?? DEFAULT_FY;
  } catch {
    return DEFAULT_FY;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
interface FYContextType {
  selectedFY: FinancialYear;
  setSelectedFY: (fy: FinancialYear) => void;
  allFYs: FinancialYear[];
}

const FYContext = createContext<FYContextType | null>(null);

// ── Provider — single render tree (no mount gate that remounts children) ───────
export function FYProvider({ children }: { children: React.ReactNode }) {
  const [selectedFY, setSelectedFYState] = useState<FinancialYear>(readStoredFY);

  const setSelectedFY = useCallback((fy: FinancialYear) => {
    setSelectedFYState(fy);
    try {
      localStorage.setItem(FY_STORAGE_KEY, fy.id);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({ selectedFY, setSelectedFY, allFYs: FINANCIAL_YEARS }),
    [selectedFY, setSelectedFY],
  );

  return <FYContext.Provider value={value}>{children}</FYContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useFY(): FYContextType {
  const ctx = useContext(FYContext);
  if (!ctx) throw new Error("useFY must be used within a FYProvider");
  return ctx;
}

// ── Standalone read (no context required, e.g. login page) ────────────────────
export function getStoredFYId(): string | null {
  try {
    return localStorage.getItem(FY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredFYId(id: string): void {
  try {
    localStorage.setItem(FY_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}
