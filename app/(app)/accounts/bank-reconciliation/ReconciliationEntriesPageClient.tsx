"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ArrowLeft, FileSpreadsheet, Search } from "lucide-react";
import {
  getEntriesForStatement,
  getStatementById,
  getStatementStats,
  MATCH_STATUS_OPTIONS,
  type BankStatementEntry,
} from "./bank-reconciliation-data";
import { exportStatementEntriesToExcel } from "./bank-reconciliation-export";
import { CategorizeEntryPanel } from "./components/CategorizeEntryPanel";
import { MatchEntryModal } from "./components/MatchEntryModal";
import { MatchStatusBadge } from "./components/MatchStatusBadge";
import { formatINR, monthYearLabel, RECONCILIATION_LIST_PATH } from "./reconciliation-utils";
import { cn } from "@/lib/utils";

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function StatementDetailsCell({ entry }: { entry: BankStatementEntry }) {
  return (
    <div className="min-w-0">
      {entry.referenceNo && (
        <p className="text-xs font-mono text-muted-foreground leading-tight">Ref# {entry.referenceNo}</p>
      )}
      <p className="text-xs whitespace-normal break-words leading-snug mt-0.5">{entry.narration}</p>
    </div>
  );
}

export default function ReconciliationEntriesPageClient({
  statementId,
  embedded = false,
}: {
  statementId: number;
  embedded?: boolean;
}) {
  const statement = getStatementById(statementId);
  const [entries, setEntries] = useState<BankStatementEntry[]>([]);
  const [search, setSearch] = useState("");
  const [matchStatus, setMatchStatus] = useState("all");
  const [entryType, setEntryType] = useState("all");
  const [activeEntries, setActiveEntries] = useState<BankStatementEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const refresh = useCallback(() => {
    setEntries(
      getEntriesForStatement(statementId, {
        search,
        matchStatus,
        entryType,
      }),
    );
  }, [statementId, search, matchStatus, entryType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = useMemo(() => getStatementStats(statementId), [statementId, entries]);

  const syncAfterSave = useCallback(() => {
    refresh();
    setSelectedIds(new Set());
    const fresh = getEntriesForStatement(statementId);
    if (activeEntries.length === 1) {
      const updated = fresh.find((e) => e.id === activeEntries[0].id);
      setActiveEntries(updated ? [updated] : []);
    }
  }, [refresh, statementId, activeEntries]);

  useEffect(() => {
    if (entries.length > 0 && activeEntries.length === 0) {
      const firstUncategorized = entries.find((e) => e.matchStatus === "unmatched") ?? entries[0];
      setActiveEntries([firstUncategorized]);
    }
  }, [entries, activeEntries.length]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(entries.map((e) => e.id)));
  };

  const selectedEntries = useMemo(
    () => entries.filter((e) => selectedIds.has(e.id)),
    [entries, selectedIds],
  );

  const panelEntries =
    selectedIds.size > 1 ? selectedEntries : activeEntries.length > 0 ? activeEntries : [];

  if (!statement) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Statement not found.{" "}
        <Link href={RECONCILIATION_LIST_PATH} className="text-brand-600 underline">
          Back to list
        </Link>
      </div>
    );
  }

  const period = monthYearLabel(statement.month, statement.year);
  const uncategorized = stats.unmatched;

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportStatementEntriesToExcel(statement, entries);
    } finally {
      setExporting(false);
    }
  };

  const body = (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Compact header */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-border/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" asChild>
            <Link href={RECONCILIATION_LIST_PATH}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{statement.bankAccountName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {period} · {uncategorized} uncategorized
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              className="h-9 text-sm font-medium bg-brand-600 text-white"
              onClick={() => setActiveEntries(selectedEntries)}
            >
              Categorize ({selectedIds.size})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-sm font-medium"
            disabled={exporting}
            onClick={handleExport}
          >
            <FileSpreadsheet className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-border/30 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2 top-2 w-4 h-4 text-muted-foreground" />
          <Input
            className="h-8 pl-7 text-xs"
            placeholder="Search narration, reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={matchStatus} onValueChange={setMatchStatus}>
          <SelectTrigger className="h-8 w-[120px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All status</SelectItem>
            {MATCH_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entryType} onValueChange={setEntryType}>
          <SelectTrigger className="h-8 w-[120px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All types</SelectItem>
            <SelectItem value="debit" className="text-xs">Withdrawals</SelectItem>
            <SelectItem value="credit" className="text-xs">Deposits</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
          W: {formatINR(stats.totalDebit)} · D: {formatINR(stats.totalCredit)}
        </span>
      </div>

      {/* Zoho split: full-width list + categorize panel when a row is selected */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div
          className={cn(
            "min-w-0 overflow-auto",
            panelEntries.length > 0 ? "flex-1 border-r border-border/40" : "w-full",
          )}
        >
          <table className="accounts-table w-full min-w-full">
            <thead className="bg-muted/40 border-b border-border sticky top-0 z-[1]">
              <tr>
                <th className="w-10 px-4 py-2.5 align-middle">
                  <Checkbox
                    checked={entries.length > 0 && selectedIds.size === entries.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap w-[110px] align-middle">
                  Date
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground min-w-[min(100%,320px)] align-middle">
                  Statement Details
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-foreground whitespace-nowrap w-[130px] align-middle">
                  Deposits
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-foreground whitespace-nowrap w-[130px] align-middle">
                  Withdrawals
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground w-[140px] align-middle">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="accounts-table-empty">
                    No entries match filters.
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const isActive = activeEntries.some((a) => a.id === e.id);
                  return (
                    <tr
                      key={e.id}
                      className={`border-b border-border/30 cursor-pointer transition-colors ${
                        isActive ? "bg-brand-50/60" : "hover:bg-slate-50/80"
                      } ${selectedIds.has(e.id) ? "ring-1 ring-inset ring-brand-200" : ""}`}
                      onClick={() => {
                        setActiveEntries([e]);
                        if (selectedIds.size <= 1) setSelectedIds(new Set());
                      }}
                    >
                      <td className="px-4 py-2 align-middle" onClick={(ev) => ev.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(e.id)}
                          onCheckedChange={() => toggleSelect(e.id)}
                        />
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap align-middle">
                        {formatDisplayDate(e.transactionDate)}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <StatementDetailsCell entry={e} />
                      </td>
                      <td className="px-4 py-2 text-xs text-right tabular-nums align-middle font-medium text-emerald-600">
                        {e.credit > 0 ? formatINR(e.credit) : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-right tabular-nums align-middle font-medium text-red-600">
                        {e.debit > 0 ? formatINR(e.debit) : "—"}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <MatchStatusBadge status={e.matchStatus} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {panelEntries.length > 0 && (
          <div className="w-[min(380px,34vw)] shrink-0 flex flex-col min-h-0 bg-white hidden lg:flex border-l border-border/40">
            <CategorizeEntryPanel entries={panelEntries} onUpdated={syncAfterSave} />
          </div>
        )}
      </div>

      {/* Mobile categorize sheet */}
      <div className="lg:hidden shrink-0 border-t border-border/40 p-2">
        {panelEntries.length > 0 ? (
          <Button
            size="sm"
            className="w-full h-9 text-sm font-medium bg-brand-600 text-white"
            onClick={() => setMobilePanelOpen(true)}
          >
            Categorize Manually
            {selectedIds.size > 1 ? ` (${selectedIds.size})` : ""}
          </Button>
        ) : (
          <p className="text-xs text-center text-muted-foreground">Select a transaction to categorize</p>
        )}
      </div>

      <MatchEntryModal
        entries={panelEntries}
        open={mobilePanelOpen && panelEntries.length > 0}
        onOpenChange={setMobilePanelOpen}
        onUpdated={syncAfterSave}
      />
    </div>
  );

  if (embedded) {
    return <div className="-mx-4 -my-3 flex flex-col h-full min-h-0">{body}</div>;
  }

  return body;
}
