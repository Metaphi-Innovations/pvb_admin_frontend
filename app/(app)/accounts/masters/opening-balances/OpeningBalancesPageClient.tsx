"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import { AccountsTableListing } from "@/components/accounts/AccountsTableListing";
import { ReportFinancialYearFilter } from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  formatMoneyString,
  formatMoneyStringOrDash,
} from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useFY } from "@/lib/fy-store";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  OpeningBalanceApiService,
  type OpeningBalanceFyListResponse,
  type OpeningBalanceFyRowDto,
  type OpeningBalanceSummaryDto,
} from "@/services/opening-balance.service";

function SummaryBar({ summary }: { summary: OpeningBalanceSummaryDto }) {
  const balanced = summary.is_balanced;
  return (
    <div className="flex-shrink-0 border-b border-border bg-white px-3 py-2.5 space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            Total Debit
          </p>
          <p className="text-sm font-bold tabular-nums text-foreground">
            {formatMoneyString(summary.total_debit)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            Total Credit
          </p>
          <p className="text-sm font-bold tabular-nums text-foreground">
            {formatMoneyString(summary.total_credit)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            Difference
          </p>
          <p
            className={cn(
              "text-sm font-bold tabular-nums",
              balanced ? "text-emerald-700" : "text-red-600"
            )}
          >
            {formatMoneyString(summary.difference)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            Status
          </p>
          <p
            className={cn(
              "text-sm font-bold inline-flex items-center gap-1.5",
              balanced ? "text-emerald-700" : "text-red-600"
            )}
          >
            {balanced ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Balanced
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" /> Not Balanced
              </>
            )}
          </p>
        </div>
      </div>
      {!balanced && (
        <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
          Opening balances are not balanced. Debit and Credit totals must match
          before treating this Financial Year opening set as complete.
          Difference: {formatMoneyString(summary.difference)}
        </div>
      )}
      {balanced && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">
          Opening balances are balanced for this Financial Year.
        </div>
      )}
    </div>
  );
}

export default function OpeningBalancesPageClient() {
  const mounted = useClientMounted();
  const { selectedFY } = useFY();

  const [financialYearId, setFinancialYearId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OpeningBalanceFyListResponse | null>(null);
  const [search, setSearch] = useState("");

  const [editRow, setEditRow] = useState<OpeningBalanceFyRowDto | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [editNarration, setEditNarration] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    if (selectedFY?.id) setFinancialYearId(selectedFY.id);
  }, [mounted, selectedFY?.id]);

  useEffect(() => {
    setEditRow(null);
    setSearch("");
    setError(null);
  }, [financialYearId]);

  const load = useCallback(async (fyId: string, signal?: AbortSignal) => {
    if (!fyId || fyId === "all") {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await OpeningBalanceApiService.listByFinancialYear(
        fyId,
        signal
      );
      if (signal?.aborted) return;
      setData(result);
    } catch (err) {
      if (signal?.aborted) return;
      setError(
        err instanceof Error ? err.message : "Failed to load opening balances."
      );
      setData(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !financialYearId) return;
    const controller = new AbortController();
    void load(financialYearId, controller.signal);
    return () => controller.abort();
  }, [mounted, financialYearId, load]);

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) => {
      const code = r.ledger?.ledgerCode?.toLowerCase() ?? "";
      const name = r.ledger?.ledgerName?.toLowerCase() ?? "";
      const head = r.ledger?.primaryHead?.name?.toLowerCase() ?? "";
      return code.includes(q) || name.includes(q) || head.includes(q);
    });
  }, [data?.rows, search]);

  const openEdit = (row: OpeningBalanceFyRowDto) => {
    setEditRow(row);
    setEditAmount(row.amount);
    setEditType(row.balanceType === "CREDIT" ? "CREDIT" : "DEBIT");
    setEditNarration(row.narration ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editRow) return;
    setSaving(true);
    try {
      await OpeningBalanceApiService.update(
        editRow.ledgerId,
        editRow.openingBalanceId,
        {
          amount: editAmount,
          balanceType: editType,
          narration: editNarration || null,
        },
        financialYearId
      );
      showToast("Opening balance updated.", "success");
      setEditRow(null);
      await load(financialYearId);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update opening balance.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: OpeningBalanceFyRowDto) => {
    const label = row.ledger
      ? `${row.ledger.ledgerCode} — ${row.ledger.ledgerName}`
      : row.openingBalanceId;
    if (
      !window.confirm(
        `Remove opening balance for ${label}?\n\nThis soft-deletes the opening row only. The ledger itself is not deleted.`
      )
    ) {
      return;
    }
    try {
      await OpeningBalanceApiService.softDelete(
        row.ledgerId,
        row.openingBalanceId,
        financialYearId
      );
      showToast("Opening balance removed.", "success");
      await load(financialYearId);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete opening balance.",
        "error"
      );
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Masters", "Opening Balances")}
      title="Opening Balances"
      description="Financial Year opening balances — Debit and Credit totals must match."
      layout="split"
      filters={
        <div className="flex flex-wrap items-end gap-2">
          <ReportFinancialYearFilter
            value={financialYearId || "all"}
            onChange={setFinancialYearId}
          />
          <div className="space-y-0.5 min-w-[200px]">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Search
            </span>
            <Input
              className="h-8 text-xs"
              placeholder="Ledger code / name / head…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={loading || !financialYearId}
            onClick={() => void load(financialYearId)}
          >
            Refresh
          </Button>
        </div>
      }
    >
      <div className="accounts-listing-card flex flex-col flex-1 min-h-0">
        {data?.summary && <SummaryBar summary={data.summary} />}
        {data?.lifecycle?.note && (
          <p className="flex-shrink-0 px-3 py-1.5 text-[11px] text-muted-foreground border-b border-border">
            {data.lifecycle.note}
          </p>
        )}
        <AccountsTableListing className="flex-1 min-h-0">
          {!mounted || loading ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              Loading opening balances…
            </div>
          ) : error ? (
            <div className="py-10 text-center text-xs text-red-600">{error}</div>
          ) : !financialYearId || financialYearId === "all" ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              Select a Financial Year to view opening balances.
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No opening balances found for this Financial Year.
            </div>
          ) : (
            <AccountsTable minWidth={900}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Code</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Ledger</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Primary Head</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">Debit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">Credit</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Effective</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">Actions</th>
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {rows.map((row) => {
                  const isDebit = row.balanceType !== "CREDIT";
                  return (
                    <AccountsTableRow key={row.openingBalanceId}>
                      <AccountsTableCell className="font-mono text-xs text-brand-700">
                        {row.ledger?.ledgerCode ?? "—"}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs font-medium">
                        {row.ledger?.ledgerName ?? "—"}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs text-muted-foreground">
                        {row.ledger?.primaryHead?.name ?? "—"}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money>
                        {formatMoneyStringOrDash(isDebit ? row.amount : "0")}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money>
                        {formatMoneyStringOrDash(!isDebit ? row.amount : "0")}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs">
                        {String(row.effectiveDate).slice(0, 10)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            className="p-1.5 rounded-md hover:bg-muted"
                            title="Edit"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-md hover:bg-red-50"
                            title="Remove opening balance"
                            onClick={() => void handleDelete(row)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </AccountsTableCell>
                    </AccountsTableRow>
                  );
                })}
              </AccountsTableBody>
            </AccountsTable>
          )}
        </AccountsTableListing>
      </div>

      <Sheet open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Opening Balance</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {editRow?.ledger
                ? `${editRow.ledger.ledgerCode} — ${editRow.ledger.ledgerName}`
                : ""}
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Amount</Label>
              <Input
                className="h-9 text-sm"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Balance Type</Label>
              <Select
                value={editType}
                onValueChange={(v) => setEditType(v as "DEBIT" | "CREDIT")}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBIT">Debit</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Side is not forced by Primary Head. Liability Debit / Asset Credit
                rows are allowed.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Narration</Label>
              <Input
                className="h-9 text-sm"
                value={editNarration}
                onChange={(e) => setEditNarration(e.target.value)}
              />
            </div>
          </SheetBody>
          <SheetFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setEditRow(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              disabled={saving}
              onClick={() => void handleSaveEdit()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AccountsPageShell>
  );
}
