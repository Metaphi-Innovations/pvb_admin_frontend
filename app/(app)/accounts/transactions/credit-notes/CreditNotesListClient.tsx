"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, FileSpreadsheet, MoreVertical, Pencil, Plus, Search, XCircle } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { ReportDateRangeFilter, useReportDateRange } from "@/components/accounts/ReportFilters";
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
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [records, setRecords] = useState<CreditNoteRecord[]>([]);
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<CreditNoteRecord | null>(null);
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCreditNotesToExcel(visible);
    } finally {
      setExporting(false);
    }
  };

  const handleTodayDateChange = (value: string) => {
    setDateFrom(value);
    setDateTo(value);
  };

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", "Credit Notes")}
        title="Credit Notes"
        description="Sales credit notes — reduces customer outstanding."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              disabled={exporting || visible.length === 0}
              onClick={handleExport}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {exporting ? "Exporting…" : "Export"}
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
              onClick={() => router.push(`${LIST_PATH}/new`)}
            >
              <Plus className="w-3.5 h-3.5" /> New
            </Button>
          </>
        }
        filters={
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                className="h-8 text-xs pl-8"
                placeholder="Search CN no., customer, invoice ref…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            {preset === "today" && (
              <div className="space-y-1">
                <Label className="text-[10px] font-medium uppercase text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  className="h-8 text-xs w-36"
                  value={dateFrom}
                  onChange={(e) => handleTodayDateChange(e.target.value)}
                />
              </div>
            )}
          </div>
        }
        layout="split"
        className="h-full min-h-0"
      >
        <div className="flex-1 overflow-auto min-h-0">
          <table className="accounts-table w-full text-table min-w-[900px]">
            <thead className="border-b border-border/60">
              <tr>
                {["Date", "Credit Note No.", "Reference Number", "Customer Name", "Amount", ""].map((h) => (
                  <th
                    key={h || "actions"}
                    className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap ${
                      h === "Amount" || h === "" ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!mounted ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-xs text-muted-foreground">
                    Loading credit notes…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <p className="text-sm font-medium text-foreground">No credit notes found</p>
                    <p className="text-xs text-muted-foreground mt-1">Adjust filters or create a new credit note.</p>
                  </td>
                </tr>
              ) : (
                visible.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-xs tabular-nums">{r.creditNoteDate}</td>
                    <td className="px-4 py-2.5 text-xs font-mono font-semibold text-brand-700">
                      <Link href={`${LIST_PATH}/${r.id}`} className="hover:underline">
                        {r.creditNoteNo}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono">{r.sourceInvoiceNo || "—"}</td>
                    <td className="px-4 py-2.5 text-xs font-medium">{r.customerName}</td>
                    <td className="px-4 py-2.5 text-xs text-right tabular-nums font-medium">
                      {formatINR(r.currentCreditAmount)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Link
                          href={`${LIST_PATH}/${r.id}`}
                          title="View"
                          className="p-1.5 hover:bg-muted rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        </Link>
                        {getCreditNoteRowActions(r).includes("edit") && (
                          <Link
                            href={`${LIST_PATH}/${r.id}/edit`}
                            title="Edit"
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </Link>
                        )}
                        {getCreditNoteRowActions(r).some((a) => a !== "view" && a !== "edit") && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                title="More actions"
                                className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
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
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
    </>
  );
}
