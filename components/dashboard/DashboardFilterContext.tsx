"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  getDashboardData,
  type DashboardData,
  type DashboardFiltersState,
} from "@/components/dashboard/mock-data";

interface DashboardFilterContextValue {
  filters: DashboardFiltersState;
  setFilters: (next: DashboardFiltersState) => void;
  data: DashboardData;
  refreshing: boolean;
  refresh: () => void;
}

const DashboardFilterContext = createContext<DashboardFilterContextValue | null>(null);

export function DashboardFilterProvider({ children }: { children: React.ReactNode }) {
  const seed = useMemo(() => getDashboardData(), []);
  const [filters, setFilters] = useState<DashboardFiltersState>(seed.defaultFilters);
  const [tick, setTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const data = useMemo(() => getDashboardData(filters), [filters, tick]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    window.setTimeout(() => {
      setTick((t) => t + 1);
      setRefreshing(false);
    }, 450);
  }, []);

  const value = useMemo(
    () => ({ filters, setFilters, data, refreshing, refresh }),
    [filters, data, refreshing, refresh],
  );

  return (
    <DashboardFilterContext.Provider value={value}>{children}</DashboardFilterContext.Provider>
  );
}

export function useDashboardFilters(): DashboardFilterContextValue {
  const ctx = useContext(DashboardFilterContext);
  if (!ctx) throw new Error("useDashboardFilters must be used within DashboardFilterProvider");
  return ctx;
}
