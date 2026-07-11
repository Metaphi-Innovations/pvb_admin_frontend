"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Plus, XCircle } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableEmpty,
  AccountsListingFilterCard,
  AccountsListingTableCard,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import { AccountsListingDateFilter } from "@/components/accounts/AccountsListingFilter";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { ReportSearchFilter, ReportFilterRow, ReportFilterResetButton } from "@/components/accounts/ReportFilters";
import { resetReportDateRange, accountsListingFiltersActive } from "@/lib/accounts/use-accounts-listing-reset";
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

const MODULE_TABS = [
  { id: "pending", label: "Pending Credit Notes" },
  { id: "records", label: "All Credit Notes" },
];

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "posted", label: "Posted" },
  { id: "cancelled", label: "Cancelled" },
];

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
      <AccountsTableScroll className="[&_.accounts-table-td-inner]:min-w-0 [&_.accounts-table-td-inner]:overflow-hidden">
        <AccountsTable minWidth={1180}>
          <colgroup>
            <col className="w-[9rem]" />
            <col className="w-[5.5rem]" />
            <col className="w-[8rem]" />
            <col className="w-[9rem]" />
            <col className="w-[6rem]" />
            <col className="w-[5.5rem]" />
            <col className="w-[5rem]" />
            <col className="w-[5rem]" />
            <col className="w-[5rem]" />
            <col className="w-[5.5rem]" />
            <col className="w-[5.5rem]" />
            <col className="w-[4.5rem]" />
          </colgroup>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <SortTh label="CN No." colKey="creditNoteNo" />
              <SortTh label="Source" colKey="source" />
              <SortTh label="Invoice" colKey="invoice" />
              <SortTh label="Customer" colKey="customerName" className="accounts-col-party" />
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
              <AccountsTableEmpty colSpan={12} message="Loading credit notes…" />
            ) : toolbarFiltered.length === 0 ? (
              <AccountsTableEmpty colSpan={12} message="No credit notes found." />
            ) : visible.length === 0 ? (
              <AccountsTableEmpty colSpan={12} message="No records match the column filters." />
            ) : (
              pagedRows.map((r) => (
                <AccountsTableRow key={r.id}>
                  <AccountsTableCell mono className="font-semibold text-brand-700">
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
                  <AccountsTableCell className="tabular-nums text-xs whitespace-nowrap">{r.creditNoteDate}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">{formatINR(r.taxableValue)}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">{formatINR(r.cgstAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">{formatINR(r.sgstAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs">{formatINR(r.igstAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money className="text-xs font-medium">
                    {formatINR(r.currentCreditAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell>
                    {(() => {
                      const badge = noteWorkflowStatusToBadge(r.status);
                      return <StatusBadge status={badge.status} label={badge.label} size="sm" />;
                    })()}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                    <AccountsTableActionCell>
                      <AccountsViewAction
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(r);
                        }}
                      />
                      {getCreditNoteRowActions(r).includes("edit") && (
                        <AccountsEditAction href={`${LIST_PATH}/${r.id}/edit`} />
                      )}
                      {getCreditNoteRowActions(r).some((a) => a !== "view" && a !== "edit") && (
                        <AccountsMoreActions contentClassName="w-40">
                          {getCreditNoteRowActions(r)
                            .filter((a) => a !== "view" && a !== "edit")
                            .map((a) =>
                              a === "cancel" ? (
                                <DropdownMenuItem
                                  key="cancel"
                                  className="text-xs gap-2 text-red-600"
                                  onClick={() => onCancel(r)}
                                >
                                  <XCircle className="w-4 h-4" /> Cancel
                                </DropdownMenuItem>
                              ) : null,
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
          recordLabel="credit notes"
        />
      ) : null}
    </>
  );
}

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

function CreditNotesRecordsTab({
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
  warehouseFilter,
  onView,
  onCancel,
}: {
  mounted: boolean;
  records: CreditNoteRecord[];
  statusTab: string;
  setStatusTab: (v: string) => void;
  counts: ReturnType<typeof computeCreditNoteTabCounts>;
  search: string;
  setSearch: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  branchFilter: string;
  warehouseFilter: string;
  onView: (r: CreditNoteRecord) => void;
  onCancel: (r: CreditNoteRecord) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const toolbarFiltered = useMemo(
    () => {
      if (!mounted) return [];
      let list = filterCreditNotes(records, {
        tab: statusTab,
        search,
        dateFrom,
        dateTo,
      });
      if (branchFilter) {
        list = list.filter((cn) => {
          const { branch } = creditNoteLocation(cn);
          return branch === branchFilter;
        });
      }
      if (warehouseFilter) {
        list = list.filter((cn) => {
          const { warehouse } = creditNoteLocation(cn);
          return warehouse === warehouseFilter;
        });
      }
      return list;
    },
    [records, statusTab, search, dateFrom, dateTo, branchFilter, warehouseFilter, mounted],
  );

  const getCellValue = useCallback((row: CreditNoteRecord, key: string) => {
    if (key === "source") return CREDIT_NOTE_SOURCE_LABELS[row.source];
    if (key === "invoice") return formatLinkedInvoiceNos(row.linkedInvoices) || row.sourceInvoiceNo || "";
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      creditNoteNo: { type: "text" as const },
      source: { type: "text" as const },
      invoice: { type: "text" as const },
      customerName: { type: "text" as const },
      creditNoteDate: { type: "date" as const },
      taxableValue: { type: "amount" as const },
      cgstAmount: { type: "amount" as const },
      sgstAmount: { type: "amount" as const },
      igstAmount: { type: "amount" as const },
      currentCreditAmount: { type: "amount" as const },
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
      defaultSortKey="creditNoteDate"
      defaultSortDir="desc"
    >
      <CreditNotesRecordsTabBody
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
        onView={onView}
        onCancel={onCancel}
      />
    </AccountsColumnFilterProvider>
  );
}

function CreditNotesRecordsTabBody({
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
  onView,
  onCancel,
}: {
  mounted: boolean;
  toolbarFiltered: CreditNoteRecord[];
  statusTab: string;
  setStatusTab: (v: string) => void;
  counts: ReturnType<typeof computeCreditNoteTabCounts>;
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
  onView: (r: CreditNoteRecord) => void;
  onCancel: (r: CreditNoteRecord) => void;
}) {
  const visible = useAccountsFilteredRows(toolbarFiltered);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportCreditNotesToExcel(visible);
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
              placeholder="Search CN no., source, invoice, return, customer, scheme…"
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
          <CreditNotesRecordsTable
            mounted={mounted}
            toolbarFiltered={toolbarFiltered}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onView={onView}
            onCancel={onCancel}
          />
        </AccountsListingTableCard>
      </div>
    </div>
  );
}

export default function CreditNotesListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useClientMounted();
  const [moduleTab, setModuleTab] = useState("pending");
  const [statusTab, setStatusTab] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [records, setRecords] = useState<CreditNoteRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<CreditNoteRecord | null>(null);
  const [viewTarget, setViewTarget] = useState<CreditNoteRecord | null>(null);

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
    const qs = searchParams.toString();
    if (!hasDocumentsListingFilters(qs)) return;
    const parsed = parseDocumentsListingFiltersFromSearch(qs);
    if (parsed.dateFrom) setDateFrom(parsed.dateFrom);
    if (parsed.dateTo) setDateTo(parsed.dateTo);
    if (parsed.branch) setBranchFilter(parsed.branch);
    if (parsed.warehouse) setWarehouseFilter(parsed.warehouse);
    setModuleTab("records");
  }, [searchParams]);

  const counts = useMemo(() => computeCreditNoteTabCounts(records), [records]);

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", "Credit Notes")}
        title="Credit Notes"
        description="Customer credit notes — pending sales returns & scheme settlements, plus manual adjustments."
        hideDescription
        actions={
          <Button
            size="sm"
            className="h-8 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
            onClick={() => router.push(`${LIST_PATH}/new?mode=fresh`)}
          >
            <Plus className="w-3.5 h-3.5" /> Create Credit Note
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
              onChange={(tab) => {
                setModuleTab(tab);
                if (tab === "pending") refresh();
              }}
              counts={{ pending: pendingCount, records: records.length }}
              compact
            />
          </div>

          {moduleTab === "pending" ? (
            <PendingCreditNotesPanel />
          ) : (
            <CreditNotesRecordsTab
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
              warehouseFilter={warehouseFilter}
              onView={setViewTarget}
              onCancel={setCancelTarget}
            />
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
