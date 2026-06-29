"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IndianRupeeInput } from "@/components/ui/IndianRupeeInput";
import { cn } from "@/lib/utils";
import {
	createEmptyExpense,
	recalculateExpense,
	type SalesOrderAdditionalExpense,
} from "../orders-data";

const inputCls =
	"h-8 text-sm rounded-lg border-border px-2.5 focus-visible:ring-1 focus-visible:ring-brand-300";

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
		<div className='flex justify-end'>
			<div className='w-full max-w-md space-y-1.5'>
				<div className='flex items-center justify-between gap-2'>
					<p className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
						Additional Expenses
					</p>
					<div className='flex items-center gap-2'>
						{showWarning && hasUnfilled && (
							<span className='text-[10px] text-red-500 font-medium'>
								Fill existing row first
							</span>
						)}
						<Button
							type='button'
							variant='outline'
							size='sm'
							className='h-8 text-xs gap-1 px-2.5'
							onClick={handleAddExpense}
						>
							<Plus className='w-3.5 h-3.5' /> Add Expense
						</Button>
					</div>
				</div>

				{expenses.length > 0 && (
					<div className='w-full border border-border rounded-lg bg-white shadow-sm overflow-hidden'>
						<table className='w-full'>
							<thead>
								<tr className='bg-muted/40 border-b border-border'>
									<th className='px-2.5 py-2 text-left text-xs font-semibold text-foreground min-w-[180px]'>
										Expense Type
									</th>
									<th className='px-2.5 py-2 text-left text-xs font-semibold text-foreground w-[130px]'>
										Amount
									</th>
									<th className='w-9' />
								</tr>
							</thead>
							<tbody>
								{expenses.map((row) => (
									<tr
										key={row.id}
										className='border-b border-border/60 last:border-0 hover:bg-muted/10'
									>
										<td className='px-2.5 py-1.5'>
											<Input
												value={row.expenseName}
												onChange={(e) =>
													update(row.id, { expenseName: e.target.value })
												}
												placeholder='e.g. Freight'
												className={inputCls}
											/>
										</td>
										<td className='px-2.5 py-1.5'>
											<IndianRupeeInput
												value={row.amount}
												onChange={(n) => update(row.id, { amount: n })}
												placeholder='₹ 0'
												className={cn(inputCls, "w-full min-w-[120px]")}
											/>
										</td>
										<td className='px-1 py-1.5 text-center'>
											<button
												type='button'
												onClick={() =>
													onChange(expenses.filter((e) => e.id !== row.id))
												}
												className='p-1.5 hover:bg-red-50 rounded-md transition-colors'
											>
												<Trash2 className='w-3.5 h-3.5 text-red-500' />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
