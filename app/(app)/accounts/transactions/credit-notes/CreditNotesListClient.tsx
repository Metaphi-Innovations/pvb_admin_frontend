"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  AccountsTablePagination,
  AccountsListingFilterCard,
} from "@/components/accounts/AccountsTableListing";
import { useReportDateRange } from "@/components/accounts/ReportFilters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { noteWorkflowStatusToBadge } from "@/lib/accounts/accounts-status-badges";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
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
  notesListingFiltersActive,
  resetNotesListingFilters,
  uniqueOptionsFromValues,
  matchesMulti,
} from "../../components/notes-listing-shared";
import { CreditNoteCancelDialog } from "../../credit-notes/components/CreditNoteCancelDialog";
import { CreditNoteDetailSheet } from "../../credit-notes/components/CreditNoteDetailSheet";
import { PendingCreditNotesPanel } from "../../credit-notes/components/PendingCreditNotesPanel";
import {
  CREDIT_NOTE_SOURCE_LABELS,
  cancelCreditNote,
  computeCreditNoteTabCounts,
  filterCreditNotes,
  getCreditNoteRowActions,
  loadCreditNotes,
  type CreditNoteRecord,
} from "../../credit-notes/credit-notes-data";
import { listPendingCreditNotes } from "../../credit-notes/pending-credit-notes-data";
import { exportCreditNotesToExcel } from "../../credit-notes/credit-notes-export";
import { formatLinkedInvoiceNos } from "../../credit-notes/components/LinkedInvoicesMultiSelect";
import { CREDIT_NOTES_LIST_PATH, formatINR } from "../../credit-notes/note-utils";
import { loadInvoices } from "../../invoices/invoices-data";
import {
  hasDocumentsListingFilters,
  parseDocumentsListingFiltersFromSearch,
} from "@/lib/accounts/documents-listing-filter-query";

const LIST_PATH = CREDIT_NOTES_LIST_PATH;

function creditNoteLocation(cn: CreditNoteRecord): { branch: string; warehouse: string } {
  let branch = (cn as { branch?: string }).branch?.trim() || "";
  let warehouse = "";
  if (cn.sourceInvoiceId != null) {
    const inv = loadInvoices().find((i) => i.id === cn.sourceInvoiceId);
    if (!branch) branch = inv?.branch?.trim() || "";
    warehouse = inv?.warehouse?.trim() || "";
  }
  return { branch, warehouse };
}

function applyCreditNoteToolbarFilters(
  records: CreditNoteRecord[],
  statusTab: string,
  filters: NotesListingFilterState,
): CreditNoteRecord[] {
  let list = filterCreditNotes(records, {
    tab: statusTab,
    search: filters.search,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });
  if (filters.branches.length) {
    list = list.filter((cn) => matchesMulti(filters.branches, creditNoteLocation(cn).branch));
  }
  if (filters.parties.length) {
    list = list.filter((cn) => matchesMulti(filters.parties, cn.customerName));
  }
  if (filters.sources.length) {
    list = list.filter((cn) => matchesMulti(filters.sources, CREDIT_NOTE_SOURCE_LABELS[cn.source]));
  }
  if (filters.status !== "all") {
    list = list.filter((cn) => cn.status === filters.status);
  }
  if (filters.voucherNo.trim()) {
    const q = filters.voucherNo.toLowerCase();
    list = list.filter((cn) => cn.creditNoteNo.toLowerCase().includes(q));
  }
  if (filters.invoiceNo.trim()) {
    const q = filters.invoiceNo.toLowerCase();
    list = list.filter(
      (cn) =>
        cn.sourceInvoiceNo.toLowerCase().includes(q) ||
        cn.linkedInvoices?.some((inv) => inv.invoiceNo.toLowerCase().includes(q)),
    );
  }
  return list;
}

function CreditNotesRecordsTable({
  mounted,
  toolbarFiltered,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onView,
  onCancel,
}: {
  mounted: boolean;
  toolbarFiltered: CreditNoteRecord[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onView: (r: CreditNoteRecord) => void;
  onCancel: (r: CreditNoteRecord) => void;
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
            <SortTh label="CN No." colKey="creditNoteNo" />
            <SortTh label="Source" colKey="source" />
            <SortTh label="Invoice" colKey="invoice" />
            <SortTh label="Customer" colKey="customerName" className="accounts-col-party" />
            <SortTh label="Branch" colKey="branch" />
            <SortTh label="Date" colKey="creditNoteDate" filterType="date" />
            <SortTh label="Taxable" colKey="taxableValue" filterType="amount" align="right" />
            <SortTh label="CGST" colKey="cgstAmount" filterType="amount" align="right" />
            <SortTh label="SGST" colKey="sgstAmount" filterType="amount" align="right" />
            <SortTh label="IGST" colKey="igstAmount" filterType="amount" align="right" />
            <SortTh label="Total" colKey="currentCreditAmount" filterType="amount" align="right" />
            <SortTh label="Status" colKey="status" />
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
          {!mounted ? (
            <AccountsTableEmpty colSpan={13} message="Loading credit notes…" />
          ) : toolbarFiltered.length === 0 ? (
            <AccountsTableEmpty colSpan={13} message="No credit notes found." />
          ) : visible.length === 0 ? (
            <AccountsTableEmpty colSpan={13} message="No records match the column filters." />
          ) : (
            pagedRows.map((r) => {
              const { branch } = creditNoteLocation(r);
              const badge = noteWorkflowStatusToBadge(r.status);
              return (
                <AccountsTableRow key={r.id}>
                  <AccountsTableCell mono>
                    <button
                      type="button"
                      className="hover:underline text-left truncate max-w-full font-mono text-xs font-semibold text-brand-700"
                      title={r.creditNoteNo}
                      onClick={() => onView(r)}
                    >
                      {r.creditNoteNo}
                    </button>
                  </AccountsTableCell>
                  <AccountsTableCell className="truncate text-xs">
                    {CREDIT_NOTE_SOURCE_LABELS[r.source]}
                  </AccountsTableCell>
                  <AccountsTableCell mono className="truncate text-xs" title={formatLinkedInvoiceNos(r.linkedInvoices) || r.sourceInvoiceNo || undefined}>
                    {formatLinkedInvoiceNos(r.linkedInvoices) || r.sourceInvoiceNo || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell className="accounts-col-party truncate text-xs font-medium" title={r.customerName}>
                    {r.customerName}
                  </AccountsTableCell>
                  <AccountsTableCell className="truncate text-xs">{branch || "—"}</AccountsTableCell>
                  <AccountsTableCell className="tabular-nums text-xs whitespace-nowrap">{r.creditNoteDate}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">{formatINR(r.taxableValue)}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">{formatINR(r.cgstAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">{formatINR(r.sgstAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">{formatINR(r.igstAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs font-medium">
                    {formatINR(r.currentCreditAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <StatusBadge status={badge.status} label={badge.label} size="sm" />
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                    <AccountsTableActionCell>
                      <AccountsViewAction onClick={() => onView(r)} />
                      {getCreditNoteRowActions(r).includes("edit") && (
                        <AccountsEditAction href={`${LIST_PATH}/${r.id}/edit`} />
                      )}
                      {getCreditNoteRowActions(r).includes("cancel") && (
                        <AccountsMoreActions contentClassName="w-40">
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
      {mounted && visible.length > 0 ? (
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
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");

  const [moduleTab, setModuleTab] = useState("pending");
  const [statusTab, setStatusTab] = useState("all");
  const [filters, setFilters] = useState<NotesListingFilterState>(() => ({
    ...resetNotesListingFilters("this_month"),
    dateFrom,
    dateTo,
    preset,
  }));
  const [records, setRecords] = useState<CreditNoteRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<CreditNoteRecord | null>(null);
  const [viewTarget, setViewTarget] = useState<CreditNoteRecord | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const sectionRefresh = useAccountsSectionRefresh("credit-notes");

  const refresh = useCallback(() => {
    if (!mounted) return;
    setRecords(loadCreditNotes());
    setPendingCount(listPendingCreditNotes().length);
  }, [mounted]);

  useEffect(() => {
    refresh();
  }, [refresh, sectionRefresh]);

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

  const counts = useMemo(() => computeCreditNoteTabCounts(records), [records]);

  const branchOptions = useMemo(
    () => uniqueOptionsFromValues(records.map((r) => creditNoteLocation(r).branch)),
    [records],
  );
  const partyOptions = useMemo(
    () => uniqueOptionsFromValues(records.map((r) => r.customerName)),
    [records],
  );
  const sourceOptions = useMemo(
    () =>
      uniqueOptionsFromValues(
        records.map((r) => CREDIT_NOTE_SOURCE_LABELS[r.source]),
      ),
    [records],
  );

  const toolbarFiltered = useMemo(() => {
    if (!mounted) return [];
    return applyCreditNoteToolbarFilters(records, statusTab, filters);
  }, [records, statusTab, filters, mounted]);

  const getCellValue = useCallback((row: CreditNoteRecord, key: string) => {
    if (key === "source") return CREDIT_NOTE_SOURCE_LABELS[row.source];
    if (key === "invoice") return formatLinkedInvoiceNos(row.linkedInvoices) || row.sourceInvoiceNo || "";
    if (key === "branch") return creditNoteLocation(row).branch;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      creditNoteNo: { type: "text" as const },
      source: { type: "text" as const },
      invoice: { type: "text" as const },
      customerName: { type: "text" as const },
      branch: { type: "text" as const },
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
      await exportCreditNotesToExcel(toolbarFiltered);
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setStatusTab("all");
    setPreset("this_month");
    setDateFrom("");
    setDateTo("");
    setFilters(resetNotesListingFilters("this_month"));
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
            onRefresh={refresh}
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
              if (tab === "pending") refresh();
            }}
            counts={{ pending: pendingCount, records: records.length }}
            compact
          />

          {moduleTab === "pending" ? (
            <PendingCreditNotesPanel />
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
                      branchOptions={branchOptions}
                      partyOptions={partyOptions}
                      sourceOptions={sourceOptions}
                      statusOptions={NOTES_STATUS_FILTER_OPTIONS}
                      searchPlaceholder="Search CN no., customer, invoice, return, scheme…"
                      onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
                      onReset={handleResetFilters}
                    />
                  </AccountsListingFilterCard>
                }
              >
                <CreditNotesRecordsTable
                  mounted={mounted}
                  toolbarFiltered={toolbarFiltered}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  onView={setViewTarget}
                  onCancel={setCancelTarget}
                />
              </AccountsTableListing>
            </AccountsColumnFilterProvider>
          )}
        </div>
      </AccountsPageShell>

      <CreditNoteCancelDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        creditNoteNo={cancelTarget?.creditNoteNo ?? ""}
        onConfirm={(reason) => {
          if (!cancelTarget) return;
          cancelCreditNote(cancelTarget.id, reason);
          refresh();
          setCancelTarget(null);
        }}
      />

      <CreditNoteDetailSheet
        record={viewTarget}
        open={!!viewTarget}
        onOpenChange={(open) => {
          if (!open) setViewTarget(null);
        }}
        onEdit={(rec) => {
          setViewTarget(null);
          router.push(`${LIST_PATH}/${rec.id}/edit`);
        }}
      />
    </>
  );
}
