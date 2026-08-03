"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ApiFinancialYear,
  FinancialYearApiService,
} from "@/services/financial-year.service";
import { getStoredFYId, setStoredFYId } from "@/lib/fy-storage";

export { getStoredFYId, setStoredFYId } from "@/lib/fy-storage";

// ── Types ─────────────────────────────────────────────────────────────────────
export type FYStatus = "upcoming" | "live" | "open" | "closed" | "archived";

export interface FinancialYear {
  /** Backend UUID — Working FY id sent as x-financial-year-id */
  id: string;
  code: string;
  label: string;
  /** Display range */
  start: string;
  end: string;
  /** ISO dates from API */
  startDate: string;
  endDate: string;
  status: FYStatus;
  isCurrent: boolean;
  isClosed: boolean;
}

export const FY_STATUS_CONFIG: Record<
  FYStatus,
  { label: string; bg: string; color: string; dot: string; border: string }
> = {
  live: {
    label: "Current",
    bg: "bg-green-50",
    color: "text-green-700",
    dot: "bg-green-500",
    border: "border-green-200",
  },
  open: {
    label: "Open",
    bg: "bg-emerald-50",
    color: "text-emerald-700",
    dot: "bg-emerald-500",
    border: "border-emerald-200",
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

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function mapApiFinancialYear(row: ApiFinancialYear): FinancialYear {
  const startDate = String(row.startDate);
  const endDate = String(row.endDate);
  const isClosed = Boolean(row.isClosed);
  const isCurrent = Boolean(row.isCurrent);
  const today = startOfLocalDay(new Date());
  const start = startOfLocalDay(new Date(startDate));

  let status: FYStatus;
  if (isClosed) {
    status = "closed";
  } else if (isCurrent) {
    status = "live";
  } else if (start > today) {
    status = "upcoming";
  } else {
    status = "open";
  }

  const code = row.code || row.name;
  return {
    id: row.financialYearId,
    code,
    label: row.name?.startsWith("FY") ? row.name : `FY ${code}`,
    start: formatDisplayDate(startDate),
    end: formatDisplayDate(endDate),
    startDate,
    endDate,
    status,
    isCurrent,
    isClosed,
  };
}

/** Placeholder until API years load — never sent as x-financial-year-id (empty id). */
const PLACEHOLDER_FY: FinancialYear = {
  id: "",
  code: "",
  label: "Loading…",
  start: "—",
  end: "—",
  startDate: "",
  endDate: "",
  status: "upcoming",
  isCurrent: false,
  isClosed: false,
};

// ── Context ───────────────────────────────────────────────────────────────────
interface FYContextType {
  selectedFY: FinancialYear;
  setSelectedFY: (fy: FinancialYear) => void;
  allFYs: FinancialYear[];
  isLoading: boolean;
  error: string | null;
  refreshFinancialYears: () => Promise<void>;
}

const FYContext = createContext<FYContextType | null>(null);

function pickInitialSelection(
  years: FinancialYear[],
  storedId: string | null,
): FinancialYear {
  if (!years.length) return PLACEHOLDER_FY;
  if (storedId) {
    const stored = years.find((y) => y.id === storedId);
    if (stored) return stored;
  }
  return years.find((y) => y.isCurrent) ?? years.find((y) => y.status === "live") ?? years[0];
}

export function FYProvider({ children }: { children: React.ReactNode }) {
  const [allFYs, setAllFYs] = useState<FinancialYear[]>([]);
  const [selectedFY, setSelectedFYState] = useState<FinancialYear>(PLACEHOLDER_FY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshFinancialYears = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await FinancialYearApiService.list(true);
      const mapped = rows.map(mapApiFinancialYear);
      setAllFYs(mapped);
      setSelectedFYState((prev) => {
        const storedId = prev?.id || getStoredFYId();
        const next = pickInitialSelection(mapped, storedId);
        if (next.id) setStoredFYId(next.id);
        return next;
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load financial years");
      setAllFYs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshFinancialYears();
  }, [refreshFinancialYears]);

  const setSelectedFY = useCallback((fy: FinancialYear) => {
    setSelectedFYState(fy);
    if (fy.id) setStoredFYId(fy.id);
  }, []);

  const value = useMemo(
    () => ({
      selectedFY,
      setSelectedFY,
      allFYs,
      isLoading,
      error,
      refreshFinancialYears,
    }),
    [selectedFY, setSelectedFY, allFYs, isLoading, error, refreshFinancialYears],
  );

  return <FYContext.Provider value={value}>{children}</FYContext.Provider>;
}

export function useFY(): FYContextType {
  const ctx = useContext(FYContext);
  if (!ctx) throw new Error("useFY must be used within a FYProvider");
  return ctx;
}

/** True once Working FY id is available for x-financial-year-id. */
export function useIsFinancialYearReady(): boolean {
  const { selectedFY } = useFY();
  return Boolean(selectedFY.id || getStoredFYId());
}

/**
 * Opening date YYYY-MM-DD for a Financial Year.
 * Prefer passing the FY object (UUID ids are not parseable as year codes).
 */
export function fyOpeningDateIso(fyOrId: FinancialYear | string): string {
  if (typeof fyOrId === "object" && fyOrId?.startDate) {
    return String(fyOrId.startDate).slice(0, 10);
  }

  const id = String(fyOrId);
  const y = parseInt(id.split("-")[0], 10);
  if (Number.isFinite(y) && y > 1900) {
    return `${y}-04-01`;
  }

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return `${month >= 3 ? year : year - 1}-04-01`;
}
