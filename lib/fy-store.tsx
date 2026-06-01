"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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

export const FY_STATUS_CONFIG: Record<FYStatus, { label: string; bg: string; color: string; dot: string; border: string }> = {
  live:     { label: "Live",     bg: "bg-green-50",  color: "text-green-700",  dot: "bg-green-500",  border: "border-green-200" },
  upcoming: { label: "Upcoming", bg: "bg-blue-50",   color: "text-blue-700",   dot: "bg-blue-500",   border: "border-blue-200"  },
  closed:   { label: "Closed",   bg: "bg-slate-100", color: "text-slate-600",  dot: "bg-slate-400",  border: "border-slate-200" },
  archived: { label: "Archived", bg: "bg-rose-50",   color: "text-rose-700",   dot: "bg-rose-400",   border: "border-rose-200"  },
};

const FY_STORAGE_KEY = "dharitrisutra_selected_fy";

// ── Context ───────────────────────────────────────────────────────────────────
interface FYContextType {
  selectedFY: FinancialYear;
  setSelectedFY: (fy: FinancialYear) => void;
  allFYs: FinancialYear[];
}

const FYContext = createContext<FYContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function FYProvider({ children }: { children: React.ReactNode }) {
  const defaultFY = FINANCIAL_YEARS.find((f) => f.status === "live") ?? FINANCIAL_YEARS[0];
  const [selectedFY, setSelectedFYState] = useState<FinancialYear>(defaultFY);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(FY_STORAGE_KEY);
      if (stored) {
        const found = FINANCIAL_YEARS.find((f) => f.id === stored);
        if (found) setSelectedFYState(found);
      }
    } catch {
      // localStorage not available (SSR)
    }
  }, []);

  const setSelectedFY = (fy: FinancialYear) => {
    setSelectedFYState(fy);
    try {
      localStorage.setItem(FY_STORAGE_KEY, fy.id);
    } catch {
      // ignore
    }
  };

  if (!mounted) {
    // Render with default to avoid hydration mismatch
    return (
      <FYContext.Provider value={{ selectedFY: defaultFY, setSelectedFY: () => {}, allFYs: FINANCIAL_YEARS }}>
        {children}
      </FYContext.Provider>
    );
  }

  return (
    <FYContext.Provider value={{ selectedFY, setSelectedFY, allFYs: FINANCIAL_YEARS }}>
      {children}
    </FYContext.Provider>
  );
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
