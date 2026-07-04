"use client";

import React, { useState, useMemo } from "react";
import { formatMoney } from "@/lib/accounts/money-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
  ReportDateRangeFilter,
  ReportSearchFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsListingCountFooter,
  AccountsListingToolbar,
} from "@/components/accounts/AccountsTableListing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Search, X, Check, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
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
  loadBankTransactions,
  filterTransactions,
  categorizeTransaction,
  reconcileTransaction,
  uncategorizeTransaction,
  searchLedgersForCategory,
  TRANSACTION_CATEGORIES,
  type BankTransaction,
  type TransactionCategory,
  type TransactionStatus,
  type TransactionFilters,
} from "@/lib/accounts/bank-transaction-categorization";
import { listBankAccountSelectOptions } from "@/lib/accounts/bank-accounts-data";

function StatusBadge({ status }: { status: TransactionStatus }) {
  const config = {
    uncategorized: { label: "Uncategorized", className: "bg-slate-100 text-slate-700" },
    categorized: { label: "Categorized", className: "bg-blue-100 text-blue-700" },
    reconciled: { label: "Reconciled", className: "bg-green-100 text-green-700" },
  };
  const c = config[status];
  return <Badge className={cn("text-xs px-2 py-0.5", c.className)}>{c.label}</Badge>;
}

interface CategorizationPanelProps {
  transaction: BankTransaction | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

function CategorizationPanel({ transaction, open, onClose, onSave }: CategorizationPanelProps) {
  const [category, setCategory] = useState<TransactionCategory | "">("");
  const [ledgerId, setLedgerId] = useState<number | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [narration, setNarration] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (transaction && open) {
      setCategory(transaction.category);
      setLedgerId(transaction.ledgerId);
      setNarration(transaction.narration);
      setRemarks(transaction.remarks);
      setLedgerSearch("");
      setError("");
    }
  }, [transaction, open]);

  const ledgerOptions = useMemo(() => {
    if (!category) return [];
    return searchLedgersForCategory(category, ledgerSearch);
  }, [category, ledgerSearch]);

  const handleSave = async () => {
    if (!transaction) return;
    if (!category) {
      setError("Please select a category");
      return;
    }
    if (!ledgerId) {
      setError("Please select a ledger");
      return;
    }

    setSaving(true);
    setError("");
    const result = categorizeTransaction({
      transactionId: transaction.id,
      category,
      ledgerId,
      amount: transaction.debit || transaction.credit,
      narration,
      remarks,
    });

    setSaving(false);
    if (result.success) {
      onSave();
      onClose();
    } else {
      setError(result.error || "Failed to categorize transaction");
    }
  };

  const handleReconcile = async () => {
    if (!transaction) return;
    setSaving(true);
    const result = reconcileTransaction(transaction.id);
    setSaving(false);
    if (result.success) {
      onSave();
      onClose();
    } else {
      setError(result.error || "Failed to reconcile transaction");
    }
  };

  const handleUncategorize = async () => {
    if (!transaction) return;
    setSaving(true);
    const result = uncategorizeTransaction(transaction.id);
    setSaving(false);
    if (result.success) {
      onSave();
      onClose();
    } else {
      setError(result.error || "Failed to uncategorize transaction");
    }
  };

  if (!transaction) return null;

  const amount = transaction.debit || transaction.credit;
  const isReceipt = transaction.credit > 0;
  const selectedLedger = ledgerOptions.find((l) => l.id === ledgerId);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Categorize Transaction</SheetTitle>
          <SheetDescription>
            Assign accounting ledger and create journal entry
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Transaction Summary */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{transaction.transactionDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className={cn("font-semibold", isReceipt ? "text-green-600" : "text-red-600")}>
                {isReceipt ? "+" : "-"} {formatMoney(amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference:</span>
              <span className="font-medium">{transaction.referenceNo || "—"}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground">Narration:</p>
              <p className="text-xs mt-1">{transaction.narration}</p>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Category Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v as TransactionCategory);
                setLedgerId(null);
                setLedgerSearch("");
              }}
              disabled={transaction.status === "reconciled"}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} className="text-xs">
                    {cat.label}
                    <span className="ml-2 text-xs text-muted-foreground">({cat.type})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ledger Selection */}
          {category && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                Ledger <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  className="h-9 text-sm pr-8"
                  placeholder="Search ledger..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  disabled={transaction.status === "reconciled"}
                />
                <Search className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
              {selectedLedger && (
                <div className="mt-2 rounded-md bg-brand-50 border border-brand-200 px-3 py-2">
                  <p className="text-xs font-medium">{selectedLedger.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedLedger.code} · {selectedLedger.type}
                  </p>
                </div>
              )}
              <div className="max-h-[200px] overflow-y-auto border border-border/60 rounded-md mt-2">
                {ledgerOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {ledgerSearch ? "No ledgers found" : "Type to search ledgers"}
                  </p>
                ) : (
                  <div className="divide-y divide-border/30">
                    {ledgerOptions.map((ledger) => (
                      <button
                        key={ledger.id}
                        type="button"
                        onClick={() => {
                          setLedgerId(ledger.id);
                          setLedgerSearch(ledger.name);
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left hover:bg-orange-50/40 transition-colors",
                          ledgerId === ledger.id && "bg-brand-50"
                        )}
                        disabled={transaction.status === "reconciled"}
                      >
                        <p className="text-xs font-medium">{ledger.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ledger.code} · {ledger.type}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Narration */}
          <div className="space-y-1.5">
            <Label className="text-xs">Narration</Label>
            <Textarea
              className="text-xs resize-none"
              rows={2}
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Optional description for journal entry"
              disabled={transaction.status === "reconciled"}
            />
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Label className="text-xs">Remarks</Label>
            <Textarea
              className="text-xs resize-none"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Internal notes"
              disabled={transaction.status === "reconciled"}
            />
          </div>

          {/* Status Info */}
          {transaction.status !== "uncategorized" && (
            <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 space-y-1 text-xs">
              <p className="font-medium">Status: <StatusBadge status={transaction.status} /></p>
              {transaction.categorizedBy && (
                <p className="text-muted-foreground">
                  Categorized by {transaction.categorizedBy} on {new Date(transaction.categorizedAt).toLocaleDateString()}
                </p>
              )}
              {transaction.reconciledBy && (
                <p className="text-muted-foreground">
                  Reconciled by {transaction.reconciledBy} on {new Date(transaction.reconciledAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-border/40">
            {transaction.status === "uncategorized" && (
              <>
                <Button
                  size="sm"
                  className="flex-1 h-9 text-sm"
                  onClick={handleSave}
                  disabled={!category || !ledgerId || saving}
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Categorize
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-sm"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </>
            )}
            {transaction.status === "categorized" && (
              <>
                <Button
                  size="sm"
                  className="flex-1 h-9 text-sm bg-green-600 hover:bg-green-700"
                  onClick={handleReconcile}
                  disabled={saving}
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Reconcile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-sm"
                  onClick={handleUncategorize}
                  disabled={saving}
                >
                  <Ban className="w-4 h-4 mr-1.5" />
                  Uncategorize
                </Button>
              </>
            )}
            {transaction.status === "reconciled" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-9 text-sm"
                onClick={onClose}
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function BankTransactionsClient() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>({ status: "all" });
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const bankAccounts = useMemo(() => listBankAccountSelectOptions(), []);

  const activeFilters = useMemo(
    () => ({ ...filters, startDate: dateFrom, endDate: dateTo }),
    [filters, dateFrom, dateTo],
  );

  const refresh = () => {
    const filtered = filterTransactions(activeFilters);
    setTransactions(filtered);
  };

  React.useEffect(() => {
    setTransactions(filterTransactions(activeFilters));
  }, [activeFilters]);

  const openCategorization = (transaction: BankTransaction) => {
    setSelectedTransaction(transaction);
    setPanelOpen(true);
  };

  const closeCategorization = () => {
    setPanelOpen(false);
    setTimeout(() => setSelectedTransaction(null), 300);
  };

  const handleSave = () => {
    refresh();
  };

  return (
    <AccountsTableListing
      toolbar={
        <AccountsListingToolbar>
          <div className="space-y-1 min-w-[140px]">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Bank Account</Label>
            <Select
              value={filters.bankAccountId?.toString() || "all"}
              onValueChange={(v) =>
                setFilters({ ...filters, bankAccountId: v === "all" ? undefined : parseInt(v) })
              }
            >
              <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[140px]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Accounts</SelectItem>
                {bankAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id.toString()} className="text-xs">
                    {acc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[120px]">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Status</Label>
            <Select
              value={filters.status || "all"}
              onValueChange={(v) => setFilters({ ...filters, status: v as TransactionStatus | "all" })}
            >
              <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[120px]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Status</SelectItem>
                <SelectItem value="uncategorized" className="text-xs">Uncategorized</SelectItem>
                <SelectItem value="categorized" className="text-xs">Categorized</SelectItem>
                <SelectItem value="reconciled" className="text-xs">Reconciled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <ReportSearchFilter
            value={filters.search || ""}
            onChange={(value) => setFilters({ ...filters, search: value })}
            placeholder="Narration, reference…"
            className="min-w-[200px] flex-1 max-w-md"
          />
        </AccountsListingToolbar>
      }
      footer={
        transactions.length > 0 ? (
          <AccountsListingCountFooter>
            Showing <span className="font-medium text-foreground">{transactions.length}</span> transactions
          </AccountsListingCountFooter>
        ) : undefined
      }
    >
      <AccountsTable minWidth={960}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <AccountsTableHeadCell uppercase>Date</AccountsTableHeadCell>
            <AccountsTableHeadCell uppercase className="accounts-col-wide">Narration</AccountsTableHeadCell>
            <AccountsTableHeadCell uppercase>Reference No</AccountsTableHeadCell>
            <AccountsTableHeadCell align="right" uppercase>Debit</AccountsTableHeadCell>
            <AccountsTableHeadCell align="right" uppercase>Credit</AccountsTableHeadCell>
            <AccountsTableHeadCell align="right" uppercase>Balance</AccountsTableHeadCell>
            <AccountsTableHeadCell uppercase>Ledger</AccountsTableHeadCell>
            <AccountsTableHeadCell uppercase>Status</AccountsTableHeadCell>
            <AccountsTableHeadCell className="accounts-col-actions" />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {transactions.length === 0 ? (
            <AccountsTableEmpty colSpan={9} message="No transactions found. Import a bank statement to get started." />
          ) : (
            transactions.map((txn) => (
              <AccountsTableRow
                key={txn.id}
                className="cursor-pointer"
                onClick={() => openCategorization(txn)}
              >
                <AccountsTableCell>{txn.transactionDate}</AccountsTableCell>
                <AccountsTableCell wrap>
                  <span className="font-medium line-clamp-1">{txn.narration}</span>
                  <span className="text-xs text-muted-foreground">{txn.bankAccountName}</span>
                </AccountsTableCell>
                <AccountsTableCell>{txn.referenceNo || "—"}</AccountsTableCell>
                <AccountsTableCell align="right" className="text-red-600 font-medium tabular-nums">
                  {txn.debit > 0 ? formatMoney(txn.debit) : "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" className="text-emerald-600 font-medium tabular-nums">
                  {txn.credit > 0 ? formatMoney(txn.credit) : "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>{formatMoney(txn.balance)}</AccountsTableCell>
                <AccountsTableCell>{txn.ledgerName || "—"}</AccountsTableCell>
                <AccountsTableCell>
                  <StatusBadge status={txn.status} />
                </AccountsTableCell>
                <AccountsTableCell />
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
      </AccountsTable>

      <CategorizationPanel
        transaction={selectedTransaction}
        open={panelOpen}
        onClose={closeCategorization}
        onSave={handleSave}
      />
    </AccountsTableListing>
  );
}
