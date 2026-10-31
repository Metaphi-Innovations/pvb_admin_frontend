"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  AccountsEditAction,
  AccountsMoreActions,
  AccountsTableActionCell,
  AccountsViewAction,
  ACCOUNTS_ACTION_BTN_CLASS,
  ACCOUNTS_ACTION_ICON_CLASS,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { Download, XCircle } from "lucide-react";
import {
  canDownloadDebitNoteOfficialPdf,
  openDebitNotePdfPreview,
} from "../../debit-notes/debit-note-official-pdf";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTableLoading,
  AccountsTablePagination,
  AccountsListingFilterCard,
} from "@/components/accounts/AccountsTableListing";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { noteWorkflowStatusToBadge } from "@/lib/accounts/accounts-status-badges";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  SectionTabs,
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "../../components/AccountsUI";
import {
  NotesListingFilterBar,
  NotesListHeaderActions,
  NOTES_MODULE_TABS,
  NOTES_STATUS_FILTER_OPTIONS,
  NOTES_STATUS_TABS,
  type NotesListingFilterState,
  uniqueOptionsFromValues,
} from "../../components/notes-listing-shared";
import type { ReportMultiSelectOption } from "@/lib/accounts/report-multi-filter-utils";
import { DebitNoteCancelDialog } from "../../debit-notes/components/DebitNoteCancelDialog";
import { PendingDebitNotesPanel } from "../../debit-notes/components/PendingDebitNotesPanel";
import { DEBIT_NOTE_SOURCE_LABELS, type DebitNoteRecord } from "../../debit-notes/debit-notes-data";
import {
  DEBIT_NOTES_LIST_PATH,
  debitNotesListHref,
  formatINR,
  parseDebitNotesModuleTab,
  parseDebitNotesStatusTab,
  type DebitNotesStatusTabId,
  withReturnTo,
} from "../../debit-notes/note-utils";
import {
  hasDocumentsListingFilters,
  parseDocumentsListingFiltersFromSearch,
} from "@/lib/accounts/documents-listing-filter-query";
import { DebitNoteService, mapDebitNoteToRecord } from "@/services/debit-note.service";
import { SupplierService, type SupplierDropdownItem } from "@/services/supplier.service";
import { WarehouseService, type WarehouseDropdownItem } from "@/services/warehouse.service";
import { showToast } from "@/lib/toast";
import { usePermissions } from "@/lib/auth/permissions-context";
import { canCreate, canEdit } from "@/lib/auth/permissions";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";
import {
  createDefaultDebitNoteRecordsListingState,
  useDebitNoteListingState,
} from "./debit-note-listing-state-context";

const LIST_PATH = DEBIT_NOTES_LIST_PATH;

function mapNotesStatusFilterToApi(status: string): string | undefined {
  switch (status) {
    case "draft":
      return "DRAFT";
    case "pending_approval":
      return "PENDING_APPROVAL";
    case "approved":
      return "APPROVED";
    case "posted":
      return "POSTED";
    case "cancelled":
      return "CANCELLED";
    case "reversed":
      return "REVERSED";
    case "rejected":
      return "REJECTED";
    default:
      return undefined;
  }
}

function getRowActions(status: string, approvalRequired: boolean): string[] {
  const s = status.toUpperCase();
  if (s === "DRAFT") {
    return approvalRequired
      ? ["edit", "submit", "cancel", "eway_bill"]
      : ["edit", "cancel", "eway_bill"];
  }
  if (s === "PENDING_APPROVAL") {
    return approvalRequired
      ? ["view", "approve", "reject", "cancel", "eway_bill"]
      : ["view", "cancel", "eway_bill"];
  }
  if (s === "APPROVED") {
    return ["view", "cancel", "eway_bill"];
  }
  if (s === "REJECTED") {
    return approvalRequired
      ? ["view", "edit", "submit", "cancel", "eway_bill"]
      : ["view", "edit", "cancel", "eway_bill"];
  }
  if (s === "POSTED") {
    return ["view", "cancel"];
  }
  return ["view"];
}

function NotesSortSync({
  sortKey,
  sortDir,
  columnFilters,
  onSortChange,
  onFilterChange,
}: {
  sortKey: string;
  sortDir: "asc" | "desc";
  columnFilters: Record<string, unknown>;
  onSortChange: (sortKey: string, sortDir: "asc" | "desc") => void;
  onFilterChange: (filters: Record<string, unknown>) => void;
}) {
  const ctx = useAccountsColumnFilterContext();

  useEffect(() => {
    if (!ctx) return;
    const nextKey = ctx.sortKey || "";
    const nextDir = ctx.sortDir ?? "asc";
    if (nextKey !== sortKey || (nextKey !== "" && nextDir !== sortDir)) {
      onSortChange(nextKey, nextDir);
    }
  }, [ctx?.sortKey, ctx?.sortDir, sortKey, sortDir, onSortChange]);

  useEffect(() => {
    if (!ctx) return;
    const ctxFiltersStr = JSON.stringify(ctx.columnFilters || {});
    const propFiltersStr = JSON.stringify(columnFilters || {});
    if (ctxFiltersStr !== propFiltersStr) {
      onFilterChange(ctx.columnFilters || {});
    }
  }, [ctx?.columnFilters, columnFilters, onFilterChange]);

  return null;
}

function DebitNotesRecordsTable({
  loading,
  error,
  toolbarFiltered,
  listReturnHref,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onCancel,
  onDownloadPdf,
  approvalRequired,
  hasCreatePermission,
  hasUpdatePermission,
}: {
  loading: boolean;
  error: string | null;
  toolbarFiltered: DebitNoteRecord[];
  listReturnHref: string;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onCancel: (r: DebitNoteRecord) => void;
  onDownloadPdf: (r: DebitNoteRecord) => void;
  approvalRequired: boolean;
  hasCreatePermission: boolean;
  hasUpdatePermission: boolean;
}) {
  const visible = useAccountsFilteredRows(toolbarFiltered);
  const ctx = useAccountsColumnFilterContext();
  // Full filtered set is loaded; column sort/filter apply across all rows, then paginate.
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, page, pageSize]);

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (
    <>
      <AccountsTable minWidth={1180}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="DN No." colKey="debitNoteNo" />
            <SortTh label="Source" colKey="source" />
            {/* Against PI — hidden while DN against Purchase Invoice is not used
            <SortTh label="Against PI" colKey="sourceInvoiceNo" />
            */}
            <SortTh label="Supplier" colKey="vendorName" className="accounts-col-party" />
            <SortTh label="Warehouse" colKey="branch" />
            <SortTh label="Date" colKey="debitNoteDate" filterType="date" />
            <SortTh label="Taxable" colKey="taxableAmount" filterType="amount" align="right" />
            <SortTh label="CGST" colKey="cgstAmount" filterType="amount" align="right" />
            <SortTh label="SGST" colKey="sgstAmount" filterType="amount" align="right" />
            <SortTh label="IGST" colKey="igstAmount" filterType="amount" align="right" />
            <SortTh label="Total" colKey="currentDebitAmount" filterType="amount" align="right" className="min-w-[6.5rem]" />
            <SortTh
              label="Status"
              colKey="status"
              filterType="status"
              statusOptions={["Draft", "Pending Approval", "Approved", "Posted", "Rejected", "Cancelled", "Reversed"]}
            />
            <AccountsColumnHeader
              label="Actions"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className={accountsActionColClass("multi")}
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {error ? (
            <AccountsTableEmpty colSpan={12} message={error} />
          ) : loading && toolbarFiltered.length === 0 ? (
            <AccountsTableLoading colSpan={12} message="Loading debit notes…" />
          ) : toolbarFiltered.length === 0 ? (
            <AccountsTableEmpty colSpan={12} message="No debit notes found." />
          ) : visible.length === 0 ? (
            <AccountsTableEmpty colSpan={12} message="No records match the column filters." />
          ) : (
            pagedRows.map((r) => {
              const badge = noteWorkflowStatusToBadge(r.status);
              const actions = getRowActions(r.status, approvalRequired);
              const canEditRow = actions.includes("edit") && hasUpdatePermission;
              const isPosted = r.status?.toUpperCase() === "POSTED";
              const canCancelRow =
                actions.includes("cancel") &&
                hasCreatePermission &&
                (!isPosted || r.canReverse !== false);

              return (
                <AccountsTableRow key={r.id}>
                  <AccountsTableCell mono>
                    <Link
                      href={withReturnTo(`${LIST_PATH}/${r.id}`, listReturnHref)}
                      className="hover:underline font-mono text-xs font-semibold text-brand-700"
                    >
                      {r.debitNoteNo}
                    </Link>
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs">
                    {DEBIT_NOTE_SOURCE_LABELS[r.source] ?? "—"}
                  </AccountsTableCell>
                  {/* Against PI cell — hidden while DN against Purchase Invoice is not used
                  <AccountsTableCell mono className="truncate text-xs">
                    {r.sourceInvoiceNo || "—"}
                  </AccountsTableCell>
                  */}
                  <AccountsTableCell className="accounts-col-party font-medium truncate text-xs" title={r.vendorName}>
                    {r.vendorName}
                  </AccountsTableCell>
                  <AccountsTableCell className="truncate text-xs">
                    {r.branch || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell className="tabular-nums text-xs">
                    {formatDisplayDate(r.debitNoteDate)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">
                    {formatINR(r.taxableAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">
                    {formatINR(r.cgstAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">
                    {formatINR(r.sgstAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">
                    {formatINR(r.igstAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs font-medium">
                    {formatINR(r.currentDebitAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <StatusBadge status={badge.status} label={badge.label} size="sm" />
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                    <AccountsTableActionCell>
                      <AccountsViewAction
                        href={withReturnTo(`${LIST_PATH}/${r.id}`, listReturnHref)}
                      />
                      {canDownloadDebitNoteOfficialPdf(r.status) ? (
                        <button
                          type="button"
                          title="Download PDF"
                          className={ACCOUNTS_ACTION_BTN_CLASS}
                          onClick={() => onDownloadPdf(r)}
                        >
                          <Download className={ACCOUNTS_ACTION_ICON_CLASS} />
                        </button>
                      ) : null}
                      {canEditRow && (
                        <AccountsEditAction
                          href={withReturnTo(
                            `${LIST_PATH}/${r.id}/edit`,
                            listReturnHref,
                          )}
                        />
                      )}
                      {canCancelRow && (
                        <AccountsMoreActions contentClassName="w-44">
                          <DropdownMenuItem
                            className="text-xs gap-2 text-red-600"
                            onClick={() => onCancel(r)}
                          >
                            <XCircle className="w-4 h-4" /> Cancel
                          </DropdownMenuItem>
                        </AccountsMoreActions>
                      )}
                    </AccountsTableActionCell>
                  </AccountsTableCell>
                </AccountsTableRow>
              );
            })
          )}
        </AccountsTableBody>
      </AccountsTable>
      {!loading && visible.length > 0 ? (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={visible.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          recordLabel="debit notes"
        />
      ) : null}
    </>
  );
}

export default function DebitNotesListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useClientMounted();
  const { permissions } = usePermissions();
  const {
    records: listing,
    setRecords: setListing,
    recordsFilterEpoch,
    setRecordsFilterEpoch,
  } = useDebitNoteListingState();

  const hasCreatePermission = useMemo(() => canCreate(permissions, "accounts", "debit_note"), [permissions]);
  const hasUpdatePermission = useMemo(() => canEdit(permissions, "accounts", "debit_note"), [permissions]);

  const moduleTab =
    parseDebitNotesModuleTab(searchParams.get("tab")) ?? "pending";
  const urlStatusTab =
    parseDebitNotesStatusTab(searchParams.get("status")) ?? "all";
  const statusTab = listing.statusTab;
  const listReturnHref = debitNotesListHref(moduleTab, statusTab);

  const filters = listing.filters;
  const page = listing.page;
  const pageSize = listing.pageSize;
  const wasRecordsRef = useRef(moduleTab === "records");
  const deepLinkedStatusRef = useRef(false);

  // Deep link: adopt ?status= once on first records view.
  useEffect(() => {
    if (deepLinkedStatusRef.current) return;
    if (moduleTab !== "records") return;
    deepLinkedStatusRef.current = true;
    if (urlStatusTab === listing.statusTab) return;
    setListing((prev) => ({ ...prev, statusTab: urlStatusTab, page: 1 }));
  }, [moduleTab, urlStatusTab, listing.statusTab, setListing]);

  // Pending → All: restore secondary status into the URL from persisted listing state.
  useEffect(() => {
    const wasRecords = wasRecordsRef.current;
    wasRecordsRef.current = moduleTab === "records";
    if (moduleTab !== "records" || wasRecords) return;
    if (urlStatusTab === listing.statusTab) return;
    router.replace(debitNotesListHref("records", listing.statusTab), {
      scroll: false,
    });
  }, [moduleTab, urlStatusTab, listing.statusTab, router]);
  const setFilters = useCallback(
    (updater: SetStateAction<NotesListingFilterState>) => {
      setListing((prev) => {
        const nextFilters =
          typeof updater === "function" ? updater(prev.filters) : updater;
        if (nextFilters === prev.filters) return prev;
        return { ...prev, filters: nextFilters };
      });
    },
    [setListing],
  );
  const setPage = useCallback(
    (next: SetStateAction<number>) => {
      setListing((prev) => {
        const pageValue = typeof next === "function" ? next(prev.page) : next;
        if (pageValue === prev.page) return prev;
        return { ...prev, page: pageValue };
      });
    },
    [setListing],
  );
  const setPageSize = useCallback(
    (next: SetStateAction<number>) => {
      setListing((prev) => {
        const pageSizeValue =
          typeof next === "function" ? next(prev.pageSize) : next;
        if (pageSizeValue === prev.pageSize) return prev;
        return { ...prev, pageSize: pageSizeValue, page: 1 };
      });
    },
    [setListing],
  );

  const [records, setRecords] = useState<DebitNoteRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    all: 0,
    draft: 0,
    posted: 0,
    cancelled: 0,
    reversed: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<DebitNoteRecord | null>(null);
  const [exporting, setExporting] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(true);

  const [supplierList, setSupplierList] = useState<SupplierDropdownItem[]>([]);
  const [warehouseList, setWarehouseList] = useState<WarehouseDropdownItem[]>([]);
  const [mastersLoaded, setMastersLoaded] = useState(false);

  const sectionRefresh = useAccountsSectionRefresh("debit-notes", { apiListing: true });
  const [manualRefreshTick, setManualRefreshTick] = useState(0);
  const listRefreshTick = sectionRefresh + manualRefreshTick;
  const listFiltersKeyRef = useRef("");

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  // Masters & config only when All tab is used (or already cached)
  useEffect(() => {
    if (!mounted || moduleTab !== "records" || mastersLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const [suppliers, warehouses, cfg] = await Promise.all([
          SupplierService.dropdown(),
          WarehouseService.dropdown(),
          DebitNoteService.getConfig().catch(() => null),
        ]);
        if (cancelled) return;
        setSupplierList(suppliers);
        setWarehouseList(warehouses);
        if (cfg) setApprovalRequired(cfg.approval_required);
        setMastersLoaded(true);
      } catch {
        if (!cancelled) setMastersLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, moduleTab, mastersLoaded]);

  const listFiltersKey = useMemo(
    () =>
      JSON.stringify({
        search: debouncedSearch.trim(),
        parties: filters.parties,
        branches: filters.branches,
        sources: filters.sources,
        statusFilter: filters.status,
        voucherNo: filters.voucherNo.trim(),
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }),
    [
      debouncedSearch,
      filters.parties,
      filters.branches,
      filters.sources,
      filters.status,
      filters.voucherNo,
      filters.dateFrom,
      filters.dateTo,
    ],
  );

  /** Avoid re-fetching All when masters finish loading unless party/branch filters need id mapping. */
  const mastersGate =
    filters.parties.length > 0 || filters.branches.length > 0
      ? mastersLoaded
        ? "ready"
        : "wait"
      : "na";

  // Reset to page 1 when list filters change (not when page alone changes)
  useEffect(() => {
    setPage((p) => (p === 1 ? p : 1));
  }, [listFiltersKey]);

  // All-tab list: load full filtered set (API pages of 100) so column sort/filter work globally.
  useEffect(() => {
    if (!mounted || moduleTab !== "records") return;
    if (mastersGate === "wait") return;
    listFiltersKeyRef.current = listFiltersKey;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const selectedSupplierIds = supplierList
          .filter((s) => filters.parties.includes(s.supplier_name))
          .map((s) => s.supplier_id)
          .filter(Boolean);

        const selectedWarehouseIds = warehouseList
          .filter((w) => filters.branches.includes(w.warehouse_name))
          .map((w) => w.warehouse_id)
          .filter(Boolean);

        const sourceTypes = filters.sources
          .map((label) => {
            if (label === "Direct") return "DIRECT" as const;
            if (label === "Purchase Return") return "PURCHASE_RETURN" as const;
            return null;
          })
          .filter((v): v is "DIRECT" | "PURCHASE_RETURN" => v != null);

        // Load all statuses so secondary tabs can filter client-side with stable counts.
        const moreFilterStatus = mapNotesStatusFilterToApi(filters.status);

        const baseQuery = {
          search: debouncedSearch.trim() || undefined,
          supplier_ids: selectedSupplierIds.length ? selectedSupplierIds : undefined,
          warehouse_ids: selectedWarehouseIds.length ? selectedWarehouseIds : undefined,
          source_types: sourceTypes.length ? sourceTypes : undefined,
          status: moreFilterStatus as any,
          dn_number: filters.voucherNo.trim() || undefined,
          from_date: filters.dateFrom || undefined,
          to_date: filters.dateTo || undefined,
        };

        const FETCH_PAGE_SIZE = 100;
        const first = await DebitNoteService.list({
          ...baseQuery,
          page: 1,
          page_size: FETCH_PAGE_SIZE,
        });
        if (cancelled) return;

        const allItems = [...(first.items ?? [])];
        const total = first.pagination?.total ?? allItems.length;
        const totalPages = Math.max(1, Math.ceil(total / FETCH_PAGE_SIZE));
        for (let p = 2; p <= totalPages; p++) {
          const next = await DebitNoteService.list({
            ...baseQuery,
            page: p,
            page_size: FETCH_PAGE_SIZE,
          });
          if (cancelled) return;
          allItems.push(...(next.items ?? []));
        }

        const mappedRecords = allItems.map(mapDebitNoteToRecord);
        setRecords(mappedRecords);
        setTotalRecords(mappedRecords.length);
        const nextCounts: Record<string, number> = {
          all: mappedRecords.length,
          draft: 0,
          posted: 0,
          cancelled: 0,
          reversed: 0,
        };
        mappedRecords.forEach((r) => {
          const st = String(r.status || "").toLowerCase();
          if (st === "draft") nextCounts.draft += 1;
          else if (st === "posted" || st === "approved") nextCounts.posted += 1;
          else if (st === "cancelled") nextCounts.cancelled += 1;
          else if (st === "reversed") nextCounts.reversed += 1;
        });
        setStatusCounts(nextCounts);
      } catch (e: any) {
        if (cancelled) return;
        setError(e.message || "Failed to load Debit Notes.");
        setRecords([]);
        setTotalRecords(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mounted,
    moduleTab,
    listFiltersKey,
    listRefreshTick,
    mastersGate,
    filters.parties.length > 0 ? supplierList : null,
    filters.branches.length > 0 ? warehouseList : null,
  ]);

  // Always fetch pending count on mount and refresh ticks so the Pending badge is accurate on all tabs
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await DebitNoteService.listPending({ page: 1, page_size: 1, status: "PENDING" });
        if (!cancelled && res?.pagination?.total != null) {
          setPendingCount(res.pagination.total);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, listRefreshTick]);

  const refreshRecords = useCallback(() => {
    setManualRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const qs = searchParams.toString();
    if (!hasDocumentsListingFilters(qs)) return;
    const parsed = parseDocumentsListingFiltersFromSearch(qs);
    if (parsed.dateFrom || parsed.dateTo || parsed.branch) {
      setFilters((prev) => ({
        ...prev,
        ...(parsed.dateFrom
          ? { dateFrom: parsed.dateFrom, preset: "custom" as const }
          : {}),
        ...(parsed.dateTo
          ? { dateTo: parsed.dateTo, preset: "custom" as const }
          : {}),
        ...(parsed.branch ? { branches: [parsed.branch] } : {}),
      }));
    }
    if (moduleTab !== "records") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "records");
      router.replace(`${LIST_PATH}?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, setFilters, moduleTab, router]);

  const handleModuleTabChange = useCallback(
    (tab: string) => {
      router.push(
        debitNotesListHref(tab, tab === "records" ? listing.statusTab : null),
        { scroll: false },
      );
    },
    [router, listing.statusTab],
  );

  const handleStatusTabChange = useCallback(
    (tab: string) => {
      const next = (parseDebitNotesStatusTab(tab) ?? "all") as DebitNotesStatusTabId;
      setListing((prev) =>
        prev.statusTab === next && prev.page === 1
          ? prev
          : { ...prev, statusTab: next, page: 1 },
      );
      router.push(debitNotesListHref("records", next), { scroll: false });
    },
    [router, setListing],
  );

  const branchOptions = useMemo(
    () => uniqueOptionsFromValues(warehouseList.map((w) => w.warehouse_name)),
    [warehouseList],
  );
  const partyOptions = useMemo(
    () => uniqueOptionsFromValues(supplierList.map((s) => s.supplier_name)),
    [supplierList],
  );
  const sourceOptions: ReportMultiSelectOption[] = [
    { value: "Direct", label: "Direct" },
    { value: "Purchase Return", label: "Purchase Return" },
  ];

  const toolbarFiltered = useMemo(() => {
    let list = records;
    if (statusTab === "draft") {
      list = list.filter((r) => String(r.status || "").toUpperCase() === "DRAFT");
    } else if (statusTab === "posted") {
      list = list.filter((r) => {
        const st = String(r.status || "").toUpperCase();
        return st === "POSTED" || st === "APPROVED";
      });
    } else if (statusTab === "cancelled") {
      list = list.filter((r) => String(r.status || "").toUpperCase() === "CANCELLED");
    } else if (statusTab === "reversed") {
      list = list.filter((r) => String(r.status || "").toUpperCase() === "REVERSED");
    }

    const apiStatus = mapNotesStatusFilterToApi(filters.status);
    if (!apiStatus) return list;
    return list.filter(
      (r) => String(r.status || "").toUpperCase() === apiStatus,
    );
  }, [records, filters.status, statusTab]);

  const getCellValue = useCallback((row: DebitNoteRecord, key: string) => {
    if (key === "source") return DEBIT_NOTE_SOURCE_LABELS[row.source] ?? "—";
    if (key === "branch") return row.branch;
    if (key === "status") {
      const badge = noteWorkflowStatusToBadge(row.status);
      return badge.label;
    }
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      debitNoteNo: { type: "text" as const },
      source: { type: "text" as const },
      // sourceInvoiceNo: { type: "text" as const }, // Against PI — unused
      vendorName: { type: "text" as const },
      branch: { type: "text" as const },
      debitNoteDate: { type: "date" as const },
      taxableAmount: { type: "amount" as const },
      cgstAmount: { type: "amount" as const },
      sgstAmount: { type: "amount" as const },
      igstAmount: { type: "amount" as const },
      currentDebitAmount: { type: "amount" as const },
      status: { type: "text" as const },
    }),
    [],
  );

  const handleExport = async () => {
    if (!toolbarFiltered.length) return;
    setExporting(true);
    try {
      const { exportDebitNotesToExcel } = await import("@/app/(app)/accounts/debit-notes/debit-notes-export");
      await exportDebitNotesToExcel(toolbarFiltered);
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setListing(createDefaultDebitNoteRecordsListingState());
    setRecordsFilterEpoch((n) => n + 1);
    router.push(debitNotesListHref("records", "all"), { scroll: false });
  };

  const handleSortChange = useCallback(
    (sortKey: string, sortDir: "asc" | "desc") => {
      setListing((prev) => ({ ...prev, sortKey, sortDir, page: 1 }));
    },
    [setListing],
  );

  const handleColumnFilterChange = useCallback(
    (columnFilters: Record<string, unknown>) => {
      setListing((prev) => ({ ...prev, columnFilters, page: 1 }));
    },
    [setListing],
  );

  const handleHeaderRefresh = () => {
    setManualRefreshTick((t) => t + 1);
  };

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", "Debit Notes")}
        title="Debit Notes"
        description="Supplier adjustments — pending purchase returns and fresh debit notes."
        hideDescription
        actions={
          <NotesListHeaderActions
            onRefresh={handleHeaderRefresh}
            onExportExcel={moduleTab === "records" ? handleExport : undefined}
            exportDisabled={exporting || toolbarFiltered.length === 0}
            createLabel="Create Debit Note"
            onCreate={() =>
              router.push(
                withReturnTo(`${LIST_PATH}/new?mode=fresh`, listReturnHref),
              )
            }
          />
        }
        layout="split"
        className="h-full min-h-0"
      >
        <div className="flex flex-col flex-1 min-h-0 gap-1.5 overflow-hidden">
          <SectionTabs
            tabs={[...NOTES_MODULE_TABS]}
            active={moduleTab}
            onChange={handleModuleTabChange}
            counts={{ pending: pendingCount, records: statusCounts.all }}
            compact
          />

          {moduleTab === "pending" ? (
            <PendingDebitNotesPanel
              onCountChange={setPendingCount}
              refreshTick={listRefreshTick}
            />
          ) : (
            <AccountsColumnFilterProvider
              key={`records-${recordsFilterEpoch}`}
              rows={toolbarFiltered}
              getCellValue={getCellValue}
              columnConfig={columnConfig}
              defaultSortKey="debitNoteDate"
              defaultSortDir="desc"
              initialColumnFilters={listing.columnFilters as Record<string, any>}
              initialSortKey={listing.sortKey || null}
              initialSortDir={listing.sortDir || "desc"}
            >
              <NotesSortSync
                sortKey={listing.sortKey}
                sortDir={listing.sortDir}
                columnFilters={listing.columnFilters}
                onSortChange={handleSortChange}
                onFilterChange={handleColumnFilterChange}
              />
              <AccountsTableListing
                subheader={
                  <SectionTabs
                    tabs={[...NOTES_STATUS_TABS]}
                    active={statusTab}
                    onChange={handleStatusTabChange}
                    counts={statusCounts}
                    compact
                  />
                }
                toolbar={
                  <AccountsListingFilterCard>
                    <NotesListingFilterBar
                      filters={filters}
                      partyLabel="Vendor"
                      branchOptions={branchOptions}
                      partyOptions={partyOptions}
                      sourceOptions={sourceOptions}
                      statusOptions={NOTES_STATUS_FILTER_OPTIONS}
                      searchPlaceholder="Search DN no., supplier, invoice, return…"
                      showInvoiceNoFilter={false}
                      onChange={(patch) => {
                        setPage(1);
                        setFilters((prev) => ({ ...prev, ...patch }));
                      }}
                      onReset={handleResetFilters}
                    />
                  </AccountsListingFilterCard>
                }
              >
                <DebitNotesRecordsTable
                  loading={loading}
                  error={error}
                  toolbarFiltered={toolbarFiltered}
                  listReturnHref={listReturnHref}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  onCancel={setCancelTarget}
                  onDownloadPdf={(r) => {
                    void openDebitNotePdfPreview(String(r.id)).catch((e: unknown) => {
                      const message =
                        e instanceof Error ? e.message : "Failed to open Debit Note PDF.";
                      showToast(message, "error");
                    });
                  }}
                  approvalRequired={approvalRequired}
                  hasCreatePermission={hasCreatePermission}
                  hasUpdatePermission={hasUpdatePermission}
                />
              </AccountsTableListing>
            </AccountsColumnFilterProvider>
          )}
        </div>
      </AccountsPageShell>

      <DebitNoteCancelDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        debitNoteNo={cancelTarget?.debitNoteNo ?? ""}
        mode={
          cancelTarget?.status?.toUpperCase() === "POSTED" ? "reverse" : "cancel"
        }
        onConfirm={async (reason) => {
          if (!cancelTarget) return;
          const isPosted = cancelTarget.status?.toUpperCase() === "POSTED";
          try {
            if (isPosted) {
              const res = await DebitNoteService.reverse(cancelTarget.id, { reason });
              if (res?.already_reversed) {
                showToast("This Debit Note was already reversed.", "info");
              } else {
                showToast("Debit Note reversed successfully.", "success");
              }
            } else {
              await DebitNoteService.cancel(cancelTarget.id, { reason });
              showToast("Debit Note cancelled successfully.", "success");
            }
            refreshRecords();
          } catch (e: any) {
            showToast(
              e.message ||
                (isPosted
                  ? "Unable to reverse Debit Note."
                  : "Failed to cancel Debit Note."),
              "error",
            );
          }
          setCancelTarget(null);
        }}
      />
    </>
  );
}
