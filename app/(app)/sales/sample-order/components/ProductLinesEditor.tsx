"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Plus,
	Search,
	ChevronsUpDown,
	Trash2,
	AlertCircle,
} from "lucide-react";
import {
	type SalesOrderLineItem,
	type ProductCatalogItem,
	createEmptyLineItem,
	applyProductToLine,
	recalculateSampleOrderLineItem,
	SAMPLE_ORDER_LINE_DISCOUNT_PERCENT,
	getProductById,
} from "../orders-data";

interface ProductLinesEditorProps {
	lines: SalesOrderLineItem[];
	products: ProductCatalogItem[];
	onChange: (lines: SalesOrderLineItem[]) => void;
	error?: string;
	sampleMode?: boolean;
	showHeader?: boolean;
}

const NUM_INPUT =
	"h-8 text-xs w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]";

function formatRupee(value: number): string {
	return `₹${value.toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function ProductSelect({
	products,
	value,
	onSelectMultiple,
}: {
	products: ProductCatalogItem[];
	value: number | null;
	onSelectMultiple: (selectedProducts: ProductCatalogItem[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [checkedIds, setCheckedIds] = useState<number[]>([]);

	const handleOpenChange = (isOpen: boolean) => {
		setOpen(isOpen);
		if (isOpen) {
			setCheckedIds(value ? [value] : []);
		} else {
			setSearch("");
		}
	};

	const selected = products.find((p) => p.id === value);
	const filtered = products.filter(
		(p) =>
			p.name.toLowerCase().includes(search.toLowerCase()) ||
			p.code.toLowerCase().includes(search.toLowerCase()),
	);

	const toggleProduct = (id: number) => {
		setCheckedIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const handleDone = () => {
		setOpen(false);
		setSearch("");
		const selectedProds = products.filter((p) => checkedIds.includes(p.id));
		onSelectMultiple(selectedProds);
	};

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="w-full h-7 px-2 text-xs text-left border border-border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30"
				>
					<span
						className={
							selected ? "text-foreground truncate" : "text-muted-foreground"
						}
					>
						{selected
							? `${selected.code} — ${selected.name}`
							: "Select product…"}
					</span>
					<ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[--radix-popover-trigger-width] p-0"
				align="start"
			>
				<div className="p-2 border-b border-border">
					<div className="relative">
						<Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
						<Input
							placeholder="Search product…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="h-8 text-xs pl-8"
						/>
					</div>
				</div>
				<div className="max-h-[200px] overflow-y-auto py-1">
					{filtered.length > 0 && (
						<>
							<button
								type="button"
								onClick={() => {
									const allSelected = checkedIds.length === filtered.length;
									setCheckedIds(allSelected ? [] : filtered.map((p) => p.id));
								}}
								className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-brand-600 hover:bg-muted/60 rounded-md text-left"
							>
								<Checkbox
									checked={checkedIds.length === filtered.length}
									className="w-3.5 h-3.5 flex-shrink-0"
								/>
								Select All
							</button>
							<div className="border-t border-border my-1" />
						</>
					)}
					{filtered.map((p) => {
						const isChecked = checkedIds.includes(p.id);
						return (
							<button
								key={p.id}
								type="button"
								onClick={() => toggleProduct(p.id)}
								className={cn(
									"w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted/60",
									isChecked && "bg-brand-50",
								)}
							>
								<Checkbox
									checked={isChecked}
									className="w-3.5 h-3.5 flex-shrink-0 pointer-events-none"
								/>
								<span className="font-mono text-brand-700 flex-shrink-0">
									{p.code}
								</span>
								<span className="flex-1 truncate">{p.name}</span>
								<span className="text-[10px] text-muted-foreground">
									Stock: {p.stock}
								</span>
							</button>
						);
					})}
					{filtered.length === 0 && (
						<p className="px-3 py-3 text-xs text-muted-foreground text-center">
							No products found
						</p>
					)}
				</div>
				<div className="border-t border-border p-1.5 flex items-center justify-between bg-muted/20">
					<span className="text-[10px] text-muted-foreground">
						{checkedIds.length} selected
					</span>
					<button
						type="button"
						onClick={handleDone}
						className="text-xs text-brand-600 hover:text-brand-700 font-semibold px-2 py-0.5 rounded border border-brand-200 bg-white"
					>
						Done
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

export default function ProductLinesEditor({
	lines,
	products,
	onChange,
	error,
	showHeader = false,
}: ProductLinesEditorProps) {
	const [localError, setLocalError] = useState<string | null>(null);

	const updateLine = (id: string, patch: Partial<SalesOrderLineItem>) => {
		setLocalError(null);
		onChange(
			lines.map((line) => {
				if (line.id !== id) return line;
				let next = { ...line, ...patch };

				if (patch.productId !== undefined && patch.productId !== null) {
					const product = getProductById(patch.productId);
					if (product) next = applyProductToLine(next, product);
				} else {
					next = recalculateSampleOrderLineItem(next);
					if (
						next.productId &&
						next.quantity > 0 &&
						next.quantity > next.availableStock
					) {
						setLocalError(
							`Quantity cannot exceed available stock (${next.availableStock})`,
						);
					}
				}
				return next;
			}),
		);
	};

	const addLine = () => {
		if (lines.length > 0) {
			const lastLine = lines[lines.length - 1];
			if (!lastLine.productId || lastLine.quantity <= 0) {
				setLocalError(
					"Please complete the current product row before adding another.",
				);
				return;
			}
		}
		setLocalError(null);
		onChange([...lines, createEmptyLineItem()]);
	};

	const removeLine = (id: string) => {
		setLocalError(null);
		onChange(lines.filter((l) => l.id !== id));
	};

	const handleProductSelectMultiple = (
		lineId: string,
		selectedProducts: ProductCatalogItem[],
	) => {
		setLocalError(null);
		if (selectedProducts.length === 0) return;

		const lineIndex = lines.findIndex((l) => l.id === lineId);
		if (lineIndex === -1) return;

		const newLines = [...lines];
		const p1 = selectedProducts[0];
		newLines[lineIndex] = applyProductToLine(newLines[lineIndex], p1);

		for (let i = 1; i < selectedProducts.length; i++) {
			const p = selectedProducts[i];
			let newLine = createEmptyLineItem();
			newLine.productId = p.id;
			newLine = applyProductToLine(newLine, p);
			newLines.push(newLine);
		}

		onChange(newLines);
	};

	const columns = [
		{ h: "Product", className: "min-w-[160px]" },
		{ h: "Stock", className: "w-14" },
		{ h: "Qty", className: "w-[88px]" },
		{ h: "DP", className: "w-24" },
		{ h: "Disc. %", className: "w-[80px]" },
		{ h: "Disc. Amt", className: "w-24" },
		{ h: "Line Total", className: "w-24" },
		{ h: "", className: "w-10" },
	];

	return (
		<div className="space-y-1.5">
			{showHeader ? (
				<div className="flex items-center justify-between gap-2 pb-1 border-b border-border">
					<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
						Products
					</p>
					<div className="flex items-center gap-2">
						{localError && (
							<span className="text-xs text-red-500 font-medium flex items-center gap-1">
								<AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {localError}
							</span>
						)}
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 text-xs gap-1"
							onClick={addLine}
						>
							<Plus className="w-3 h-3" /> Add Product
						</Button>
					</div>
				</div>
			) : (
				<div className="flex flex-col items-end gap-1">
					{localError && (
						<span className="text-xs text-red-500 font-medium flex items-center gap-1">
							<AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {localError}
						</span>
					)}
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-7 text-xs gap-1"
						onClick={addLine}
					>
						<Plus className="w-3 h-3" /> Add Product
					</Button>
				</div>
			)}

			{lines.length === 0 ? (
				<div className="border border-dashed border-border rounded-lg py-6 text-center">
					<p className="text-xs text-muted-foreground">
						No products — click Add Product
					</p>
				</div>
			) : (
				<div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
					<table className="w-full table-fixed">
						<thead>
							<tr className="bg-muted/40 border-b border-border/60">
								{columns.map(({ h, className }) => (
									<th
										key={h || "actions"}
										className={cn(
											"px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap",
											className,
										)}
									>
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{lines.map((line) => {
								const qtyOverStock =
									line.productId && line.quantity > line.availableStock;

								return (
									<tr
										key={line.id}
										className="border-b border-border/60 hover:bg-muted/10"
									>
										<td className="px-2 py-1.5">
											<ProductSelect
												products={products}
												value={line.productId}
												onSelectMultiple={(selectedProds) =>
													handleProductSelectMultiple(line.id, selectedProds)
												}
											/>
										</td>
										<td className="px-2 py-1.5">
											<span
												className={cn(
													"text-xs font-medium tabular-nums",
													line.availableStock === 0
														? "text-amber-600"
														: "text-foreground",
												)}
											>
												{line.productId != null ? line.availableStock : "—"}
											</span>
										</td>
										<td className="px-2 py-1.5">
											<Input
												type="number"
												min={0}
												max={line.availableStock || undefined}
												value={line.quantity > 0 ? line.quantity : ""}
												placeholder="Qty"
												onChange={(e) => {
													const raw = e.target.value;
													updateLine(line.id, {
														quantity: raw === "" ? 0 : Number(raw),
													});
												}}
												className={cn(
													NUM_INPUT,
													qtyOverStock && "border-red-400 bg-red-50/10",
												)}
											/>
										</td>
										<td className="px-2 py-1.5">
											<span className="text-xs tabular-nums whitespace-nowrap">
												{line.productId && line.unitPrice > 0
													? formatRupee(line.unitPrice)
													: "—"}
											</span>
										</td>
										<td className="px-2 py-1.5">
											{line.productId ? (
												<span className="inline-flex items-center h-8 px-2.5 text-xs tabular-nums text-muted-foreground bg-muted/30 border border-border rounded-lg">
													{SAMPLE_ORDER_LINE_DISCOUNT_PERCENT}%
												</span>
											) : (
												<span className="text-xs text-muted-foreground">—</span>
											)}
										</td>
										<td className="px-2 py-1.5">
											<span className="text-xs tabular-nums whitespace-nowrap">
												{line.productId && line.quantity > 0
													? formatRupee(line.discountValue)
													: line.productId
														? formatRupee(0)
														: "—"}
											</span>
										</td>
										<td className="px-2 py-1.5">
											<span className="text-xs font-semibold tabular-nums whitespace-nowrap text-foreground">
												{line.productId && line.quantity > 0
													? formatRupee(line.lineTotal)
													: line.productId
														? formatRupee(0)
														: "—"}
											</span>
										</td>
										<td className="px-2 py-1.5">
											<div className="flex items-center justify-end">
												<button
													type="button"
													onClick={() => removeLine(line.id)}
													className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
													title="Remove row"
												>
													<Trash2 className="w-3.5 h-3.5 text-red-500" />
												</button>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{error && (
				<p className="text-xs text-red-500 flex items-center gap-1">
					<AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
				</p>
			)}
		</div>
	);
}
