/**
 * Shared Additional Charges editor for Sales / Service / Purchase invoices.
 * Particular (free text) + Income/Expense ledger + HSN Master — no Additional Charge Master selector.
 */

"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { GenericLedgerHierarchySelect } from "@/components/accounts/GenericLedgerHierarchySelect";
import { SearchableSelect } from "@/app/(app)/accounts/credit-notes/components/SearchableSelect";
import { useHsnDropdown } from "@/hooks/masters/use-hsn";
import {
  calcAdditionalExpenseRow,
  createEmptyAdditionalExpense,
  type InvoiceAdditionalExpense,
} from "../invoice-additional-expenses";
import { formatINR } from "../invoice-utils";

const NUM_INPUT_CLASS =
  "h-8 text-xs tabular-nums text-right w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const CHARGE_LEDGER_HEADS = ["INC", "EXP"] as const;

function ChargeTableReadonly({
  value,
  muted,
  strong,
}: {
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "so-table-ro so-table-ro--right",
        muted && "so-table-ro--muted",
        strong && "so-table-ro--strong",
      )}
    >
      {value}
    </div>
  );
}

function ledgerSelectValue(ledgerId: string | number | null | undefined): string | null {
  if (typeof ledgerId === "string" && ledgerId.trim()) return ledgerId.trim();
  if (typeof ledgerId === "number" && Number.isFinite(ledgerId)) return String(ledgerId);
  return null;
}

const ChargeRow = memo(function ChargeRow({
  row,
  hsnOptions,
  disabled,
  interstate,
  onUpdate,
  onRemove,
  tableVariant = "default",
}: {
  row: InvoiceAdditionalExpense;
  hsnOptions: { value: string; label: string; selectedLabel?: string; sub?: string; gstPercentage: number; hsnCode: string }[];
  disabled?: boolean;
  interstate: boolean;
  onUpdate: (id: string, patch: Partial<InvoiceAdditionalExpense>) => void;
  onRemove: (id: string) => void;
  tableVariant?: "default" | "invoice";
}) {
  const calc = calcAdditionalExpenseRow(row, interstate);
  const invoiceTable = tableVariant === "invoice";
  const rowClass = invoiceTable
    ? "border-b border-border/40 last:border-0"
    : "border-b border-border/40 last:border-b-0";
  const cellClass = invoiceTable ? "p-1.5 align-middle" : "px-1.5 py-1.5 align-middle";

  const renderComputed = (value: string, opts?: { muted?: boolean; strong?: boolean }) => {
    if (invoiceTable) {
      return <ChargeTableReadonly value={value} muted={opts?.muted} strong={opts?.strong} />;
    }
    return (
      <span
        className={cn(
          "block text-right text-xs tabular-nums whitespace-nowrap",
          opts?.strong ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {value}
      </span>
    );
  };

  return (
    <tr className={rowClass}>
      <td className={cn(cellClass, "min-w-[180px] w-[200px]")}>
        <Input
          className="h-8 text-xs"
          placeholder="e.g. Freight"
          disabled={disabled}
          value={row.expenseHead}
          onChange={(e) => onUpdate(row.id, { expenseHead: e.target.value })}
        />
        {row.origin === "sales_order" || row.origin === "purchase_order" ? (
          <p className="so-product-meta mt-0.5">From {row.origin === "sales_order" ? "Sales Order" : "Purchase Order"}</p>
        ) : null}
      </td>
      <td className={cn(cellClass, "min-w-[240px] w-[260px]")}>
        <GenericLedgerHierarchySelect
          value={ledgerSelectValue(row.coaLedgerId)}
          fallbackLabel={
            row.coaLedgerName
              ? row.coaLedgerCode
                ? `${row.coaLedgerCode} · ${row.coaLedgerName}`
                : row.coaLedgerName
              : undefined
          }
          disabled={disabled}
          compact
          placeholder="Select ledger…"
          className="h-8 text-xs text-left"
          query={{ status: "ACTIVE", allowManualPosting: true }}
          allowedPrimaryHeadCodes={[...CHARGE_LEDGER_HEADS]}
          onChange={(ledger) =>
            onUpdate(row.id, {
              coaLedgerId: ledger.ledgerId,
              coaLedgerName: ledger.ledgerName,
              coaLedgerCode: ledger.ledgerCode,
            })
          }
        />
      </td>
      <td className={cn(cellClass, "min-w-[140px] w-[150px]")}>
        <SearchableSelect
          value={row.hsnId ?? ""}
          onChange={(id) => {
            const hit = hsnOptions.find((o) => o.value === id);
            onUpdate(row.id, {
              hsnId: id || null,
              hsnCode: hit?.hsnCode ?? null,
              ...(row.gstApplicable && hit
                ? { gstPct: hit.gstPercentage }
                : {}),
            });
          }}
          options={hsnOptions}
          placeholder="Select HSN…"
          disabled={disabled}
          contentClassName="w-[320px]"
          triggerClassName="h-8 px-2 text-xs rounded-lg"
        />
      </td>
      <td className={cn(cellClass, "min-w-[120px] w-[130px]")}>
        <AccountsMoneyInput
          className={NUM_INPUT_CLASS}
          value={row.amount || ""}
          disabled={disabled}
          onChange={(v) => onUpdate(row.id, { amount: v })}
        />
      </td>
      <td className={cn(cellClass, "min-w-[72px] w-[80px]")}>
        <div className="flex items-center justify-center h-8">
          <Switch
            checked={row.gstApplicable}
            disabled={disabled}
            onCheckedChange={(gstApplicable) => onUpdate(row.id, { gstApplicable })}
          />
        </div>
      </td>
      <td className={cn(cellClass, "min-w-[90px] w-[100px]")}>
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
        <td className={cn(cellClass, "min-w-[110px] w-[120px]")}>
          {renderComputed(
            row.gstApplicable && calc.igst > 0 ? formatINR(calc.igst) : "—",
            { muted: true },
          )}
        </td>
      ) : (
        <>
          <td className={cn(cellClass, "min-w-[110px] w-[120px]")}>
            {renderComputed(
              row.gstApplicable && calc.cgst > 0 ? formatINR(calc.cgst) : "—",
              { muted: true },
            )}
          </td>
          <td className={cn(cellClass, "min-w-[110px] w-[120px]")}>
            {renderComputed(
              row.gstApplicable && calc.sgst > 0 ? formatINR(calc.sgst) : "—",
              { muted: true },
            )}
          </td>
        </>
      )}
      <td className={cn(cellClass, "min-w-[120px] w-[130px]")}>
        {renderComputed(
          calc.totalAmount > 0 ? formatINR(calc.totalAmount) : "—",
          { strong: calc.totalAmount > 0, muted: calc.totalAmount <= 0 },
        )}
      </td>
      <td className={cn(cellClass, "min-w-[160px] w-[180px]")}>
        <Input
          className="h-8 text-xs"
          placeholder="Optional"
          disabled={disabled}
          value={row.remarks}
          onChange={(e) => onUpdate(row.id, { remarks: e.target.value })}
        />
      </td>
      {!disabled ? (
        <td className={cn(cellClass, "so-col-actions w-9")}>
          <button
            type="button"
            onClick={() => onRemove(row.id)}
            className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
            aria-label="Remove charge row"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      ) : null}
    </tr>
  );
});

function GoodsInvoiceAdditionalChargesEditorInner({
  expenses,
  onChange,
  disabled,
  interstate = false,
  tableVariant = "default",
  hideAddButton = false,
  onBindAddRow,
}: {
  expenses: InvoiceAdditionalExpense[];
  onChange: Dispatch<SetStateAction<InvoiceAdditionalExpense[]>>;
  disabled?: boolean;
  interstate?: boolean;
  /** Match service-invoice line table chrome when embedded in voucher section cards. */
  tableVariant?: "default" | "invoice";
  hideAddButton?: boolean;
  onBindAddRow?: (addRow: () => void) => void;
}) {
  const { data: hsnDropdown = [], isLoading: hsnLoading } = useHsnDropdown();

  const hsnOptions = useMemo(
    () =>
      hsnDropdown.map((h) => ({
        value: h.id,
        label: `${h.hsnCode}${h.hsnDescription ? ` — ${h.hsnDescription}` : ""}`,
        selectedLabel: h.hsnCode,
        sub: h.codeType === "SAC" ? `SAC · GST ${h.gstPercentage}%` : `HSN · GST ${h.gstPercentage}%`,
        gstPercentage: h.gstPercentage,
        hsnCode: h.hsnCode,
      })),
    [hsnDropdown],
  );

  const gstHeaders = interstate ? (["IGST"] as const) : (["CGST", "SGST"] as const);
  const headers = (
    disabled
      ? ([
          "Particular",
          "Additional Charges Ledger",
          "HSN",
          "Amount",
          "GST",
          "GST %",
          ...gstHeaders,
          "Total Amount",
          "Remark",
        ] as const)
      : ([
          "Particular",
          "Additional Charges Ledger",
          "HSN",
          "Amount",
          "GST",
          "GST %",
          ...gstHeaders,
          "Total Amount",
          "Remark",
          "",
        ] as const)
  );

  const rightAlign = new Set(["Amount", "GST %", "CGST", "SGST", "IGST", "Total Amount"]);

  const colClassByHeader: Record<string, string> = {
    Particular: "min-w-[180px] w-[200px]",
    "Additional Charges Ledger": "min-w-[240px] w-[260px]",
    HSN: "min-w-[140px] w-[150px]",
    Amount: "min-w-[120px] w-[130px]",
    GST: "min-w-[72px] w-[80px]",
    "GST %": "min-w-[90px] w-[100px]",
    CGST: "min-w-[110px] w-[120px]",
    SGST: "min-w-[110px] w-[120px]",
    IGST: "min-w-[110px] w-[120px]",
    "Total Amount": "min-w-[120px] w-[130px]",
    Remark: "min-w-[160px] w-[180px]",
  };

  const update = useCallback(
    (id: string, patch: Partial<InvoiceAdditionalExpense>) => {
      onChange((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;
          const next = { ...row, ...patch };
          if (patch.gstApplicable === false) {
            next.gstPct = 0;
          } else if (patch.gstApplicable === true && next.gstPct <= 0) {
            const fromHsn = hsnOptions.find((o) => o.value === next.hsnId);
            next.gstPct = fromHsn?.gstPercentage || 0;
          }
          return next;
        }),
      );
    },
    [onChange, hsnOptions],
  );

  const addRow = useCallback(() => {
    onChange((prev) => [...prev, createEmptyAdditionalExpense("manual")]);
  }, [onChange]);

  useEffect(() => {
    onBindAddRow?.(addRow);
  }, [addRow, onBindAddRow]);

  const removeRow = useCallback(
    (id: string) => {
      onChange((prev) => {
        const next = prev.filter((r) => r.id !== id);
        return next.length ? next : [createEmptyAdditionalExpense("manual")];
      });
    },
    [onChange],
  );

  const invoiceTable = tableVariant === "invoice";
  const thClass = invoiceTable
    ? "px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap"
    : "px-1.5 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap";

  return (
    <div className={invoiceTable ? undefined : "space-y-2"}>
      <div
        className={cn(
          invoiceTable ? "so-invoice-charges-table-wrap w-full" : "so-goods-product-table-wrap",
          "overflow-x-auto",
        )}
      >
        <table
          className={cn(
            invoiceTable
              ? "so-invoice-table so-invoice-charges-table text-xs w-full"
              : "w-full text-xs",
            "min-w-[1480px]",
          )}
        >
          <thead className={invoiceTable ? undefined : "border-b border-border/60 bg-muted/20"}>
            <tr>
              {headers.map((h) => (
                <th
                  key={h || "actions"}
                  className={cn(
                    thClass,
                    colClassByHeader[h],
                    rightAlign.has(h) && "text-right",
                    h === "GST" && "text-center",
                    !h && "so-col-actions",
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
                  {hsnLoading
                    ? "Loading…"
                    : 'No additional charges. Click "+ Add Charge" to add.'}
                </td>
              </tr>
            ) : (
              expenses.map((row) => (
                <ChargeRow
                  key={row.id}
                  row={row}
                  hsnOptions={hsnOptions}
                  disabled={disabled}
                  interstate={interstate}
                  onUpdate={update}
                  onRemove={removeRow}
                  tableVariant={tableVariant}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {!disabled && !hideAddButton && (
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

/** Validate Additional Charge rows before Generate / Create / Post. */
export function validateGoodsAdditionalCharges(
  expenses: InvoiceAdditionalExpense[],
): string | null {
  for (const row of expenses) {
    const particular = (row.expenseHead || "").trim();
    const hasLedger = Boolean(
      row.coaLedgerId != null && String(row.coaLedgerId).trim(),
    );
    const hasHsn = Boolean(row.hsnId?.trim());
    const hasAmount = row.amount > 0;
    const hasContent = Boolean(particular) || hasLedger || hasHsn || hasAmount;
    if (!hasContent) continue;

    if (!particular) {
      return "Enter Particular for every Additional Charge row.";
    }
    if (!hasLedger) {
      return `Select Additional Charges Ledger for "${particular}".`;
    }
    if (!hasHsn) {
      return `Select HSN for "${particular}".`;
    }
    if (!(row.amount > 0)) {
      return `Enter a valid amount for "${particular}".`;
    }
    if (row.gstApplicable && !(row.gstPct > 0)) {
      return `GST % is required when GST Applicable is Yes for "${particular}".`;
    }
  }
  return null;
}

/**
 * @deprecated Legacy master enrichment — ledger must not auto-fill from Additional Charge Master.
 * Kept as a no-op identity for call-site compatibility.
 */
export function enrichExpensesFromChargeMaster(
  expenses: InvoiceAdditionalExpense[],
  _options?: unknown[],
): InvoiceAdditionalExpense[] {
  return expenses;
}
