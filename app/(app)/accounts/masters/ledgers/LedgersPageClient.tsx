"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Pencil, Plus, Search } from "lucide-react";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { canCoa } from "@/lib/accounts/permissions";
import { SortTh, StatusBadge } from "../../components/AccountsUI";
import { getCoaLedgers, loadChartOfAccounts, nextId, saveChartOfAccounts, type ChartOfAccount } from "../../data";
import { SYSTEM_COA_NODES } from "../coa-seed-nodes";
import { LedgerSheet } from "../chart-of-accounts/components/LedgerSheet";
import {
  DEFAULT_LEDGER_FORM,
  PRIMARY_HEAD_OPTIONS,
  defaultBalanceTypeForParent,
  formToLedger,
  generateLedgerCode,
  ledgerToForm,
  parentGroupLabel,
  validateLedgerForm,
  type LedgerFormValues,
} from "../chart-of-accounts/chart-of-accounts-data";
import {
  accountTypeMatchesPrimaryHead,
  computeLedgerBalanceBreakdown,
  computeLedgerCurrentBalance,
  formatLedgerBalance,
  formatOpeningBalance,
  getGroupFilterOptions,
  ledgerUnderGroup,
  primaryHeadLabelForLedger,
} from "./ledgers-utils";

const PAGE_SIZE = 15;
const INITIAL_COA: ChartOfAccount[] = [...SYSTEM_COA_NODES];

type SheetMode = "add" | "edit" | null;

export default function LedgersPageClient() {
  const router = useRouter();
  const [coaRecords, setCoaRecords] = useState<ChartOfAccount[]>(INITIAL_COA);
  const [search, setSearch] = useState("");
  const [primaryHeadFilter, setPrimaryHeadFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
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

  const groupOptions = useMemo(
    () => getGroupFilterOptions(coaRecords, primaryHeadFilter),
    [coaRecords, primaryHeadFilter],
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
          primaryHeadLabelForLedger(coaRecords, x).toLowerCase().includes(q),
      );
    }
    if (primaryHeadFilter !== "all") {
      r = r.filter((x) => accountTypeMatchesPrimaryHead(x, primaryHeadFilter));
    }
    if (groupFilter !== "all") {
      r = r.filter((x) => ledgerUnderGroup(coaRecords, x, groupFilter));
    }
    if (statusFilter !== "all") {
      r = r.filter((x) => x.status === statusFilter);
    }
    r.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (sortKey === "parentGroup") {
        av = a.parentAccountId ? parentGroupLabel(coaRecords, a.parentAccountId) : "";
        bv = b.parentAccountId ? parentGroupLabel(coaRecords, b.parentAccountId) : "";
      } else if (sortKey === "currentBalance") {
        av = computeLedgerCurrentBalance(a).amount;
        bv = computeLedgerCurrentBalance(b).amount;
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
  }, [ledgers, coaRecords, search, primaryHeadFilter, groupFilter, statusFilter, sortKey, sortDir]);

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
    const header = "Ledger Name,Code,Alias,Parent Group,Primary Head,Opening Balance,Current Balance,Status,GST,TDS\n";
    const rows = visible
      .map((r) => {
        const group = r.parentAccountId ? parentGroupLabel(coaRecords, r.parentAccountId) : "";
        const head = primaryHeadLabelForLedger(coaRecords, r);
        const current = computeLedgerCurrentBalance(r);
        return [
          `"${r.accountName}"`,
          `"${r.accountCode}"`,
          `"${r.alias ?? ""}"`,
          `"${group}"`,
          `"${head}"`,
          `"${formatOpeningBalance(r)}"`,
          `"${formatLedgerBalance(current)}"`,
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
          <div className="flex flex-wrap gap-2">
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
            <Select
              value={primaryHeadFilter}
              onValueChange={(v) => {
                setPrimaryHeadFilter(v);
                setGroupFilter("all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[150px] text-xs bg-white">
                <SelectValue placeholder="Primary Head" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Primary Heads</SelectItem>
                {PRIMARY_HEAD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={groupFilter}
              onValueChange={(v) => {
                setGroupFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[200px] text-xs bg-white">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                <SelectItem value="all" className="text-xs">All Groups</SelectItem>
                {groupOptions.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)} className="text-xs">
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[120px] text-xs bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Status</SelectItem>
                <SelectItem value="active" className="text-xs">Active</SelectItem>
                <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
              </SelectContent>
            </Select>
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
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-table min-w-[880px]">
            <thead className="bg-muted/20 border-b border-border/60 sticky top-0 z-10">
              <tr>
                <SortTh label="Ledger Name" colKey="accountName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Parent Group" colKey="parentGroup" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Primary Head
                </th>
                <SortTh label="Opening Balance" colKey="openingBalance" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                <SortTh label="Current Balance" colKey="currentBalance" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                {canEdit && (
                  <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-16">
                    Edit
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="px-4 py-16 text-center">
                    <p className="text-sm font-medium text-foreground">No ledgers found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Adjust filters or add a ledger under a valid group.
                    </p>
                    {canCreate && (
                      <Button size="sm" className="h-8 text-xs mt-3 bg-brand-600 text-white" onClick={openAdd}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Ledger
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                paged.map((r) => {
                  const current = computeLedgerCurrentBalance(r);
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border/40 hover:bg-brand-50/40 cursor-pointer transition-colors"
                      onClick={() => router.push(`/accounts/masters/ledgers/${r.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{r.accountName}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {r.accountCode}
                          {r.alias ? ` · ${r.alias}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[240px]">
                        <span className="line-clamp-2">
                          {r.parentAccountId ? parentGroupLabel(coaRecords, r.parentAccountId) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-foreground">
                        {primaryHeadLabelForLedger(coaRecords, r)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <MoneyAmount amount={r.openingBalance} side={r.balanceType} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <MoneyAmount amount={current.amount} side={current.balanceType} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={r.status} />
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 hover:bg-muted/40 text-muted-foreground"
                            title="Edit ledger"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(r);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
