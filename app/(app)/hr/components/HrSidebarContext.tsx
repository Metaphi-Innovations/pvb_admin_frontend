"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { HR_SIDEBAR_AUTO_COLLAPSE_MAX_PX } from "@/lib/hr/hr-layout-constants";

export const HR_SIDEBAR_STORAGE_KEY = "ds_hr_sidebar_collapsed";

type HrSidebarContextValue = {
  collapsed: boolean;
  hydrated: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (value: boolean) => void;
};

const HrSidebarContext = createContext<HrSidebarContextValue | null>(null);

export function HrSidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(HR_SIDEBAR_STORAGE_KEY) === "true";
    const narrow = window.innerWidth < HR_SIDEBAR_AUTO_COLLAPSE_MAX_PX;
    setCollapsedState(stored || narrow);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(HR_SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed, hydrated]);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${HR_SIDEBAR_AUTO_COLLAPSE_MAX_PX - 1}px)`);
    const onChange = () => {
      if (mq.matches) setCollapsedState(true);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setCollapsed = useCallback((value: boolean) => setCollapsedState(value), []);
  const toggleCollapsed = useCallback(() => setCollapsedState((p) => !p), []);

  const value = useMemo(
    () => ({ collapsed, hydrated, toggleCollapsed, setCollapsed }),
    [collapsed, hydrated, toggleCollapsed, setCollapsed],
  );

  return <HrSidebarContext.Provider value={value}>{children}</HrSidebarContext.Provider>;
}

export function useHrSidebar(): HrSidebarContextValue {
  const ctx = useContext(HrSidebarContext);
  if (!ctx) throw new Error("useHrSidebar must be used within HrSidebarProvider");
  return ctx;
}
