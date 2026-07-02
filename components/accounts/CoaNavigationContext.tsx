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
  hasChildLedgers,
  loadChartOfAccounts,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-data";
import { backfillCoaMasterLinks } from "@/lib/accounts/coa-master-link";
import { isPostableNode } from "@/lib/accounts/coa-hierarchy";
import {
  buildTdsPartyWiseReportHref,
  isTdsCoaNode,
} from "@/lib/accounts/tds-coa-utils";
import { ensureTdsSectionLedgers } from "@/lib/accounts/tds-section-ledgers";
import { backfillErpPartyLedgers } from "@/lib/accounts/erp-accounting-mapping";
import { subscribeCoaChanged } from "@/lib/accounts/coa-events";

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
  highlightedLedgerId: number | null;
  setHighlightedLedgerId: React.Dispatch<React.SetStateAction<number | null>>;
  ensureExpanded: (ids: number | number[]) => void;
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
  const [highlightedLedgerId, setHighlightedLedgerId] = useState<number | null>(null);

  const isCoaRoute = pathname.startsWith(CHART_OF_ACCOUNTS_HREF);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    backfillErpPartyLedgers();
    backfillCoaMasterLinks();
    ensureTdsSectionLedgers();
    const loaded = readCoaRecords();
    setRecords(loaded);
    setExpandedIds(defaultExpandedIds(loaded));
  }, []);

  const refreshRecords = useCallback(() => {
    const loaded = readCoaRecords();
    setRecords(loaded);
  }, []);

  useEffect(() => subscribeCoaChanged(refreshRecords), [refreshRecords]);

  const selectedNode = useMemo(
    () => (selectedId != null ? records.find((r) => r.id === selectedId) ?? null : null),
    [records, selectedId],
  );

  const selectNode = useCallback(
    (node: ChartOfAccount) => {
      if (isTdsCoaNode(node, records) && !pathname.startsWith(CHART_OF_ACCOUNTS_HREF)) {
        router.push(buildTdsPartyWiseReportHref(node, records));
        return;
      }
      setSelectedId(node.id);
      if (node.nodeLevel !== "ledger" || hasChildLedgers(records, node.id)) {
        setExpandedIds((prev) => new Set([...prev, node.id]));
      }
      const href = `${CHART_OF_ACCOUNTS_HREF}?node=${node.id}`;
      if (pathname.startsWith(CHART_OF_ACCOUNTS_HREF)) {
        router.replace(href, { scroll: false });
      } else if (node.nodeLevel === "ledger" && isPostableNode(node, records)) {
        router.push(buildGeneralLedgerHref(node.id));
      } else {
        router.push(href);
      }
    },
    [pathname, router, records],
  );

  useEffect(() => {
    const nodeParam = searchParams.get("node") ?? searchParams.get("ledger");
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

  const ensureExpanded = useCallback((ids: number | number[]) => {
    const list = Array.isArray(ids) ? ids : [ids];
    setExpandedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of list) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
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
      highlightedLedgerId,
      setHighlightedLedgerId,
      ensureExpanded,
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
      highlightedLedgerId,
      ensureExpanded,
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
