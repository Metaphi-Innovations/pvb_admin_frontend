"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileSpreadsheet, Link2 } from "lucide-react";
import {
  getEntriesForStatement,
  getStatementById,
  getStatementStats,
  loadBankEntries,
  MATCH_MODULE_OPTIONS,
  MATCH_STATUS_OPTIONS,
  matchModuleLabel,
  type BankStatementEntry,
} from "./bank-reconciliation-data";
import { exportStatementEntriesToExcel } from "./bank-reconciliation-export";
import { MatchEntryModal } from "./components/MatchEntryModal";
import { MatchStatusBadge } from "./components/MatchStatusBadge";
import { formatINR, monthYearLabel, RECONCILIATION_LIST_PATH } from "./reconciliation-utils";

export default function ReconciliationEntriesPageClient({ statementId }: { statementId: number }) {
  const statement = getStatementById(statementId);
  const [entries, setEntries] = useState<BankStatementEntry[]>([]);
  const [search, setSearch] = useState("");
  const [matchStatus, setMatchStatus] = useState("all");
  const [reconStatus, setReconStatus] = useState("all");
  const [entryType, setEntryType] = useState("all");
  const [matchedModule, setMatchedModule] = useState("all");
  const [matchEntry, setMatchEntry] = useState<BankStatementEntry | null>(null);
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(() => {
    setEntries(
      getEntriesForStatement(statementId, {
        search,
        matchStatus,
        reconciliationStatus: reconStatus,
        entryType,
        matchedModule,
      }),
    );
  }, [statementId, search, matchStatus, reconStatus, entryType, matchedModule]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = useMemo(() => getStatementStats(statementId), [statementId, entries]);

  const syncMatchEntry = useCallback(() => {
    refresh();
    if (matchEntry) {
      const fresh = loadBankEntries().find((e) => e.id === matchEntry.id);
      if (fresh) setMatchEntry(fresh);
    }
  }, [matchEntry, refresh]);

  if (!statement) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-sm text-muted-foreground">
          Statement not found.{" "}
          <Link href={RECONCILIATION_LIST_PATH} className="text-brand-600 underline">
            Back to list
          </Link>
        </div>
      </AppLayout>
    );
  }

  const period = monthYearLabel(statement.month, statement.year);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportStatementEntriesToExcel(statement, entries);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1680px] mx-auto space-y-3">
        <PageHeader
          title={statement.statementName}
          description={`${statement.bankAccountName} · ${period} · ${statement.fileName}`}
          breadcrumbs={[
            { label: "Accounts", href: "/accounts" },
            { label: "Bank Reconciliation", href: RECONCILIATION_LIST_PATH },
            { label: "Entries" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
                <Link href={RECONCILIATION_LIST_PATH}>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={exporting || entries.length === 0}
                onClick={handleExport}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Excel
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: "Total Entries", value: stats.total },
            { label: "Matched", value: stats.matched },
            { label: "Unmatched", value: stats.unmatched },
            { label: "Reconciled", value: stats.reconciled },
            { label: "Total Debit", value: formatINR(stats.totalDebit) },
            { label: "Total Credit", value: formatINR(stats.totalCredit) },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border bg-white px-3 py-2">
              <p className="text-[10px] uppercase text-muted-foreground font-medium">{c.label}</p>
              <p className="text-sm font-semibold tabular-nums mt-0.5">{c.value}</p>
            </div>
          ))}
        </div>

        <ModuleFiltersBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Narration, reference, matched record…">
          <Select value={matchStatus} onValueChange={setMatchStatus}>
            <SelectTrigger className="h-8 w-[130px] text-xs bg-white">
              <SelectValue placeholder="Match status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All match</SelectItem>
              {MATCH_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={reconStatus} onValueChange={setReconStatus}>
            <SelectTrigger className="h-8 w-[140px] text-xs bg-white">
              <SelectValue placeholder="Recon status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All recon</SelectItem>
              {MATCH_STATUS_OPTIONS.map((s) => (
                <SelectItem key={`r-${s}`} value={s} className="text-xs capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entryType} onValueChange={setEntryType}>
            <SelectTrigger className="h-8 w-[110px] text-xs bg-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All types</SelectItem>
              <SelectItem value="debit" className="text-xs">Debit</SelectItem>
              <SelectItem value="credit" className="text-xs">Credit</SelectItem>
            </SelectContent>
          </Select>
          <Select value={matchedModule} onValueChange={setMatchedModule}>
            <SelectTrigger className="h-8 w-[130px] text-xs bg-white">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All modules</SelectItem>
              {MATCH_MODULE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ModuleFiltersBar>

        <div className="page-shell overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-table min-w-[1400px]">
              <thead className="sticky top-0 z-10 bg-white border-b">
                <tr>
                  {[
                    "Date",
                    "Narration",
                    "Debit",
                    "Credit",
                    "Balance",
                    "Ref No.",
                    "Type",
                    "Module",
                    "Matched Record",
                    "Match",
                    "Recon",
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
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-xs text-muted-foreground">
                      No entries match filters.
                    </td>
                  </tr>
                ) : (
                  entries.map((e) => (
                    <tr key={e.id} className="border-b hover:bg-brand-50/25">
                      <td className="px-2.5 py-2 text-xs text-muted-foreground whitespace-nowrap">{e.transactionDate}</td>
                      <td className="px-2.5 py-2 text-xs max-w-[200px] truncate" title={e.narration}>
                        {e.narration}
                      </td>
                      <td className="px-2.5 py-2 text-xs tabular-nums">{e.debit > 0 ? formatINR(e.debit) : "—"}</td>
                      <td className="px-2.5 py-2 text-xs tabular-nums">{e.credit > 0 ? formatINR(e.credit) : "—"}</td>
                      <td className="px-2.5 py-2 text-xs tabular-nums text-muted-foreground">
                        {e.balance > 0 ? formatINR(e.balance) : "—"}
                      </td>
                      <td className="px-2.5 py-2 text-xs font-mono">{e.referenceNo || "—"}</td>
                      <td className="px-2.5 py-2 text-xs capitalize">{e.entryType}</td>
                      <td className="px-2.5 py-2 text-xs">{matchModuleLabel(e.matchedModule)}</td>
                      <td className="px-2.5 py-2 text-xs max-w-[160px] truncate" title={e.matchedRecordLabel || e.ledgerName}>
                        {e.matchedRecordLabel || e.ledgerName || "—"}
                      </td>
                      <td className="px-2.5 py-2">
                        <MatchStatusBadge status={e.matchStatus} />
                      </td>
                      <td className="px-2.5 py-2">
                        <MatchStatusBadge status={e.reconciliationStatus} />
                      </td>
                      <td className="px-2.5 py-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] gap-1"
                          onClick={() => {
                            setMatchEntry(e);
                          }}
                        >
                          <Link2 className="w-3 h-3" />
                          Match
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <MatchEntryModal
        entry={matchEntry}
        open={!!matchEntry}
        onOpenChange={(v) => !v && setMatchEntry(null)}
        onUpdated={syncMatchEntry}
      />
    </AppLayout>
  );
}
