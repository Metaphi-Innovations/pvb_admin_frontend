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
  getAncestorPath,
  getSearchMatchingNodes,
  getSearchVisibleIds,
  hasChildLedgers,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import {
  loadChartOfAccounts,
  loadChartOfAccountsCore,
} from "@/app/(app)/accounts/data";
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
import { ACCOUNTS_SECTION_SEEDED_EVENT } from "@/lib/accounts/accounts-section-seed";
import { useAccountsAccordion } from "./AccountsAccordionContext";

/**
 * Sidebar starts with primary heads only expanded — groups open on user click (ERP style).
 */
function defaultExpandedIds(records: ChartOfAccount[]): Set<number> {
  return new Set(records.filter((r) => r.nodeLevel === "primary_head").map((r) => r.id));
}

/** Expand ancestor path so a selected/deep node remains visible without preloading the full tree. */
function expandAncestorsOf(
  records: ChartOfAccount[],
  nodeId: number,
  prev: Set<number>,
): Set<number> {
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

function readCoaRecords(full = false): ChartOfAccount[] {
  if (typeof window === "undefined") return [];
  return full ? loadChartOfAccounts() : loadChartOfAccountsCore();
}

function scheduleOnIdle(fn: () => void, timeoutMs: number): void {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(fn, { timeout: timeoutMs });
  } else {
    window.setTimeout(fn, Math.min(timeoutMs, 500));
  }
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
  const backfillRef = useRef(false);
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
    if (!needsCoaData) return;

    let cancelled = false;

    const showTree = (full = false) => {
      if (cancelled) return;
      const loaded = readCoaRecords(full);
      setRecords(loaded);
      setExpandedIds((prev) => {
        const next = defaultExpandedIds(loaded);
        for (const id of prev) next.add(id);
        return next;
      });
      setCoaReady(true);
    };

    if (!initRef.current) {
      initRef.current = true;

      const loadInitial = () => {
        if (cancelled) return;
        showTree(false);
      };

      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(loadInitial);
        });
      } else {
        window.setTimeout(loadInitial, 32);
      }

      if (initMode === "full" && !backfillRef.current) {
        backfillRef.current = true;

        scheduleOnIdle(() => {
          if (cancelled) return;
          showTree(true);
        }, 3500);

        scheduleOnIdle(() => {
          if (cancelled) return;
          backfillErpPartyLedgers();
          backfillCoaMasterLinks();
          ensureTdsAccountingLedgers();
          showTree(true);
        }, 12000);
      }
    } else if (!coaReady) {
      showTree(false);
    }

    return () => {
      cancelled = true;
    };
  }, [needsCoaData, initMode, coaReady]);

  useEffect(() => {
    if (!needsCoaData) return;
    const onCoaSeeded = (e: Event) => {
      const groupId = (e as CustomEvent<{ groupId: string }>).detail?.groupId;
      if (groupId !== "coa") return;
      const loaded = readCoaRecords(true);
      if (loaded.length === 0) return;
      setRecords(loaded);
      setExpandedIds((prev) => {
        const next = defaultExpandedIds(loaded);
        for (const id of prev) next.add(id);
        return next;
      });
      setCoaReady(true);
    };
    window.addEventListener(ACCOUNTS_SECTION_SEEDED_EVENT, onCoaSeeded);
    return () => window.removeEventListener(ACCOUNTS_SECTION_SEEDED_EVENT, onCoaSeeded);
  }, [needsCoaData]);

  const refreshRecords = useCallback(() => {
    if (!initRef.current) return;
    const loaded = readCoaRecords(true);
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
              setExpandedIds((prev) => expandAncestorsOf(currentRecords, resolved.id, prev));
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
