"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

/** Single compact Receipt summary — bottom-right only. */
export function ReceiptFormSummary({
  invoiceSettlement,
  ledgerTotal,
  bankAmount,
  tdsAmount,
  label = "Invoice Settlement",
  className,
}: {
  invoiceSettlement: number;
  ledgerTotal: number;
  bankAmount?: number;
  tdsAmount?: number;
  /** e.g. Invoice Settlement / Advance / Receipt Amount */
  label?: string;
  className?: string;
}) {
  const difference =
    Math.round((invoiceSettlement - ledgerTotal) * 100) / 100;
  const balanced = Math.abs(difference) < 0.01;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-white shadow-sm px-3.5 py-3 space-y-1.5 w-full max-w-[280px]",
        !balanced && "border-amber-300",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Summary
        </p>
        {balanced ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Balanced
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Difference
          </span>
        )}
      </div>

      <Row label={label} value={invoiceSettlement} />
      {(bankAmount ?? 0) > 0 ? (
        <Row label="Bank Received" value={bankAmount!} muted />
      ) : null}
      {(tdsAmount ?? 0) > 0 ? (
        <Row label="TDS" value={tdsAmount!} muted />
      ) : null}
      <Row label="Ledger Total" value={ledgerTotal} emphasize />

      <div
        className={cn(
          "mt-1 rounded-lg px-2.5 py-1.5 flex items-center justify-between",
          balanced ? "bg-emerald-50" : "bg-amber-50",
        )}
      >
        <span
          className={cn(
            "text-xs font-semibold",
            balanced ? "text-emerald-800" : "text-amber-900",
          )}
        >
          Difference
        </span>
        <span
          className={cn(
            "text-sm tabular-nums font-bold",
            balanced ? "text-emerald-800" : "text-amber-900",
          )}
        >
          {formatMoney(difference)}
        </span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasize,
  muted,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums font-medium",
          emphasize && "text-brand-700 font-semibold",
        )}
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}
