"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { CreditNoteLedgerSelect } from "./CreditNoteLedgerSelect";
import type { CreditNoteFormLine, DirectLineDraft, ParticularColumnKey } from "../credit-note-form-types";
import {
  columnLabel,
  computeDirectLinePreview,
  formatCnMoney,
  lineBatchNo,
  lineExpiry,
  lineLedgerName,
  lineProductName,
  lineQty,
  lineTaxable,
  particularsColumnsForSource,
  toNum,
} from "../credit-note-form-utils";

function Cell({
  children,
  align,
}: {
  children: ReactNode;
  align?: "right" | "center" | "left";
}) {
  return (
    <td
      className={
        align === "right"
          ? "px-2 py-1 text-right tabular-nums"
          : align === "center"
            ? "px-2 py-1 text-center"
            : "px-2 py-1"
      }
    >
      {children}
    </td>
  );
}

function ReadCell({ value, align }: { value: ReactNode; align?: "right" | "center" | "left" }) {
  return (
    <Cell align={align}>
      <div
        className={
          align === "left" || !align
            ? "cdn-cell-value cdn-cell-value--left"
            : "cdn-cell-value"
        }
      >
        {value}
      </div>
    </Cell>
  );
}

export function CreditNoteParticularsEditor({
  sourceType,
  interstate,
  editable,
  directLines,
  pendingLines,
  onDirectLinesChange,
}: {
  sourceType: string;
  interstate: boolean;
  editable: boolean;
  directLines: DirectLineDraft[];
  pendingLines: CreditNoteFormLine[];
  onDirectLinesChange: (lines: DirectLineDraft[]) => void;
}) {
  const isDirect = sourceType === "DIRECT" || sourceType === "SALES_INVOICE";
  const gstOn = isDirect
    ? directLines.some((l) => l.gst_applicable)
    : pendingLines.some((l) => toNum(l.gst_amount) > 0);
  const columns = particularsColumnsForSource(sourceType, {
    gstOn,
    interstate,
    editable: editable && isDirect,
  });

  const updateLine = (key: string, patch: Partial<DirectLineDraft>) => {
    onDirectLinesChange(directLines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    const last = directLines[directLines.length - 1];
    onDirectLinesChange([
      ...directLines,
      {
        key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description: "",
        ledger_id: last?.ledger_id || "",
        ledger_name: last?.ledger_name || "",
        quantity: "1",
        rate: "",
        taxable_amount: "",
        gst_applicable: last?.gst_applicable ?? false,
        gst_rate: last?.gst_rate || "18",
      },
    ]);
  };

  const removeLine = (key: string) => {
    if (directLines.length <= 1) return;
    onDirectLinesChange(directLines.filter((l) => l.key !== key));
  };

  const renderDirectCell = (col: ParticularColumnKey, line: DirectLineDraft) => {
    const preview = computeDirectLinePreview(line, interstate);
    switch (col) {
      case "particular":
        return (
          <Cell key={col}>
            <Input
              className="h-7 text-xs border border-border"
              value={line.description}
              onChange={(e) => updateLine(line.key, { description: e.target.value })}
              placeholder="Particular…"
              disabled={!editable}
            />
          </Cell>
        );
      case "ledger":
        return (
          <Cell key={col}>
            <CreditNoteLedgerSelect
              value={line.ledger_id}
              fallbackLabel={line.ledger_name}
              disabled={!editable}
              onChange={(id, name) => updateLine(line.key, { ledger_id: id, ledger_name: name })}
            />
          </Cell>
        );
      case "qty":
        return (
          <Cell key={col} align="right">
            <Input
              className="h-7 text-xs text-right border border-border"
              value={line.quantity}
              onChange={(e) => {
                const quantity = e.target.value;
                const taxable =
                  toNum(quantity) > 0 && toNum(line.rate) > 0
                    ? String(Math.round(toNum(quantity) * toNum(line.rate) * 100) / 100)
                    : line.taxable_amount;
                updateLine(line.key, { quantity, taxable_amount: taxable });
              }}
              disabled={!editable}
            />
          </Cell>
        );
      case "rate_benefit":
        return (
          <Cell key={col} align="right">
            <AccountsMoneyInput
              className="h-7 text-xs border border-border"
              value={line.rate}
              onChange={(v) => {
                const rate = String(v);
                const taxable =
                  toNum(line.quantity) > 0 && toNum(rate) > 0
                    ? String(Math.round(toNum(line.quantity) * toNum(rate) * 100) / 100)
                    : line.taxable_amount;
                updateLine(line.key, { rate, taxable_amount: taxable });
              }}
              disabled={!editable}
            />
          </Cell>
        );
      case "eligible_base":
        return (
          <Cell key={col} align="right">
            <AccountsMoneyInput
              className="h-7 text-xs border border-border"
              value={line.taxable_amount || preview.basicAmount}
              onChange={(v) => updateLine(line.key, { taxable_amount: String(v), rate: toNum(line.quantity) > 0 ? String(Math.round((toNum(v) / Math.max(toNum(line.quantity), 1)) * 100) / 100) : line.rate })}
              disabled={!editable}
            />
          </Cell>
        );
      case "gst_toggle":
        return (
          <Cell key={col} align="center">
            <Switch
              checked={line.gst_applicable}
              onCheckedChange={(v) => updateLine(line.key, { gst_applicable: v })}
              disabled={!editable}
            />
          </Cell>
        );
      case "gst_rate":
        return (
          <Cell key={col} align="right">
            <Input
              className="h-7 text-xs text-right w-16 ml-auto"
              value={line.gst_rate}
              onChange={(e) => updateLine(line.key, { gst_rate: e.target.value })}
              disabled={!editable || !line.gst_applicable}
            />
          </Cell>
        );
      case "cgst":
        return <ReadCell key={col} align="right" value={formatCnMoney(preview.cgst)} />;
      case "sgst":
        return <ReadCell key={col} align="right" value={formatCnMoney(preview.sgst)} />;
      case "igst":
        return <ReadCell key={col} align="right" value={formatCnMoney(preview.igst)} />;
      case "cn_amount":
        return <ReadCell key={col} align="right" value={formatCnMoney(preview.lineTotal)} />;
      case "actions":
        return (
          <Cell key={col} align="center">
            <button
              type="button"
              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-40"
              onClick={() => removeLine(line.key)}
              disabled={!editable || directLines.length <= 1}
              aria-label="Remove line"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Cell>
        );
      default:
        return <ReadCell key={col} value="—" />;
    }
  };

  const renderPendingCell = (col: ParticularColumnKey, line: CreditNoteFormLine) => {
    const rate =
      line.discount_type === "Percentage"
        ? `${toNum(line.discount_value)}%`
        : line.discount_value != null
          ? formatCnMoney(line.discount_value)
          : toNum(line.quantity ?? line.eligible_quantity) > 0 && lineTaxable(line) > 0
            ? formatCnMoney(lineTaxable(line) / Math.max(lineQty(line), 1))
            : "—";
    switch (col) {
      case "particular":
        return <ReadCell key={col} value={line.description || "—"} />;
      case "product":
        return <ReadCell key={col} value={lineProductName(line)} />;
      case "batch":
        return <ReadCell key={col} value={lineBatchNo(line)} />;
      case "expiry":
        return <ReadCell key={col} value={lineExpiry(line)} />;
      case "qty":
        return <ReadCell key={col} align="right" value={lineQty(line) || "—"} />;
      case "eligible_base":
        return <ReadCell key={col} align="right" value={formatCnMoney(line.eligible_base_amount ?? lineTaxable(line))} />;
      case "rate_benefit":
        return <ReadCell key={col} align="right" value={rate} />;
      case "ledger":
        return <ReadCell key={col} value={lineLedgerName(line)} />;
      case "gst":
        return <ReadCell key={col} align="right" value={formatCnMoney(line.gst_amount)} />;
      case "cn_amount":
        return <ReadCell key={col} align="right" value={formatCnMoney(line.line_total)} />;
      default:
        return null;
    }
  };

  return (
    <VoucherFormSectionCard
      title="Particulars"
      flush
      compact
      headerActions={
        isDirect && editable ? (
          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={addLine}>
            <Plus className="w-3 h-3" /> Add Line
          </Button>
        ) : null
      }
    >
      <div className="cnz-table-wrap">
        <table className="cnz-table accounts-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className={
                    col === "qty" ||
                    col === "eligible_base" ||
                    col === "rate_benefit" ||
                    col === "gst" ||
                    col === "gst_rate" ||
                    col === "cgst" ||
                    col === "sgst" ||
                    col === "igst" ||
                    col === "cn_amount"
                      ? "text-right"
                      : col === "gst_toggle" || col === "actions"
                        ? "text-center"
                        : "text-left"
                  }
                >
                  {columnLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isDirect
              ? directLines.map((line) => (
                  <tr key={line.key}>{columns.map((col) => renderDirectCell(col, line))}</tr>
                ))
              : pendingLines.length
                ? pendingLines.map((line, idx) => (
                    <tr key={line.credit_note_line_id || line.pending_credit_note_line_id || String(idx)}>
                      {columns.map((col) => renderPendingCell(col, line))}
                    </tr>
                  ))
                : (
                    <tr>
                      <td colSpan={columns.length} className="cnz-empty">
                        Entitlement lines will appear when a Pending Credit Note is loaded.
                      </td>
                    </tr>
                  )}
          </tbody>
        </table>
      </div>
    </VoucherFormSectionCard>
  );
}
