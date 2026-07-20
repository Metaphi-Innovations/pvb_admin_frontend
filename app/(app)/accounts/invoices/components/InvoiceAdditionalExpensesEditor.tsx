"use client";

import { memo, useCallback, type Dispatch, type SetStateAction } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Plus, Trash2 } from "lucide-react";
import {
	calcAdditionalExpenseRow,
	createEmptyAdditionalExpense,
	INVOICE_EXPENSE_HEAD_OPTIONS,
	resolveExpenseHeadCoaLedger,
	type InvoiceAdditionalExpense,
	type InvoiceExpenseHead,
} from "../invoice-additional-expenses";
import { formatINR } from "../invoice-utils";

const NUM_INPUT_CLASS =
	"h-8 text-sm tabular-nums text-right min-w-[4.5rem] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function GstToggle({
	value,
	onChange,
	disabled,
}: {
	value: boolean;
	onChange: (v: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/20">
			{(["No", "Yes"] as const).map((label, i) => {
				const yes = i === 1;
				const active = value === yes;
				return (
					<button
						key={label}
						type="button"
						disabled={disabled}
						onClick={() => onChange(yes)}
						className={cn(
							"h-7 px-2.5 text-sm font-medium rounded-md transition-colors",
							active
								? "bg-brand-600 text-white shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{label}
					</button>
				);
			})}
		</div>
	);
}

const ExpenseRow = memo(function ExpenseRow({
	row,
	disabled,
	defaultGstPct,
	interstate,
	onUpdate,
	onRemove,
}: {
	row: InvoiceAdditionalExpense;
	disabled?: boolean;
	defaultGstPct: number;
	interstate: boolean;
	onUpdate: (id: string, patch: Partial<InvoiceAdditionalExpense>) => void;
	onRemove: (id: string) => void;
}) {
	const calc = calcAdditionalExpenseRow(row, interstate);
	const fromSalesOrder = row.origin === "sales_order";

	return (
		<tr className="border-b border-border/40 last:border-b-0">
			<td className="p-2 min-w-[180px]">
				<Select
					value={row.expenseHead || undefined}
					disabled={disabled || fromSalesOrder}
					onValueChange={(v) => {
						const expenseHead = v as InvoiceExpenseHead;
						const ledger = resolveExpenseHeadCoaLedger(expenseHead);
						onUpdate(row.id, {
							expenseHead,
							coaLedgerId: ledger.coaLedgerId,
							coaLedgerName: ledger.coaLedgerName,
						});
					}}
				>
					<SelectTrigger className="h-8 text-xs font-medium">
						<SelectValue placeholder="Select charge / expense head…" />
					</SelectTrigger>
					<SelectContent>
						{INVOICE_EXPENSE_HEAD_OPTIONS.map((opt) => (
							<SelectItem key={opt} value={opt} className="text-xs">
								{opt}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{fromSalesOrder ? (
					<p className="text-[10px] text-muted-foreground mt-0.5">From Sales Order</p>
				) : null}
			</td>
			<td className="p-2 w-[110px]">
				<AccountsMoneyInput
					className={NUM_INPUT_CLASS}
					value={row.amount || ""}
					disabled={disabled}
					onChange={(v) => onUpdate(row.id, { amount: v })}
				/>
			</td>
			<td className="p-2 w-[110px]">
				<GstToggle
					value={row.gstApplicable}
					disabled={disabled}
					onChange={(gstApplicable) => onUpdate(row.id, { gstApplicable })}
				/>
			</td>
			<td className="p-2 w-[72px]">
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
				<td className="p-2 w-[90px] text-right text-xs tabular-nums font-medium text-muted-foreground">
					{calc.igst > 0 ? formatINR(calc.igst) : "—"}
				</td>
			) : (
				<>
					<td className="p-2 w-[90px] text-right text-xs tabular-nums font-medium text-muted-foreground">
						{calc.cgst > 0 ? formatINR(calc.cgst) : "—"}
					</td>
					<td className="p-2 w-[90px] text-right text-xs tabular-nums font-medium text-muted-foreground">
						{calc.sgst > 0 ? formatINR(calc.sgst) : "—"}
					</td>
				</>
			)}
			<td className="p-2 w-[100px] text-right text-xs tabular-nums font-semibold">
				{calc.totalAmount > 0 ? formatINR(calc.totalAmount) : "—"}
			</td>
			<td className="p-2 min-w-[120px]">
				<Input
					className="h-8 text-xs font-medium"
					placeholder="Optional"
					disabled={disabled}
					value={row.remarks}
					onChange={(e) => onUpdate(row.id, { remarks: e.target.value })}
				/>
			</td>
			<td className="p-2 w-10">
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

function InvoiceAdditionalExpensesEditorInner({
	expenses,
	onChange,
	defaultGstPct = 18,
	disabled,
	interstate = false,
}: {
	expenses: InvoiceAdditionalExpense[];
	onChange: Dispatch<SetStateAction<InvoiceAdditionalExpense[]>>;
	defaultGstPct?: number;
	disabled?: boolean;
	interstate?: boolean;
}) {
	const headers = interstate
		? ([
				"Charge / Expense Head",
				"Amount",
				"GST Applicable",
				"GST %",
				"IGST",
				"Total Amount",
				"Remarks",
				"",
			] as const)
		: ([
				"Charge / Expense Head",
				"Amount",
				"GST Applicable",
				"GST %",
				"CGST",
				"SGST",
				"Total Amount",
				"Remarks",
				"",
			] as const);

	const rightAlign = new Set(["Amount", "GST %", "CGST", "SGST", "IGST", "Total Amount"]);

	const update = useCallback(
		(id: string, patch: Partial<InvoiceAdditionalExpense>) => {
			onChange((prev) =>
				prev.map((row) => {
					if (row.id !== id) return row;
					const next = { ...row, ...patch };
					if (patch.gstApplicable === false) {
						next.gstPct = 0;
					} else if (patch.gstApplicable === true && next.gstPct <= 0) {
						next.gstPct = defaultGstPct;
					}
					if (patch.expenseHead && !patch.coaLedgerName) {
						const ledger = resolveExpenseHeadCoaLedger(patch.expenseHead);
						next.coaLedgerId = ledger.coaLedgerId;
						next.coaLedgerName = ledger.coaLedgerName;
					}
					return next;
				}),
			);
		},
		[onChange, defaultGstPct],
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

	const hasManualExpense = expenses.some((e) => e.origin !== "sales_order");

	return (
		<div className="space-y-2">
			<div className="overflow-x-auto border border-border/60 rounded-lg bg-white">
				<table className="w-full text-sm min-w-[980px]">
					<thead className="border-b border-border/60 bg-muted/20">
						<tr>
							{headers.map((h) => (
								<th
									key={h || "actions"}
									className={cn(
										"px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
										rightAlign.has(h) && "text-right",
									)}
								>
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{expenses.length === 0 ? (
							<tr>
								<td
									colSpan={headers.length}
									className="py-8 text-center text-xs text-muted-foreground"
								>
									No additional charges. Click &quot;+ Add Charge&quot; to add freight or other
									charges.
								</td>
							</tr>
						) : (
							expenses.map((row) => (
								<ExpenseRow
									key={row.id}
									row={row}
									disabled={disabled}
									defaultGstPct={defaultGstPct}
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
				<div className="flex items-center justify-end gap-2">
					{hasManualExpense && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-8 text-xs font-medium gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
							onClick={() => {
								const lastManual = [...expenses]
									.reverse()
									.find((e) => e.origin !== "sales_order");
								if (lastManual) removeRow(lastManual.id);
							}}
						>
							<Trash2 className="w-3.5 h-3.5" /> Remove Charge
						</Button>
					)}
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

export const InvoiceAdditionalExpensesEditor = memo(InvoiceAdditionalExpensesEditorInner);
