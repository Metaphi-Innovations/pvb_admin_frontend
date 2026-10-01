"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  ReportFilterRow,
  ReportSearchFilter,
} from "@/components/accounts/ReportFilters";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { bankReconCompletePath } from "../reconciliation-utils";
import type { BankReconSessionRecord, BankReconSessionStatus } from "@/lib/accounts/bank-recon-completion-types";
import {
  canDownloadReconciliationReports,
  canReopenReconciliation,
  getSessionReview,
  loadBankReconSessions,
  reopenReconciliation,
} from "@/lib/accounts/bank-recon-completion-service";
import { ensureBankReconCompletionSeeded } from "@/lib/accounts/bank-recon-completion-demo-seed";
import {
  exportOutstandingItemsReport,
  exportReconciliationReportToExcel,
  exportReconciliationReportToPdf,
} from "@/lib/accounts/bank-recon-completion-export";
import { BankReconReopenDialog } from "./BankReconReopenDialog";

const QUICK_CHIPS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Completed", label: "Completed" },
  { id: "Completed with Difference", label: "With Difference" },
  { id: "Reopened", label: "Reopened" },
  { id: "Draft", label: "Draft" },
];

function StatusPill({ status }: { status: BankReconSessionStatus }) {
  const cfg: Record<string, string> = {
    Completed: "bg-emerald-50 text-emerald-700",
    "Completed with Difference": "bg-amber-50 text-amber-700",
    Reopened: "bg-purple-50 text-purple-700",
    Draft: "bg-slate-100 text-slate-600",
    "In Progress": "bg-navy-50 text-navy-700",
    Cancelled: "bg-red-50 text-red-700",
  };
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold", cfg[status] ?? cfg.Draft)}>
      {status}
    </span>
  );
}

interface BankReconHistoryTabProps {
  bankAccountId: string;
  registerTick?: number;
}

export function BankReconHistoryTab({ bankAccountId, registerTick = 0 }: BankReconHistoryTabProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [chip, setChip] = useState("all");
  const [reopenId, setReopenId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    ensureBankReconCompletionSeeded();
  }, []);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener("bank-recon-completion-updated", bump);
    window.addEventListener("bank-recon-register-updated", bump);
    return () => {
      window.removeEventListener("bank-recon-completion-updated", bump);
      window.removeEventListener("bank-recon-register-updated", bump);
    };
  }, []);

  const sessions = useMemo(() => {
    void registerTick;
    void tick;
    return loadBankReconSessions(bankAccountId).sort((a, b) =>
      (b.completedOn ?? b.preparedOn).localeCompare(a.completedOn ?? a.preparedOn),
    );
  }, [bankAccountId, registerTick, tick]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      if (chip !== "all" && s.status !== chip) return false;
      if (!q) return true;
      return (
        (s.reconciliationNumber ?? "").toLowerCase().includes(q) ||
        s.periodFrom.includes(q) ||
        s.periodTo.includes(q) ||
        (s.completedBy ?? "").toLowerCase().includes(q)
      );
    });
  }, [sessions, search, chip]);

  const handleExport = async (session: BankReconSessionRecord) => {
    const review = getSessionReview(session.id);
    if (!review) return;
    await exportReconciliationReportToExcel(session, review);
  };

  const handleOutstandingExport = async (session: BankReconSessionRecord) => {
    const review = getSessionReview(session.id);
    if (!review) return;
    await exportOutstandingItemsReport(session, review);
  };

  return (
    <div className="space-y-3 p-1">
      <ReportFilterRow>
        <ReportSearchFilter value={search} onChange={setSearch} placeholder="Search reconciliation number…" />
      </ReportFilterRow>
      <div className="flex flex-wrap gap-1">
        {QUICK_CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChip(c.id)}
            className={cn(
              "h-6 px-2 text-[10px] rounded-md border font-medium",
              chip === c.id ? "bg-brand-50 border-brand-200 text-brand-700" : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
        <AccountsTable>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell>Recon No.</AccountsTableHeadCell>
              <AccountsTableHeadCell>Period</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right">Book Closing</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right">Statement Closing</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right">Difference</AccountsTableHeadCell>
              <AccountsTableHeadCell>Completed By</AccountsTableHeadCell>
              <AccountsTableHeadCell>Status</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-28">Action</AccountsTableHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {filtered.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={8} className="py-10 text-center text-muted-foreground text-xs">
                  No reconciliation history.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              filtered.map((s) => (
                <AccountsTableRow key={s.id}>
                  <AccountsTableCell>
                    <span className="font-mono text-xs font-semibold text-brand-700">{s.reconciliationNumber ?? "Draft"}</span>
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs">{s.periodFrom} — {s.periodTo}</AccountsTableCell>
                  <AccountsTableCell align="right" className="text-xs tabular-nums">{formatMoney(s.bookClosingBalance)}</AccountsTableCell>
                  <AccountsTableCell align="right" className="text-xs tabular-nums">{formatMoney(s.statementClosingBalance)}</AccountsTableCell>
                  <AccountsTableCell align="right" className={cn("text-xs tabular-nums font-semibold", Math.abs(s.finalDifference) > 0.009 && "text-amber-700")}>
                    {formatMoney(s.finalDifference)}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs">{s.completedBy ?? "—"}</AccountsTableCell>
                  <AccountsTableCell><StatusPill status={s.status} /></AccountsTableCell>
                  <AccountsTableCell>
                    <div className="flex gap-1">
                      <button type="button" className="p-1 hover:bg-muted rounded" title="View" onClick={() => router.push(bankReconCompletePath(bankAccountId, s.id))}>
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      {canDownloadReconciliationReports() && (
                        <button type="button" className="p-1 hover:bg-muted rounded" title="Download Excel" onClick={() => handleExport(s)}>
                          <Download className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                      {(s.status === "Completed" || s.status === "Completed with Difference") && canReopenReconciliation() && (
                        <button type="button" className="p-1 hover:bg-muted rounded" title="Reopen" onClick={() => setReopenId(s.id)}>
                          <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      )}
                    </div>
                  </AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </div>

      <BankReconReopenDialog
        sessionId={reopenId}
        open={Boolean(reopenId)}
        onClose={() => setReopenId(null)}
        onReopened={() => setTick((t) => t + 1)}
      />
    </div>
  );
}
