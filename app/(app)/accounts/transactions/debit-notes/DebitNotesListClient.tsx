"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { AccountsListingDateFilter } from "@/components/accounts/AccountsListingFilter";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { ReportSearchFilter } from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { useClientMounted } from "@/lib/use-client-mounted";
import { SectionTabs } from "../../components/AccountsUI";
import { NoteWorkflowBadge } from "../../components/NoteWorkflowBadge";
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

export default function DebitNotesListClient() {
  const router = useRouter();
  const mounted = useClientMounted();
  const [moduleTab, setModuleTab] = useState("pending");
  const [statusTab, setStatusTab] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [records, setRecords] = useState<DebitNoteRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<DebitNoteRecord | null>(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const refresh = useCallback(() => {
    if (!mounted) return;
    setRecords(loadDebitNotes());
    setPendingCount(listPendingDebitNoteReturns().length);
  }, [mounted]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const counts = useMemo(() => computeDebitNoteTabCounts(records), [records]);

  const visible = useMemo(
    () =>
      mounted
        ? filterDebitNotes(records, {
            tab: statusTab,
            search,
            vendor: "all",
            referenceType: "all",
            referenceNo: "",
            dateFrom,
            dateTo,
            status: "all",
          })
        : [],
    [records, statusTab, search, dateFrom, dateTo, mounted],
  );

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, pageSize, statusTab, moduleTab]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, page, pageSize]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportDebitNotesToExcel(visible);
    } finally {
      setExporting(false);
    }
  };

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
            <div className="flex flex-col flex-1 min-h-0 gap-2 overflow-hidden">
              <div className="flex-shrink-0">
                <SectionTabs tabs={STATUS_TABS} active={statusTab} onChange={setStatusTab} counts={counts} compact />
              </div>
              <div className="accounts-listing-card flex flex-col flex-1 min-h-0">
                <AccountsListingFilterCard
                  actions={
                    <AccountsExportMenu
                      onExcel={handleExportExcel}
                      onPdf={handleExportExcel}
                      disabled={exporting || visible.length === 0}
                    />
                  }
                >
                  <AccountsListingDateFilter
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    onDateFromChange={setDateFrom}
                    onDateToChange={setDateTo}
                  />
                  <ReportSearchFilter
                    value={search}
                    onChange={setSearch}
                    placeholder="Search DN no., source, invoice, return, supplier…"
                    className="min-w-[200px] flex-1 max-w-md"
                  />
                </AccountsListingFilterCard>
                <AccountsListingTableCard>
                  <AccountsTableScroll>
                    <AccountsTable className="table-fixed w-full">
                  <AccountsTableHead>
                    <AccountsTableHeadRow>
                      <AccountsTableHeadCell uppercase>Debit Note No.</AccountsTableHeadCell>
                      <AccountsTableHeadCell uppercase>Source</AccountsTableHeadCell>
                      <AccountsTableHeadCell uppercase>Against PI</AccountsTableHeadCell>
                      <AccountsTableHeadCell uppercase className="accounts-col-party">Supplier</AccountsTableHeadCell>
                      <AccountsTableHeadCell uppercase>Date</AccountsTableHeadCell>
                      <AccountsTableHeadCell align="right" uppercase>Taxable</AccountsTableHeadCell>
                      <AccountsTableHeadCell align="right" uppercase>CGST</AccountsTableHeadCell>
                      <AccountsTableHeadCell align="right" uppercase>SGST</AccountsTableHeadCell>
                      <AccountsTableHeadCell align="right" uppercase>IGST</AccountsTableHeadCell>
                      <AccountsTableHeadCell align="right" uppercase>Total</AccountsTableHeadCell>
                      <AccountsTableHeadCell uppercase>Status</AccountsTableHeadCell>
                      <AccountsTableHeadCell align="right" uppercase className={accountsActionColClass("multi")}>
                        Actions
                      </AccountsTableHeadCell>
                    </AccountsTableHeadRow>
                  </AccountsTableHead>
                  <AccountsTableBody>
                    {!mounted ? (
                      <AccountsTableEmpty colSpan={12} message="Loading debit notes…" />
                    ) : visible.length === 0 ? (
                      <AccountsTableEmpty
                        colSpan={12}
                        message="No debit notes found."
                        onClear={search || dateFrom || dateTo ? () => { setSearch(""); setDateFrom(""); setDateTo(""); } : undefined}
                      />
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
                          <AccountsTableCell><NoteWorkflowBadge status={r.status} /></AccountsTableCell>
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
                                        refresh();
                                      }}
                                    >
                                      <FileText className="w-4 h-4" /> Post
                                    </DropdownMenuItem>
                                  )}
                                  {getDebitNoteRowActions(r).includes("cancel") && (
                                    <DropdownMenuItem
                                      className="text-xs gap-2 text-red-600"
                                      onClick={() => setCancelTarget(r)}
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
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    recordLabel="debit notes"
                  />
                ) : null}
              </AccountsListingTableCard>
            </div>
            </div>
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
