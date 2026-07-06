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
import { usePathname, useRouter } from "next/navigation";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  getAllExpandableIds,
  getSearchMatchingNodes,
  getSearchVisibleIds,
  hasChildLedgers,
  loadChartOfAccounts,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";
import { GENERAL_LEDGER_HREF, buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-data";
import { backfillCoaMasterLinks } from "@/lib/accounts/coa-master-link";
import { resolveCoaTreeSelectionNode } from "@/lib/accounts/coa-tree-children";
import { isPostableNode } from "@/lib/accounts/coa-hierarchy";
import {
  buildTdsPartyWiseReportHref,
  isTdsCoaNode,
} from "@/lib/accounts/tds-coa-utils";
import { ensureTdsAccountingLedgers } from "@/lib/accounts/tds-accounting";
import { backfillErpPartyLedgers } from "@/lib/accounts/erp-accounting-mapping";
import { subscribeCoaChanged } from "@/lib/accounts/coa-events";
import { useAccountsAccordion } from "./AccountsAccordionContext";

function defaultExpandedIds(records: ChartOfAccount[]): Set<number> {
  return new Set(
    records
      .filter((r) => r.nodeLevel === "primary_head" || r.nodeLevel === "account_group")
      .map((r) => r.id),
  );
}

function readCoaRecords(): ChartOfAccount[] {
  if (typeof window === "undefined") return [];
  return loadChartOfAccounts();
}

function routeNeedsCoaData(pathname: string): boolean {
  return (
    pathname.startsWith(CHART_OF_ACCOUNTS_HREF) ||
    pathname.startsWith(GENERAL_LEDGER_HREF) ||
    pathname.startsWith("/accounts/masters/") ||
    pathname.startsWith("/accounts/settings")
  );
}

/** Client-only URL params — avoids useSearchParams() Suspense/hydration mismatches in layout providers. */
function readClientSearchParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

interface CoaNavigationContextValue {
  records: ChartOfAccount[];
  setRecords: React.Dispatch<React.SetStateAction<ChartOfAccount[]>>;
  selectedId: number | null;
  selectedNode: ChartOfAccount | null;
  expandedIds: Set<number>;
  treeSearchTerm: string;
  setTreeSearchTerm: (value: string) => void;
  selectNode: (node: ChartOfAccount) => void;
  toggleExpand: (id: number) => void;
  expandAll: () => void;
  collapseAll: () => void;
  refreshRecords: () => void;
  isCoaRoute: boolean;
  coaReady: boolean;
  highlightedLedgerId: number | null;
  setHighlightedLedgerId: React.Dispatch<React.SetStateAction<number | null>>;
  ensureExpanded: (ids: number | number[]) => void;
}

const CoaNavigationContext = createContext<CoaNavigationContextValue | null>(null);

export function CoaNavigationProvider({
  children,
  initMode = "full",
}: {
  children: React.ReactNode;
  /** tree-only: sidebar COA tree without ERP/TDS backfill (fast). full: deferred backfill. */
  initMode?: "full" | "tree-only";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeAccountsSection } = useAccountsAccordion();
  const initRef = useRef(false);
  const recordsRef = useRef<ChartOfAccount[]>([]);

  const [records, setRecords] = useState<ChartOfAccount[]>([]);
  const [coaReady, setCoaReady] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const [treeSearchTerm, setTreeSearchTerm] = useState("");
  const [highlightedLedgerId, setHighlightedLedgerId] = useState<number | null>(null);

  const isCoaRoute = pathname.startsWith(CHART_OF_ACCOUNTS_HREF);
  const needsCoaData =
    routeNeedsCoaData(pathname) || activeAccountsSection === "coa";

  recordsRef.current = records;

  useEffect(() => {
    if (!needsCoaData || initRef.current) return;
    initRef.current = true;

    const showTree = () => {
      const loaded = readCoaRecords();
      setRecords(loaded);
      setExpandedIds(defaultExpandedIds(loaded));
      setCoaReady(true);
    };

    window.setTimeout(showTree, 0);

    if (initMode !== "full") return;

    const runBackfill = () => {
      backfillErpPartyLedgers();
      backfillCoaMasterLinks();
      ensureTdsAccountingLedgers();
      setRecords(readCoaRecords());
    };

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(runBackfill, { timeout: 3000 });
    } else {
      window.setTimeout(runBackfill, 250);
    }
  }, [needsCoaData, initMode]);

  const refreshRecords = useCallback(() => {
    if (!initRef.current) return;
    const loaded = readCoaRecords();
    setRecords(loaded);
  }, []);

  useEffect(() => {
    if (!coaReady || !needsCoaData) return;
    return subscribeCoaChanged(refreshRecords);
  }, [coaReady, needsCoaData, refreshRecords]);

  const selectedNode = useMemo(
    () => (selectedId != null ? records.find((r) => r.id === selectedId) ?? null : null),
    [records, selectedId],
  );

  const selectNode = useCallback(
    (node: ChartOfAccount) => {
      const resolved = resolveCoaTreeSelectionNode(records, node);
      if (isTdsCoaNode(resolved, records) && !pathname.startsWith(CHART_OF_ACCOUNTS_HREF)) {
        router.push(buildTdsPartyWiseReportHref(resolved, records));
        return;
      }
      setSelectedId(resolved.id);
      if (resolved.nodeLevel !== "ledger" || hasChildLedgers(records, resolved.id)) {
        setExpandedIds((prev) => new Set([...prev, resolved.id]));
      }
      const href = `${CHART_OF_ACCOUNTS_HREF}?node=${resolved.id}`;
      if (pathname.startsWith(CHART_OF_ACCOUNTS_HREF)) {
        router.replace(href, { scroll: false });
      } else if (resolved.nodeLevel === "ledger" && isPostableNode(resolved, records)) {
        router.push(buildGeneralLedgerHref(resolved.id));
      } else {
        router.push(href);
      }
    },
    [pathname, router, records],
  );

  useEffect(() => {
    if (!needsCoaData || !coaReady) return;

    const syncFromUrl = () => {
      const currentRecords = recordsRef.current;

      if (isCoaRoute) {
        const nodeParam = readClientSearchParam("node");
        if (nodeParam) {
          const id = Number(nodeParam);
          if (!Number.isNaN(id)) {
            const node = currentRecords.find((r) => r.id === id);
            if (node) {
              const resolved = resolveCoaTreeSelectionNode(currentRecords, node);
              setSelectedId((prev) => (prev === resolved.id ? prev : resolved.id));
              if (resolved.id !== id) {
                router.replace(`${CHART_OF_ACCOUNTS_HREF}?node=${resolved.id}`, {
                  scroll: false,
                });
              }
            } else {
              setSelectedId((prev) => (prev === id ? prev : id));
            }
          }
          return;
        }
        if (currentRecords.length > 0) {
          const firstHead = currentRecords
            .filter((r) => r.nodeLevel === "primary_head")
            .sort((a, b) => a.accountCode.localeCompare(b.accountCode))[0];
          if (firstHead) {
            router.replace(`${CHART_OF_ACCOUNTS_HREF}?node=${firstHead.id}`, { scroll: false });
          }
        }
        return;
      }

      if (pathname.startsWith(GENERAL_LEDGER_HREF)) {
        const ledgerParam = readClientSearchParam("ledger");
        if (ledgerParam) {
          const id = Number(ledgerParam);
          if (!Number.isNaN(id)) {
            setSelectedId((prev) => (prev === id ? prev : id));
          }
        }
        return;
      }

      setSelectedId((prev) => (prev === null ? prev : null));
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [isCoaRoute, pathname, router, needsCoaData, coaReady]);

  /** Tree search: expand ancestors of matches only — never change selection or URL. */
  useEffect(() => {
    if (!treeSearchTerm.trim() || !coaReady) return;

    const matching = getSearchMatchingNodes(records, treeSearchTerm);
    if (matching.length === 0) return;

    const visible = getSearchVisibleIds(records, treeSearchTerm);

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
  }, [treeSearchTerm, records, coaReady]);

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
      treeSearchTerm,
      setTreeSearchTerm,
      selectNode,
      toggleExpand,
      expandAll,
      collapseAll,
      refreshRecords,
      isCoaRoute,
      coaReady,
      highlightedLedgerId,
      setHighlightedLedgerId,
      ensureExpanded,
    }),
    [
      records,
      selectedId,
      selectedNode,
      expandedIds,
      treeSearchTerm,
      selectNode,
      toggleExpand,
      expandAll,
      collapseAll,
      refreshRecords,
      isCoaRoute,
      coaReady,
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
