"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Plus,
  RotateCcw,
  Sparkles,
  Upload,
  History as HistoryIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsSummaryCards } from "@/components/accounts/AccountsSummaryCards";
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
  AccountsMoreActions,
  AccountsTableActionCell,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import {
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTablePagination,
  AccountsListingToolbar,
  ACCOUNTS_DEFAULT_PAGE_SIZE,
} from "@/components/accounts/AccountsTableListing";
import { AccountsListingTabsRow } from "@/components/accounts/AccountsListingHeader";
import {
  ReportFilterRow,
  ReportSearchFilter,
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
} from "@/components/accounts/ReportFilters";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { SkeletonRow } from "@/components/ui/Loaders";
import {
  BANK_RECON_ENTRY_STATUS_FILTER_OPTIONS,
  BANK_RECON_MATCH_STATUS_OPTIONS,
  BANK_RECON_QUICK_FILTER_CHIPS,
  BANK_RECON_SOURCE_OPTIONS,
  BANK_RECON_TRANSACTION_MODE_OPTIONS,
  BANK_RECON_VERIFICATION_STATUS_OPTIONS,
  computeWorkspaceSummary,
  getBankReconAccountById,
  getBankReconTransactions,
  maskAccountNumber,
  type BankReconQuickFilterId,
  type BankReconTransaction,
} from "./bank-reconciliation-v2-data";
import {
  BankReconMatchStatusBadge,
  BankReconSourceBadge,
  BankReconVerificationStatusBadge,
} from "./components/BankReconBadges";
import { BankReconHistoryTab } from "./components/BankReconHistoryTab";
import { BankReconAuditTrailTab } from "./components/BankReconAuditTrailTab";
import { BankReconManualReconciliationTab } from "./components/BankReconManualReconciliationTab";
import { BankReconAutoMatchTab } from "./components/BankReconAutoMatchTab";
import { BankReconCategorizeTab } from "./components/BankReconCategorizeTab";
import { BankReconCategorizeSheet } from "./components/BankReconCategorizeSheet";
import { BankReconUndoMatchDialog } from "./components/BankReconUndoMatchDialog";
import { BankReconMatchReviewSheet } from "./components/BankReconMatchReviewSheet";
import { BankReconFindMatchSheet } from "./components/BankReconFindMatchSheet";
import {
  loadMatchRun,
  rejectMatch,
  runAutoMatch,
  updateStatementMatchStatusFromRun,
} from "@/lib/accounts/bank-recon-match-service";
import { getMatchLinkForStatement } from "@/lib/accounts/bank-recon-match-store";
import { exportBankReconTransactionsToExcel } from "@/lib/accounts/bank-recon-v2-export";
import {
  RECONCILIATION_LIST_PATH,
  bankReconCompletePath,
  bankReconUploadPath,
  BANK_RECON_IMPORT_HISTORY_PATH,
  bankReconWorkspacePath,
} from "./reconciliation-utils";
import { BankReconTransactionDetailSheet } from "./components/BankReconTransactionDetailSheet";
import { BankReconManualTransactionSheet } from "./components/BankReconManualTransactionSheet";
import { BankReconCancelManualDialog } from "./components/BankReconCancelManualDialog";
import { BankReconUpdateReferenceDialog } from "./components/BankReconUpdateReferenceDialog";
import {
  canCancelManualTransaction,
  canEditManualTransaction,
} from "@/lib/accounts/bank-recon-manual-service";
import { canCategorizeTransaction } from "@/lib/accounts/bank-recon-categorize-service";
import {
  getBankReconTransactionById,
  loadBankReconTransactions,
  type BankReconTransactionRecord,
} from "@/lib/accounts/bank-recon-register";

type WorkspaceTab =
  | "transactions"
  | "auto-match"
  | "manual"
  | "categorize"
  | "history"
  | "audit";

const WORKSPACE_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "transactions", label: "Bank Transactions" },
  { id: "auto-match", label: "Auto Match" },
  { id: "manual", label: "Manual Reconciliation" },
  { id: "categorize", label: "Categorize Transactions" },
  { id: "history", label: "Reconciliation History" },
  { id: "audit", label: "Audit Trail" },
];

function PlaceholderBtn({
  children,
  icon: Icon,
  primary,
  onClick,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={primary ? "default" : "outline"}
      className={cn(
        "h-8 text-xs gap-1.5",
        primary && "bg-brand-600 hover:bg-brand-700 text-white border-0",
      )}
      onClick={onClick ?? (() => {})}
    >
      {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
      {children}
    </Button>
  );
}

function TransactionsTable({
  rows,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onViewDetails,
  onEditManual,
  onCancelManual,
  onUpdateReference,
  onAddManual,
  onMatchTransaction,
  onUndoMatch,
  onCategorize,
  loading,
}: {
  rows: BankReconTransaction[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onViewDetails: (txn: BankReconTransaction) => void;
  onEditManual: (id: string) => void;
  onCancelManual: (id: string) => void;
  onUpdateReference: (id: string) => void;
  onAddManual: () => void;
  onMatchTransaction: (id: string) => void;
  onUndoMatch: (id: string) => void;
  onCategorize: (id: string) => void;
  loading: boolean;
}) {
  const filtered = useAccountsFilteredRows(rows);
  const allSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
  const someSelected = filtered.some((r) => selectedIds.has(r.id));

  if (loading) {
    return (
      <AccountsTable minWidth={1600}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            {Array.from({ length: 14 }).map((_, i) => (
              <AccountsTableHeadCell key={i} sticky={false}>
                &nbsp;
              </AccountsTableHeadCell>
            ))}
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} cols={14} />
          ))}
        </AccountsTableBody>
      </AccountsTable>
    );
  }

  return (
    <AccountsTable minWidth={1600}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <AccountsTableHeadCell className="w-10" sticky={false}>
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={(v) => onToggleAll(v === true)}
              aria-label="Select all"
            />
          </AccountsTableHeadCell>
          <SortTh label="Statement Date" colKey="statementDate" filterType="date" />
          <SortTh label="Value Date" colKey="valueDate" filterType="date" />
          <SortTh label="Book Date" colKey="bookDate" filterType="date" />
          <SortTh label="Reference / UTR / Cheque" colKey="reference" className="min-w-[140px]" />
          <SortTh label="Narration" colKey="narration" className="accounts-col-wide" />
          <SortTh label="Party / Ledger" colKey="partyLedger" />
          <SortTh label="Deposit" colKey="deposit" filterType="amount" align="right" />
          <SortTh label="Withdrawal" colKey="withdrawal" filterType="amount" align="right" />
          <SortTh label="Source" colKey="source" />
          <SortTh label="Match Status" colKey="matchStatus" />
          <SortTh label="Verification" colKey="verificationStatus" />
          <SortTh label="Recon Date" colKey="reconciliationDate" filterType="date" />
          <AccountsTableHeadCell className={accountsActionColClass("multi")} sticky>
            Action
          </AccountsTableHeadCell>
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={14} className="accounts-table-empty">
              <p>No transactions for this account.</p>
              <button
                type="button"
                onClick={onAddManual}
                className="inline-flex items-center gap-1 mt-2 text-xs text-brand-600 hover:underline font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Manual Transaction
              </button>
            </td>
          </tr>
        ) : filtered.length === 0 ? (
          <AccountsTableEmpty colSpan={14} message="No transactions match the current filters." />
        ) : (
          filtered.map((txn) => {
            const full = getBankReconTransactionById(txn.id);
            const isManualSource = txn.source === "Manual" || txn.source === "Manual + Statement";
            const canEdit = full ? canEditManualTransaction(full) : false;
            const canCancel = full ? canCancelManualTransaction(full) : false;
            const canUpdateRef =
              full &&
              full.source === "Manual" &&
              full.manualEntryStatus !== "Cancelled";

            const canMatch = txn.matchStatus !== "Matched" && txn.matchStatus !== "Excluded";
            const canUndo = txn.matchStatus === "Matched" && Boolean(getMatchLinkForStatement(txn.id));
            const canCategorize = full ? canCategorizeTransaction(full) : false;

            return (
            <AccountsTableRow key={txn.id} className="group">
              <AccountsTableCell>
                <Checkbox
                  checked={selectedIds.has(txn.id)}
                  onCheckedChange={() => onToggleRow(txn.id)}
                  aria-label={`Select ${txn.reference || txn.id}`}
                />
              </AccountsTableCell>
              <AccountsTableCell>{txn.statementDate}</AccountsTableCell>
              <AccountsTableCell>{txn.valueDate}</AccountsTableCell>
              <AccountsTableCell>{txn.bookDate ?? "—"}</AccountsTableCell>
              <AccountsTableCell mono wrap>
                <span className="line-clamp-1">{txn.reference || txn.chequeNo || "—"}</span>
              </AccountsTableCell>
              <AccountsTableCell wrap>
                <span className="line-clamp-2 text-[11px] leading-snug">{txn.narration}</span>
              </AccountsTableCell>
              <AccountsTableCell>{txn.partyLedger}</AccountsTableCell>
              <AccountsTableCell align="right" money>
                {formatMoneyOrDash(txn.deposit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {formatMoneyOrDash(txn.withdrawal)}
              </AccountsTableCell>
              <AccountsTableCell>
                <BankReconSourceBadge source={txn.source} />
              </AccountsTableCell>
              <AccountsTableCell>
                <BankReconMatchStatusBadge status={txn.matchStatus} />
                {txn.matchStatus === "Matched" && txn.relatedRecord ? (
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {txn.relatedRecord.voucherNumber}
                    {txn.relatedRecord.matchMethod ? ` · ${txn.relatedRecord.matchMethod}` : ""}
                    {txn.relatedRecord.matchConfidence ? ` · ${txn.relatedRecord.matchConfidence}` : ""}
                  </p>
                ) : null}
              </AccountsTableCell>
              <AccountsTableCell>
                <BankReconVerificationStatusBadge status={txn.verificationStatus} />
              </AccountsTableCell>
              <AccountsTableCell>{txn.reconciliationDate ?? "—"}</AccountsTableCell>
              <AccountsTableCell align="right" className="accounts-table-td-sticky">
                <AccountsTableActionCell variant="multi">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] px-2"
                    onClick={() => onViewDetails(txn)}
                  >
                    View Details
                  </Button>
                  <AccountsMoreActions contentClassName="w-52">
                    <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                      Actions
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onViewDetails(txn)}>View Details</DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canMatch}
                      onClick={() => canMatch && onMatchTransaction(txn.id)}
                    >
                      Match Transaction
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canCategorize}
                      onClick={() => canCategorize && onCategorize(txn.id)}
                    >
                      Categorize
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canEdit}
                      onClick={() => canEdit && onEditManual(txn.id)}
                    >
                      Edit Manual Entry
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canUpdateRef}
                      onClick={() => canUpdateRef && onUpdateReference(txn.id)}
                    >
                      Update Reference
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canCancel}
                      onClick={() => canCancel && onCancelManual(txn.id)}
                    >
                      Cancel Manual Entry
                    </DropdownMenuItem>
                    {isManualSource && txn.attachments && txn.attachments.length > 0 ? (
                      <DropdownMenuItem onClick={() => onViewDetails(txn)}>View Attachments</DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem disabled>View Attachments</DropdownMenuItem>
                    )}
                    <DropdownMenuItem disabled>View Audit Trail</DropdownMenuItem>
                    <DropdownMenuItem disabled>Exclude</DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canUndo}
                      onClick={() => canUndo && onUndoMatch(txn.id)}
                    >
                      Undo Match
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>View Voucher</DropdownMenuItem>
                    <DropdownMenuItem disabled>View Statement</DropdownMenuItem>
                  </AccountsMoreActions>
                </AccountsTableActionCell>
              </AccountsTableCell>
            </AccountsTableRow>
            );
          })
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

interface BankReconciliationWorkspacePageClientProps {
  accountId: string;
}

export default function BankReconciliationWorkspacePageClient({
  accountId,
}: BankReconciliationWorkspacePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const account = getBankReconAccountById(accountId);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("transactions");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [flowFilter, setFlowFilter] = useState<"all" | "deposit" | "withdrawal">("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [matchFilter, setMatchFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [partyFilter, setPartyFilter] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [quickFilter, setQuickFilter] = useState<BankReconQuickFilterId>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailTxn, setDetailTxn] = useState<BankReconTransaction | null>(null);
  const [registerTick, setRegisterTick] = useState(0);
  const [manualSheetOpen, setManualSheetOpen] = useState(false);
  const [editManualId, setEditManualId] = useState<string | null>(null);
  const [undoMatchId, setUndoMatchId] = useState<string | null>(null);
  const [matchReviewId, setMatchReviewId] = useState<string | null>(null);
  const [findMatchId, setFindMatchId] = useState<string | null>(null);
  const [categorizeTxn, setCategorizeTxn] = useState<BankReconTransactionRecord | null>(null);
  const [cancelRecord, setCancelRecord] = useState<BankReconTransactionRecord | null>(null);
  const [updateRefRecord, setUpdateRefRecord] = useState<BankReconTransactionRecord | null>(null);
  const [entryStatusFilter, setEntryStatusFilter] = useState("active");
  const [modeFilter, setModeFilter] = useState("all");
  const [bookDateFrom, setBookDateFrom] = useState("");
  const [bookDateTo, setBookDateTo] = useState("");
  const [clearingDateFrom, setClearingDateFrom] = useState("");
  const [clearingDateTo, setClearingDateTo] = useState("");

  useEffect(() => {
    const handler = () => setRegisterTick((t) => t + 1);
    window.addEventListener("bank-recon-register-updated", handler);
    return () => window.removeEventListener("bank-recon-register-updated", handler);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, [accountId]);

  const allTransactions = useMemo(() => {
    void registerTick;
    if (account) {
      return loadBankReconTransactions(account.id).map(({ activity, ...rest }) => ({
        ...rest,
        activity: [...activity],
      }));
    }
    return getBankReconTransactions(accountId);
  }, [account, accountId, registerTick]);

  const partyOptions = useMemo(() => {
    const parties = new Set<string>();
    allTransactions.forEach((t) => {
      if (t.partyLedger && t.partyLedger !== "—") parties.add(t.partyLedger);
    });
    return Array.from(parties).sort();
  }, [allTransactions]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = amountMin ? parseFloat(amountMin) : null;
    const max = amountMax ? parseFloat(amountMax) : null;

    return allTransactions.filter((t) => {
      if (entryStatusFilter === "active") {
        if (t.manualEntryStatus === "Draft" || t.manualEntryStatus === "Cancelled") return false;
      } else if (entryStatusFilter !== "all" && t.manualEntryStatus !== entryStatusFilter) {
        return false;
      }
      if (modeFilter !== "all" && t.transactionMode !== modeFilter) return false;
      if (bookDateFrom && (t.bookDate ?? "") < bookDateFrom) return false;
      if (bookDateTo && (t.bookDate ?? "") > bookDateTo) return false;
      if (clearingDateFrom && (t.expectedClearingDate ?? "") < clearingDateFrom) return false;
      if (clearingDateTo && (t.expectedClearingDate ?? "") > clearingDateTo) return false;
      if (quickFilter !== "all" && t.matchStatus !== quickFilter) return false;
      if (flowFilter === "deposit" && !t.deposit) return false;
      if (flowFilter === "withdrawal" && !t.withdrawal) return false;
      if (sourceFilter !== "all" && t.source !== sourceFilter) return false;
      if (matchFilter !== "all" && t.matchStatus !== matchFilter) return false;
      if (verificationFilter !== "all" && t.verificationStatus !== verificationFilter) return false;
      if (partyFilter && t.partyLedger !== partyFilter) return false;
      if (dateFrom && t.statementDate < dateFrom) return false;
      if (dateTo && t.statementDate > dateTo) return false;

      const amt = t.deposit || t.withdrawal;
      if (min != null && amt < min) return false;
      if (max != null && amt > max) return false;

      if (!q) return true;
      return (
        t.narration.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q) ||
        (t.chequeNo ?? "").includes(q) ||
        t.partyLedger.toLowerCase().includes(q)
      );
    });
  }, [
    allTransactions,
    quickFilter,
    flowFilter,
    sourceFilter,
    matchFilter,
    verificationFilter,
    partyFilter,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    search,
    entryStatusFilter,
    modeFilter,
    bookDateFrom,
    bookDateTo,
    clearingDateFrom,
    clearingDateTo,
  ]);

  const tableRows = useMemo(
    () =>
      filteredTransactions.map((t) => ({
        ...t,
        bookDate: t.bookDate ?? "",
        reconciliationDate: t.reconciliationDate ?? "",
        reference: t.reference || t.chequeNo || "",
      })),
    [filteredTransactions],
  );

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tableRows.slice(start, start + pageSize);
  }, [tableRows, page, pageSize]);

  const workspaceSummary = useMemo(() => {
    if (!account) return null;
    return computeWorkspaceSummary(account, allTransactions);
  }, [account, allTransactions]);

  const handleReset = useCallback(() => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setFlowFilter("all");
    setSourceFilter("all");
    setMatchFilter("all");
    setVerificationFilter("all");
    setPartyFilter("");
    setAmountMin("");
    setAmountMax("");
    setQuickFilter("all");
    setEntryStatusFilter("active");
    setModeFilter("all");
    setBookDateFrom("");
    setBookDateTo("");
    setClearingDateFrom("");
    setClearingDateTo("");
    setPage(1);
  }, []);

  const openManualSheet = useCallback((editId?: string) => {
    setEditManualId(editId ?? null);
    setManualSheetOpen(true);
  }, []);

  const refreshRegister = useCallback(() => setRegisterTick((t) => t + 1), []);

  const handleRunAutoMatch = useCallback(() => {
    runAutoMatch({
      bankAccountId: accountId,
      transactionIds: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
    });
    updateStatementMatchStatusFromRun(accountId);
    refreshRegister();
    setActiveTab("auto-match");
  }, [accountId, selectedIds, refreshRegister]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const run = searchParams.get("runMatch");
    if (tab === "auto-match") setActiveTab("auto-match");
    if (run === "1" && accountId) {
      handleRunAutoMatch();
      router.replace(bankReconWorkspacePath(accountId));
    }
  }, [searchParams, accountId, handleRunAutoMatch, router]);

  const matchReviewGroup = useMemo(() => {
    if (!matchReviewId) return null;
    const run = loadMatchRun(accountId);
    return run?.groups.find((g) => g.statementTransactionId === matchReviewId) ?? null;
  }, [matchReviewId, accountId, registerTick]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setSelectedIds(new Set());
        return;
      }
      setSelectedIds(new Set(paginatedRows.map((r) => r.id)));
    },
    [paginatedRows],
  );

  const getCellValue = useCallback(
    (row: (typeof tableRows)[number], key: string) =>
      (row as unknown as Record<string, unknown>)[key],
    [],
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

  const summaryItems = workspaceSummary
    ? [
        { label: "Book Balance", value: formatMoney(workspaceSummary.bookBalance) },
        { label: "Statement Balance", value: formatMoney(workspaceSummary.statementBalance) },
        {
          label: "Difference",
          value: formatMoney(Math.abs(workspaceSummary.difference)),
          warn: workspaceSummary.difference !== 0,
        },
        { label: "Reconciled Amount", value: formatMoney(workspaceSummary.reconciledAmount) },
        { label: "Pending Amount", value: formatMoney(workspaceSummary.pendingAmount) },
        { label: "Pending Transactions", value: String(workspaceSummary.pendingTransactions) },
        { label: "Suggested Matches", value: String(workspaceSummary.suggestedMatches) },
        { label: "Statement Period", value: workspaceSummary.statementPeriod },
      ]
    : [];

  return (
    <>
      <AccountsPageShell
        breadcrumbs={[
          { label: "Accounts", href: "/accounts/masters/chart-of-accounts" },
          { label: "Banking" },
          { label: "Bank Reconciliation", href: RECONCILIATION_LIST_PATH },
          { label: account.accountNickname },
        ]}
        title={account.bankName}
        description={`${account.accountNickname} · ${maskAccountNumber(account.accountNumber)} · ${account.accountType}`}
        hideDescription
        layout="split"
        className="h-full min-h-0"
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
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
            <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Link href={BANK_RECON_IMPORT_HISTORY_PATH}>
                <HistoryIcon className="w-3.5 h-3.5" /> Import History
              </Link>
            </Button>
            <PlaceholderBtn icon={Upload} onClick={() => router.push(bankReconUploadPath(accountId))}>
              Upload Statement
            </PlaceholderBtn>
            <PlaceholderBtn icon={Plus} onClick={() => openManualSheet()} primary>
              Add Manual Transaction
            </PlaceholderBtn>
            <PlaceholderBtn icon={Sparkles} onClick={handleRunAutoMatch}>
              Run Auto Match
            </PlaceholderBtn>
            <PlaceholderBtn icon={CheckCircle2} primary onClick={() => router.push(bankReconCompletePath(accountId, {
              periodFrom: account.statementPeriodFrom,
              periodTo: account.statementPeriodTo,
            }))}>
              Complete Reconciliation
            </PlaceholderBtn>
            <PlaceholderBtn
              icon={Download}
              onClick={() =>
                void exportBankReconTransactionsToExcel(
                  filteredTransactions as BankReconTransactionRecord[],
                  account.bankName,
                )
              }
            >
              Export
            </PlaceholderBtn>
          </div>
        }
      >
        <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 px-0.5 pb-2">
          {[
            ["Last Reconciled", account.lastReconciledDate ?? "—"],
            ["Statement Period", `${account.statementPeriodFrom} — ${account.statementPeriodTo}`],
            ["Account Type", account.accountType],
            ["Pending Txns", String(account.pendingTransactions)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col justify-center px-2.5 py-1.5 rounded-md border border-[#E5E7EB] bg-white min-h-[40px]"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-xs font-semibold text-foreground truncate">{value}</p>
            </div>
          ))}
        </div>

        <AccountsColumnFilterProvider
          rows={paginatedRows}
          getCellValue={getCellValue}
          columnConfig={{
            statementDate: { type: "date" },
            valueDate: { type: "date" },
            bookDate: { type: "date" },
            reference: { type: "text" },
            narration: { type: "text" },
            partyLedger: { type: "text" },
            deposit: { type: "amount" },
            withdrawal: { type: "amount" },
            source: { type: "text" },
            matchStatus: { type: "text" },
            verificationStatus: { type: "text" },
            reconciliationDate: { type: "date" },
          }}
          defaultSortKey="statementDate"
          defaultSortDir="desc"
        >
          <AccountsTableListing
            summary={<AccountsSummaryCards items={summaryItems} columns={4} className="px-0" />}
            subheader={
              <AccountsListingTabsRow>
                <div className="flex items-center gap-0.5 py-1 overflow-x-auto">
                  {WORKSPACE_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "h-7 px-2.5 text-xs rounded-md font-medium whitespace-nowrap transition-colors",
                        activeTab === tab.id
                          ? "bg-brand-600 text-white"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </AccountsListingTabsRow>
            }
            toolbar={
              activeTab === "transactions" ? (
                <AccountsListingToolbar>
                  <ReportFilterRow>
                    <ReportSearchFilter
                      value={search}
                      onChange={(v) => {
                        setSearch(v);
                        setPage(1);
                      }}
                      placeholder="Search transactions…"
                    />
                    <div className="space-y-0.5">
                      <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>From</Label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.target.value);
                          setPage(1);
                        }}
                        className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[130px]")}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>To</Label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.target.value);
                          setPage(1);
                        }}
                        className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[130px]")}
                      />
                    </div>
                    <FilterSelect
                      label="Entry Status"
                      value={entryStatusFilter}
                      options={BANK_RECON_ENTRY_STATUS_FILTER_OPTIONS}
                      onChange={(v) => {
                        setEntryStatusFilter(v);
                        setPage(1);
                      }}
                    />
                    <FilterSelect
                      label="Transaction Mode"
                      value={modeFilter}
                      options={[
                        { value: "all", label: "All Modes" },
                        ...BANK_RECON_TRANSACTION_MODE_OPTIONS.map((m) => ({ value: m, label: m })),
                      ]}
                      onChange={(v) => {
                        setModeFilter(v);
                        setPage(1);
                      }}
                    />
                    <div className="space-y-0.5">
                      <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Book From</Label>
                      <input
                        type="date"
                        value={bookDateFrom}
                        onChange={(e) => {
                          setBookDateFrom(e.target.value);
                          setPage(1);
                        }}
                        className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[130px]")}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Book To</Label>
                      <input
                        type="date"
                        value={bookDateTo}
                        onChange={(e) => {
                          setBookDateTo(e.target.value);
                          setPage(1);
                        }}
                        className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[130px]")}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Clearing From</Label>
                      <input
                        type="date"
                        value={clearingDateFrom}
                        onChange={(e) => {
                          setClearingDateFrom(e.target.value);
                          setPage(1);
                        }}
                        className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[130px]")}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Clearing To</Label>
                      <input
                        type="date"
                        value={clearingDateTo}
                        onChange={(e) => {
                          setClearingDateTo(e.target.value);
                          setPage(1);
                        }}
                        className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[130px]")}
                      />
                    </div>
                    <FilterSelect
                      label="Deposit / Withdrawal"
                      value={flowFilter}
                      options={[
                        { value: "all", label: "All" },
                        { value: "deposit", label: "Deposits" },
                        { value: "withdrawal", label: "Withdrawals" },
                      ]}
                      onChange={(v) => {
                        setFlowFilter(v as typeof flowFilter);
                        setPage(1);
                      }}
                    />
                    <FilterSelect
                      label="Source"
                      value={sourceFilter}
                      options={[
                        { value: "all", label: "All Sources" },
                        ...BANK_RECON_SOURCE_OPTIONS.map((s) => ({ value: s, label: s })),
                      ]}
                      onChange={(v) => {
                        setSourceFilter(v);
                        setPage(1);
                      }}
                    />
                    <FilterSelect
                      label="Match Status"
                      value={matchFilter}
                      options={[
                        { value: "all", label: "All" },
                        ...BANK_RECON_MATCH_STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
                      ]}
                      onChange={(v) => {
                        setMatchFilter(v);
                        setPage(1);
                      }}
                    />
                    <FilterSelect
                      label="Verification"
                      value={verificationFilter}
                      options={[
                        { value: "all", label: "All" },
                        ...BANK_RECON_VERIFICATION_STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
                      ]}
                      onChange={(v) => {
                        setVerificationFilter(v);
                        setPage(1);
                      }}
                    />
                    <FilterSelect
                      label="Party"
                      value={partyFilter || "all"}
                      options={[
                        { value: "all", label: "All Parties" },
                        ...partyOptions.map((p) => ({ value: p, label: p })),
                      ]}
                      onChange={(v) => {
                        setPartyFilter(v === "all" ? "" : v);
                        setPage(1);
                      }}
                    />
                    <div className="space-y-0.5">
                      <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Amount Min</Label>
                      <input
                        type="number"
                        value={amountMin}
                        onChange={(e) => {
                          setAmountMin(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Min"
                        className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[90px]")}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Amount Max</Label>
                      <input
                        type="number"
                        value={amountMax}
                        onChange={(e) => {
                          setAmountMax(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Max"
                        className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[90px]")}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 self-end"
                      onClick={handleReset}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </Button>
                  </ReportFilterRow>
                </AccountsListingToolbar>
              ) : undefined
            }
            footer={
              activeTab === "transactions" ? (
                <AccountsTablePagination
                  page={page}
                  pageSize={pageSize}
                  totalRecords={tableRows.length}
                  onPageChange={setPage}
                  onPageSizeChange={(s) => {
                    setPageSize(s);
                    setPage(1);
                  }}
                  recordLabel="transactions"
                />
              ) : undefined
            }
          >
            {activeTab === "transactions" && (
              <>
                <AccountsListingTabsRow className="border-t-0">
                  <div className="flex flex-wrap items-center gap-1 py-1.5">
                    {BANK_RECON_QUICK_FILTER_CHIPS.map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => {
                          setQuickFilter(chip.id);
                          setPage(1);
                        }}
                        className={cn(
                          "h-6 px-2 text-[11px] rounded-md border font-medium transition-colors",
                          quickFilter === chip.id
                            ? "bg-brand-50 border-brand-200 text-brand-700"
                            : "border-border text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {chip.label}
                      </button>
                    ))}
                    {selectedIds.size > 0 && (
                      <>
                        <span className="text-[11px] text-muted-foreground ml-2">
                          {selectedIds.size} selected
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px] gap-1 ml-1"
                          onClick={handleRunAutoMatch}
                        >
                          <Sparkles className="w-3 h-3" />
                          Run Auto Match
                        </Button>
                      </>
                    )}
                  </div>
                </AccountsListingTabsRow>
                <TransactionsTable
                  rows={paginatedRows}
                  selectedIds={selectedIds}
                  onToggleRow={toggleRow}
                  onToggleAll={toggleAll}
                  onViewDetails={setDetailTxn}
                  onEditManual={(id) => openManualSheet(id)}
                  onCancelManual={(id) => {
                    const rec = getBankReconTransactionById(id);
                    if (rec) setCancelRecord(rec);
                  }}
                  onUpdateReference={(id) => {
                    const rec = getBankReconTransactionById(id);
                    if (rec) setUpdateRefRecord(rec);
                  }}
                  onAddManual={() => openManualSheet()}
                  onMatchTransaction={(id) => {
                    runAutoMatch({ bankAccountId: accountId, transactionIds: [id] });
                    updateStatementMatchStatusFromRun(accountId);
                    refreshRegister();
                    setActiveTab("auto-match");
                    setMatchReviewId(id);
                  }}
                  onUndoMatch={(id) => setUndoMatchId(id)}
                  onCategorize={(id) => {
                    const rec = getBankReconTransactionById(id);
                    if (rec && canCategorizeTransaction(rec)) setCategorizeTxn(rec);
                  }}
                  loading={loading}
                />
              </>
            )}
            {activeTab === "auto-match" && (
              <BankReconAutoMatchTab
                bankAccountId={accountId}
                selectedTransactionIds={selectedIds.size > 0 ? Array.from(selectedIds) : undefined}
                onRefresh={refreshRegister}
              />
            )}
            {activeTab === "manual" && (
              <BankReconManualReconciliationTab
                bankAccountId={accountId}
                registerTick={registerTick}
                onRefresh={refreshRegister}
              />
            )}
            {activeTab === "categorize" && (
              <BankReconCategorizeTab
                bankAccountId={accountId}
                registerTick={registerTick}
                onRefresh={refreshRegister}
              />
            )}
            {activeTab === "history" && <BankReconHistoryTab bankAccountId={accountId} registerTick={registerTick} />}
            {activeTab === "audit" && <BankReconAuditTrailTab bankAccountId={accountId} registerTick={registerTick} />}
          </AccountsTableListing>
        </AccountsColumnFilterProvider>
      </AccountsPageShell>

      <BankReconTransactionDetailSheet
        transaction={detailTxn}
        open={Boolean(detailTxn)}
        onClose={() => setDetailTxn(null)}
      />

      <BankReconManualTransactionSheet
        open={manualSheetOpen}
        onClose={() => {
          setManualSheetOpen(false);
          setEditManualId(null);
        }}
        bankAccountId={accountId}
        editTransactionId={editManualId}
        onSaved={refreshRegister}
        onViewExisting={(id) => {
          const rec = getBankReconTransactionById(id);
          if (rec) setDetailTxn(rec as BankReconTransaction);
        }}
      />

      <BankReconCancelManualDialog
        transaction={cancelRecord}
        open={Boolean(cancelRecord)}
        onClose={() => setCancelRecord(null)}
        onCancelled={refreshRegister}
      />

      <BankReconUpdateReferenceDialog
        transaction={updateRefRecord}
        open={Boolean(updateRefRecord)}
        onClose={() => setUpdateRefRecord(null)}
        onUpdated={refreshRegister}
      />

      <BankReconUndoMatchDialog
        bankAccountId={accountId}
        statementTransactionId={undoMatchId}
        open={Boolean(undoMatchId)}
        onClose={() => setUndoMatchId(null)}
        onUndone={refreshRegister}
      />

      <BankReconMatchReviewSheet
        bankAccountId={accountId}
        group={matchReviewGroup}
        open={Boolean(matchReviewGroup)}
        onClose={() => setMatchReviewId(null)}
        onAccepted={refreshRegister}
        onFindAnother={(id) => {
          setMatchReviewId(null);
          setFindMatchId(id);
        }}
        onReject={(statementId, bookTargetId, reason) => {
          rejectMatch({
            bankAccountId: accountId,
            statementTransactionId: statementId,
            bookTargetId,
            reason,
          });
          refreshRegister();
        }}
      />

      <BankReconFindMatchSheet
        bankAccountId={accountId}
        statementTransactionId={findMatchId}
        open={Boolean(findMatchId)}
        onClose={() => setFindMatchId(null)}
        onAccepted={refreshRegister}
      />

      <BankReconCategorizeSheet
        transaction={categorizeTxn}
        open={Boolean(categorizeTxn)}
        onClose={() => setCategorizeTxn(null)}
        onSaved={refreshRegister}
      />
    </>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-0.5 min-w-[120px]">
      <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-full")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
