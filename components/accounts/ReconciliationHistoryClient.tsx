"use client";

import React, { useState, useMemo } from "react";
import { formatMoney } from "@/lib/accounts/money-format";
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
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, User, CheckCircle2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getReconciliationHistory,
  TRANSACTION_CATEGORIES,
  type ReconciliationHistoryEntry,
} from "@/lib/accounts/bank-transaction-categorization";
import { listBankAccountSelectOptions } from "@/lib/accounts/bank-accounts-data";

function CategoryBadge({ category }: { category: string }) {
  const cat = TRANSACTION_CATEGORIES.find((c) => c.value === category);
  const label = cat?.label || category;
  const isReceipt = cat?.type === "receipt";

  return (
    <Badge
      className={cn(
        "text-[10px] px-2 py-0.5",
        isReceipt ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
      )}
    >
      {label}
    </Badge>
  );
}

export function ReconciliationHistoryClient() {
  const [bankAccountId, setBankAccountId] = useState<number | undefined>();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const bankAccounts = useMemo(() => listBankAccountSelectOptions(), []);

  const history = useMemo(() => {
    return getReconciliationHistory({
      bankAccountId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [bankAccountId, startDate, endDate]);

  const exportToExcel = () => {
    // Simple CSV export
    const headers = [
      "Date",
      "Bank Account",
      "Narration",
      "Amount",
      "Category",
      "Ledger",
      "Journal Entry",
      "Categorized By",
      "Categorized At",
      "Reconciled By",
      "Reconciled At",
    ];
    
    const rows = history.map((h) => [
      h.transactionDate,
      h.bankAccountName,
      h.narration,
      h.amount,
      TRANSACTION_CATEGORIES.find((c) => c.value === h.category)?.label || h.category,
      h.ledgerName,
      h.journalEntryNumber,
      h.categorizedBy,
      h.categorizedAt,
      h.reconciledBy,
      h.reconciledAt,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconciliation-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/40 bg-white">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">Reconciliation History</h1>
            <p className="text-xs text-muted-foreground mt-1">Audit trail of all categorized and reconciled transactions</p>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={exportToExcel}>
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Bank Account</Label>
            <Select
              value={bankAccountId?.toString() || "all"}
              onValueChange={(v) => setBankAccountId(v === "all" ? undefined : parseInt(v))}
            >
              <SelectTrigger className="h-8 text-xs">
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

          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Start Date</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">End Date</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="flex-1 overflow-auto">
        {history.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No reconciliation history</p>
              <p className="text-xs text-muted-foreground mt-1">
                Categorized and reconciled transactions will appear here
              </p>
            </div>
          </div>
        ) : (
          <table className="accounts-table w-full text-sm">
            <thead className="border-b border-border/40">
              <tr>
                {[
                  "Date",
                  "Bank Account",
                  "Narration",
                  "Amount",
                  "Category",
                  "Ledger",
                  "Journal Entry",
                  "Categorized By",
                  "Reconciled By",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.transactionId} className="border-b border-border/30 hover:bg-slate-50/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {entry.transactionDate}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="font-medium">{entry.bankAccountName}</p>
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[250px]">
                    <p className="truncate">{entry.narration}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums font-medium">
                    {formatMoney(entry.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <CategoryBadge category={entry.category} />
                  </td>
                  <td className="px-4 py-3 text-xs font-medium">{entry.ledgerName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{entry.journalEntryNumber}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span>{entry.categorizedBy}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(entry.categorizedAt).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {entry.reconciledBy ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          <span>{entry.reconciledBy}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(entry.reconciledAt).toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Summary */}
      <div className="flex-shrink-0 px-6 py-3 border-t border-border/40 bg-slate-50/50">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{history.length}</span> record(s)
        </p>
      </div>
    </div>
  );
}
