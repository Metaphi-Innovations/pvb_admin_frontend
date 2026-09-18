"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { VOUCHER_INPUT_CLASS } from "@/components/accounts/voucher-simple-form-ui";
import { InvoiceTableReadonly } from "@/app/(app)/accounts/invoices/components/invoice-form-voucher-ui";
import { computeNoteParticularTotals } from "@/components/accounts/voucher-form/NoteParticularsTable";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { DebitNoteLedgerSelect } from "./DebitNoteLedgerSelect";

const INPUT_CLASS = cn(VOUCHER_INPUT_CLASS, "text-xs");

export type DirectDnLineDraft = {
  key: string;
  description: string;
  ledger_id: string;
  ledger_name: string;
  quantity: string;
  rate: string;
  gst_applicable: boolean;
  gst_rate: string;
};

export function newDirectDnLine(seed?: Partial<DirectDnLineDraft>): DirectDnLineDraft {
  return {
    key: `dn-line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: "",
    ledger_id: "",
    ledger_name: "",
    quantity: "1",
    rate: "",
    gst_applicable: false,
    gst_rate: "18",
    ...seed,
  };
}

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
  | "dn_amount"
  | "actions";

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
    case "actions":
      return "";
  }
}

function colAlign(key: ColumnKey): "left" | "right" | "center" {
  if (key === "gst_toggle" || key === "actions") return "center";
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

export function previewDirectDnLine(line: DirectDnLineDraft, interstate: boolean) {
  return computeNoteParticularTotals(
    line.quantity,
    line.rate,
    line.gst_applicable,
    line.gst_rate,
    interstate,
  );
}

export function DebitNoteParticularsEditor({
  lines,
  onLinesChange,
  interstate = false,
  disabled = false,
  allowAddRemove = true,
  helperText = "Enter adjustments, freight, packing, or other direct debit note lines here.",
}: {
  lines: DirectDnLineDraft[];
  onLinesChange: (lines: DirectDnLineDraft[]) => void;
  interstate?: boolean;
  disabled?: boolean;
  allowAddRemove?: boolean;
  helperText?: string | null;
}) {
  const gstOn = lines.some((l) => l.gst_applicable);
  const columns: ColumnKey[] = [
    "particular",
    "ledger",
    "qty",
    "rate_benefit",
    "eligible_base",
    "gst_toggle",
  ];
  if (gstOn) {
    columns.push("gst_rate");
    if (interstate) columns.push("igst");
    else columns.push("cgst", "sgst");
  }
  columns.push("dn_amount");
  if (allowAddRemove && !disabled) columns.push("actions");

  const updateLine = (key: string, patch: Partial<DirectDnLineDraft>) => {
    onLinesChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    const last = lines[lines.length - 1];
    onLinesChange([
      ...lines,
      newDirectDnLine({
        ledger_id: last?.ledger_id || "",
        ledger_name: last?.ledger_name || "",
        gst_applicable: last?.gst_applicable ?? false,
        gst_rate: last?.gst_rate || "18",
      }),
    ]);
  };

  const removeLine = (key: string) => {
    if (lines.length <= 1) return;
    onLinesChange(lines.filter((l) => l.key !== key));
  };

  return (
    <VoucherFormSectionCard
      title="Particulars"
      flush
      headerActions={
        allowAddRemove && !disabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="so-section-header-btn"
            onClick={addLine}
          >
            <Plus /> Add Line
          </Button>
        ) : null
      }
    >
      {helperText ? (
        <p className="px-3 pt-2 text-[11px] text-muted-foreground">{helperText}</p>
      ) : null}
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
                    col === "actions" && "so-col-actions",
                  )}
                >
                  {colLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const totals = previewDirectDnLine(line, interstate);
              return (
                <tr key={line.key} className="border-b border-border/40 last:border-0">
                  <Cell>
                    <Input
                      className={INPUT_CLASS}
                      value={line.description}
                      onChange={(e) => updateLine(line.key, { description: e.target.value })}
                      placeholder="Particular…"
                      disabled={disabled}
                    />
                  </Cell>
                  <Cell>
                    <DebitNoteLedgerSelect
                      value={line.ledger_id}
                      fallbackLabel={line.ledger_name}
                      disabled={disabled}
                      onChange={(id, name) =>
                        updateLine(line.key, { ledger_id: id, ledger_name: name })
                      }
                    />
                  </Cell>
                  <Cell align="right">
                    <Input
                      className={cn(INPUT_CLASS, "text-right tabular-nums")}
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      disabled={disabled}
                    />
                  </Cell>
                  <Cell align="right">
                    <AccountsMoneyInput
                      className={cn(INPUT_CLASS, "text-right tabular-nums")}
                      value={line.rate}
                      onChange={(v) => updateLine(line.key, { rate: String(v) })}
                      disabled={disabled}
                    />
                  </Cell>
                  <Cell align="right">
                    <AccountsMoneyInput
                      className={cn(INPUT_CLASS, "text-right tabular-nums")}
                      value={String(totals.basicAmount || "")}
                      onChange={(v) => {
                        const base = toNum(String(v));
                        const q = Math.max(toNum(line.quantity), 1);
                        updateLine(line.key, {
                          rate: String(Math.round((base / q) * 100) / 100),
                        });
                      }}
                      disabled={disabled}
                    />
                  </Cell>
                  <Cell align="center" className="cn-switch-cell">
                    <Switch
                      id={`dn-gst-${line.key}`}
                      checked={line.gst_applicable}
                      onCheckedChange={(v) => updateLine(line.key, { gst_applicable: v })}
                      disabled={disabled}
                      className="shrink-0"
                    />
                  </Cell>
                  {gstOn ? (
                    <>
                      <Cell align="right">
                        {line.gst_applicable ? (
                          <Input
                            className={cn(INPUT_CLASS, "text-right tabular-nums w-16 ml-auto")}
                            value={line.gst_rate}
                            onChange={(e) => updateLine(line.key, { gst_rate: e.target.value })}
                            disabled={disabled}
                          />
                        ) : (
                          <InvoiceTableReadonly value="—" muted />
                        )}
                      </Cell>
                      {interstate ? (
                        <ReadCell
                          align="right"
                          value={formatMoney(line.gst_applicable ? totals.igst : 0)}
                          muted
                        />
                      ) : (
                        <>
                          <ReadCell
                            align="right"
                            value={formatMoney(line.gst_applicable ? totals.cgst : 0)}
                            muted
                          />
                          <ReadCell
                            align="right"
                            value={formatMoney(line.gst_applicable ? totals.sgst : 0)}
                            muted
                          />
                        </>
                      )}
                    </>
                  ) : null}
                  <ReadCell align="right" value={formatMoney(totals.lineTotal)} strong />
                  {allowAddRemove && !disabled ? (
                    <Cell align="center">
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-40"
                        disabled={lines.length <= 1}
                        onClick={() => removeLine(line.key)}
                        aria-label="Remove line"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Cell>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </VoucherFormSectionCard>
  );
}
