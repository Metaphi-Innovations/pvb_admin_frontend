"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  AccountsEditAction,
  AccountsMoreActions,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { FileText, XCircle } from "lucide-react";
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
  resetNotesListingFilters,
  uniqueOptionsFromValues,
  matchesMulti,
} from "../../components/notes-listing-shared";
import { DebitNoteCancelDialog } from "../../debit-notes/components/DebitNoteCancelDialog";
import { PendingDebitNotesPanel } from "../../debit-notes/components/PendingDebitNotesPanel";
import {
  DEBIT_NOTE_SOURCE_LABELS,
  cancelDebitNote,
  computeDebitNoteTabCounts,
  filterDebitNotes,
  getDebitNoteRowActions,
  loadDebitNotes,
  postDebitNoteRecord,
  type DebitNoteRecord,
} from "../../debit-notes/debit-notes-data";
import { listPendingDebitNoteReturns } from "../../debit-notes/pending-debit-notes-data";
import { exportDebitNotesToExcel } from "../../debit-notes/debit-notes-export";
import { DEBIT_NOTES_LIST_PATH, formatINR } from "../../debit-notes/note-utils";
import {
  hasDocumentsListingFilters,
  parseDocumentsListingFiltersFromSearch,
} from "@/lib/accounts/documents-listing-filter-query";

const LIST_PATH = DEBIT_NOTES_LIST_PATH;

function debitNoteBranch(dn: DebitNoteRecord): string {
  return (dn as { branch?: string }).branch?.trim() || "";
}

function applyDebitNoteToolbarFilters(
  records: DebitNoteRecord[],
  statusTab: string,
  filters: NotesListingFilterState,
): DebitNoteRecord[] {
  let list = filterDebitNotes(records, {
    tab: statusTab,
    search: filters.search,
    vendor: "all",
    referenceType: "all",
    referenceNo: filters.invoiceNo,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    status: filters.status === "all" ? "all" : filters.status,
  });
  if (filters.branches.length) {
    list = list.filter((dn) => matchesMulti(filters.branches, debitNoteBranch(dn)));
  }
  if (filters.parties.length) {
    list = list.filter((dn) => matchesMulti(filters.parties, dn.vendorName));
  }
  if (filters.sources.length) {
    list = list.filter((dn) => matchesMulti(filters.sources, DEBIT_NOTE_SOURCE_LABELS[dn.source]));
  }
  if (filters.voucherNo.trim()) {
    const q = filters.voucherNo.toLowerCase();
    list = list.filter((dn) => dn.debitNoteNo.toLowerCase().includes(q));
  }
  return list;
}

function DebitNotesRecordsTable({
  mounted,
  toolbarFiltered,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onCancel,
  onRefresh,
}: {
  mounted: boolean;
  toolbarFiltered: DebitNoteRecord[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onCancel: (r: DebitNoteRecord) => void;
  onRefresh: () => void;
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
            <SortTh label="DN No." colKey="debitNoteNo" />
            <SortTh label="Source" colKey="source" />
            <SortTh label="Against PI" colKey="sourceInvoiceNo" />
            <SortTh label="Supplier" colKey="vendorName" className="accounts-col-party" />
            <SortTh label="Branch" colKey="branch" />
            <SortTh label="Date" colKey="debitNoteDate" filterType="date" />
            <SortTh label="Taxable" colKey="taxableAmount" filterType="amount" align="right" />
            <SortTh label="CGST" colKey="cgstAmount" filterType="amount" align="right" />
            <SortTh label="SGST" colKey="sgstAmount" filterType="amount" align="right" />
            <SortTh label="IGST" colKey="igstAmount" filterType="amount" align="right" />
            <SortTh label="Total" colKey="currentDebitAmount" filterType="amount" align="right" />
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
            <AccountsTableEmpty colSpan={13} message="Loading debit notes…" />
          ) : toolbarFiltered.length === 0 ? (
            <AccountsTableEmpty colSpan={13} message="No debit notes found." />
          ) : visible.length === 0 ? (
            <AccountsTableEmpty colSpan={13} message="No records match the column filters." />
          ) : (
            pagedRows.map((r) => {
              const badge = noteWorkflowStatusToBadge(r.status);
              return (
                <AccountsTableRow key={r.id}>
                  <AccountsTableCell mono>
                    <Link
                      href={`${LIST_PATH}/${r.id}`}
                      className="hover:underline font-mono text-xs font-semibold text-brand-700"
                    >
                      {r.debitNoteNo}
                    </Link>
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs">{DEBIT_NOTE_SOURCE_LABELS[r.source]}</AccountsTableCell>
                  <AccountsTableCell mono className="truncate text-xs">{r.sourceInvoiceNo || "—"}</AccountsTableCell>
                  <AccountsTableCell className="accounts-col-party font-medium truncate text-xs" title={r.vendorName}>
                    {r.vendorName}
                  </AccountsTableCell>
                  <AccountsTableCell className="truncate text-xs">{debitNoteBranch(r) || "—"}</AccountsTableCell>
                  <AccountsTableCell className="tabular-nums text-xs">{r.debitNoteDate}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">{formatINR(r.taxableAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">{formatINR(r.cgstAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">{formatINR(r.sgstAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">{formatINR(r.igstAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs font-medium">
                    {formatINR(r.currentDebitAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <StatusBadge status={badge.status} label={badge.label} size="sm" />
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                    <AccountsTableActionCell>
                      <AccountsViewAction href={`${LIST_PATH}/${r.id}`} />
                      {getDebitNoteRowActions(r).includes("edit") && (
                        <AccountsEditAction href={`${LIST_PATH}/${r.id}/edit`} />
                      )}
                      {getDebitNoteRowActions(r).some((a) => a === "post" || a === "cancel") && (
                        <AccountsMoreActions contentClassName="w-44">
                          {getDebitNoteRowActions(r).includes("post") && (
                            <DropdownMenuItem
                              className="text-xs gap-2"
                              onClick={() => {
                                postDebitNoteRecord(r.id);
                                onRefresh();
                              }}
                            >
                              <FileText className="w-4 h-4" /> Post
                            </DropdownMenuItem>
                          )}
                          {getDebitNoteRowActions(r).includes("cancel") && (
                            <DropdownMenuItem
                              className="text-xs gap-2 text-red-600"
                              onClick={() => onCancel(r)}
                            >
                              <XCircle className="w-4 h-4" /> Cancel
                            </DropdownMenuItem>
                          )}
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
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");

  const [moduleTab, setModuleTab] = useState("pending");
  const [statusTab, setStatusTab] = useState("all");
  const [filters, setFilters] = useState<NotesListingFilterState>(() => ({
    ...resetNotesListingFilters("this_month"),
    dateFrom,
    dateTo,
    preset,
  }));
  const [records, setRecords] = useState<DebitNoteRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<DebitNoteRecord | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const sectionRefresh = useAccountsSectionRefresh("debit-notes");

  const refresh = useCallback(() => {
    if (!mounted) return;
    setRecords(loadDebitNotes());
    setPendingCount(listPendingDebitNoteReturns().length);
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

  const counts = useMemo(() => computeDebitNoteTabCounts(records), [records]);

  const branchOptions = useMemo(
    () => uniqueOptionsFromValues(records.map(debitNoteBranch)),
    [records],
  );
  const partyOptions = useMemo(
    () => uniqueOptionsFromValues(records.map((r) => r.vendorName)),
    [records],
  );
  const sourceOptions = useMemo(
    () => uniqueOptionsFromValues(records.map((r) => DEBIT_NOTE_SOURCE_LABELS[r.source])),
    [records],
  );

  const toolbarFiltered = useMemo(() => {
    if (!mounted) return [];
    return applyDebitNoteToolbarFilters(records, statusTab, filters);
  }, [records, statusTab, filters, mounted]);

  const getCellValue = useCallback((row: DebitNoteRecord, key: string) => {
    if (key === "source") return DEBIT_NOTE_SOURCE_LABELS[row.source];
    if (key === "branch") return debitNoteBranch(row);
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      debitNoteNo: { type: "text" as const },
      source: { type: "text" as const },
      sourceInvoiceNo: { type: "text" as const },
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

  useEffect(() => {
    setPage(1);
  }, [filters, statusTab, pageSize]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportDebitNotesToExcel(toolbarFiltered);
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
        breadcrumbs={accountsBreadcrumb("Transactions", "Debit Notes")}
        title="Debit Notes"
        description="Supplier adjustments — pending purchase returns and fresh debit notes."
        hideDescription
        actions={
          <NotesListHeaderActions
            onRefresh={refresh}
            onExportExcel={moduleTab === "records" ? handleExport : undefined}
            onExportPdf={moduleTab === "records" ? handleExport : undefined}
            exportDisabled={exporting || toolbarFiltered.length === 0}
            createLabel="Create Debit Note"
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
            onChange={setModuleTab}
            counts={{ pending: pendingCount, records: records.length }}
            compact
          />

          {moduleTab === "pending" ? (
            <PendingDebitNotesPanel />
          ) : (
            <AccountsColumnFilterProvider
              rows={toolbarFiltered}
              getCellValue={getCellValue}
              columnConfig={columnConfig}
              defaultSortKey="debitNoteDate"
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
                      partyLabel="Vendor"
                      branchOptions={branchOptions}
                      partyOptions={partyOptions}
                      sourceOptions={sourceOptions}
                      statusOptions={NOTES_STATUS_FILTER_OPTIONS}
                      searchPlaceholder="Search DN no., supplier, invoice, return…"
                      onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
                      onReset={handleResetFilters}
                    />
                  </AccountsListingFilterCard>
                }
              >
                <DebitNotesRecordsTable
                  mounted={mounted}
                  toolbarFiltered={toolbarFiltered}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  onCancel={setCancelTarget}
                  onRefresh={refresh}
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
        onConfirm={(reason) => {
          if (!cancelTarget) return;
          cancelDebitNote(cancelTarget.id, reason);
          refresh();
          setCancelTarget(null);
        }}
      />
    </>
  );
}
