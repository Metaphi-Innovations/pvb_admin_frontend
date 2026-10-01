"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IndianRupeeInput } from "@/components/ui/IndianRupeeInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
	createEmptyExpense,
	recalculateExpense,
	type SalesOrderAdditionalExpense,
	type TaxSupplyType,
} from "../orders-data";

const inputCls = "h-8 text-sm rounded-lg border-border px-2.5 focus-visible:ring-1 focus-visible:ring-brand-300";

function formatRupee(value: number): string {
	return `₹${value.toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

export default function AdditionalExpensesEditor({
	expenses,
	onChange,
	taxSupplyType = "intra",
}: {
	expenses: SalesOrderAdditionalExpense[];
	onChange: (expenses: SalesOrderAdditionalExpense[]) => void;
	taxSupplyType?: TaxSupplyType;
}) {
	const update = (id: string, patch: Partial<SalesOrderAdditionalExpense>) => {
		onChange(
			expenses.map((row) => {
				if (row.id !== id) return row;
				return recalculateExpense({ ...row, ...patch }, taxSupplyType);
			}),
		);
	};

	const [showWarning, setShowWarning] = React.useState(false);

	const hasUnfilled = expenses.some((e) => !e.expenseName.trim() || e.amount <= 0);

	const handleAddExpense = () => {
		if (hasUnfilled) {
			setShowWarning(true);
		} else {
			setShowWarning(false);
			onChange([...expenses, createEmptyExpense()]);
		}
	};

	return (
		<div className="w-full border border-border rounded-lg bg-white shadow-sm p-4 space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
						ADDITIONAL CHARGES
					</h3>
					<p className="text-xs text-muted-foreground mt-0.5">
						Freight, transport, loading, and other charges
					</p>
				</div>
				<div className="flex items-center gap-2">
					{showWarning && hasUnfilled && (
						<span className="text-[10px] text-red-500 font-medium">
							Fill existing row first
						</span>
					)}
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 text-xs gap-1 px-3 bg-white"
						onClick={handleAddExpense}
					>
						<Plus className="w-3.5 h-3.5" /> Add Charge
					</Button>
				</div>
			</div>

			{expenses.length > 0 && (
				<div className="w-full border border-border/60 rounded-xl bg-white overflow-hidden">
					<table className="w-full">
						<thead>
							<tr className="bg-muted/30 border-b border-border/60">
								<th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground min-w-[200px]">
									Charge Name
								</th>
								<th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-[120px]">
									Amount
								</th>
								<th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-[90px]">
									GST %
								</th>
								{taxSupplyType === "intra" ? (
									<>
										<th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-[80px]">
											CGST
										</th>
										<th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-[80px]">
											SGST
										</th>
									</>
								) : (
									<th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-[90px]">
										IGST
									</th>
								)}
								<th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-[100px]">
									Total
								</th>
								<th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground min-w-[150px]">
									Remarks
								</th>
								<th className="w-10" />
							</tr>
						</thead>
						<tbody>
							{expenses.map((row) => (
								<tr
									key={row.id}
									className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors"
								>
									<td className="px-3 py-2">
										<Input
											value={row.expenseName}
											onChange={(e) => update(row.id, { expenseName: e.target.value })}
											placeholder="e.g. Freight Charges"
											className={cn(inputCls, "bg-white shadow-sm")}
										/>
									</td>
									<td className="px-3 py-2">
										<IndianRupeeInput
											value={row.amount}
											onChange={(n) => update(row.id, { amount: n })}
											placeholder="₹ 0"
											className={cn(inputCls, "w-full shadow-sm")}
										/>
									</td>
									<td className="px-3 py-2">
										<Select
											value={row.gstRate}
											onValueChange={(val) => update(row.id, { gstRate: val })}
										>
											<SelectTrigger className={cn("h-8 text-xs shadow-sm bg-white", inputCls)}>
												<SelectValue placeholder="0%" />
											</SelectTrigger>
											<SelectContent className="min-w-[100px]">
												<SelectItem value="0">0%</SelectItem>
												<SelectItem value="5">5%</SelectItem>
												<SelectItem value="12">12%</SelectItem>
												<SelectItem value="18">18%</SelectItem>
												<SelectItem value="28">28%</SelectItem>
											</SelectContent>
										</Select>
									</td>
									{taxSupplyType === "intra" ? (
										<>
											<td className="px-3 py-2">
												<div className="flex flex-col text-xs">
													<span className="font-semibold text-foreground">{Number(row.gstRate) / 2}%</span>
													<span className="text-muted-foreground">{formatRupee(row.cgstAmount)}</span>
												</div>
											</td>
											<td className="px-3 py-2">
												<div className="flex flex-col text-xs">
													<span className="font-semibold text-foreground">{Number(row.gstRate) / 2}%</span>
													<span className="text-muted-foreground">{formatRupee(row.sgstAmount)}</span>
												</div>
											</td>
										</>
									) : (
										<td className="px-3 py-2">
											<div className="flex flex-col text-xs">
												<span className="font-semibold text-foreground">{row.gstRate}%</span>
												<span className="text-muted-foreground">{formatRupee(row.igstAmount)}</span>
											</div>
										</td>
									)}
									<td className="px-3 py-2">
										<span className="text-xs font-bold text-foreground tabular-nums">
											{formatRupee(row.totalAmount)}
										</span>
									</td>
									<td className="px-3 py-2">
										<Input
											value={row.remarks || ""}
											onChange={(e) => update(row.id, { remarks: e.target.value })}
											placeholder="Optional"
											className={cn(inputCls, "shadow-sm")}
										/>
									</td>
									<td className="px-2 py-2 text-center">
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
			)}
		</div>
	);
}
