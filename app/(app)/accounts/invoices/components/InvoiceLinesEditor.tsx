"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, Check, ChevronsUpDown, Trash2 } from "lucide-react";
import {
  applyProductToInvoiceLine,
  calcGstLineSplit,
  createEmptyLine,
  recalculateLineItem,
  type InvoiceLineItem,
  type InvoiceProductOption,
} from "../invoices-data";
import { formatINR } from "../invoice-utils";
import {
  INVOICE_FORM_INPUT_CLASS,
  INVOICE_FORM_TABLE_TD_CLASS,
  INVOICE_FORM_TABLE_TH_CLASS,
} from "@/app/(app)/accounts/components/InvoiceFormLayout";

const CELL_CLASS = cn(INVOICE_FORM_TABLE_TD_CLASS, "align-top");
const NUM_INPUT_CLASS = cn(
  INVOICE_FORM_INPUT_CLASS,
  "w-full tabular-nums text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
);

const RIGHT_ALIGNED_HEADERS = new Set([
  "Quantity",
  "Rate",
  "Discount %",
  "Amount",
  "GST %",
  "CGST",
  "SGST",
  "IGST",
]);

type LineColumn = {
  key: string;
  label: string;
  width: string;
  align?: "left" | "right" | "center";
};

function getColumns(interstate: boolean): LineColumn[] {
  const base: LineColumn[] = [
    { key: "item", label: "Item Details", width: "24%" },
    { key: "hsn", label: "HSN/SAC", width: "8%" },
    { key: "qty", label: "Quantity", width: "7%", align: "right" },
    { key: "unit", label: "Unit", width: "6%", align: "center" },
    { key: "rate", label: "Rate", width: "9%", align: "right" },
    { key: "discount", label: "Discount %", width: "8%", align: "right" },
    { key: "amount", label: "Amount", width: "9%", align: "right" },
    { key: "gst", label: "GST %", width: "7%", align: "right" },
  ];

  if (interstate) {
    return [...base, { key: "igst", label: "IGST", width: "9%", align: "right" }, { key: "actions", label: "", width: "44px" }];
  }

  return [
    ...base,
    { key: "cgst", label: "CGST", width: "8%", align: "right" },
    { key: "sgst", label: "SGST", width: "8%", align: "right" },
    { key: "actions", label: "", width: "44px" },
  ];
}

function ProductSelect({
  products,
  value,
  onSelect,
  disabled,
}: {
  products: InvoiceProductOption[];
  value: number | null;
  onSelect: (p: InvoiceProductOption) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = products.find((p) => p.id === value);
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={open && !disabled} onOpenChange={(v) => { if (!disabled) setOpen(v); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full h-9 px-2.5 text-sm text-left border border-slate-200 rounded-md bg-white flex items-center justify-between",
            disabled && "opacity-70 cursor-default bg-muted/20",
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? `${selected.code} — ${selected.name}` : "Type or click to select an item…"}
          </span>
          <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm pl-8"
            />
          </div>
        </div>
        <div className="max-h-[220px] overflow-y-auto py-1">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p);
                setOpen(false);
                setSearch("");
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-2 text-sm text-left hover:bg-muted/60",
                value === p.id && "bg-brand-50",
              )}
            >
              <span className="font-mono text-brand-700 shrink-0">{p.code}</span>
              <span className="flex-1 truncate">{p.name}</span>
              {value === p.id && <Check className="w-4 h-4 text-brand-600" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function InvoiceLinesEditor({
  lines,
  products,
  onChange,
  interstate = false,
  hideMasterHint = false,
  manualEntry = true,
}: {
  lines: InvoiceLineItem[];
  products: InvoiceProductOption[];
  onChange: (lines: InvoiceLineItem[]) => void;
  interstate?: boolean;
  hideMasterHint?: boolean;
  /** When false (dispatch-sourced invoice), lines are read-only. */
  manualEntry?: boolean;
}) {
  const columns = getColumns(interstate);

  const update = (id: string, patch: Partial<InvoiceLineItem>) => {
    onChange(
      lines.map((line) => {
        if (line.id !== id) return line;
        let next = { ...line, ...patch };
        if (patch.productId != null) {
          const product = products.find((p) => p.id === patch.productId);
          if (product) next = applyProductToInvoiceLine(next, product);
        } else {
          next = recalculateLineItem(next);
        }
        return next;
      }),
    );
  };

  const addRow = () => onChange([...lines, createEmptyLine()]);
  const removeRow = (id: string) => onChange(lines.filter((l) => l.id !== id));

  const renderCell = (column: LineColumn, line: InvoiceLineItem) => {
    const split = calcGstLineSplit(line, interstate);

    switch (column.key) {
      case "item":
        return (
          <div className="min-w-0 space-y-1.5">
            <ProductSelect
              products={products}
              value={line.productId}
              onSelect={(p) => update(line.id, { productId: p.id })}
              disabled={!manualEntry}
            />
            {!line.productId && manualEntry && (
              <Input
                className="h-8 text-sm w-full"
                placeholder="Or enter item name"
                value={line.productName}
                onChange={(e) => update(line.id, { productName: e.target.value })}
              />
            )}
          </div>
        );
      case "hsn":
        return (
          <Input
            className="h-8 text-sm font-mono w-full bg-muted/20"
            placeholder="HSN"
            value={line.hsn ?? ""}
            readOnly={!manualEntry || !!line.productId}
            onChange={(e) => update(line.id, { hsn: e.target.value })}
          />
        );
      case "qty":
        return (
          <Input
            type="number"
            min={0}
            className={cn(NUM_INPUT_CLASS, !manualEntry && "bg-muted/20")}
            value={line.qty || ""}
            readOnly={!manualEntry}
            onChange={(e) => update(line.id, { qty: parseFloat(e.target.value) || 0 })}
          />
        );
      case "unit":
        return (
          <Input
            className="h-8 text-sm text-center w-full bg-muted/20"
            value={line.unit}
            readOnly={!manualEntry || !!line.productId}
            onChange={(e) => update(line.id, { unit: e.target.value })}
          />
        );
      case "rate":
        return (
          <AccountsMoneyInput
            compact={false}
            className={cn(NUM_INPUT_CLASS, !manualEntry && "bg-muted/20")}
            value={line.unitPrice || ""}
            disabled={!manualEntry}
            onChange={(v) => update(line.id, { unitPrice: v })}
          />
        );
      case "discount":
        return (
          <Input
            type="number"
            min={0}
            max={100}
            className={cn(NUM_INPUT_CLASS, !manualEntry && "bg-muted/20")}
            value={line.discountPct || ""}
            readOnly={!manualEntry}
            onChange={(e) => update(line.id, { discountPct: parseFloat(e.target.value) || 0 })}
          />
        );
      case "amount":
        return (
          <span className="block tabular-nums text-right font-medium whitespace-nowrap text-sm">
            {formatINR(split.taxable)}
          </span>
        );
      case "gst":
        return (
          <Input
            type="number"
            min={0}
            className={cn(NUM_INPUT_CLASS, "bg-muted/20")}
            value={line.taxPct || ""}
            readOnly={!manualEntry || !!line.productId}
            onChange={(e) => update(line.id, { taxPct: parseFloat(e.target.value) || 0 })}
          />
        );
      case "cgst":
        return (
          <span className="block tabular-nums text-right text-muted-foreground whitespace-nowrap text-sm">
            {split.cgst > 0 ? formatINR(split.cgst) : "—"}
          </span>
        );
      case "sgst":
        return (
          <span className="block tabular-nums text-right text-muted-foreground whitespace-nowrap text-sm">
            {split.sgst > 0 ? formatINR(split.sgst) : "—"}
          </span>
        );
      case "igst":
        return (
          <span className="block tabular-nums text-right text-muted-foreground whitespace-nowrap text-sm">
            {split.igst > 0 ? formatINR(split.igst) : "—"}
          </span>
        );
      case "actions":
        return manualEntry ? (
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-red-600 mx-auto"
            onClick={() => removeRow(line.id)}
            aria-label="Remove line"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        {!hideMasterHint ? (
          <span className="text-xs text-muted-foreground">Products from Product Master</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {manualEntry ? "Add products for manual invoice." : "Line items from selected dispatch."}
          </span>
        )}
        {manualEntry && (
          <Button type="button" variant="outline" size="sm" className="h-9 text-[13px] font-medium gap-1.5" onClick={addRow}>
            <Plus className="w-4 h-4" /> Add New Row
          </Button>
        )}
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full min-w-[1180px] table-fixed border-collapse">
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={{ width: col.width }} />
            ))}
          </colgroup>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    INVOICE_FORM_TABLE_TH_CLASS,
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    RIGHT_ALIGNED_HEADERS.has(col.label) && !col.align && "text-right",
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-10 text-center text-sm text-slate-500">
                  Add at least one product or service line.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.id} className="border-b border-slate-100 last:border-b-0">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        CELL_CLASS,
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.key === "actions" && "px-1",
                      )}
                    >
                      {renderCell(col, line)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
