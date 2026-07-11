"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  AccountsEditAction,
  AccountsMoreActions,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { FileText, Plus, XCircle } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTableEmpty,
  AccountsListingFilterCard,
  AccountsListingTableCard,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { AccountsListingDateFilter } from "@/components/accounts/AccountsListingFilter";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { ReportSearchFilter, ReportFilterRow, ReportFilterResetButton } from "@/components/accounts/ReportFilters";
import { accountsListingFiltersActive } from "@/lib/accounts/use-accounts-listing-reset";
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

const MODULE_TABS = [
  { id: "pending", label: "Pending Debit Notes" },
  { id: "records", label: "Debit Notes" },
];

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "posted", label: "Posted" },
  { id: "cancelled", label: "Cancelled" },
];

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
      <AccountsTableScroll>
        <AccountsTable className="table-fixed w-full">
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <SortTh label="Debit Note No." colKey="debitNoteNo" />
              <SortTh label="Source" colKey="source" />
              <SortTh label="Against PI" colKey="sourceInvoiceNo" />
              <SortTh label="Supplier" colKey="vendorName" className="accounts-col-party" />
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
              <AccountsTableEmpty colSpan={12} message="Loading debit notes…" />
            ) : toolbarFiltered.length === 0 ? (
              <AccountsTableEmpty colSpan={12} message="No debit notes found." />
            ) : visible.length === 0 ? (
              <AccountsTableEmpty colSpan={12} message="No records match the column filters." />
            ) : (
              pagedRows.map((r) => (
                <AccountsTableRow key={r.id}>
                  <AccountsTableCell mono className="font-semibold text-brand-700">
                    <Link href={`${LIST_PATH}/${r.id}`} className="hover:underline">
                      {r.debitNoteNo}
                    </Link>
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs">{DEBIT_NOTE_SOURCE_LABELS[r.source]}</AccountsTableCell>
                  <AccountsTableCell mono>{r.sourceInvoiceNo || "—"}</AccountsTableCell>
                  <AccountsTableCell className="accounts-col-party font-medium">{r.vendorName}</AccountsTableCell>
                  <AccountsTableCell className="tabular-nums">{r.debitNoteDate}</AccountsTableCell>
                  <AccountsTableCell align="right" money>{formatINR(r.taxableAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money>{formatINR(r.cgstAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money>{formatINR(r.sgstAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money>{formatINR(r.igstAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="font-medium">
                    {formatINR(r.currentDebitAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell>
                    {(() => {
                      const badge = noteWorkflowStatusToBadge(r.status);
                      return <StatusBadge status={badge.status} label={badge.label} size="sm" />;
                    })()}
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
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableScroll>
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

function DebitNotesRecordsTab({
  mounted,
  records,
  statusTab,
  setStatusTab,
  counts,
  search,
  setSearch,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  branchFilter,
  onCancel,
  onRefresh,
}: {
  mounted: boolean;
  records: DebitNoteRecord[];
  statusTab: string;
  setStatusTab: (v: string) => void;
  counts: ReturnType<typeof computeDebitNoteTabCounts>;
  search: string;
  setSearch: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  branchFilter: string;
  onCancel: (r: DebitNoteRecord) => void;
  onRefresh: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const toolbarFiltered = useMemo(
    () => {
      if (!mounted) return [];
      let list = filterDebitNotes(records, {
        tab: statusTab,
        search,
        vendor: "all",
        referenceType: "all",
        referenceNo: "",
        dateFrom,
        dateTo,
        status: "all",
      });
      if (branchFilter) {
        list = list.filter(
          (dn) => ((dn as { branch?: string }).branch?.trim() || "") === branchFilter,
        );
      }
      return list;
    },
    [records, statusTab, search, dateFrom, dateTo, branchFilter, mounted],
  );

  const getCellValue = useCallback((row: DebitNoteRecord, key: string) => {
    if (key === "source") return DEBIT_NOTE_SOURCE_LABELS[row.source];
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      debitNoteNo: { type: "text" as const },
      source: { type: "text" as const },
      sourceInvoiceNo: { type: "text" as const },
      vendorName: { type: "text" as const },
      debitNoteDate: { type: "date" as const },
      taxableAmount: { type: "amount" as const },
      cgstAmount: { type: "amount" as const },
      sgstAmount: { type: "amount" as const },
      igstAmount: { type: "amount" as const },
      currentDebitAmount: { type: "amount" as const },
    }),
    [],
  );

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, pageSize, statusTab]);

  return (
    <AccountsColumnFilterProvider
      rows={toolbarFiltered}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="debitNoteDate"
      defaultSortDir="desc"
    >
      <DebitNotesRecordsTabBody
        mounted={mounted}
        toolbarFiltered={toolbarFiltered}
        statusTab={statusTab}
        setStatusTab={setStatusTab}
        counts={counts}
        search={search}
        setSearch={setSearch}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        exporting={exporting}
        setExporting={setExporting}
        onCancel={onCancel}
        onRefresh={onRefresh}
      />
    </AccountsColumnFilterProvider>
  );
}

function DebitNotesRecordsTabBody({
  mounted,
  toolbarFiltered,
  statusTab,
  setStatusTab,
  counts,
  search,
  setSearch,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  page,
  setPage,
  pageSize,
  setPageSize,
  exporting,
  setExporting,
  onCancel,
  onRefresh,
}: {
  mounted: boolean;
  toolbarFiltered: DebitNoteRecord[];
  statusTab: string;
  setStatusTab: (v: string) => void;
  counts: ReturnType<typeof computeDebitNoteTabCounts>;
  search: string;
  setSearch: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  onCancel: (r: DebitNoteRecord) => void;
  onRefresh: () => void;
}) {
  const visible = useAccountsFilteredRows(toolbarFiltered);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportDebitNotesToExcel(visible);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2 overflow-hidden">
      <div className="flex-shrink-0">
        <SectionTabs tabs={STATUS_TABS} active={statusTab} onChange={setStatusTab} counts={counts} compact />
      </div>
      <div className="accounts-listing-card flex flex-col flex-1 min-h-0">
        <AccountsListingFilterCard>
          <ReportFilterRow
            end={
              <AccountsExportMenu
                onExcel={handleExportExcel}
                onPdf={handleExportExcel}
                disabled={exporting || visible.length === 0}
              />
            }
          >
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Search DN no., source, invoice, return, supplier…"
              className="min-w-[200px] flex-1 max-w-md"
            />
            <AccountsListingDateFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <ReportFilterResetButton
              showOnlyWhenActive
              active={accountsListingFiltersActive(
                { search, dateFrom, dateTo, statusTab: statusTab === "all" ? "" : statusTab },
                { search: "", dateFrom: "", dateTo: "", statusTab: "" },
              )}
              onClick={() => {
                setSearch("");
                setDateFrom("");
                setDateTo("");
                setStatusTab("all");
              }}
            />
          </ReportFilterRow>
        </AccountsListingFilterCard>
        <AccountsListingTableCard>
          <DebitNotesRecordsTable
            mounted={mounted}
            toolbarFiltered={toolbarFiltered}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onCancel={onCancel}
            onRefresh={onRefresh}
          />
        </AccountsListingTableCard>
      </div>
    </div>
  );
}

export default function DebitNotesListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useClientMounted();
  const [moduleTab, setModuleTab] = useState("pending");
  const [statusTab, setStatusTab] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [records, setRecords] = useState<DebitNoteRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<DebitNoteRecord | null>(null);

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
    const qs = searchParams.toString();
    if (!hasDocumentsListingFilters(qs)) return;
    const parsed = parseDocumentsListingFiltersFromSearch(qs);
    if (parsed.dateFrom) setDateFrom(parsed.dateFrom);
    if (parsed.dateTo) setDateTo(parsed.dateTo);
    if (parsed.branch) setBranchFilter(parsed.branch);
    setModuleTab("records");
  }, [searchParams]);

  const counts = useMemo(() => computeDebitNoteTabCounts(records), [records]);

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", "Debit Notes")}
        title="Debit Notes"
        description="Supplier adjustments — pending purchase returns and fresh debit notes."
        hideDescription
        actions={
          <Button
            size="sm"
            className="h-8 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
            onClick={() => router.push(`${LIST_PATH}/new?mode=fresh`)}
          >
            <Plus className="w-3.5 h-3.5" /> Create Debit Note
          </Button>
        }
        layout="split"
        className="h-full min-h-0"
      >
        <div className="flex flex-col flex-1 min-h-0 gap-2 overflow-hidden">
          <div className="flex-shrink-0">
            <SectionTabs
              tabs={MODULE_TABS}
              active={moduleTab}
              onChange={setModuleTab}
              counts={{ pending: pendingCount, records: records.length }}
              compact
            />
          </div>

          {moduleTab === "pending" ? (
            <PendingDebitNotesPanel />
          ) : (
            <DebitNotesRecordsTab
              mounted={mounted}
              records={records}
              statusTab={statusTab}
              setStatusTab={setStatusTab}
              counts={counts}
              search={search}
              setSearch={setSearch}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              branchFilter={branchFilter}
              onCancel={setCancelTarget}
              onRefresh={refresh}
            />
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
