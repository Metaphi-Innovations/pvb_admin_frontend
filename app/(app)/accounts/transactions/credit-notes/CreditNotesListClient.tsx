"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTablePagination,
  AccountsTableToolbar,
} from "@/components/accounts/AccountsTableListing";
import { AccountsListingDateFilter } from "@/components/accounts/AccountsListingFilter";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { useClientMounted } from "@/lib/use-client-mounted";
import { CreditNoteCancelDialog } from "../../credit-notes/components/CreditNoteCancelDialog";
import {
  cancelCreditNote,
  filterCreditNotesListing,
  getCreditNoteRowActions,
  loadCreditNotes,
  type CreditNoteRecord,
} from "../../credit-notes/credit-notes-data";
import { exportCreditNotesToExcel } from "../../credit-notes/credit-notes-export";
import { CREDIT_NOTES_LIST_PATH, formatINR } from "../../credit-notes/note-utils";

const LIST_PATH = CREDIT_NOTES_LIST_PATH;

export default function CreditNotesListClient() {
  const router = useRouter();
  const mounted = useClientMounted();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [records, setRecords] = useState<CreditNoteRecord[]>([]);
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<CreditNoteRecord | null>(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const refresh = useCallback(() => {
    if (!mounted) return;
    setRecords(loadCreditNotes());
  }, [mounted]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const visible = useMemo(
    () =>
      mounted
        ? filterCreditNotesListing(records, { search, dateFrom, dateTo })
        : [],
    [records, search, dateFrom, dateTo, mounted],
  );

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, pageSize]);

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
        description="Sales credit notes — reduces customer outstanding."
        actions={
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
            onClick={() => router.push(`${LIST_PATH}/new`)}
          >
            <Plus className="w-3.5 h-3.5" /> New
          </Button>
        }
        toolbar={
          <AccountsTableToolbar
            placement="page-header"
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "Search CN no., customer, invoice ref…",
            }}
            filters={
              <AccountsListingDateFilter
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
              />
            }
            onExcel={handleExportExcel}
            onPdf={handleExportExcel}
            exportDisabled={exporting || visible.length === 0}
          />
        }
        layout="split"
        className="h-full min-h-0"
      >
        <AccountsTableListing
          footer={
            mounted && visible.length > 0 ? (
              <AccountsTablePagination
                page={page}
                pageSize={pageSize}
                totalRecords={visible.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                recordLabel="credit notes"
              />
            ) : null
          }
        >
          <AccountsTable minWidth={900}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <AccountsTableHeadCell uppercase>Date</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>Credit Note No.</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>Reference Number</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase className="accounts-col-party">Customer Name</AccountsTableHeadCell>
                <AccountsTableHeadCell align="right" uppercase>Amount</AccountsTableHeadCell>
                <AccountsTableHeadCell align="right" uppercase className={accountsActionColClass("multi")}>
                  Actions
                </AccountsTableHeadCell>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {!mounted ? (
                <AccountsTableEmpty colSpan={6} message="Loading credit notes…" />
              ) : visible.length === 0 ? (
                <AccountsTableEmpty
                  colSpan={6}
                  message="No credit notes found. Adjust filters or create a new credit note."
                  onClear={search || dateFrom || dateTo ? () => { setSearch(""); setDateFrom(""); setDateTo(""); } : undefined}
                />
              ) : (
                pagedRows.map((r) => (
                  <AccountsTableRow key={r.id}>
                    <AccountsTableCell className="tabular-nums">{r.creditNoteDate}</AccountsTableCell>
                    <AccountsTableCell mono className="font-semibold text-brand-700">
                      <Link href={`${LIST_PATH}/${r.id}`} className="hover:underline">
                        {r.creditNoteNo}
                      </Link>
                    </AccountsTableCell>
                    <AccountsTableCell mono>{r.sourceInvoiceNo || "—"}</AccountsTableCell>
                    <AccountsTableCell className="accounts-col-party font-medium">{r.customerName}</AccountsTableCell>
                    <AccountsTableCell align="right" money className="font-medium">
                      {formatINR(r.currentCreditAmount)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                      <AccountsTableActionCell>
                        <AccountsViewAction href={`${LIST_PATH}/${r.id}`} />
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
                                    <XCircle className="w-3.5 h-3.5" /> Cancel
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
        </AccountsTableListing>
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
    </>
  );
}
