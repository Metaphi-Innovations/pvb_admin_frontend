"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const ACCOUNTS_SIDEBAR_STORAGE_KEY = "ds_accounts_sidebar_collapsed";
export const ACCOUNTS_SIDEBAR_EXPANDED_WIDTH_PX = 232;
export const ACCOUNTS_SIDEBAR_COLLAPSED_WIDTH_PX = 60;
/** Below this width the sidebar auto-collapses */
export const ACCOUNTS_SIDEBAR_AUTO_COLLAPSE_MAX_PX = 1024;

type AccountsSidebarContextValue = {
  collapsed: boolean;
  hydrated: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (value: boolean) => void;
};

const AccountsSidebarContext = createContext<AccountsSidebarContextValue | null>(null);

export function AccountsSidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(ACCOUNTS_SIDEBAR_STORAGE_KEY) === "true";
    const narrow = window.innerWidth < ACCOUNTS_SIDEBAR_AUTO_COLLAPSE_MAX_PX;
    setCollapsedState(stored || narrow);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(ACCOUNTS_SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed, hydrated]);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${ACCOUNTS_SIDEBAR_AUTO_COLLAPSE_MAX_PX - 1}px)`);
    const onChange = () => {
      if (mq.matches) setCollapsedState(true);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({ collapsed, hydrated, toggleCollapsed, setCollapsed }),
    [collapsed, hydrated, toggleCollapsed, setCollapsed],
  );

  return (
    <AccountsSidebarContext.Provider value={value}>{children}</AccountsSidebarContext.Provider>
  );
}

export function useAccountsSidebar(): AccountsSidebarContextValue {
  const ctx = useContext(AccountsSidebarContext);
  if (!ctx) {
    throw new Error("useAccountsSidebar must be used within AccountsSidebarProvider");
  }
  return ctx;
}
