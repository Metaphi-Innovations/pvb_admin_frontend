"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { VOUCHER_INPUT_CLASS } from "@/components/accounts/voucher-simple-form-ui";
import { InvoiceTableReadonly } from "@/app/(app)/accounts/invoices/components/invoice-form-voucher-ui";
import {
  computeNoteParticularTotals,
} from "@/components/accounts/voucher-form/NoteParticularsTable";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { DebitNoteLedgerSelect } from "./DebitNoteLedgerSelect";

const INPUT_CLASS = cn(VOUCHER_INPUT_CLASS, "text-xs");

type ColumnKey =
  | "particular"
  | "ledger"
  | "qty"
  | "rate_benefit"
  | "eligible_base"
  | "gst_toggle"
  | "gst_rate"
  | "cgst"
  | "sgst"
  | "igst"
  | "dn_amount";

function colLabel(key: ColumnKey): string {
  switch (key) {
    case "particular":
      return "Particular / Description";
    case "ledger":
      return "Adjustment Ledger";
    case "qty":
      return "Qty";
    case "rate_benefit":
      return "Rate / Benefit";
    case "eligible_base":
      return "Eligible Base";
    case "gst_toggle":
      return "GST";
    case "gst_rate":
      return "GST %";
    case "cgst":
      return "CGST";
    case "sgst":
      return "SGST";
    case "igst":
      return "IGST";
    case "dn_amount":
      return "DN Amount";
  }
}

function colAlign(key: ColumnKey): "left" | "right" | "center" {
  if (key === "gst_toggle") return "center";
  if (
    key === "qty" ||
    key === "rate_benefit" ||
    key === "eligible_base" ||
    key === "gst_rate" ||
    key === "cgst" ||
    key === "sgst" ||
    key === "igst" ||
    key === "dn_amount"
  ) {
    return "right";
  }
  return "left";
}

function Cell({
  children,
  align,
  className,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "p-1.5 align-middle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

function ReadCell({
  value,
  align,
  muted,
  strong,
}: {
  value: ReactNode;
  align?: "left" | "right" | "center";
  muted?: boolean;
  strong?: boolean;
}) {
  if (align === "right" || align === "center") {
    return (
      <Cell align={align}>
        <InvoiceTableReadonly
          value={String(value ?? "—")}
          muted={muted}
          strong={strong}
        />
      </Cell>
    );
  }
  return (
    <Cell align="left">
      <div className="so-goods-ro w-full min-w-0 truncate text-left">{value}</div>
    </Cell>
  );
}

function toNum(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function DebitNoteParticularsEditor({
  particular,
  onParticularChange,
  adjustmentLedgerId,
  onAdjustmentLedgerChange,
  adjustmentLedgerName,
  qty,
  onQtyChange,
  rate,
  onRateChange,
  gstPct,
  onGstPctChange,
  gstApplicable,
  onGstApplicableChange,
  interstate = false,
  disabled = false,
  switchId = "dn-gst-applicable",
}: {
  particular: string;
  onParticularChange: (value: string) => void;
  adjustmentLedgerId: string | number | null;
  onAdjustmentLedgerChange: (ledger: { id: string | number; accountName: string }) => void;
  adjustmentLedgerName?: string;
  qty: string;
  onQtyChange: (value: string) => void;
  rate: string;
  onRateChange: (value: string) => void;
  gstPct: string;
  onGstPctChange: (value: string) => void;
  gstApplicable: boolean;
  onGstApplicableChange: (value: boolean) => void;
  interstate?: boolean;
  disabled?: boolean;
  switchId?: string;
}) {
  const totals = computeNoteParticularTotals(qty, rate, gstApplicable, gstPct, interstate);

  const columns: ColumnKey[] = [
    "particular",
    "ledger",
    "qty",
    "rate_benefit",
    "eligible_base",
    "gst_toggle",
  ];
  if (gstApplicable) {
    columns.push("gst_rate");
    if (interstate) columns.push("igst");
    else columns.push("cgst", "sgst");
  }
  columns.push("dn_amount");

  return (
    <VoucherFormSectionCard title="Particulars" flush>
      <div className="so-invoice-charges-table-wrap w-full">
        <table className="so-invoice-table text-xs w-full table-fixed">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className={cn(
                    "px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                    colAlign(col) === "right"
                      ? "text-right"
                      : colAlign(col) === "center"
                        ? "text-center"
                        : "text-left",
                    col === "particular" && "w-[22%]",
                    col === "ledger" && "w-[18%]",
                    col === "gst_toggle" && "w-[4.5rem]",
                  )}
                >
                  {colLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/40 last:border-0">
              <Cell>
                <Input
                  className={INPUT_CLASS}
                  value={particular}
                  onChange={(e) => onParticularChange(e.target.value)}
                  placeholder="Particular…"
                  disabled={disabled}
                />
              </Cell>
              <Cell>
                <DebitNoteLedgerSelect
                  value={adjustmentLedgerId ? String(adjustmentLedgerId) : ""}
                  fallbackLabel={adjustmentLedgerName}
                  disabled={disabled}
                  onChange={(id, name) =>
                    onAdjustmentLedgerChange({ id, accountName: name })
                  }
                />
              </Cell>
              <Cell align="right">
                <Input
                  className={cn(INPUT_CLASS, "text-right tabular-nums")}
                  value={qty}
                  onChange={(e) => onQtyChange(e.target.value)}
                  disabled={disabled}
                />
              </Cell>
              <Cell align="right">
                <AccountsMoneyInput
                  className={cn(INPUT_CLASS, "text-right tabular-nums")}
                  value={rate}
                  onChange={(v) => onRateChange(String(v))}
                  disabled={disabled}
                />
              </Cell>
              <Cell align="right">
                <AccountsMoneyInput
                  className={cn(INPUT_CLASS, "text-right tabular-nums")}
                  value={String(totals.basicAmount || "")}
                  onChange={(v) => {
                    const base = toNum(String(v));
                    const q = Math.max(toNum(qty), 1);
                    onRateChange(String(Math.round((base / q) * 100) / 100));
                  }}
                  disabled={disabled}
                />
              </Cell>
              <Cell align="center" className="cn-switch-cell">
                <Switch
                  id={switchId}
                  checked={gstApplicable}
                  onCheckedChange={onGstApplicableChange}
                  disabled={disabled}
                  className="shrink-0"
                />
              </Cell>
              {gstApplicable ? (
                <>
                  <Cell align="right">
                    <Input
                      className={cn(INPUT_CLASS, "text-right tabular-nums w-16 ml-auto")}
                      value={gstPct}
                      onChange={(e) => onGstPctChange(e.target.value)}
                      disabled={disabled}
                    />
                  </Cell>
                  {interstate ? (
                    <ReadCell align="right" value={formatMoney(totals.igst)} muted />
                  ) : (
                    <>
                      <ReadCell align="right" value={formatMoney(totals.cgst)} muted />
                      <ReadCell align="right" value={formatMoney(totals.sgst)} muted />
                    </>
                  )}
                </>
              ) : null}
              <ReadCell align="right" value={formatMoney(totals.lineTotal)} strong />
            </tr>
          </tbody>
        </table>
      </div>
    </VoucherFormSectionCard>
  );
}
