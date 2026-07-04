"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Plus, XCircle } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
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
import {
  AccountsTableEmpty,
  AccountsListingFilterCard,
  AccountsListingTableCard,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import { AccountsListingDateFilter } from "@/components/accounts/AccountsListingFilter";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { ReportSearchFilter } from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { useClientMounted } from "@/lib/use-client-mounted";
import { SectionTabs } from "../../components/AccountsUI";
import { NoteWorkflowBadge } from "../../components/NoteWorkflowBadge";
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

export default function CreditNotesListClient() {
  const router = useRouter();
  const mounted = useClientMounted();
  const [moduleTab, setModuleTab] = useState("pending");
  const [statusTab, setStatusTab] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [records, setRecords] = useState<CreditNoteRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<CreditNoteRecord | null>(null);
  const [viewTarget, setViewTarget] = useState<CreditNoteRecord | null>(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const refresh = useCallback(() => {
    if (!mounted) return;
    setRecords(loadCreditNotes());
    setPendingCount(listPendingCreditNotes().length);
  }, [mounted]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const counts = useMemo(() => computeCreditNoteTabCounts(records), [records]);

  const visible = useMemo(
    () =>
      mounted
        ? filterCreditNotes(records, {
            tab: statusTab,
            search,
            dateFrom,
            dateTo,
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
      await exportCreditNotesToExcel(visible);
    } finally {
      setExporting(false);
    }
  };

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
            onClick={() => {
              const target = `${LIST_PATH}/new?mode=fresh`;
              // #region agent log
              fetch('http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'db7cdd'},body:JSON.stringify({sessionId:'db7cdd',hypothesisId:'A-B',location:'CreditNotesListClient.tsx:create-btn',message:'Create Credit Note clicked',data:{target},timestamp:Date.now()})}).catch(()=>{});
              // #endregion
              router.push(target);
            }}
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
                    placeholder="Search CN no., source, invoice, return, customer, scheme…"
                    className="min-w-[200px] flex-1 max-w-md"
                  />
                </AccountsListingFilterCard>
                <AccountsListingTableCard>
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
                          <AccountsTableHeadCell uppercase>CN No.</AccountsTableHeadCell>
                          <AccountsTableHeadCell uppercase>Source</AccountsTableHeadCell>
                          <AccountsTableHeadCell uppercase>Invoice</AccountsTableHeadCell>
                          <AccountsTableHeadCell uppercase className="accounts-col-party">Customer</AccountsTableHeadCell>
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
                          <AccountsTableEmpty colSpan={12} message="Loading credit notes…" />
                        ) : visible.length === 0 ? (
                          <AccountsTableEmpty
                            colSpan={12}
                            message="No credit notes found."
                            onClear={
                              search || dateFrom || dateTo
                                ? () => {
                                    setSearch("");
                                    setDateFrom("");
                                    setDateTo("");
                                  }
                                : undefined
                            }
                          />
                        ) : (
                          pagedRows.map((r) => (
                            <AccountsTableRow key={r.id}>
                              <AccountsTableCell mono className="font-semibold text-brand-700">
                                <button
                                  type="button"
                                  className="hover:underline text-left truncate max-w-full font-mono text-xs font-semibold text-brand-700"
                                  title={r.creditNoteNo}
                                  onClick={() => setViewTarget(r)}
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
                              <AccountsTableCell><NoteWorkflowBadge status={r.status} /></AccountsTableCell>
                              <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                                <AccountsTableActionCell>
                                  <AccountsViewAction
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewTarget(r);
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
                                              onClick={() => setCancelTarget(r)}
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
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                      recordLabel="credit notes"
                    />
                  ) : null}
                </AccountsListingTableCard>
              </div>
            </div>
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
