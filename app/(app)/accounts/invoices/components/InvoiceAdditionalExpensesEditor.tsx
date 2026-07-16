"use client";

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
	type InvoiceAdditionalExpense,
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

export function InvoiceAdditionalExpensesEditor({
	expenses,
	onChange,
	defaultGstPct = 18,
	disabled,
}: {
	expenses: InvoiceAdditionalExpense[];
	onChange: (rows: InvoiceAdditionalExpense[]) => void;
	defaultGstPct?: number;
	disabled?: boolean;
}) {
	const update = (id: string, patch: Partial<InvoiceAdditionalExpense>) => {
		onChange(
			expenses.map((row) => {
				if (row.id !== id) return row;
				const next = { ...row, ...patch };
				if (patch.gstApplicable === false) {
					next.gstPct = 0;
				} else if (patch.gstApplicable === true && next.gstPct <= 0) {
					next.gstPct = defaultGstPct;
				}
				return next;
			}),
		);
	};

	const addRow = () => onChange([...expenses, createEmptyAdditionalExpense("manual")]);
	const removeRow = (id: string) => {
		const target = expenses.find((r) => r.id === id);
		if (target?.origin === "sales_order") return;
		const next = expenses.filter((r) => r.id !== id);
		onChange(next.length ? next : [createEmptyAdditionalExpense("manual")]);
	};

	const headers = [
		"Expense Head",
		"Amount",
		"GST Applicable",
		"GST %",
		"GST Amount",
		"Total Amount",
		"Remarks",
		"",
	];

	return (
		<div className="space-y-3">
			<div className="overflow-x-auto border border-border/60 rounded-lg bg-white">
				<table className="w-full text-sm min-w-[980px]">
					<thead className="border-b border-border/60 bg-muted/20">
						<tr>
							{headers.map((h) => (
								<th
									key={h || "actions"}
									className={cn(
										"px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
										["Amount", "GST %", "GST Amount", "Total Amount"].includes(h) &&
											"text-right",
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
									className="py-10 text-center text-sm text-muted-foreground"
								>
									No additional expenses. Click &quot;+ Add Expense&quot; to add freight or
									other charges.
								</td>
							</tr>
						) : (
							expenses.map((row) => {
								const calc = calcAdditionalExpenseRow(row);
								const fromSalesOrder = row.origin === "sales_order";
								return (
									<tr key={row.id} className="border-b border-border/40 last:border-b-0">
										<td className="p-2 min-w-[180px]">
											<Select
												value={row.expenseHead || undefined}
												disabled={disabled || fromSalesOrder}
												onValueChange={(v) =>
													update(row.id, {
														expenseHead: v as InvoiceAdditionalExpense["expenseHead"],
													})
												}
											>
												<SelectTrigger className="h-9 text-sm font-medium">
													<SelectValue placeholder="Select expense head…" />
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
										<td className="p-2 w-[120px]">
											<AccountsMoneyInput
												className={NUM_INPUT_CLASS}
												value={row.amount || ""}
												disabled={disabled}
												onChange={(v) => update(row.id, { amount: v })}
											/>
										</td>
										<td className="p-2 w-[120px]">
											<GstToggle
												value={row.gstApplicable}
												disabled={disabled}
												onChange={(gstApplicable) =>
													update(row.id, { gstApplicable })
												}
											/>
										</td>
										<td className="p-2 w-[88px]">
											<Input
												type="number"
												min={0}
												max={100}
												step={0.01}
												disabled={disabled || !row.gstApplicable}
												className={cn(
													NUM_INPUT_CLASS,
													!row.gstApplicable && "bg-muted/25",
												)}
												value={row.gstApplicable ? row.gstPct || "" : ""}
												onChange={(e) =>
													update(row.id, {
														gstPct: parseFloat(e.target.value) || 0,
													})
												}
											/>
										</td>
										<td className="p-2 w-[110px] text-right text-xs tabular-nums font-medium text-muted-foreground">
											{calc.gstAmount > 0 ? formatINR(calc.gstAmount) : "—"}
										</td>
										<td className="p-2 w-[110px] text-right text-xs tabular-nums font-semibold">
											{calc.totalAmount > 0 ? formatINR(calc.totalAmount) : "—"}
										</td>
										<td className="p-2 min-w-[140px]">
											<Input
												className="h-9 text-sm font-medium"
												placeholder="Optional"
												disabled={disabled}
												value={row.remarks}
												onChange={(e) =>
													update(row.id, { remarks: e.target.value })
												}
											/>
										</td>
										<td className="p-2 w-10">
											{!disabled && !fromSalesOrder && (
												<button
													type="button"
													onClick={() => removeRow(row.id)}
													className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
													aria-label="Remove expense row"
												>
													<Trash2 className="w-4 h-4" />
												</button>
											)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{!disabled && (
				<div className="flex items-center justify-end gap-2">
					{expenses.some((e) => e.origin !== "sales_order") && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-9 text-sm font-medium gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
							onClick={() => {
								const lastManual = [...expenses]
									.reverse()
									.find((e) => e.origin !== "sales_order");
								if (lastManual) removeRow(lastManual.id);
							}}
						>
							<Trash2 className="w-4 h-4" /> Delete Expense
						</Button>
					)}
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-9 text-sm font-medium gap-1.5"
						onClick={addRow}
					>
						<Plus className="w-4 h-4" /> Add Expense
					</Button>
				</div>
			)}

			<p className="text-xs text-muted-foreground">
				Expense heads will be linked to Expense Ledger / COA in a future release.
			</p>
		</div>
	);
}
