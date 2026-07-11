"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, History as HistoryIcon, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AccountsColumnFilterProvider,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  AccountsTableEmpty,
  AccountsTablePagination,
  ACCOUNTS_DEFAULT_PAGE_SIZE,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportSearchFilter,
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
} from "@/components/accounts/ReportFilters";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { SkeletonRow } from "@/components/ui/Loaders";
import {
  getBankReconAccountById,
  getBankReconAccounts,
  maskAccountNumber,
} from "./bank-reconciliation-v2-data";
import {
  BankReconEntrySourceBadge,
  BankReconReconciliationStatusBadge,
} from "./components/BankReconBadges";
import { BankReconReconcilePanel } from "./components/BankReconReconcilePanel";
import { BankReconUploadDialog } from "./components/BankReconUploadDialog";
import { BankReconManualEntryDialog } from "./components/BankReconManualEntryDialog";
import {
  RECONCILIATION_LIST_PATH,
  BANK_RECON_IMPORT_HISTORY_PATH,
  bankReconWorkspacePath,
} from "./reconciliation-utils";
import {
  loadBankReconTransactions,
  type BankReconTransactionRecord,
} from "@/lib/accounts/bank-recon-register";
import {
  getDisplayReconciliationStatus,
  type ReconcileSaveAction,
} from "@/lib/accounts/bank-recon-reconcile-service";

const PENDING_STATUSES = new Set([
  "Unreconciled",
  "Pending",
  "Suggested",
  "Pending Review",
]);

type WorkspaceRow = BankReconTransactionRecord & {
  reference: string;
  reconStatus: string;
};

const RECON_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "Unreconciled", label: "Unreconciled" },
  { value: "Pending", label: "Pending" },
  { value: "Pending Review", label: "Pending Review" },
  { value: "Reconciled", label: "Reconciled" },
  { value: "Suggested", label: "Suggested" },
];

function StatementTransactionsTable({
  rows,
  selectedId,
  onSelect,
  onReconcile,
  loading,
}: {
  rows: WorkspaceRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReconcile: (id: string) => void;
  loading: boolean;
}) {
  const filtered = useAccountsFilteredRows(rows);

  if (loading) {
    return (
      <AccountsTable minWidth={920}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            {Array.from({ length: 8 }).map((_, i) => (
              <AccountsTableHeadCell key={i} sticky={false}>
                &nbsp;
              </AccountsTableHeadCell>
            ))}
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonRow key={i} cols={8} />
          ))}
        </AccountsTableBody>
      </AccountsTable>
    );
  }

  return (
    <AccountsTable minWidth={920}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Date" colKey="statementDate" filterType="date" />
          <SortTh label="Narration" colKey="narration" className="accounts-col-wide" />
          <SortTh label="Reference / UTR / Cheque" colKey="reference" className="min-w-[120px]" />
          <SortTh label="Debit" colKey="withdrawal" filterType="amount" align="right" />
          <SortTh label="Credit" colKey="deposit" filterType="amount" align="right" />
          <SortTh label="Running Balance" colKey="runningBalance" filterType="amount" align="right" />
          <SortTh label="Status" colKey="reconStatus" />
          <AccountsTableHeadCell className="w-24" sticky={false}>
            Action
          </AccountsTableHeadCell>
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={8} className="accounts-table-empty">
              <p>No bank transactions yet.</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Upload a statement or add a manual entry to begin.
              </p>
            </td>
          </tr>
        ) : filtered.length === 0 ? (
          <AccountsTableEmpty colSpan={8} message="No transactions match the current filters." />
        ) : (
          filtered.map((txn) => (
            <AccountsTableRow
              key={txn.id}
              className={cn(
                "cursor-pointer group",
                selectedId === txn.id && "bg-brand-50/60 hover:bg-brand-50/60",
              )}
              onClick={() => onSelect(txn.id)}
            >
              <AccountsTableCell>{txn.statementDate}</AccountsTableCell>
              <AccountsTableCell wrap>
                <span className="line-clamp-2 text-[11px] leading-snug">{txn.narration}</span>
              </AccountsTableCell>
              <AccountsTableCell mono wrap>
                <span className="line-clamp-1">{txn.reference || "—"}</span>
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {txn.withdrawal ? formatMoney(txn.withdrawal) : "—"}
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {txn.deposit ? formatMoney(txn.deposit) : "—"}
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {txn.runningBalance != null ? formatMoney(txn.runningBalance) : "—"}
              </AccountsTableCell>
              <AccountsTableCell>
                <div className="space-y-0.5">
                  <BankReconEntrySourceBadge source={txn.source} />
                  <BankReconReconciliationStatusBadge status={txn.reconStatus} />
                </div>
              </AccountsTableCell>
              <AccountsTableCell>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReconcile(txn.id);
                  }}
                >
                  Reconcile
                </Button>
              </AccountsTableCell>
            </AccountsTableRow>
          ))
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

interface BankReconciliationWorkspacePageClientProps {
  accountId?: string;
}

export default function BankReconciliationWorkspacePageClient({
  accountId: accountIdProp,
}: BankReconciliationWorkspacePageClientProps) {
  const router = useRouter();
  const routeParams = useParams();
  const accountId =
    accountIdProp ??
    (typeof routeParams?.accountId === "string"
      ? routeParams.accountId
      : Array.isArray(routeParams?.accountId)
        ? routeParams.accountId[0] ?? ""
        : "");
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [registerTick, setRegisterTick] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const allAccounts = useMemo(() => {
    void registerTick;
    return getBankReconAccounts();
  }, [registerTick]);

  const account = useMemo(
    () => allAccounts.find((a) => a.id === accountId) ?? getBankReconAccountById(accountId),
    [allAccounts, accountId],
  );

  useEffect(() => {
    const handler = () => setRegisterTick((t) => t + 1);
    window.addEventListener("bank-recon-register-updated", handler);
    return () => window.removeEventListener("bank-recon-register-updated", handler);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, [accountId]);

  const workspaceAction = searchParams.get("upload") === "1" ? "upload" : searchParams.get("manual") === "1" ? "manual" : null;

  useEffect(() => {
    if (workspaceAction === "upload") {
      setUploadOpen(true);
      router.replace(bankReconWorkspacePath(accountId));
    }
    if (workspaceAction === "manual") {
      setManualOpen(true);
      router.replace(bankReconWorkspacePath(accountId));
    }
  }, [workspaceAction, accountId, router]);

  const allTransactions = useMemo((): WorkspaceRow[] => {
    void registerTick;
    if (!account) return [];
    return loadBankReconTransactions(accountId)
      .filter((t) => t.manualEntryStatus !== "Draft" && t.manualEntryStatus !== "Cancelled")
      .map((t) => ({
        ...t,
        activity: [...t.activity],
        reference: t.reference || t.chequeNo || t.utrNumber || "",
        reconStatus: getDisplayReconciliationStatus(t),
      }));
  }, [account, accountId, registerTick]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTransactions.filter((t) => {
      if (statusFilter !== "all" && t.reconStatus !== statusFilter) return false;
      if (dateFrom && t.statementDate < dateFrom) return false;
      if (dateTo && t.statementDate > dateTo) return false;
      if (!q) return true;
      return (
        t.narration.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q) ||
        (t.chequeNo ?? "").toLowerCase().includes(q) ||
        (t.utrNumber ?? "").toLowerCase().includes(q)
      );
    });
  }, [allTransactions, statusFilter, dateFrom, dateTo, search]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page, pageSize]);

  const refreshRegister = useCallback(() => setRegisterTick((t) => t + 1), []);

  const advanceToNextPending = useCallback(
    (currentId: string) => {
      const list = filteredTransactions;
      const idx = list.findIndex((t) => t.id === currentId);
      const after = list.slice(idx + 1).find((t) => PENDING_STATUSES.has(t.reconStatus));
      const before = list.slice(0, idx).find((t) => PENDING_STATUSES.has(t.reconStatus));
      setSelectedTxnId((after ?? before)?.id ?? null);
    },
    [filteredTransactions],
  );

  const handleReconcileComplete = useCallback(
    (action: ReconcileSaveAction) => {
      const prev = selectedTxnId;
      refreshRegister();
      if (action !== "skip" && prev) {
        setTimeout(() => advanceToNextPending(prev), 50);
      }
    },
    [selectedTxnId, refreshRegister, advanceToNextPending],
  );

  const handleSkip = useCallback(() => {
    if (selectedTxnId) advanceToNextPending(selectedTxnId);
  }, [selectedTxnId, advanceToNextPending]);

  const getCellValue = useCallback(
    (row: WorkspaceRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const openReconcile = useCallback((id: string) => {
    setSelectedTxnId(id);
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }, []);

  const selectedTransaction = useMemo(
    () => (selectedTxnId ? allTransactions.find((t) => t.id === selectedTxnId) ?? null : null),
    [allTransactions, selectedTxnId],
  );

  if (!account) {
    return (
      <AccountsPageShell
        breadcrumbs={[
          { label: "Accounts", href: "/accounts/masters/chart-of-accounts" },
          { label: "Banking" },
          { label: "Bank Reconciliation", href: RECONCILIATION_LIST_PATH },
          { label: "Not Found" },
        ]}
        title="Bank Account Not Found"
        description="The selected bank account could not be loaded."
        layout="standard"
      >
        <div className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Invalid or missing bank account.</p>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link href={RECONCILIATION_LIST_PATH}>Back to Bank Reconciliation</Link>
          </Button>
        </div>
      </AccountsPageShell>
    );
  }

  const statementPeriodLabel = `${account.statementPeriodFrom} — ${account.statementPeriodTo}`;

  return (
    <>
      <AccountsPageShell
        breadcrumbs={[
          { label: "Accounts", href: "/accounts/masters/chart-of-accounts" },
          { label: "Banking" },
          { label: "Bank Reconciliation", href: RECONCILIATION_LIST_PATH },
          { label: account.accountNickname },
        ]}
        title="Bank Reconciliation"
        description={`${account.bankName} · ${maskAccountNumber(account.accountNumber)}`}
        hideDescription
        layout="split"
        className="h-full min-h-0"
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => router.push(RECONCILIATION_LIST_PATH)}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>
        }
      >
        <div className="flex-shrink-0 flex flex-wrap items-end gap-2 pb-2 border-b border-border/60">
          <div className="space-y-0.5 min-w-[160px]">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Bank Account</Label>
            <Select value={accountId} onValueChange={(id) => router.push(bankReconWorkspacePath(id))}>
              <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[180px]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    {a.accountNickname} · {maskAccountNumber(a.accountNumber)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-0.5">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Statement Period</Label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dateFrom || account.statementPeriodFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[120px]")}
              />
              <span className="text-[11px] text-muted-foreground">—</span>
              <input
                type="date"
                value={dateTo || account.statementPeriodTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[120px]")}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">{statementPeriodLabel}</p>
          </div>

          <div className="space-y-0.5 min-w-[130px]">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-full")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECON_STATUS_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ReportSearchFilter
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search narration, reference…"
          />

          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Link href={BANK_RECON_IMPORT_HISTORY_PATH}>
              <HistoryIcon className="w-3.5 h-3.5" />
              Import History
            </Link>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => setManualOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Manual Entry
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Statement
          </Button>
        </div>

        <div className="flex flex-1 min-h-0 gap-0 overflow-hidden">
          <div className="flex-1 min-w-0 flex flex-col min-h-0 border border-border rounded-xl bg-white shadow-sm overflow-hidden">
            <AccountsColumnFilterProvider
              rows={paginatedRows}
              getCellValue={getCellValue}
              columnConfig={{
                statementDate: { type: "date" },
                narration: { type: "text" },
                reference: { type: "text" },
                withdrawal: { type: "amount" },
                deposit: { type: "amount" },
                runningBalance: { type: "amount" },
                reconStatus: { type: "text" },
              }}
              defaultSortKey="statementDate"
              defaultSortDir="desc"
            >
              <div className="flex-1 min-h-0 overflow-auto">
                <StatementTransactionsTable
                  rows={paginatedRows}
                  selectedId={selectedTxnId}
                  onSelect={openReconcile}
                  onReconcile={openReconcile}
                  loading={loading}
                />
              </div>
              <div className="flex-shrink-0 border-t border-border bg-muted/20">
                <AccountsTablePagination
                  page={page}
                  pageSize={pageSize}
                  totalRecords={filteredTransactions.length}
                  onPageChange={setPage}
                  onPageSizeChange={(s) => {
                    setPageSize(s);
                    setPage(1);
                  }}
                  recordLabel="transactions"
                />
              </div>
            </AccountsColumnFilterProvider>
          </div>

          <div ref={panelRef} className="flex-shrink-0 min-h-0">
            <BankReconReconcilePanel
              transaction={selectedTransaction}
              transactionId={selectedTxnId}
              onComplete={handleReconcileComplete}
              onSkip={handleSkip}
            />
          </div>
        </div>
      </AccountsPageShell>

      <BankReconUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        bankAccountId={accountId}
        onImported={() => {
          refreshRegister();
          setUploadOpen(false);
        }}
      />

      <BankReconManualEntryDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        bankAccountId={accountId}
        onCreated={(id) => {
          refreshRegister();
          setSelectedTxnId(id);
        }}
      />
    </>
  );
}
