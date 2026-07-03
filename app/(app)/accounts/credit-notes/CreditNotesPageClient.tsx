"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountsFilterBar } from "@/components/accounts/AccountsFilterBar";
import { AccountsListingDateFilter } from "@/components/accounts/AccountsListingFilter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AccountsEditAction,
  AccountsMoreActions,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { FileSpreadsheet, Plus, XCircle } from "lucide-react";
import { SectionTabs } from "../components/AccountsUI";
import { NoteWorkflowBadge } from "../components/NoteWorkflowBadge";
import { CreditNoteCancelDialog } from "./components/CreditNoteCancelDialog";
import {
  cancelCreditNote,
  computeCreditNoteTabCounts,
  filterCreditNotes,
  filterCreditNotesListing,
  getCreditNoteRowActions,
  loadCreditNotes,
  type CreditNoteRecord,
} from "./credit-notes-data";
import { exportCreditNotesToExcel } from "./credit-notes-export";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "pending_approval", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "cancelled", label: "Cancelled" },
];

export default function CreditNotesPageClient() {
  const [records, setRecords] = useState<CreditNoteRecord[]>([]);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cancelTarget, setCancelTarget] = useState<CreditNoteRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(() => setRecords(loadCreditNotes()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const visible = useMemo(() => {
    const tabFiltered = filterCreditNotes(records, { tab, search: "" });
    return filterCreditNotesListing(tabFiltered, { search, dateFrom, dateTo });
  }, [records, tab, search, dateFrom, dateTo]);
  const counts = useMemo(() => computeCreditNoteTabCounts(records), [records]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCreditNotesToExcel(visible);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto space-y-3">
        <PageHeader
          title="Credit Notes"
          description="Customer credits for returns, rate differences, and billing corrections."
          breadcrumbs={CREDIT_NOTES_BREADCRUMB}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-[13px] font-medium gap-1.5"
                disabled={exporting || visible.length === 0}
                onClick={handleExport}
              >
                <FileSpreadsheet className="w-4 h-4" />
                {exporting ? "Exporting…" : "Export"}
              </Button>
              <Button size="sm" className="h-9 text-[13px] font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1.5" asChild>
                <Link href={`${CREDIT_NOTES_LIST_PATH}/new`}>
                  <Plus className="w-4 h-4" />
                  Create Credit Note
                </Link>
              </Button>
            </div>
          }
        />

        <SectionTabs tabs={TABS} active={tab} onChange={setTab} counts={counts} />

        <AccountsFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="CN no., customer, invoice ref., SO ref…"
        >
          <AccountsListingDateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
        </AccountsFilterBar>

        <div className="page-shell overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
            <table className="accounts-table w-full min-w-[1280px]">
              <thead className="border-b border-border">
                <tr>
                  {[
                    "Credit Note No.",
                    "Date",
                    "Customer",
                    "Ref. Invoice",
                    "Ref. Sales Order",
                    "Credit Amount",
                    "Status",
                    "Created By",
                    "Updated By",
                    "",
                  ].map((h) => (
                    <th
                      key={h || "a"}
                      className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="accounts-table-empty">
                      No credit notes. Click Create Credit Note to add one.
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => (
                    <tr key={r.id} className="accounts-table-row group">
                      <td className="px-2.5 py-2 text-xs font-mono font-medium">{r.creditNoteNo}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.creditNoteDate}</td>
                      <td className="px-2.5 py-2 text-xs">{r.customerName}</td>
                      <td className="px-2.5 py-2 text-xs font-mono">{r.sourceInvoiceNo || "—"}</td>
                      <td className="px-2.5 py-2 text-xs font-mono">{r.sourceOrderNo || "—"}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">
                        {formatINR(r.currentCreditAmount)}
                      </td>
                      <td className="px-2.5 py-2">
                        <NoteWorkflowBadge status={r.status} />
                      </td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.createdBy}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.updatedBy}</td>
                      <td className={cn("px-2.5 py-2 sticky right-0 bg-white", accountsActionColClass("multi"))}>
                        <AccountsTableActionCell>
                          <AccountsViewAction href={`${CREDIT_NOTES_LIST_PATH}/${r.id}`} />
                          {getCreditNoteRowActions(r).includes("edit") && (
                            <AccountsEditAction href={`${CREDIT_NOTES_LIST_PATH}/${r.id}/edit`} />
                          )}
                          {getCreditNoteRowActions(r).some((a) => a !== "view" && a !== "edit") && (
                            <AccountsMoreActions contentClassName="w-40">
                              {getCreditNoteRowActions(r)
                                .filter((a) => a !== "view" && a !== "edit")
                                .map((a) => {
                              if (a === "cancel")
                                return (
                                  <DropdownMenuItem
                                    key="cancel"
                                    className="text-xs gap-2 text-red-600"
                                    onClick={() => setCancelTarget(r)}
                                  >
                                    <XCircle className="w-4 h-4" /> Cancel
                                  </DropdownMenuItem>
                                );
                              return null;
                            })}
                            </AccountsMoreActions>
                          )}
                        </AccountsTableActionCell>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
    </AppLayout>
  );
}
