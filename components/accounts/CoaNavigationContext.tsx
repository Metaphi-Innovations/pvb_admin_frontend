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
import { useQueryClient } from "@tanstack/react-query";
import type { ChartOfAccount, CoaNodeId } from "@/app/(app)/accounts/data";
import {
  getAllExpandableIds,
  getAncestorPath,
  hasChildLedgers,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";
import { GENERAL_LEDGER_HREF } from "@/lib/accounts/general-ledger-data";
import { resolveCoaTreeSelectionNode } from "@/lib/accounts/coa-tree-children";
import { getCoaSidebarExpandableIds } from "@/lib/accounts/coa-sidebar-tree";
import {
  buildTdsPartyWiseReportHref,
  isTdsCoaNode,
} from "@/lib/accounts/tds-coa-utils";
import {
  chartOfAccountsKeys,
  useChartOfAccountsTree,
} from "@/hooks/accounts/use-chart-of-accounts";
import { useAccountsAccordion } from "./AccountsAccordionContext";

const TREE_SEARCH_DEBOUNCE_MS = 350;

/**
 * Sidebar starts with primary heads only expanded — groups open on user click (ERP style).
 */
function defaultExpandedIds(records: ChartOfAccount[]): Set<CoaNodeId> {
  return new Set(records.filter((r) => r.nodeLevel === "primary_head").map((r) => r.id));
}

/** Expand ancestor path so a selected/deep node remains visible without preloading the full tree. */
function expandAncestorsOf(
  records: ChartOfAccount[],
  nodeId: CoaNodeId,
  prev: Set<CoaNodeId>,
): Set<CoaNodeId> {
  const path = getAncestorPath(records, nodeId);
  if (path.length <= 1) return prev;
  const next = new Set(prev);
  let changed = false;
  for (let i = 0; i < path.length - 1; i++) {
    if (!next.has(path[i].id)) {
      next.add(path[i].id);
      changed = true;
    }
  }
  return changed ? next : prev;
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

/** Resolve ?node= / ?ledger= against API UUIDs or legacy numeric ids. */
function resolveNodeIdParam(
  param: string,
  records: ChartOfAccount[],
): CoaNodeId | null {
  const byString = records.find((r) => String(r.id) === param);
  if (byString) return byString.id;
  const asNumber = Number(param);
  if (!Number.isNaN(asNumber)) {
    const byNumber = records.find((r) => r.id === asNumber);
    if (byNumber) return byNumber.id;
    return asNumber;
  }
  return null;
}

interface CoaNavigationContextValue {
  records: ChartOfAccount[];
  setRecords: React.Dispatch<React.SetStateAction<ChartOfAccount[]>>;
  selectedId: CoaNodeId | null;
  selectedNode: ChartOfAccount | null;
  expandedIds: Set<CoaNodeId>;
  treeSearchTerm: string;
  setTreeSearchTerm: (value: string) => void;
  /** Debounced term sent to the COA tree API */
  treeSearchQuery: string;
  isTreeSearching: boolean;
  selectNode: (node: ChartOfAccount) => void;
  toggleExpand: (id: CoaNodeId) => void;
  expandAll: () => void;
  collapseAll: () => void;
  refreshRecords: () => void;
  isCoaRoute: boolean;
  coaReady: boolean;
  coaError: string | null;
  highlightedLedgerId: CoaNodeId | null;
  setHighlightedLedgerId: React.Dispatch<React.SetStateAction<CoaNodeId | null>>;
  ensureExpanded: (ids: CoaNodeId | CoaNodeId[]) => void;
}

const CoaNavigationContext = createContext<CoaNavigationContextValue | null>(null);

export function CoaNavigationProvider({
  children,
  initMode = "full",
}: {
  children: React.ReactNode;
  /** Kept for call-site compatibility; COA tree always loads from the Accounts API. */
  initMode?: "full" | "tree-only";
}) {
  void initMode;
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { activeAccountsSection } = useAccountsAccordion();
  const recordsRef = useRef<ChartOfAccount[]>([]);

  const [selectedId, setSelectedId] = useState<CoaNodeId | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<CoaNodeId>>(() => new Set());
  const [treeSearchTerm, setTreeSearchTerm] = useState("");
  const [treeSearchQuery, setTreeSearchQuery] = useState("");
  const [highlightedLedgerId, setHighlightedLedgerId] = useState<CoaNodeId | null>(null);
  /** Local override after create/delete while an API refetch is in flight. */
  const [localRecords, setLocalRecords] = useState<ChartOfAccount[] | null>(null);

  const isCoaRoute = pathname.startsWith(CHART_OF_ACCOUNTS_HREF);
  const needsCoaData =
    routeNeedsCoaData(pathname) || activeAccountsSection === "coa";

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setTreeSearchQuery(treeSearchTerm.trim());
    }, TREE_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [treeSearchTerm]);

  const {
    data: apiRecords,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useChartOfAccountsTree({
    enabled: needsCoaData,
    includeLedgers: true,
    search: treeSearchQuery || undefined,
  });

  const records = localRecords ?? apiRecords ?? [];
  recordsRef.current = records;

  const isTreeSearching =
    treeSearchTerm.trim() !== treeSearchQuery ||
    (Boolean(treeSearchQuery) && isFetching);

  const coaReady = needsCoaData && !isLoading && (apiRecords != null || isError);
  const coaError = isError
    ? error instanceof Error
      ? error.message
      : "Failed to load chart of accounts"
    : null;

  useEffect(() => {
    if (!apiRecords) return;
    setLocalRecords(null);
    setExpandedIds((prev) => {
      const next = defaultExpandedIds(apiRecords);
      for (const id of prev) next.add(id);
      return next;
    });
  }, [apiRecords]);

  const refreshRecords = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.all });
    void refetch();
  }, [queryClient, refetch]);

  const setRecords = useCallback((action: React.SetStateAction<ChartOfAccount[]>) => {
    setLocalRecords((prev) => {
      const base = prev ?? recordsRef.current;
      return typeof action === "function" ? action(base) : action;
    });
  }, []);

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
      setExpandedIds((prev) => {
        let next = expandAncestorsOf(records, resolved.id, prev);
        if (resolved.nodeLevel !== "ledger" || hasChildLedgers(records, resolved.id)) {
          if (!next.has(resolved.id)) {
            next = new Set(next);
            next.add(resolved.id);
          }
        }
        return next;
      });
      const href = `${CHART_OF_ACCOUNTS_HREF}?node=${encodeURIComponent(String(resolved.id))}`;
      if (pathname.startsWith(CHART_OF_ACCOUNTS_HREF)) {
        router.replace(href, { scroll: false });
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
          const id = resolveNodeIdParam(nodeParam, currentRecords);
          if (id == null) return;
          const node = currentRecords.find((r) => r.id === id);
          if (node) {
            const resolved = resolveCoaTreeSelectionNode(currentRecords, node);
            setSelectedId((prev) => (prev === resolved.id ? prev : resolved.id));
            setExpandedIds((prev) => expandAncestorsOf(currentRecords, resolved.id, prev));
            if (String(resolved.id) !== nodeParam) {
              router.replace(
                `${CHART_OF_ACCOUNTS_HREF}?node=${encodeURIComponent(String(resolved.id))}`,
                { scroll: false },
              );
            }
          } else {
            setSelectedId((prev) => (prev === id ? prev : id));
          }
          return;
        }
        setSelectedId(null);
        return;
      }

      if (pathname.startsWith(GENERAL_LEDGER_HREF)) {
        const ledgerParam = readClientSearchParam("ledger");
        if (ledgerParam) {
          const id = resolveNodeIdParam(ledgerParam, currentRecords);
          if (id != null) {
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
  }, [isCoaRoute, pathname, router, needsCoaData, coaReady, apiRecords]);

  /** Backend search returns a pruned tree — expand all returned branches so matches are visible. */
  useEffect(() => {
    if (!treeSearchQuery || !coaReady || records.length === 0) return;

    setExpandedIds(
      new Set(
        isCoaRoute || activeAccountsSection === "coa"
          ? getCoaSidebarExpandableIds(records)
          : getAllExpandableIds(records),
      ),
    );
  }, [treeSearchQuery, records, coaReady, isCoaRoute, activeAccountsSection]);

  const toggleExpand = useCallback((id: CoaNodeId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const ensureExpanded = useCallback((ids: CoaNodeId | CoaNodeId[]) => {
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
    setExpandedIds(
      new Set(
        isCoaRoute || activeAccountsSection === "coa"
          ? getCoaSidebarExpandableIds(records)
          : getAllExpandableIds(records),
      ),
    );
  }, [records, isCoaRoute, activeAccountsSection]);

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
      treeSearchQuery,
      isTreeSearching,
      selectNode,
      toggleExpand,
      expandAll,
      collapseAll,
      refreshRecords,
      isCoaRoute,
      coaReady,
      coaError,
      highlightedLedgerId,
      setHighlightedLedgerId,
      ensureExpanded,
    }),
    [
      records,
      setRecords,
      selectedId,
      selectedNode,
      expandedIds,
      treeSearchTerm,
      treeSearchQuery,
      isTreeSearching,
      selectNode,
      toggleExpand,
      expandAll,
      collapseAll,
      refreshRecords,
      isCoaRoute,
      coaReady,
      coaError,
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
