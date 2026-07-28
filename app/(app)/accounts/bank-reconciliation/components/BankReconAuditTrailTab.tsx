"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
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
import { ReportFilterRow, ReportSearchFilter } from "@/components/accounts/ReportFilters";
import { aggregateAuditTrail } from "@/lib/accounts/bank-recon-completion-service";
import { ensureBankReconCompletionSeeded } from "@/lib/accounts/bank-recon-completion-demo-seed";
import { exportAuditTrailToExcel } from "@/lib/accounts/bank-recon-completion-export";

interface BankReconAuditTrailTabProps {
  bankAccountId: string;
  registerTick?: number;
}

export function BankReconAuditTrailTab({ bankAccountId, registerTick = 0 }: BankReconAuditTrailTabProps) {
  const [search, setSearch] = useState("");
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

  const rows = useMemo(() => {
    void registerTick;
    void tick;
    return aggregateAuditTrail(bankAccountId);
  }, [bankAccountId, registerTick, tick]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.action.toLowerCase().includes(q) ||
        r.user.toLowerCase().includes(q) ||
        (r.transactionReference ?? "").toLowerCase().includes(q) ||
        (r.reconciliationNumber ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className="space-y-3 p-1">
      <ReportFilterRow>
        <ReportSearchFilter value={search} onChange={setSearch} placeholder="Search audit trail…" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1"
          onClick={() =>
            exportAuditTrailToExcel(
              filtered.map((r) => ({
                timestamp: r.timestamp,
                user: r.user,
                action: r.action,
                reference: r.transactionReference,
                reason: r.reason,
              })),
              bankAccountId,
            )
          }
        >
          <Download className="w-3.5 h-3.5" /> Export Audit
        </Button>
      </ReportFilterRow>

      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
        <AccountsTable>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell>Date & Time</AccountsTableHeadCell>
              <AccountsTableHeadCell>User</AccountsTableHeadCell>
              <AccountsTableHeadCell>Action</AccountsTableHeadCell>
              <AccountsTableHeadCell>Recon No.</AccountsTableHeadCell>
              <AccountsTableHeadCell>Reference</AccountsTableHeadCell>
              <AccountsTableHeadCell>Previous → New</AccountsTableHeadCell>
              <AccountsTableHeadCell>Reason</AccountsTableHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {filtered.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={7} className="py-10 text-center text-muted-foreground text-xs">
                  No audit entries.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              filtered.map((r) => (
                <AccountsTableRow key={r.id}>
                  <AccountsTableCell className="text-xs whitespace-nowrap">
                    {new Date(r.timestamp).toLocaleString("en-IN")}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs">{r.user}</AccountsTableCell>
                  <AccountsTableCell className="text-xs font-medium">{r.action}</AccountsTableCell>
                  <AccountsTableCell className="text-xs font-mono text-brand-700">{r.reconciliationNumber ?? "—"}</AccountsTableCell>
                  <AccountsTableCell className="text-xs max-w-[120px] truncate">{r.transactionReference ?? "—"}</AccountsTableCell>
                  <AccountsTableCell className="text-[11px] text-muted-foreground">
                    {r.previousValue ?? "—"} → {r.newValue ?? "—"}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-[11px] max-w-[100px] truncate">{r.reason ?? "—"}</AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </div>
    </div>
  );
}
