"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AccountsEditAction,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { Download, Plus, Search } from "lucide-react";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import {
  LedgerTransactionDateFilter,
  useLedgerTransactionDateFilter,
} from "@/components/accounts/LedgerTransactionDateFilter";
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
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { canCoa } from "@/lib/accounts/permissions";
import { SortTh, StatusBadge } from "../../components/AccountsUI";
import { getCoaLedgers, loadChartOfAccounts, nextId, saveChartOfAccounts, type ChartOfAccount } from "../../data";
import { SYSTEM_COA_NODES } from "../coa-seed-nodes";
import { LedgerSheet } from "../chart-of-accounts/components/LedgerSheet";
import {
  DEFAULT_LEDGER_FORM,
  defaultBalanceTypeForParent,
  formToLedger,
  generateLedgerCode,
  ledgerToForm,
  parentGroupLabel,
  validateLedgerForm,
  type LedgerFormValues,
} from "../chart-of-accounts/chart-of-accounts-data";
import {
  computePeriodClosingBalance,
  ledgerMovementMapForRange,
} from "@/lib/accounts/ledger-transaction-date-filter";
import {
  formatOpeningBalance,
  ledgerTypeDisplayLabel,
} from "./ledgers-utils";

const PAGE_SIZE = 15;
const INITIAL_COA: ChartOfAccount[] = [...SYSTEM_COA_NODES];

type SheetMode = "add" | "edit" | null;

export default function LedgersPageClient() {
  const router = useRouter();
  const [coaRecords, setCoaRecords] = useState<ChartOfAccount[]>(INITIAL_COA);
  const [search, setSearch] = useState("");
  const { applied, draft, setPreset, setDraftFrom, setDraftTo, apply } = useLedgerTransactionDateFilter();
  const [sortKey, setSortKey] = useState("accountName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [active, setActive] = useState<ChartOfAccount | null>(null);
  const [form, setForm] = useState<LedgerFormValues>(DEFAULT_LEDGER_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState("");

  const canCreate = canCoa("create");
  const canEdit = canCoa("edit");

  const refresh = useCallback(() => {
    setCoaRecords(loadChartOfAccounts());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ledgers = useMemo(() => getCoaLedgers(), [coaRecords]);

  const movementByLedger = useMemo(
    () => ledgerMovementMapForRange(applied.from, applied.to),
    [applied.from, applied.to, coaRecords],
  );

  const periodClosingFor = useCallback(
    (ledger: ChartOfAccount) => {
      const movement = movementByLedger.get(ledger.id) ?? { totalDebit: 0, totalCredit: 0 };
      return computePeriodClosingBalance(ledger, movement.totalDebit, movement.totalCredit);
    },
    [movementByLedger],
  );

  const visible = useMemo(() => {
    let r = [...ledgers];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.accountName.toLowerCase().includes(q) ||
          x.accountCode.toLowerCase().includes(q) ||
          (x.alias && x.alias.toLowerCase().includes(q)) ||
          ledgerTypeDisplayLabel(x, coaRecords).toLowerCase().includes(q),
      );
    }
    r.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (sortKey === "parentGroup") {
        av = a.parentAccountId ? parentGroupLabel(coaRecords, a.parentAccountId) : "";
        bv = b.parentAccountId ? parentGroupLabel(coaRecords, b.parentAccountId) : "";
      } else if (sortKey === "ledgerType") {
        av = ledgerTypeDisplayLabel(a, coaRecords);
        bv = ledgerTypeDisplayLabel(b, coaRecords);
      } else if (sortKey === "currentBalance") {
        av = periodClosingFor(a).amount;
        bv = periodClosingFor(b).amount;
      } else {
        av = (a as unknown as Record<string, unknown>)[sortKey] as string | number;
        bv = (b as unknown as Record<string, unknown>)[sortKey] as string | number;
      }
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [ledgers, coaRecords, search, sortKey, sortDir, periodClosingFor]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const openAdd = () => {
    setForm(DEFAULT_LEDGER_FORM);
    setPreviewCode(generateLedgerCode(coaRecords));
    setActive(null);
    setFormError(null);
    setSheetMode("add");
  };

  const openEdit = (row: ChartOfAccount) => {
    setActive(row);
    setForm(ledgerToForm(row));
    setPreviewCode(row.accountCode);
    setFormError(null);
    setSheetMode("edit");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setFormError(null);
  };

  const handleFormChange = (next: LedgerFormValues) => {
    if (next.parentGroupId !== form.parentGroupId && next.parentGroupId) {
      next.balanceType = defaultBalanceTypeForParent(coaRecords, next.parentGroupId);
    }
    setForm(next);
  };

  const handleSave = () => {
    const err = validateLedgerForm(form, coaRecords, active?.id);
    if (err) {
      setFormError(err);
      return;
    }
    const list = [...coaRecords];
    if (sheetMode === "add") {
      const code = generateLedgerCode(list);
      list.push(formToLedger(form, nextId(list), code, list));
    } else if (sheetMode === "edit" && active) {
      const idx = list.findIndex((r) => r.id === active.id);
      if (idx >= 0) {
        list[idx] = formToLedger(form, active.id, active.accountCode, list, active);
      }
    }
    saveChartOfAccounts(list);
    setCoaRecords(list);
    closeSheet();
  };

  const exportCsv = () => {
    const header = "Ledger Name,Code,Alias,Parent Group,Ledger Type,Opening Balance,Current Balance,Status,GST,TDS\n";
    const rows = visible
      .map((r) => {
        const group = r.parentAccountId ? parentGroupLabel(coaRecords, r.parentAccountId) : "";
        const ledgerType = ledgerTypeDisplayLabel(r, coaRecords);
        const closing = periodClosingFor(r);
        return [
          `"${r.accountName}"`,
          `"${r.accountCode}"`,
          `"${r.alias ?? ""}"`,
          `"${group}"`,
          `"${ledgerType}"`,
          `"${formatOpeningBalance(r)}"`,
          `"${closing.amount} ${closing.balanceType}"`,
          r.status,
          r.gstApplicable ? "Yes" : "No",
          r.tdsApplicable ? "Yes" : "No",
        ].join(",");
      })
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ledgers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterBar = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-8 text-xs bg-white"
          placeholder="Search ledger name, code, alias…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <LedgerTransactionDateFilter
        preset={draft.preset}
        dateFrom={draft.from}
        dateTo={draft.to}
        onPresetChange={setPreset}
        onDateFromChange={setDraftFrom}
        onDateToChange={setDraftTo}
        onApply={() => {
          apply();
          setPage(1);
        }}
      />
    </div>
  );

  const paginationFooter = (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/5 text-xs text-muted-foreground">
          <span>
            {visible.length === 0
              ? "0 ledgers"
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, visible.length)} of ${visible.length}`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-[11px] tabular-nums">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
  );

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Masters", "Ledgers")}
        title="Ledgers"
        description="Ledger accounts created under Chart of Accounts groups and sub-groups."
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={exportCsv}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            {canCreate && (
              <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1" onClick={openAdd}>
                <Plus className="w-3.5 h-3.5" /> Add Ledger
              </Button>
            )}
          </>
        }
        filters={filterBar}
        footer={paginationFooter}
        layout="split"
        className="h-full min-h-0"
      >
        <AccountsTableScroll>
          <AccountsTable minWidth={960}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <SortTh label="Ledger Code" colKey="accountCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Ledger Name" colKey="accountName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Ledger Type" colKey="ledgerType" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Parent Group" colKey="parentGroup" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Opening Balance" colKey="openingBalance" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                <SortTh label="Current Balance" colKey="currentBalance" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                <AccountsTableHeadCell align="center">Status</AccountsTableHeadCell>
                <AccountsTableHeadCell align="center" className={accountsActionColClass("multi")}>
                  Action
                </AccountsTableHeadCell>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {paged.length === 0 ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={8} className="accounts-table-empty">
                    <p className="text-sm font-medium text-foreground">No ledgers found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Adjust search or date range, or add a ledger under a valid group.
                    </p>
                    {canCreate && (
                      <Button size="sm" className="h-8 text-xs mt-3 bg-brand-600 text-white" onClick={openAdd}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Ledger
                      </Button>
                    )}
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : (
                paged.map((r) => {
                  const closing = periodClosingFor(r);
                  const ledgerType = ledgerTypeDisplayLabel(r, coaRecords);
                  return (
                    <AccountsTableRow
                      key={r.id}
                      className="group"
                      onClick={() => router.push(`/accounts/masters/ledgers/${r.id}`)}
                    >
                      <AccountsTableCell mono className="font-semibold text-brand-700">
                        {r.accountCode}
                      </AccountsTableCell>
                      <AccountsTableCell wrap className="min-w-[180px]">
                        <p className="text-xs font-semibold text-foreground leading-snug">{r.accountName}</p>
                        {r.alias ? (
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{r.alias}</p>
                        ) : null}
                      </AccountsTableCell>
                      <AccountsTableCell className="whitespace-nowrap">{ledgerType}</AccountsTableCell>
                      <AccountsTableCell wrap className="text-muted-foreground max-w-[200px]">
                        <span className="line-clamp-2">
                          {r.parentAccountId ? parentGroupLabel(coaRecords, r.parentAccountId) : "—"}
                        </span>
                      </AccountsTableCell>
                      <AccountsTableCell align="right">
                        <MoneyAmount amount={r.openingBalance} side={r.balanceType} sideBadge />
                      </AccountsTableCell>
                      <AccountsTableCell align="right">
                        <MoneyAmount amount={closing.amount} side={closing.balanceType} sideBadge />
                      </AccountsTableCell>
                      <AccountsTableCell align="center">
                        <StatusBadge status={r.status} />
                      </AccountsTableCell>
                      <AccountsTableCell align="center" className={accountsActionColClass("multi")} onClick={(e) => e.stopPropagation()}>
                        <AccountsTableActionCell>
                          <AccountsViewAction
                            title="View ledger"
                            onClick={() => router.push(`/accounts/masters/ledgers/${r.id}`)}
                          />
                          {canEdit && (
                            <AccountsEditAction title="Edit ledger" onClick={() => openEdit(r)} />
                          )}
                        </AccountsTableActionCell>
                      </AccountsTableCell>
                    </AccountsTableRow>
                  );
                })
              )}
            </AccountsTableBody>
          </AccountsTable>
        </AccountsTableScroll>
      </AccountsPageShell>

      <LedgerSheet
        open={!!sheetMode}
        mode={sheetMode}
        form={form}
        formError={formError}
        previewCode={previewCode}
        records={coaRecords}
        active={active}
        onClose={closeSheet}
        onSave={handleSave}
        onFormChange={handleFormChange}
        canEdit={sheetMode === "add" ? canCreate : canEdit}
      />
    </>
  );
}
