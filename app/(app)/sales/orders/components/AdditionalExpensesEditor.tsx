"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { IndianRupeeInput } from "@/components/ui/IndianRupeeInput";
import { cn } from "@/lib/utils";
import {
  createEmptyExpense,
  EXPENSE_DISCOUNT_TYPE_OPTIONS,
  recalculateExpense,
  type ExpenseDiscountType,
  type SalesOrderAdditionalExpense,
} from "../orders-data";

const EXPENSE_PRESETS = [
  "Freight",
  "Loading",
  "Unloading",
  "Transportation",
  "Insurance",
  "Packing",
  "Other",
].map((e) => ({ value: e, label: e }));

const inputCls = "h-7 text-xs rounded-lg";

export default function AdditionalExpensesEditor({
  expenses,
  onChange,
}: {
  expenses: SalesOrderAdditionalExpense[];
  onChange: (expenses: SalesOrderAdditionalExpense[]) => void;
}) {
  const update = (id: string, patch: Partial<SalesOrderAdditionalExpense>) => {
    onChange(
      expenses.map((row) => {
        if (row.id !== id) return row;
        return recalculateExpense({ ...row, ...patch });
      }),
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Additional Expenses
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => onChange([...expenses, createEmptyExpense()])}
        >
          <Plus className="w-3 h-3" /> Add Expense
        </Button>
      </div>

      {expenses.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-4 text-center">
          <p className="text-xs text-muted-foreground">No additional expenses</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["Expense Name", "Amount", "Discount Type", "Discount Value", "Net", ""].map((h) => (
                    <th
                      key={h || "act"}
                      className="px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 hover:bg-muted/10">
                    <td className="px-2 py-1.5 min-w-[140px]">
                      <AutocompleteSelect
                        options={EXPENSE_PRESETS}
                        value={row.expenseName}
                        onChange={(v) => update(row.id, { expenseName: String(v) })}
                        placeholder="Expense name"
                        className={inputCls}
                      />
                    </td>
                    <td className="px-2 py-1.5 w-32">
                      <IndianRupeeInput
                        value={row.amount}
                        onChange={(n) => update(row.id, { amount: n })}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-2 py-1.5 w-36">
                      <AutocompleteSelect
                        options={EXPENSE_DISCOUNT_TYPE_OPTIONS}
                        value={row.discountType}
                        onChange={(v) =>
                          update(row.id, { discountType: v as ExpenseDiscountType, discountValue: 0 })
                        }
                        className={inputCls}
                      />
                    </td>
                    <td className="px-2 py-1.5 w-32">
                      {row.discountType === "percent" ? (
                        <div className="relative flex items-center">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={row.discountValue || ""}
                            onChange={(e) =>
                              update(row.id, { discountValue: Number(e.target.value) || 0 })
                            }
                            className={cn(inputCls, "pr-6")}
                          />
                          <span className="absolute right-2 text-[10px] text-muted-foreground pointer-events-none">
                            %
                          </span>
                        </div>
                      ) : (
                        <IndianRupeeInput
                          value={row.discountValue}
                          onChange={(n) => update(row.id, { discountValue: n })}
                          className={inputCls}
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-xs font-medium tabular-nums whitespace-nowrap">
                      ₹{row.netAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => onChange(expenses.filter((e) => e.id !== row.id))}
                        className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
