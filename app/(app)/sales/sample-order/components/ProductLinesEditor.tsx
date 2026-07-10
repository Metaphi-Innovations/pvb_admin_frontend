"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
	Pencil,
	Check,
	X,
} from "lucide-react";
import { ProductItemDetailsSection } from "@/components/procurement/ProductItemDetailsSection";
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
	selectedValues = [],
	alreadyAddedProductIds = [],
	onSelectMultiple,
}: {
	products: ProductCatalogItem[];
	value: string | null;
	selectedValues?: string[];
	alreadyAddedProductIds?: string[];
	onSelectMultiple: (selectedProducts: ProductCatalogItem[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [checkedIds, setCheckedIds] = useState<string[]>([]);

	const handleOpenChange = (isOpen: boolean) => {
		setOpen(isOpen);
		if (isOpen) {
			setCheckedIds(selectedValues.length > 0 ? selectedValues : (value ? [value] : []));
		} else {
			setSearch("");
		}
	};

	const filtered = products.filter(
		(p) =>
			p.name.toLowerCase().includes(search.toLowerCase()) ||
			p.code.toLowerCase().includes(search.toLowerCase()),
	);

	const toggleProduct = (id: string) => {
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

	const hasSelection = selectedValues.length > 0 || value !== null;
	const getTriggerLabel = () => {
		if (selectedValues.length > 1) {
			return `${selectedValues.length} products selected`;
		}
		const activeId = selectedValues.length === 1 ? selectedValues[0] : value;
		const selected = products.find((p) => p.id === activeId);
		return selected ? `${selected.code} — ${selected.name}` : "Select product…";
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
							hasSelection ? "text-foreground truncate" : "text-muted-foreground"
						}
					>
						{getTriggerLabel()}
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
									const availableProducts = filtered.filter((p) => !alreadyAddedProductIds.includes(p.id));
									const allSelected = availableProducts.every((p) => checkedIds.includes(p.id));
									if (allSelected) {
										setCheckedIds(checkedIds.filter((id) => !availableProducts.map((x) => x.id).includes(id)));
									} else {
										setCheckedIds([...new Set([...checkedIds, ...availableProducts.map((x) => x.id)])]);
									}
								}}
								className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-brand-600 hover:bg-muted/60 rounded-md text-left"
							>
								<Checkbox
									checked={filtered.filter((p) => !alreadyAddedProductIds.includes(p.id)).every((p) => checkedIds.includes(p.id))}
									className="w-3.5 h-3.5 flex-shrink-0"
								/>
								Select All
							</button>
							<div className="border-t border-border my-1" />
						</>
					)}
					{filtered.map((p) => {
						const isChecked = checkedIds.includes(p.id);
						const isAlreadyAdded = alreadyAddedProductIds.includes(p.id);
						return (
							<button
								key={p.id}
								type="button"
								disabled={isAlreadyAdded}
								onClick={() => toggleProduct(p.id)}
								className={cn(
									"w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted/60",
									isChecked && "bg-brand-50",
									isAlreadyAdded && "opacity-50 cursor-not-allowed bg-muted/10",
								)}
							>
								<Checkbox
									checked={isChecked || isAlreadyAdded}
									disabled={isAlreadyAdded}
									className="w-3.5 h-3.5 flex-shrink-0 pointer-events-none"
								/>
								<span className="font-mono text-brand-700 flex-shrink-0">
									{p.code}
								</span>
								<span className="flex-1 truncate">{p.name}</span>
								{isAlreadyAdded ? (
									<span className="text-[10px] text-brand-600 font-semibold bg-brand-50 px-1.5 py-0.5 rounded">
										Added
									</span>
								) : (
									<span className="text-[10px] text-muted-foreground">
										Stock: {p.stock}
									</span>
								)}
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
	const [topQuantityType, setTopQuantityType] = useState<"Case" | "Piece">("Piece");
	const [topCaseQuantity, setTopCaseQuantity] = useState<number>(0);
	const [topPieceQuantity, setTopPieceQuantity] = useState<number>(0);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editDraft, setEditDraft] = useState<Partial<SalesOrderLineItem> | null>(null);

	const updateDraft = (patch: Partial<SalesOrderLineItem>) => {
		setEditDraft((prev) => {
			if (!prev) return prev;
			let next = { ...prev, ...patch };
			if (patch.productId !== undefined && patch.productId !== null) {
				const product = getProductById(patch.productId);
				if (product) next = applyProductToLine(next as SalesOrderLineItem, product);
			} else {
				if (patch.caseQuantity !== undefined || patch.pieceQuantity !== undefined || patch.quantityType !== undefined) {
					if (next.quantityType === "Case") {
						next.pieceQuantity = 0;
					}
					const product = getProductById(next.productId || "");
					next.quantity = next.quantityType === "Case"
						? ((next.caseQuantity || 0) * (product?.packSize || 1))
						: ((next.caseQuantity || 0) * (product?.packSize || 1)) + (next.pieceQuantity || 0);
				}
				next = recalculateSampleOrderLineItem(next as SalesOrderLineItem);
			}
			return next;
		});
	};

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
					if (patch.caseQuantity !== undefined || patch.pieceQuantity !== undefined || patch.quantityType !== undefined) {
						if (next.quantityType === "Case") {
							next.pieceQuantity = 0;
						}
						const product = getProductById(next.productId || "");
						next.quantity = next.quantityType === "Case"
							? ((next.caseQuantity || 0) * (product?.packSize || 1))
							: ((next.caseQuantity || 0) * (product?.packSize || 1)) + (next.pieceQuantity || 0);
					}
					next = recalculateSampleOrderLineItem(next);
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

		// Check for duplicate products
		for (const prod of selectedProducts) {
			const exists = lines.some((l) => l.id !== lineId && l.productId === prod.id);
			if (exists) {
				setLocalError(`Product "${prod.name}" is already added to this order.`);
				return;
			}
		}

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

	const [topSelectedProds, setTopSelectedProds] = useState<ProductCatalogItem[]>([]);
	const [topInputQty, setTopInputQty] = useState<string>("1");

	const handleAddProductFromTop = () => {
		if (topSelectedProds.length === 0) {
			setLocalError("Please select a product.");
			return;
		}
		// Check for duplicate products
		for (const prod of topSelectedProds) {
			const exists = lines.some((l) => l.productId === prod.id);
			if (exists) {
				setLocalError(`Product "${prod.name}" is already added to this order.`);
				return;
			}
		}

		const newLines = [...lines];

		for (const prod of topSelectedProds) {
			let newLine = createEmptyLineItem();
			newLine.productId = prod.id;

			const qty = topQuantityType === "Case"
				? (topCaseQuantity * (prod.packSize || 1))
				: (topCaseQuantity * (prod.packSize || 1)) + topPieceQuantity;

			if (qty <= 0) {
				setLocalError("Quantity must be greater than zero.");
				return;
			}

			newLine.quantityType = topQuantityType;
			newLine.caseQuantity = topCaseQuantity;
			newLine.pieceQuantity = topPieceQuantity;
			newLine.quantity = qty;
			newLine = applyProductToLine(newLine, prod);
			newLines.push(newLine);
		}

		onChange(newLines);
		setTopSelectedProds([]);
		setTopCaseQuantity(0);
		setTopPieceQuantity(0);
		setLocalError(null);
	};

	const columns = [
		{ h: "Product", className: "min-w-[160px]" },
		{ h: "Type", className: "w-[80px]" },
		{ h: "Cases", className: "w-20" },
		{ h: "Pieces", className: "w-20" },
		{ h: "Total Unit Qty", className: "w-20" },
		{ h: "DP", className: "w-24" },
		{ h: "Disc. %", className: "w-[80px]" },
		{ h: "Disc. Amt", className: "w-24" },
		{ h: "Line Total", className: "w-24" },
		{ h: "", className: "w-10" },
	];

	const totalQuantity = lines.reduce((sum, line) => sum + (line.quantity || 0), 0);
	const totalAmount = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);

	return (
		<div className="space-y-1.5">
			<ProductItemDetailsSection
				mode="sales-order"
				title="Products"
				description="Manage products, quantities, schemes, and taxes for this order."
				items={lines}
				totalQuantity={totalQuantity}
				totalAmount={totalAmount}
				showTotalsInHeader={true}
				quantity={topInputQty}
				onQuantityChange={setTopInputQty}
				onAddItem={handleAddProductFromTop}
				customSelectorArea={
					<ProductSelect
						products={products}
						value={null}
						selectedValues={topSelectedProds.map((p) => p.id)}
						alreadyAddedProductIds={lines.map((l) => l.productId).filter((id): id is string => id !== null)}
						onSelectMultiple={(selected) => setTopSelectedProds(selected)}
					/>
				}
				customQuantityArea={
					<>
						<div className="space-y-1">
							<Label className="text-xs font-medium">Type</Label>
							<Select
								value={topQuantityType}
								onValueChange={(value) => {
									const type = value as "Case" | "Piece";
									setTopQuantityType(type);
									if (type === "Case") {
										setTopPieceQuantity(0);
									}
								}}
							>
								<SelectTrigger className="h-8 text-xs rounded-lg border-border bg-white w-[90px]">
									<SelectValue placeholder="Type" />
								</SelectTrigger>
								<SelectContent className="min-w-[120px]">
									<SelectItem value="Case">Case</SelectItem>
									<SelectItem value="Piece">Piece</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">Cases</Label>
							<Input
								type="number"
								min={0}
								value={topCaseQuantity || ""}
								onChange={(e) => setTopCaseQuantity(Number(e.target.value) || 0)}
								className="h-8 text-xs w-20 bg-white"
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">Pieces</Label>
							<Input
								type="number"
								min={0}
								disabled={topQuantityType === "Case"}
								value={topPieceQuantity || ""}
								onChange={(e) => setTopPieceQuantity(Number(e.target.value) || 0)}
								className="h-8 text-xs w-20 bg-white disabled:opacity-50"
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">Total Unit Qty</Label>
							<Input
								type="text"
								disabled
								value={
									topSelectedProds.length === 1
										? (((topCaseQuantity || 0) * (topSelectedProds[0].packSize || 1)) + (topPieceQuantity || 0)) || "—"
										: "—"
								}
								className="h-8 text-xs w-24 font-semibold bg-muted text-muted-foreground"
							/>
						</div>
					</>
				}
				customTableHead={
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
				}
				customTableBody={
					lines.map((line) => {
						const isEditing = editingId === line.id;
						const draftLine = isEditing && editDraft ? (editDraft as SalesOrderLineItem) : line;
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
										selectedValues={line.productId ? [line.productId] : []}
										alreadyAddedProductIds={lines
											.filter((l) => l.id !== line.id)
											.map((l) => l.productId)
											.filter((id): id is string => id !== null)}
										onSelectMultiple={(selectedProds) =>
											handleProductSelectMultiple(line.id, selectedProds)
										}
									/>
								</td>
								<td className='px-2 py-1.5 w-[80px]'>
									{isEditing ? (
										<Select
											value={draftLine.quantityType || "Piece"}
											onValueChange={(value) => updateDraft({ quantityType: value as "Case" | "Piece" })}
										>
											<SelectTrigger className="h-7 text-xs rounded border-border bg-white w-full px-2">
												<SelectValue placeholder="Type" />
											</SelectTrigger>
											<SelectContent className="min-w-[120px]">
												<SelectItem value="Case">Case</SelectItem>
												<SelectItem value="Piece">Piece</SelectItem>
											</SelectContent>
										</Select>
									) : (
										<span className="text-xs">{line.quantityType || "Piece"}</span>
									)}
								</td>
								<td className='px-2 py-1.5 w-20'>
									{isEditing ? (
										<Input
											type="number"
											min={0}
											value={draftLine.caseQuantity === 0 && !draftLine.quantity ? "" : draftLine.caseQuantity}
											onChange={(e) => updateDraft({ caseQuantity: e.target.value ? Number(e.target.value) : 0 })}
											className="h-7 text-xs w-full"
										/>
									) : (
										<span className="text-xs">{line.caseQuantity || 0}</span>
									)}
								</td>
								<td className='px-2 py-1.5 w-20'>
									{isEditing ? (
										<Input
											type="number"
											min={0}
											disabled={draftLine.quantityType === "Case"}
											value={draftLine.pieceQuantity === 0 && !draftLine.quantity ? "" : draftLine.pieceQuantity}
											onChange={(e) => updateDraft({ pieceQuantity: e.target.value ? Number(e.target.value) : 0 })}
											className="h-7 text-xs w-full disabled:opacity-50"
										/>
									) : (
										<span className="text-xs">{line.pieceQuantity || 0}</span>
									)}
								</td>
								<td className='px-2 py-1.5 w-20'>
									{isEditing ? (
										<Input
											type="number"
											disabled
											value={draftLine.quantity || ""}
											className={cn(
												"h-7 text-xs w-full font-semibold bg-muted text-muted-foreground",
												qtyOverStock && "border-red-400"
											)}
										/>
									) : (
										<span className={cn(
											"text-xs font-semibold tabular-nums",
											qtyOverStock ? "text-red-600" : "text-foreground"
										)}>
											{line.quantity || 0}
										</span>
									)}
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
									<div className="flex items-center justify-end gap-0.5">
										{isEditing ? (
											<>
												<button
													type='button'
													onClick={() => {
														if (editDraft) {
															updateLine(line.id, editDraft);
														}
														setEditingId(null);
														setEditDraft(null);
													}}
													className='p-1.5 hover:bg-emerald-50 rounded-md transition-colors'
													title='Save changes'
												>
													<Check className='w-3.5 h-3.5 text-emerald-600' />
												</button>
												<button
													type='button'
													onClick={() => {
														setEditingId(null);
														setEditDraft(null);
													}}
													className='p-1.5 hover:bg-red-50 rounded-md transition-colors'
													title='Cancel editing'
												>
													<X className='w-3.5 h-3.5 text-red-500' />
												</button>
											</>
										) : (
											<>
												<button
													type='button'
													onClick={() => {
														setEditingId(line.id);
														setEditDraft({ ...line });
													}}
													className='p-1.5 hover:bg-muted rounded-md transition-colors'
													title='Edit row'
												>
													<Pencil className='w-3.5 h-3.5 text-muted-foreground' />
												</button>
												<button
													type="button"
													onClick={() => removeLine(line.id)}
													className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
													title="Remove row"
												>
													<Trash2 className="w-3.5 h-3.5 text-red-500" />
												</button>
											</>
										)}
									</div>
								</td>
							</tr>
						);
					})
				}
				customTableFooter={
					<div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-2.5">
						<p className="text-[11px] text-muted-foreground">
							<span className="font-medium text-foreground">{lines.length}</span> product(s) selected
						</p>
						<div className="flex flex-wrap items-center gap-3">
							<p className="text-[11px] text-muted-foreground">
								Total unit qty:{" "}
								<span className="font-medium text-foreground tabular-nums">{totalQuantity}</span>
							</p>
							<p className="text-[11px] text-muted-foreground">
								Total amount:{" "}
								<span className="font-medium text-foreground tabular-nums font-mono">
									{formatRupee(totalAmount)}
								</span>
							</p>
						</div>
					</div>
				}
			/>

			{localError && (
				<p className="text-xs text-red-500 flex items-center gap-1 mt-1">
					<AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {localError}
				</p>
			)}
		</div>
	);
}
