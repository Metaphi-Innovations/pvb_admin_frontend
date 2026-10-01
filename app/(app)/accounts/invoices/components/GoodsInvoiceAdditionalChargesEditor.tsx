/**
 * Goods Sales Invoice Additional Charges editor.
 * Uses Sales Invoice Charge Master (recovery Income ledgers).
 * Not used by Service Invoice — keep Service on InvoiceAdditionalExpensesEditor.
 */

"use client";

import { memo, useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Check, ChevronsUpDown, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import {
  calcAdditionalExpenseRow,
  createEmptyAdditionalExpense,
  type InvoiceAdditionalExpense,
  type InvoiceExpenseHead,
} from "../invoice-additional-expenses";
import { formatINR } from "../invoice-utils";
import {
  loadSalesInvoiceChargeMaster,
  type ResolvedSalesInvoiceCharge,
} from "@/lib/accounts/sales-invoice-charge-master";

const NUM_INPUT_CLASS =
  "h-8 text-xs tabular-nums text-right w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function ChargeSelect({
  row,
  options,
  disabled,
  onSelect,
}: {
  row: InvoiceAdditionalExpense;
  options: ResolvedSalesInvoiceCharge[];
  disabled?: boolean;
  onSelect: (charge: ResolvedSalesInvoiceCharge) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = options.find((o) => o.chargeId === row.chargeMasterId);
  const label = selected?.chargeName || row.expenseHead || "Select additional charge…";

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter(
      (o) =>
        o.chargeName.toLowerCase().includes(s) ||
        o.chargeCode.toLowerCase().includes(s) ||
        o.ledgerName.toLowerCase().includes(s) ||
        o.ledgerCode.toLowerCase().includes(s),
    );
  }, [options, q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={label}
          className={cn(
            "w-full h-8 px-2 text-xs text-left border border-border rounded-lg bg-background",
            "flex items-center justify-between gap-1 hover:bg-muted/30 transition-colors",
            disabled && "opacity-60 pointer-events-none",
          )}
        >
          <span className="truncate flex-1">{label}</span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] p-0 so-charge-popover">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search charge, code, ledger…"
              className="w-full pl-8 pr-3 py-1.5 text-xs focus:outline-none bg-transparent"
            />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">No charges match.</p>
          ) : (
            filtered.map((opt) => {
              const active = row.chargeMasterId === opt.chargeId;
              return (
                <button
                  key={opt.chargeId}
                  type="button"
                  onClick={() => {
                    onSelect(opt);
                    setOpen(false);
                    setQ("");
                  }}
                  className={cn(
                    "w-full flex items-start gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60 transition-colors",
                    active && "bg-brand-50",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{opt.chargeName}</p>
                    <p
                      className="text-[10px] text-muted-foreground mt-0.5 truncate"
                      title={`Ledger: ${opt.ledgerName} — ${opt.ledgerCode}`}
                    >
                      Ledger: {opt.ledgerName} — {opt.ledgerCode}
                    </p>
                  </div>
                  {active ? <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 mt-0.5" /> : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const ChargeRow = memo(function ChargeRow({
  row,
  options,
  disabled,
  interstate,
  onUpdate,
  onRemove,
}: {
  row: InvoiceAdditionalExpense;
  options: ResolvedSalesInvoiceCharge[];
  disabled?: boolean;
  interstate: boolean;
  onUpdate: (id: string, patch: Partial<InvoiceAdditionalExpense>) => void;
  onRemove: (id: string) => void;
}) {
  const calc = calcAdditionalExpenseRow(row, interstate);
  const fromSalesOrder = row.origin === "sales_order";
  const mapped = Boolean(row.coaLedgerId && row.coaLedgerCode);

  return (
    <tr className="border-b border-border/40 last:border-b-0">
      <td className="px-1.5 py-1.5 align-middle so-charge-col">
        <ChargeSelect
          row={row}
          options={options}
          disabled={disabled || fromSalesOrder}
          onSelect={(opt) =>
            onUpdate(row.id, {
              expenseHead: opt.chargeName as InvoiceExpenseHead,
              chargeMasterId: opt.chargeId,
              chargeCode: opt.chargeCode,
              coaLedgerId: opt.ledgerId,
              coaLedgerName: opt.ledgerName,
              coaLedgerCode: opt.ledgerCode,
              gstApplicable: opt.gstApplicable,
              gstPct: opt.gstApplicable ? opt.gstRate : 0,
            })
          }
        />
        {mapped ? (
          <p
            className="so-product-meta mt-0.5 truncate"
            title={`Ledger: ${row.coaLedgerName} — ${row.coaLedgerCode}`}
          >
            Ledger: {row.coaLedgerName} — {row.coaLedgerCode}
          </p>
        ) : fromSalesOrder ? (
          <p className="so-product-meta mt-0.5">From Sales Order</p>
        ) : null}
      </td>
      <td className="px-1.5 py-1.5 align-middle w-[100px]">
        <AccountsMoneyInput
          className={NUM_INPUT_CLASS}
          value={row.amount || ""}
          disabled={disabled}
          onChange={(v) => onUpdate(row.id, { amount: v })}
        />
      </td>
      <td className="px-1.5 py-1.5 align-middle w-[72px]">
        <div className="flex items-center justify-center h-8">
          <Switch
            checked={row.gstApplicable}
            disabled={disabled}
            onCheckedChange={(gstApplicable) => onUpdate(row.id, { gstApplicable })}
          />
        </div>
      </td>
      <td className="px-1.5 py-1.5 align-middle w-[56px]">
        <Input
          type="number"
          min={0}
          max={100}
          step={0.01}
          disabled={disabled || !row.gstApplicable}
          className={cn(NUM_INPUT_CLASS, !row.gstApplicable && "bg-muted/25")}
          value={row.gstApplicable ? row.gstPct || "" : ""}
          onChange={(e) =>
            onUpdate(row.id, {
              gstPct: parseFloat(e.target.value) || 0,
            })
          }
        />
      </td>
      {interstate ? (
        <td className="px-1.5 py-1.5 align-middle w-[90px] text-right text-xs tabular-nums text-muted-foreground">
          {row.gstApplicable && calc.igst > 0 ? formatINR(calc.igst) : "—"}
        </td>
      ) : (
        <>
          <td className="px-1.5 py-1.5 align-middle w-[90px] text-right text-xs tabular-nums text-muted-foreground">
            {row.gstApplicable && calc.cgst > 0 ? formatINR(calc.cgst) : "—"}
          </td>
          <td className="px-1.5 py-1.5 align-middle w-[90px] text-right text-xs tabular-nums text-muted-foreground">
            {row.gstApplicable && calc.sgst > 0 ? formatINR(calc.sgst) : "—"}
          </td>
        </>
      )}
      <td className="px-1.5 py-1.5 align-middle w-[110px] text-right text-xs tabular-nums font-semibold">
        {calc.totalAmount > 0 ? formatINR(calc.totalAmount) : "—"}
      </td>
      <td className="px-1.5 py-1.5 align-middle w-[180px]">
        <Input
          className="h-8 text-xs"
          placeholder="Optional"
          disabled={disabled}
          value={row.remarks}
          onChange={(e) => onUpdate(row.id, { remarks: e.target.value })}
        />
      </td>
      <td className="px-1.5 py-1.5 align-middle w-9">
        {!disabled && !fromSalesOrder && (
          <button
            type="button"
            onClick={() => onRemove(row.id)}
            className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
            aria-label="Remove charge row"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
});

function GoodsInvoiceAdditionalChargesEditorInner({
  expenses,
  onChange,
  disabled,
  interstate = false,
}: {
  expenses: InvoiceAdditionalExpense[];
  onChange: Dispatch<SetStateAction<InvoiceAdditionalExpense[]>>;
  disabled?: boolean;
  interstate?: boolean;
}) {
  const [options, setOptions] = useState<ResolvedSalesInvoiceCharge[]>([]);

  useEffect(() => {
    setOptions(
      loadSalesInvoiceChargeMaster().filter(
        (c) =>
          c.status === "active" &&
          c.isMapped &&
          Boolean(c.ledgerId) &&
          Boolean(c.ledgerName?.trim()) &&
          Boolean(c.ledgerCode?.trim()),
      ),
    );
  }, []);

  const headers = interstate
    ? (["Additional Charge", "Amount", "GST", "GST %", "IGST", "Total Amount", "Remarks", ""] as const)
    : (["Additional Charge", "Amount", "GST", "GST %", "CGST", "SGST", "Total Amount", "Remarks", ""] as const);

  const rightAlign = new Set(["Amount", "GST %", "CGST", "SGST", "IGST", "Total Amount"]);

  const update = useCallback(
    (id: string, patch: Partial<InvoiceAdditionalExpense>) => {
      onChange((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;
          const next = { ...row, ...patch };
          if (patch.gstApplicable === false) next.gstPct = 0;
          else if (patch.gstApplicable === true && next.gstPct <= 0) next.gstPct = 18;
          return next;
        }),
      );
    },
    [onChange],
  );

  const addRow = useCallback(() => {
    onChange((prev) => [...prev, createEmptyAdditionalExpense("manual")]);
  }, [onChange]);

  const removeRow = useCallback(
    (id: string) => {
      onChange((prev) => {
        const target = prev.find((r) => r.id === id);
        if (target?.origin === "sales_order") return prev;
        const next = prev.filter((r) => r.id !== id);
        return next.length ? next : [createEmptyAdditionalExpense("manual")];
      });
    },
    [onChange],
  );

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-border/60 rounded-lg bg-white">
        <table className="w-full text-xs table-fixed min-w-[860px]">
          <thead className="border-b border-border/60 bg-muted/20">
            <tr>
              {headers.map((h) => (
                <th
                  key={h || "actions"}
                  className={cn(
                    "px-1.5 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                    rightAlign.has(h) && "text-right",
                    h === "GST" && "text-center",
                    h === "Additional Charge" && "so-charge-col",
                  )}
                >
                  {h === "GST" ? "GST Applicable" : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="py-6 text-center text-xs text-muted-foreground">
                  No additional charges. Click &quot;+ Add Charge&quot; to add.
                </td>
              </tr>
            ) : (
              expenses.map((row) => (
                <ChargeRow
                  key={row.id}
                  row={row}
                  options={options}
                  disabled={disabled}
                  interstate={interstate}
                  onUpdate={update}
                  onRemove={removeRow}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {!disabled && (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium gap-1.5"
            onClick={addRow}
          >
            <Plus className="w-3.5 h-3.5" /> Add Charge
          </Button>
        </div>
      )}
    </div>
  );
}

export const GoodsInvoiceAdditionalChargesEditor = memo(GoodsInvoiceAdditionalChargesEditorInner);

/** Validate Goods charge rows before Generate Invoice. */
export function validateGoodsAdditionalCharges(
  expenses: InvoiceAdditionalExpense[],
): string | null {
  for (const row of expenses) {
    const hasCharge = Boolean(row.chargeMasterId || row.expenseHead?.trim());
    const hasAmount = row.amount > 0;
    if (!hasCharge && !hasAmount) continue;

    if (!row.chargeMasterId && !row.expenseHead?.trim()) {
      return "Select an Additional Charge for every charge row with an amount.";
    }
    if (!row.coaLedgerId || !row.coaLedgerCode?.trim()) {
      return `Select a mapped Additional Charge for "${row.expenseHead || "this row"}".`;
    }
    if (hasAmount && row.amount <= 0) {
      return `Enter a valid amount for "${row.expenseHead}".`;
    }
    if (row.gstApplicable && !(row.gstPct > 0)) {
      return `GST % is required when GST Applicable is Yes for "${row.expenseHead}".`;
    }
  }
  return null;
}

/** Enrich SO-prefetched / name-only rows from Charge Master (Goods). */
export function enrichExpensesFromChargeMaster(
  expenses: InvoiceAdditionalExpense[],
): InvoiceAdditionalExpense[] {
  const options = loadSalesInvoiceChargeMaster();
  return expenses.map((row) => {
    if (row.coaLedgerId && row.coaLedgerCode) return row;
    const byId = row.chargeMasterId
      ? options.find((o) => o.chargeId === row.chargeMasterId)
      : undefined;
    const byName = row.expenseHead
      ? options.find(
          (o) => o.chargeName.toLowerCase() === row.expenseHead!.toLowerCase(),
        )
      : undefined;
    const hit = byId ?? byName;
    if (!hit) return row;
    return {
      ...row,
      expenseHead: hit.chargeName as InvoiceExpenseHead,
      chargeMasterId: hit.chargeId,
      chargeCode: hit.chargeCode,
      coaLedgerId: hit.ledgerId,
      coaLedgerName: hit.ledgerName,
      coaLedgerCode: hit.ledgerCode,
      gstApplicable: row.gstApplicable || hit.gstApplicable,
      gstPct: row.gstApplicable || hit.gstApplicable ? row.gstPct || hit.gstRate : 0,
    };
  });
}
