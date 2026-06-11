"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { SYSTEM_COA_NODES } from "@/app/(app)/accounts/masters/coa-seed-nodes";
import {
  getAllExpandableIds,
  getSearchVisibleIds,
  loadChartOfAccounts,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";

const FULL_COA_SEED: ChartOfAccount[] = [...SYSTEM_COA_NODES];

function defaultExpandedIds(records: ChartOfAccount[]): Set<number> {
  return new Set(
    records
      .filter((r) => r.nodeLevel === "primary_head" || r.nodeLevel === "account_group")
      .map((r) => r.id),
  );
}

function readCoaRecords(): ChartOfAccount[] {
  if (typeof window === "undefined") return FULL_COA_SEED;
  return loadChartOfAccounts();
}

interface CoaNavigationContextValue {
  records: ChartOfAccount[];
  setRecords: React.Dispatch<React.SetStateAction<ChartOfAccount[]>>;
  selectedId: number | null;
  selectedNode: ChartOfAccount | null;
  expandedIds: Set<number>;
  search: string;
  setSearch: (value: string) => void;
  selectNode: (node: ChartOfAccount) => void;
  toggleExpand: (id: number) => void;
  expandAll: () => void;
  collapseAll: () => void;
  refreshRecords: () => void;
  isCoaRoute: boolean;
}

const CoaNavigationContext = createContext<CoaNavigationContextValue | null>(null);

export function CoaNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mountedRef = useRef(false);

  const [records, setRecords] = useState<ChartOfAccount[]>(FULL_COA_SEED);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => defaultExpandedIds(FULL_COA_SEED));
  const [search, setSearch] = useState("");

  const isCoaRoute = pathname.startsWith(CHART_OF_ACCOUNTS_HREF);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const loaded = readCoaRecords();
    setRecords(loaded);
    setExpandedIds(defaultExpandedIds(loaded));
  }, []);

  const selectedNode = useMemo(
    () => (selectedId != null ? records.find((r) => r.id === selectedId) ?? null : null),
    [records, selectedId],
  );

  const selectNode = useCallback(
    (node: ChartOfAccount) => {
      setSelectedId(node.id);
      if (node.nodeLevel !== "ledger") {
        setExpandedIds((prev) => new Set([...prev, node.id]));
      }
      const href = `${CHART_OF_ACCOUNTS_HREF}?node=${node.id}`;
      if (pathname.startsWith(CHART_OF_ACCOUNTS_HREF)) {
        router.replace(href, { scroll: false });
      } else {
        router.push(href);
      }
    },
    [pathname, router],
  );

  useEffect(() => {
    const nodeParam = searchParams.get("node");
    if (nodeParam) {
      const id = Number(nodeParam);
      if (!Number.isNaN(id)) setSelectedId(id);
      return;
    }
    if (isCoaRoute && records.length > 0) {
      const firstHead = records
        .filter((r) => r.nodeLevel === "primary_head")
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode))[0];
      if (firstHead) {
        router.replace(`${CHART_OF_ACCOUNTS_HREF}?node=${firstHead.id}`, { scroll: false });
      }
    }
  }, [searchParams, isCoaRoute, records, router]);

  useEffect(() => {
    if (!search.trim()) return;
    const visible = getSearchVisibleIds(records, search);
    if (visible.size === 0) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      visible.forEach((id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [search, records]);

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(getAllExpandableIds(records)));
  }, [records]);

  const collapseAll = useCallback(() => {
    setExpandedIds(
      new Set(records.filter((r) => r.nodeLevel === "primary_head").map((r) => r.id)),
    );
  }, [records]);

  const refreshRecords = useCallback(() => {
    const loaded = readCoaRecords();
    setRecords(loaded);
  }, []);

  const value = useMemo(
    () => ({
      records,
      setRecords,
      selectedId,
      selectedNode,
      expandedIds,
      search,
      setSearch,
      selectNode,
      toggleExpand,
      expandAll,
      collapseAll,
      refreshRecords,
      isCoaRoute,
    }),
    [
      records,
      selectedId,
      selectedNode,
      expandedIds,
      search,
      selectNode,
      toggleExpand,
      expandAll,
      collapseAll,
      refreshRecords,
      isCoaRoute,
    ],
  );

  return (
    <CoaNavigationContext.Provider value={value}>{children}</CoaNavigationContext.Provider>
  );
}

export function useCoaNavigation(): CoaNavigationContextValue {
  const ctx = useContext(CoaNavigationContext);
  if (!ctx) {
    throw new Error("useCoaNavigation must be used within CoaNavigationProvider");
  }
  return ctx;
}
