"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  AccountsEditAction,
  AccountsMoreActions,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { XCircle } from "lucide-react";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
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
import { useReportDateRange } from "@/components/accounts/ReportFilters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { useClientMounted } from "@/lib/use-client-mounted";
import type { StatusKey } from "@/lib/tokens";
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
  resetNotesListingFilters,
  uniqueOptionsFromValues,
  matchesMulti,
} from "../../components/notes-listing-shared";
import { CreditNoteCancelDialog } from "../../credit-notes/components/CreditNoteCancelDialog";
import { CreditNoteReverseDialog } from "../../credit-notes/components/CreditNoteReverseDialog";
import { PendingCreditNotesPanel } from "../../credit-notes/components/PendingCreditNotesPanel";
import {
  CreditNoteListApi,
  creditNoteListApiError,
  type CreditNoteListApiRow,
} from "../../credit-notes/credit-note-list-api";
import { CREDIT_NOTES_LIST_PATH, formatINR } from "../../credit-notes/note-utils";
import {
  hasDocumentsListingFilters,
  parseDocumentsListingFiltersFromSearch,
} from "@/lib/accounts/documents-listing-filter-query";

const LIST_PATH = CREDIT_NOTES_LIST_PATH;

const CN_SOURCE_LABELS: Record<string, string> = {
  DIRECT: "Direct",
  SALES_INVOICE: "Sales Invoice",
  SALES_RETURN: "Sales Return",
  CASH_DISCOUNT: "Cash Discount",
  SPECIAL_SCHEME: "Special Scheme",
  TURNOVER_DISCOUNT: "Turnover Discount",
  NEAR_EXPIRY: "Near Expiry",
};

type CreditNoteListRow = {
  credit_note_id: string;
  cn_number: string;
  source_type: string;
  invoiceNos: string[];
  customerName: string;
  warehouse: string;
  creditNoteDate: string;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  currentCreditAmount: number;
  status: string;
};

function uniqueInvoiceCodes(raw: CreditNoteListApiRow): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const ref of raw.references ?? []) {
    if (ref.reference_type !== "SALES_INVOICE") continue;
    const code = ref.reference_code?.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

function toNum(value: unknown, fallback = 0): number {
  if (value == null || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function toDate(value: unknown): string {
  if (!value) return "";
  const s = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
}

function mapCreditNoteListRow(raw: CreditNoteListApiRow): CreditNoteListRow {
  return {
    credit_note_id: raw.credit_note_id,
    cn_number: raw.cn_number || "—",
    source_type: raw.source_type || "",
    invoiceNos: uniqueInvoiceCodes(raw),
    customerName: raw.customer?.customer_name || "",
    warehouse: raw.warehouse?.warehouse_name || "",
    creditNoteDate: toDate(raw.cn_date),
    taxableValue: toNum(raw.taxable_amount),
    cgstAmount: toNum(raw.cgst_amount),
    sgstAmount: toNum(raw.sgst_amount),
    igstAmount: toNum(raw.igst_amount),
    currentCreditAmount: toNum(raw.cn_amount),
    status: raw.status || "",
  };
}

function sourceLabel(source: string): string {
  return CN_SOURCE_LABELS[source] || source || "—";
}

function cnStatusToBadge(status: string): { status: StatusKey; label: string } {
  switch (status) {
    case "POSTED":
      return { status: "approved", label: "Posted" };
    case "APPROVED":
      return { status: "approved", label: "Approved" };
    case "CANCELLED":
      return { status: "rejected", label: "Cancelled" };
    case "REVERSED":
      return { status: "rejected", label: "Reversed" };
    case "DRAFT":
      return { status: "draft", label: "Draft" };
    case "PENDING_APPROVAL":
      return { status: "pending", label: "Pending Approval" };
    case "REJECTED":
      return { status: "rejected", label: "Rejected" };
    default:
      return { status: "draft", label: status.replaceAll("_", " ") || "—" };
  }
}

function canEditListRow(row: CreditNoteListRow): boolean {
  return row.status === "DRAFT" || row.status === "REJECTED";
}

function canCancelListRow(row: CreditNoteListRow): boolean {
  return row.status !== "CANCELLED" && row.status !== "REVERSED";
}

function isPostedListRow(row: CreditNoteListRow): boolean {
  return row.status === "POSTED";
}

function mapUiStatusToApi(status: string): string | undefined {
  switch (status) {
    case "draft":
      return "DRAFT";
    case "pending_approval":
      return "PENDING_APPROVAL";
    case "approved":
      return "POSTED";
    case "cancelled":
      return "CANCELLED";
    case "rejected":
      return "REJECTED";
    default:
      return undefined;
  }
}

function applyCreditNoteToolbarFilters(
  records: CreditNoteListRow[],
  statusTab: string,
  filters: NotesListingFilterState,
): CreditNoteListRow[] {
  let list = records;
  if (statusTab === "draft") list = list.filter((x) => x.status === "DRAFT");
  else if (statusTab === "posted") list = list.filter((x) => x.status === "POSTED" || x.status === "APPROVED");
  else if (statusTab === "cancelled") list = list.filter((x) => x.status === "CANCELLED");

  if (filters.dateFrom) list = list.filter((x) => x.creditNoteDate >= filters.dateFrom);
  if (filters.dateTo) list = list.filter((x) => x.creditNoteDate <= filters.dateTo);
  if (filters.branches.length) {
    list = list.filter((x) => matchesMulti(filters.branches, x.warehouse));
  }
  if (filters.parties.length) {
    list = list.filter((x) => matchesMulti(filters.parties, x.customerName));
  }
  if (filters.sources.length) {
    list = list.filter((x) => matchesMulti(filters.sources, sourceLabel(x.source_type)));
  }
  if (filters.status !== "all") {
    const apiStatus = mapUiStatusToApi(filters.status);
    if (apiStatus) list = list.filter((x) => x.status === apiStatus);
  }
  if (filters.voucherNo.trim()) {
    const q = filters.voucherNo.toLowerCase();
    list = list.filter((x) => x.cn_number.toLowerCase().includes(q));
  }
  if (filters.invoiceNo.trim()) {
    const q = filters.invoiceNo.toLowerCase();
    list = list.filter((x) => x.invoiceNos.some((n) => n.toLowerCase().includes(q)));
  }
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (x) =>
        x.cn_number.toLowerCase().includes(q) ||
        x.customerName.toLowerCase().includes(q) ||
        sourceLabel(x.source_type).toLowerCase().includes(q) ||
        x.warehouse.toLowerCase().includes(q) ||
        x.status.toLowerCase().includes(q) ||
        cnStatusToBadge(x.status).label.toLowerCase().includes(q) ||
        x.invoiceNos.some((n) => n.toLowerCase().includes(q)),
    );
  }
  return list;
}

function computeTabCounts(
  records: CreditNoteListRow[],
  filters: NotesListingFilterState,
): Record<string, number> {
  const base = applyCreditNoteToolbarFilters(records, "all", { ...filters, status: "all" });
  return {
    all: base.length,
    draft: base.filter((r) => r.status === "DRAFT").length,
    posted: base.filter((r) => r.status === "POSTED" || r.status === "APPROVED").length,
    cancelled: base.filter((r) => r.status === "CANCELLED").length,
    reversed: base.filter((r) => r.status === "REVERSED").length,
  };
}

async function exportCreditNoteListRows(rows: CreditNoteListRow[]): Promise<void> {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      "Credit Note No.": r.cn_number,
      Source: sourceLabel(r.source_type),
      Customer: r.customerName,
      Warehouse: r.warehouse,
      Date: r.creditNoteDate,
      "Taxable Value": r.taxableValue,
      CGST: r.cgstAmount,
      SGST: r.sgstAmount,
      IGST: r.igstAmount,
      Total: r.currentCreditAmount,
      Status: r.status.replaceAll("_", " "),
    })),
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Credit Notes");
  XLSX.writeFile(wb, `credit-notes-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function CreditNotesRecordsTable({
  loading,
  toolbarFiltered,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onView,
  onCancel,
  actionBusy,
}: {
  loading: boolean;
  toolbarFiltered: CreditNoteListRow[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onView: (r: CreditNoteListRow) => void;
  onCancel: (r: CreditNoteListRow) => void;
  actionBusy?: boolean;
}) {
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows(toolbarFiltered);
  const pagedRows = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (
    <>
      <AccountsTable minWidth={1180}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="CN No." colKey="cn_number" />
            <SortTh
              label="Source"
              colKey="source_type"
              filterType="status"
              statusOptions={Object.values(CN_SOURCE_LABELS)}
            />
            <SortTh label="Invoice" colKey="invoice" />
            <SortTh label="Customer" colKey="customerName" className="accounts-col-party" />
            <SortTh label="Warehouse" colKey="warehouse" />
            <SortTh label="Date" colKey="creditNoteDate" filterType="date" />
            <SortTh label="Taxable" colKey="taxableValue" filterType="amount" align="right" />
            <SortTh label="CGST" colKey="cgstAmount" filterType="amount" align="right" />
            <SortTh label="SGST" colKey="sgstAmount" filterType="amount" align="right" />
            <SortTh label="IGST" colKey="igstAmount" filterType="amount" align="right" />
            <SortTh label="Total" colKey="currentCreditAmount" filterType="amount" align="right" />
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
          {loading && toolbarFiltered.length === 0 ? (
            <AccountsTableLoading colSpan={13} message="Loading credit notes…" />
          ) : toolbarFiltered.length === 0 ? (
            <AccountsTableEmpty colSpan={13} message="No credit notes found." />
          ) : visible.length === 0 ? (
            <AccountsTableEmpty colSpan={13} message="No records match the column filters." />
          ) : (
            pagedRows.map((r) => {
              const badge = cnStatusToBadge(r.status);
              return (
                <AccountsTableRow key={r.credit_note_id}>
                  <AccountsTableCell mono>
                    <button
                      type="button"
                      className="hover:underline text-left truncate max-w-full font-mono text-xs font-semibold text-brand-700"
                      title={r.cn_number}
                      onClick={() => onView(r)}
                    >
                      {r.cn_number}
                    </button>
                  </AccountsTableCell>
                  <AccountsTableCell className="truncate text-xs">
                    {sourceLabel(r.source_type)}
                  </AccountsTableCell>
                  <AccountsTableCell mono className="truncate text-xs" title={r.invoiceNos.join(", ") || undefined}>
                    {r.invoiceNos.length ? r.invoiceNos.join(", ") : "—"}
                  </AccountsTableCell>
                  <AccountsTableCell className="accounts-col-party truncate text-xs font-medium" title={r.customerName}>
                    {r.customerName || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell className="truncate text-xs">{r.warehouse || "—"}</AccountsTableCell>
                  <AccountsTableCell className="tabular-nums text-xs whitespace-nowrap">
                    {r.creditNoteDate || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">
                    {formatINR(r.taxableValue)}
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
                    {formatINR(r.currentCreditAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <StatusBadge status={badge.status} label={badge.label} size="sm" />
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                    <AccountsTableActionCell>
                      <AccountsViewAction onClick={() => onView(r)} />
                      {canEditListRow(r) && (
                        <AccountsEditAction href={`${LIST_PATH}/${r.credit_note_id}/edit`} />
                      )}
                      {canCancelListRow(r) && (
                        <AccountsMoreActions contentClassName="w-44">
                          <DropdownMenuItem
                            className="text-xs gap-2 text-red-600"
                            disabled={actionBusy}
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
          recordLabel="credit notes"
        />
      ) : null}
    </>
  );
}

export default function CreditNotesListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useClientMounted();
  const { toast, showToast, dismissToast } = useAccountsToast();
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");

  const [moduleTab, setModuleTab] = useState("pending");
  const [statusTab, setStatusTab] = useState("all");
  const [filters, setFilters] = useState<NotesListingFilterState>(() => ({
    ...resetNotesListingFilters("this_year"),
    dateFrom,
    dateTo,
    preset,
  }));
  const [records, setRecords] = useState<CreditNoteListRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<CreditNoteListRow | null>(null);
  const [reverseTarget, setReverseTarget] = useState<CreditNoteListRow | null>(null);
  const [reverseBusy, setReverseBusy] = useState(false);
  const reverseBusyRef = useRef(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  const sectionRefresh = useAccountsSectionRefresh("credit-notes");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [listResult, pendingResult] = await Promise.all([
        CreditNoteListApi.list({ page: 1, page_size: 100 }),
        CreditNoteListApi.listPending({ page: 1, page_size: 1 }),
      ]);
      setRecords((listResult.items ?? []).map(mapCreditNoteListRow));
      setPendingCount(pendingResult.pagination?.total ?? pendingResult.items?.length ?? 0);
    } catch (e) {
      setRecords([]);
      showToast(creditNoteListApiError(e, "Failed to load credit notes."), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!mounted) return;
    void refresh();
  }, [mounted, refresh, sectionRefresh]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, dateFrom, dateTo, preset }));
  }, [dateFrom, dateTo, preset]);

  useEffect(() => {
    const qs = searchParams.toString();
    if (!hasDocumentsListingFilters(qs)) return;
    const parsed = parseDocumentsListingFiltersFromSearch(qs);
    if (parsed.dateFrom) {
      setDateFrom(parsed.dateFrom);
      setPreset("custom");
    }
    if (parsed.dateTo) {
      setDateTo(parsed.dateTo);
      setPreset("custom");
    }
    if (parsed.branch) setFilters((prev) => ({ ...prev, branches: [parsed.branch!] }));
    setModuleTab("records");
  }, [searchParams, setDateFrom, setDateTo, setPreset]);

  const counts = useMemo(() => computeTabCounts(records, filters), [records, filters]);

  const partyOptions = useMemo(
    () => uniqueOptionsFromValues(records.map((r) => r.customerName)),
    [records],
  );
  const sourceOptions = useMemo(
    () => uniqueOptionsFromValues(records.map((r) => sourceLabel(r.source_type))),
    [records],
  );
  const warehouseOptions = useMemo(
    () => uniqueOptionsFromValues(records.map((r) => r.warehouse)),
    [records],
  );

  const toolbarFiltered = useMemo(() => {
    if (!mounted) return [];
    return applyCreditNoteToolbarFilters(records, statusTab, filters);
  }, [records, statusTab, filters, mounted]);

  const getCellValue = useCallback((row: CreditNoteListRow, key: string) => {
    if (key === "source_type") return sourceLabel(row.source_type);
    if (key === "invoice") return row.invoiceNos.join(", ");
    if (key === "status") return cnStatusToBadge(row.status).label;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      cn_number: { type: "text" as const },
      source_type: { type: "text" as const },
      invoice: { type: "text" as const },
      customerName: { type: "text" as const },
      warehouse: { type: "text" as const },
      creditNoteDate: { type: "date" as const },
      taxableValue: { type: "amount" as const },
      cgstAmount: { type: "amount" as const },
      sgstAmount: { type: "amount" as const },
      igstAmount: { type: "amount" as const },
      currentCreditAmount: { type: "amount" as const },
      status: { type: "text" as const },
    }),
    [],
  );

  useEffect(() => {
    setPage(1);
  }, [filters, statusTab, pageSize]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCreditNoteListRows(toolbarFiltered);
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setStatusTab("all");
    const reset = resetNotesListingFilters("this_year");
    setPreset(reset.preset);
    setDateFrom(reset.dateFrom);
    setDateTo(reset.dateTo);
    setFilters(reset);
  };

  const handleView = (row: CreditNoteListRow) => {
    router.push(`${LIST_PATH}/${row.credit_note_id}`);
  };

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", "Credit Notes")}
        title="Credit Notes"
        description="Customer credit notes — pending sales returns & scheme settlements, plus manual adjustments."
        hideDescription
        actions={
          <NotesListHeaderActions
            onRefresh={() => void refresh()}
            onExportExcel={moduleTab === "records" ? handleExport : undefined}
            onExportPdf={moduleTab === "records" ? handleExport : undefined}
            exportDisabled={exporting || toolbarFiltered.length === 0}
            createLabel="Create Credit Note"
            onCreate={() => router.push(`${LIST_PATH}/new?mode=fresh`)}
          />
        }
        layout="split"
        className="h-full min-h-0"
      >
        <div className="flex flex-col flex-1 min-h-0 gap-1.5 overflow-hidden">
          <SectionTabs
            tabs={[...NOTES_MODULE_TABS]}
            active={moduleTab}
            onChange={(tab) => {
              setModuleTab(tab);
              if (tab === "pending") void refresh();
            }}
            counts={{ pending: pendingCount, records: counts.all }}
            compact
          />

          {moduleTab === "pending" ? (
            <PendingCreditNotesPanel onCountChange={setPendingCount} />
          ) : (
            <AccountsColumnFilterProvider
              rows={toolbarFiltered}
              getCellValue={getCellValue}
              columnConfig={columnConfig}
              defaultSortKey="creditNoteDate"
              defaultSortDir="desc"
            >
              <AccountsTableListing
                subheader={
                  <SectionTabs
                    tabs={[...NOTES_STATUS_TABS]}
                    active={statusTab}
                    onChange={setStatusTab}
                    counts={counts}
                    compact
                  />
                }
                toolbar={
                  <AccountsListingFilterCard>
                    <NotesListingFilterBar
                      filters={filters}
                      partyLabel="Customer"
                      branchOptions={warehouseOptions}
                      partyOptions={partyOptions}
                      sourceOptions={sourceOptions}
                      statusOptions={NOTES_STATUS_FILTER_OPTIONS}
                      searchPlaceholder="Search CN no., customer, warehouse, source, invoice…"
                      showEntityFilters={false}
                      onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
                      onReset={handleResetFilters}
                    />
                  </AccountsListingFilterCard>
                }
              >
                <CreditNotesRecordsTable
                  loading={loading}
                  toolbarFiltered={toolbarFiltered}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  onView={handleView}
                  actionBusy={reverseBusy}
                  onCancel={(r) => {
                    if (isPostedListRow(r)) setReverseTarget(r);
                    else setCancelTarget(r);
                  }}
                />
              </AccountsTableListing>
            </AccountsColumnFilterProvider>
          )}
        </div>
      </AccountsPageShell>

      <AccountsToast toast={toast} onDismiss={dismissToast} />

      <CreditNoteCancelDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        creditNoteNo={cancelTarget?.cn_number ?? ""}
        busy={reverseBusy}
        onConfirm={async (reason) => {
          if (!cancelTarget || reverseBusyRef.current) return;
          reverseBusyRef.current = true;
          setReverseBusy(true);
          try {
            await CreditNoteListApi.cancel(cancelTarget.credit_note_id, reason);
            showToast(`Cancelled ${cancelTarget.cn_number}`);
            setCancelTarget(null);
            await refresh();
          } catch (e) {
            showToast(creditNoteListApiError(e, "Could not cancel credit note."), "error");
          } finally {
            reverseBusyRef.current = false;
            setReverseBusy(false);
          }
        }}
      />

      <CreditNoteReverseDialog
        open={!!reverseTarget}
        onClose={() => {
          if (!reverseBusy) setReverseTarget(null);
        }}
        busy={reverseBusy}
        onConfirm={async (payload) => {
          if (!reverseTarget || reverseBusyRef.current) return;
          reverseBusyRef.current = true;
          setReverseBusy(true);
          try {
            await CreditNoteListApi.reverse(reverseTarget.credit_note_id, payload);
            showToast(`Cancelled ${reverseTarget.cn_number}`);
            setReverseTarget(null);
            await refresh();
          } catch (e) {
            showToast(creditNoteListApiError(e, "Could not cancel this Credit Note."), "error");
          } finally {
            reverseBusyRef.current = false;
            setReverseBusy(false);
          }
        }}
      />
    </>
  );
}
