"use client";

import React, { useEffect, useState } from "react";
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
	Check,
	ChevronsUpDown,
	Trash2,
	Pencil,
	AlertCircle,
} from "lucide-react";
import {
	type SalesOrderLineItem,
	type ProductCatalogItem,
	type SalesOrderPricingContext,
	createEmptyLineItem,
	applySchemePricingToLine,
	applyManualSchemeToLine,
	removeAppliedSchemeFromLine,
	recalculateLineItem,
	applyLineTaxFields,
	computeLineTaxBreakdown,
	getProductById,
	repriceOrderLineItems,
	isProductDiscountSchemeApplied,
	getEligibleSchemesForSalesOrderLine,
	type TaxSupplyType,
} from "../orders-data";
import {
	formatSchemeRupee,
	formatSchemeOfferLabel,
	mapCustomerMasterTypeToSchemeType,
} from "@/app/(app)/masters/scheme/product-discount-scheme";
import type { EligibleProductDiscountSchemeOffer } from "@/app/(app)/masters/scheme/product-discount-scheme";
import { Badge } from "@/components/ui/badge";
import ProductSchemeOfferDialog, {
	type ProductSchemeOfferDialogMode,
} from "./ProductSchemeOfferDialog";
import { Tag } from "lucide-react";
import { ProductItemDetailsSection } from "@/components/procurement/ProductItemDetailsSection";

interface ProductLinesEditorProps {
	lines: SalesOrderLineItem[];
	products: ProductCatalogItem[];
	onChange: (lines: SalesOrderLineItem[]) => void;
	error?: string;
	/** When true (SEZ + active LUT), line GST is zeroed. */
	zeroGst?: boolean;
	/** Customer state + type + order date for Product Discount Scheme lookup */
	pricingContext?: SalesOrderPricingContext | null;
	/** Intra-state (CGST+SGST) vs inter-state (IGST) based on warehouse vs ship-to */
	taxSupplyType?: TaxSupplyType;
}

function EmptyTaxCell() {
	return (
		<td className='px-2 py-1.5 min-w-[72px] text-xs text-muted-foreground'>
			—
		</td>
	);
}

const TAX_HEAD =
	"px-2 py-1.5 text-left text-[10px] font-semibold text-foreground whitespace-nowrap";
const TAX_CELL = "px-2 py-1.5 text-xs tabular-nums";
const TAX_CELL_AMT =
	"px-2 py-1.5 text-xs font-medium tabular-nums whitespace-nowrap text-foreground";

function ProductSelect({
	products,
	value,
	selectedValues = [],
	alreadyAddedProductIds = [],
	onSelectMultiple,
}: {
	products: ProductCatalogItem[];
	value: number | null;
	selectedValues?: number[];
	alreadyAddedProductIds?: number[];
	onSelectMultiple: (selectedProducts: ProductCatalogItem[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [checkedIds, setCheckedIds] = useState<number[]>([]);

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
					type='button'
					className='w-full h-7 px-2 text-xs text-left border border-border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30'
				>
					<span
						className={
							hasSelection ? "text-foreground truncate" : "text-muted-foreground"
						}
					>
						{getTriggerLabel()}
					</span>
					<ChevronsUpDown className='w-3.5 h-3.5 text-muted-foreground flex-shrink-0' />
				</button>
			</PopoverTrigger>
			<PopoverContent
				className='w-[--radix-popover-trigger-width] p-0'
				align='start'
			>
				<div className='p-2 border-b border-border'>
					<div className='relative'>
						<Search className='w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none' />
						<Input
							placeholder='Search product…'
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className='h-8 text-xs pl-8'
						/>
					</div>
				</div>
				<div className='max-h-[200px] overflow-y-auto py-1'>
					{filtered.length > 0 && (
						<>
							<button
								type='button'
								onClick={() => {
									const availableProducts = filtered.filter((p) => !alreadyAddedProductIds.includes(p.id));
									const allSelected = availableProducts.every((p) => checkedIds.includes(p.id));
									if (allSelected) {
										setCheckedIds(checkedIds.filter((id) => !availableProducts.map((x) => x.id).includes(id)));
									} else {
										setCheckedIds([...new Set([...checkedIds, ...availableProducts.map((x) => x.id)])]);
									}
								}}
								className='w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-brand-600 hover:bg-muted/60 rounded-md text-left'
							>
								<Checkbox
									checked={filtered.filter((p) => !alreadyAddedProductIds.includes(p.id)).every((p) => checkedIds.includes(p.id))}
									className='w-3.5 h-3.5 flex-shrink-0'
								/>
								Select All
							</button>
							<div className='border-t border-border my-1' />
						</>
					)}
					{filtered.map((p) => {
						const isChecked = checkedIds.includes(p.id);
						const isAlreadyAdded = alreadyAddedProductIds.includes(p.id);
						return (
							<button
								key={p.id}
								type='button'
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
									className='w-3.5 h-3.5 flex-shrink-0 pointer-events-none'
								/>
								<span className='font-mono text-brand-700 flex-shrink-0'>
									{p.code}
								</span>
								<span className='flex-1 truncate'>{p.name}</span>
								{isAlreadyAdded ? (
									<span className='text-[10px] text-brand-600 font-semibold bg-brand-50 px-1.5 py-0.5 rounded'>
										Added
									</span>
								) : (
									<span className='text-[10px] text-muted-foreground'>
										Stock: {p.stock}
									</span>
								)}
							</button>
						);
					})}
					{filtered.length === 0 && (
						<p className='px-3 py-3 text-xs text-muted-foreground text-center'>
							No products found
						</p>
					)}
				</div>
				<div className='border-t border-border p-1.5 flex items-center justify-between bg-muted/20'>
					<span className='text-[10px] text-muted-foreground'>
						{checkedIds.length} selected
					</span>
					<button
						type='button'
						onClick={handleDone}
						className='text-xs text-brand-600 hover:text-brand-700 font-semibold px-2 py-0.5 rounded border border-brand-200 bg-white'
					>
						Done
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function formatRupee(value: number): string {
	return `₹${value.toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

export default function ProductLinesEditor({
	lines,
	products,
	onChange,
	error,
	zeroGst = false,
	pricingContext = null,
	taxSupplyType = "intra",
}: ProductLinesEditorProps) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [localError, setLocalError] = useState<string | null>(null);
	const [schemeDialog, setSchemeDialog] = useState<{
		lineId: string;
		mode: ProductSchemeOfferDialogMode;
		offers: EligibleProductDiscountSchemeOffer[];
		selectedOffer: EligibleProductDiscountSchemeOffer | null;
	} | null>(null);

	const schemeCustomerTypeLabel = pricingContext?.customerMasterType
		? mapCustomerMasterTypeToSchemeType(pricingContext.customerMasterType)
		: undefined;

	const contextKey = pricingContext
		? `${pricingContext.stateName}|${pricingContext.customerMasterType}|${pricingContext.orderDate}`
		: "";

	const taxOptionsKey = `${taxSupplyType}|${zeroGst}`;

	useEffect(() => {
		if (!pricingContext?.stateName || !pricingContext.customerMasterType) return;
		const repriced = repriceOrderLineItems(lines, pricingContext, {
			zeroGst,
			supplyType: taxSupplyType,
		});
		const changed = repriced.some((line, index) => {
			const prev = lines[index];
			if (!prev) return true;
			return (
				line.dealerPrice !== prev.dealerPrice ||
				line.schemeDiscountPercent !== prev.schemeDiscountPercent ||
				line.schemeDiscountAmount !== prev.schemeDiscountAmount ||
				line.finalRate !== prev.finalRate ||
				line.schemeDiscountType !== prev.schemeDiscountType ||
				line.schemeDiscountValue !== prev.schemeDiscountValue ||
				line.schemeCode !== prev.schemeCode ||
				line.schemeApplied !== prev.schemeApplied ||
				line.unitPrice !== prev.unitPrice ||
				line.discount !== prev.discount ||
				line.gstAmount !== prev.gstAmount ||
				line.lineTotal !== prev.lineTotal
			);
		});
		if (changed) onChange(repriced);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- repricing when customer/state/date changes
	}, [contextKey, zeroGst, taxSupplyType]);

	useEffect(() => {
		const nextLines = lines.map((line) => {
			if (!line.productId) return line;
			const product = getProductById(line.productId);
			if (!product) return line;
			return applyLineTaxFields(line, product.gstRate, taxSupplyType, zeroGst);
		});
		const changed = nextLines.some(
			(l, i) =>
				l.gstAmount !== lines[i]?.gstAmount ||
				l.cgstAmount !== lines[i]?.cgstAmount ||
				l.sgstAmount !== lines[i]?.sgstAmount ||
				l.igstAmount !== lines[i]?.igstAmount ||
				l.lineTotal !== lines[i]?.lineTotal,
		);
		if (changed) onChange(nextLines);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- recalc when tax supply type or LUT toggles
	}, [taxOptionsKey]);

	const getLineEligibleSchemes = (
		line: SalesOrderLineItem,
	): EligibleProductDiscountSchemeOffer[] => {
		if (
			!line.productId ||
			!pricingContext?.stateName ||
			!pricingContext.customerMasterType ||
			!pricingContext.orderDate
		) {
			return [];
		}
		return getEligibleSchemesForSalesOrderLine(line.productId, pricingContext);
	};

	const openSchemeDialog = (line: SalesOrderLineItem) => {
		const eligible = getLineEligibleSchemes(line);
		if (eligible.length > 0) {
			setSchemeDialog({
				lineId: line.id,
				mode: "apply",
				offers: eligible,
				selectedOffer: eligible[0],
			});
			return;
		}
		setSchemeDialog({
			lineId: line.id,
			mode: "no-scheme",
			offers: [],
			selectedOffer: null,
		});
	};

	const handleApplyScheme = () => {
		if (!schemeDialog?.selectedOffer) return;
		const line = lines.find((entry) => entry.id === schemeDialog.lineId);
		if (!line?.productId) return;
		const product = getProductById(line.productId);
		if (!product) return;

		const updated = applyManualSchemeToLine(
			line,
			schemeDialog.selectedOffer,
			product,
			{ zeroGst, supplyType: taxSupplyType },
		);
		onChange(lines.map((entry) => (entry.id === line.id ? updated : entry)));
	};

	const handleRemoveScheme = (line: SalesOrderLineItem) => {
		if (!line.productId) return;
		const product = getProductById(line.productId);
		if (!product) return;
		const updated = removeAppliedSchemeFromLine(line, product, {
			zeroGst,
			supplyType: taxSupplyType,
		});
		onChange(lines.map((entry) => (entry.id === line.id ? updated : entry)));
	};

	const updateLine = (id: string, patch: Partial<SalesOrderLineItem>) => {
		setLocalError(null);
		onChange(
			lines.map((line) => {
				if (line.id !== id) return line;
				let next = { ...line, ...patch };

				if (patch.productId !== undefined && patch.productId !== null) {
					const product = getProductById(patch.productId);
					if (product) {
						next = applySchemePricingToLine(next, product, pricingContext, {
							zeroGst,
							supplyType: taxSupplyType,
						});
					}
				} else if (patch.quantity !== undefined) {
					const product = next.productId
						? getProductById(next.productId)
						: undefined;
					if (product) {
						next = applyLineTaxFields(
							next,
							product.gstRate,
							taxSupplyType,
							zeroGst,
						);
					} else {
						next = recalculateLineItem(next);
					}
				} else if (
					patch.gstAmount !== undefined ||
					patch.cgstAmount !== undefined ||
					patch.sgstAmount !== undefined ||
					patch.igstAmount !== undefined
				) {
					next = recalculateLineItem(next);
				}
				return next;
			}),
		);
	};

	const addLine = () => {
		if (lines.length > 0) {
			const lastLine = lines[lines.length - 1];
			if (
				!lastLine.productId ||
				lastLine.quantity <= 0 ||
				lastLine.unitPrice < 0
			) {
				setLocalError(
					"Please complete the current product row before adding another.",
				);
				return;
			}
		}
		setLocalError(null);
		const newLine = createEmptyLineItem();
		onChange([...lines, newLine]);
		setEditingId(newLine.id);
	};

	const removeLine = (id: string) => {
		setLocalError(null);
		onChange(lines.filter((l) => l.id !== id));
		if (editingId === id) setEditingId(null);
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
		newLines[lineIndex] = applySchemePricingToLine(
			newLines[lineIndex],
			p1,
			pricingContext,
			{ zeroGst, supplyType: taxSupplyType },
		);

		for (let i = 1; i < selectedProducts.length; i++) {
			const p = selectedProducts[i];
			let newLine = createEmptyLineItem();
			newLine.productId = p.id;
			newLine = applySchemePricingToLine(newLine, p, pricingContext, {
				zeroGst,
				supplyType: taxSupplyType,
			});
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
		const qty = Number(topInputQty) || 0;
		if (qty <= 0) {
			setLocalError("Quantity must be greater than zero.");
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
			newLine.quantity = qty;
			newLine = applySchemePricingToLine(newLine, prod, pricingContext, {
				zeroGst,
				supplyType: taxSupplyType,
			});
			newLines.push(newLine);
		}

		onChange(newLines);
		setTopSelectedProds([]);
		setTopInputQty("1");
		setLocalError(null);
	};

	const totalQuantity = lines.reduce((sum, line) => sum + (line.quantity || 0), 0);
	const totalAmount = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);

	return (
		<div className='space-y-2'>
			<ProductSchemeOfferDialog
				open={schemeDialog != null}
				mode={schemeDialog?.mode ?? "no-scheme"}
				offers={schemeDialog?.offers ?? []}
				selectedOffer={schemeDialog?.selectedOffer ?? null}
				customerType={schemeCustomerTypeLabel}
				stateName={pricingContext?.stateName}
				onSelectOffer={(offer) =>
					setSchemeDialog((prev) =>
						prev ? { ...prev, selectedOffer: offer } : prev,
					)
				}
				onClose={() => setSchemeDialog(null)}
				onApply={handleApplyScheme}
			/>

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
						alreadyAddedProductIds={lines.map((l) => l.productId).filter((id): id is number => id !== null)}
						onSelectMultiple={(selected) => setTopSelectedProds(selected)}
					/>
				}
				customTableHead={
					<>
						<tr className='bg-muted/40 border-b border-border/60'>
							{[
								{ h: "Product", rowSpan: 2, className: "min-w-[180px]" },
								{ h: "Stock", rowSpan: 2, className: "w-16" },
								{ h: "Qty", rowSpan: 2, className: "w-16" },
								{ h: "DP", rowSpan: 2, className: "min-w-[80px]" },
								{ h: "Offer", rowSpan: 2, className: "min-w-[130px]" },
								{ h: "Disc. Amt", rowSpan: 2, className: "min-w-[80px]" },
								{ h: "Final Rate", rowSpan: 2, className: "min-w-[80px]" },
							].map(({ h, rowSpan, className }) => (
								<th
									key={h}
									rowSpan={rowSpan}
									className={cn(
										"px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap align-middle",
										className,
									)}
								>
									{h}
								</th>
							))}
							<th
								colSpan={taxSupplyType === "intra" ? 4 : 2}
								className='px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-foreground border-b border-border/60'
							>
								{taxSupplyType === "intra" ? "Tax — CGST + SGST" : "Tax — IGST"}
							</th>
							{[
								{ h: "Line Total", rowSpan: 2, className: "min-w-[90px]" },
								{ h: "", rowSpan: 2, className: "w-16" },
							].map(({ h, rowSpan, className }) => (
								<th
									key={h || "actions"}
									rowSpan={rowSpan}
									className={cn(
										"px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap align-middle",
										className,
									)}
								>
									{h}
								</th>
							))}
						</tr>
						<tr className='bg-muted/40 border-b border-border/60'>
							{(taxSupplyType === "intra"
								? ["CGST %", "CGST Amt", "SGST %", "SGST Amt"]
								: ["IGST %", "IGST Amt"]
							).map((h) => (
								<th key={h} className={TAX_HEAD}>
									{h}
								</th>
							))}
						</tr>
					</>
				}
				customTableBody={
					lines.map((line) => {
						const isEditing = editingId === line.id;
						const product = line.productId
							? getProductById(line.productId)
							: undefined;
						const hasScheme = isProductDiscountSchemeApplied(line);
						const eligibleSchemes = hasScheme ? [] : getLineEligibleSchemes(line);
						const hasEligibleScheme = eligibleSchemes.length > 0;
						const taxBreakdown =
							line.productId && product
								? computeLineTaxBreakdown(
										line,
										product.gstRate,
										taxSupplyType,
										zeroGst,
									)
								: null;
						return (
							<tr
								key={line.id}
								className='border-b border-border/60 hover:bg-muted/10'
							>
								<td className='px-2 py-1.5 min-w-[180px]'>
									<div
										className={cn(
											localError &&
												!line.productId &&
												"rounded-lg border border-red-400 p-0.5 animate-pulse bg-red-50/20",
										)}
									>
										<ProductSelect
											products={products}
											value={line.productId}
											selectedValues={line.productId ? [line.productId] : []}
											alreadyAddedProductIds={lines
												.filter((l) => l.id !== line.id)
												.map((l) => l.productId)
												.filter((id): id is number => id !== null)}
											onSelectMultiple={(selectedProds) =>
												handleProductSelectMultiple(
													line.id,
													selectedProds,
												)
											}
										/>
									</div>
								</td>
								<td className='px-2 py-1.5'>
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
								<td className='px-2 py-1.5 w-16'>
									{isEditing ? (
										<Input
											type='number'
											min={0}
											value={line.quantity || ""}
											onChange={(e) =>
												updateLine(line.id, {
													quantity: Number(e.target.value) || 0,
												})
											}
											className={cn(
												"h-7 text-xs",
												localError &&
													line.quantity <= 0 &&
													"border-red-400 focus-visible:ring-red-400 bg-red-50/10",
											)}
										/>
									) : (
										<span
											className={cn(
												"text-xs",
												localError &&
													line.quantity <= 0 &&
													"text-red-500 font-semibold",
											)}
										>
											{line.quantity}
										</span>
									)}
								</td>
								<td className='px-2 py-1.5'>
									<span className='text-xs tabular-nums whitespace-nowrap'>
										{line.productId
											? formatSchemeRupee(line.dealerPrice)
											: "—"}
									</span>
								</td>
								<td className='px-2 py-1.5'>
									{line.productId ? (
										hasScheme ? (
											<div className='flex flex-col gap-0.5 max-w-[140px]'>
												<Badge className='w-fit px-1.5 py-0 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-600'>
													Applied
												</Badge>
												<span className='text-[10px] font-mono text-brand-700 truncate'>
													{line.appliedSchemeCode ?? line.schemeCode}
												</span>
												<span className='text-[10px] text-emerald-700 tabular-nums'>
													{formatSchemeRupee(line.schemeDiscountAmount)} off
												</span>
												<button
													type='button'
													onClick={() => handleRemoveScheme(line)}
													className='text-[10px] font-medium text-red-600 hover:text-red-700 hover:underline text-left w-fit'
												>
													Remove scheme
												</button>
											</div>
										) : hasEligibleScheme ? (
											<div className='flex flex-col gap-0.5 max-w-[140px]'>
												<button
													type='button'
													onClick={() => openSchemeDialog(line)}
													className='inline-flex items-center gap-1 w-fit max-w-full rounded-full border border-dashed border-brand-400 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-100 transition-colors truncate'
													title={formatSchemeOfferLabel(eligibleSchemes[0])}
												>
													<Tag className='w-3 h-3 shrink-0' />
													<span className='truncate'>
														{formatSchemeOfferLabel(eligibleSchemes[0])}
													</span>
												</button>
												{eligibleSchemes.length > 1 && (
													<span className='text-[9px] text-muted-foreground pl-0.5'>
														+{eligibleSchemes.length - 1} more scheme
														{eligibleSchemes.length > 2 ? "s" : ""}
													</span>
												)}
											</div>
										) : (
											<button
												type='button'
												onClick={() => openSchemeDialog(line)}
												className='text-[10px] font-medium text-muted-foreground hover:text-brand-700 transition-colors'
											>
												No Scheme
											</button>
										)
									) : (
										"—"
									)}
								</td>
								<td className='px-2 py-1.5'>
									<span className='text-xs tabular-nums whitespace-nowrap'>
										{line.productId && hasScheme
											? formatSchemeRupee(line.schemeDiscountAmount)
											: "—"}
									</span>
								</td>
								<td className='px-2 py-1.5'>
									<span className='text-xs font-medium tabular-nums whitespace-nowrap'>
										{line.productId ? formatSchemeRupee(line.finalRate) : "—"}
									</span>
								</td>
								{line.productId && product && taxBreakdown ? (
									taxSupplyType === "intra" ? (
										<>
											<td className={cn(TAX_CELL, "min-w-[72px] text-muted-foreground")}>
												{taxBreakdown.cgstRate}%
											</td>
											<td className={cn(TAX_CELL_AMT, "min-w-[80px]")}>
												{formatRupee(line.cgstAmount ?? 0)}
											</td>
											<td className={cn(TAX_CELL, "min-w-[72px] text-muted-foreground")}>
												{taxBreakdown.sgstRate}%
											</td>
											<td className={cn(TAX_CELL_AMT, "min-w-[80px]")}>
												{formatRupee(line.sgstAmount ?? 0)}
											</td>
										</>
									) : (
										<>
											<td className={cn(TAX_CELL, "min-w-[72px] text-muted-foreground")}>
												{taxBreakdown.igstRate}%
											</td>
											<td className={cn(TAX_CELL_AMT, "min-w-[80px]")}>
												{formatRupee(line.igstAmount ?? 0)}
											</td>
										</>
									)
								) : taxSupplyType === "intra" ? (
									<>
										<EmptyTaxCell />
										<EmptyTaxCell />
										<EmptyTaxCell />
										<EmptyTaxCell />
									</>
								) : (
									<>
										<EmptyTaxCell />
										<EmptyTaxCell />
									</>
								)}
								<td className='px-2 py-1.5'>
									<span className='text-xs font-semibold text-foreground tabular-nums'>
										{formatRupee(line.lineTotal)}
									</span>
								</td>
								<td className='px-2 py-1.5'>
									<div className='flex items-center gap-0.5 justify-end'>
										<button
											type='button'
											onClick={() =>
												setEditingId(isEditing ? null : line.id)
											}
											className='p-1.5 hover:bg-muted rounded-md transition-colors'
											title={isEditing ? "Done editing" : "Edit row"}
										>
											<Pencil
												className={cn(
													"w-3.5 h-3.5",
													isEditing
														? "text-brand-600"
														: "text-muted-foreground",
												)}
											/>
										</button>
										<button
											type='button'
											onClick={() => removeLine(line.id)}
											className='p-1.5 hover:bg-red-50 rounded-md transition-colors'
											title='Remove row'
										>
											<Trash2 className='w-3.5 h-3.5 text-red-500' />
										</button>
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
								Total quantity:{" "}
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
				<p className='text-xs text-red-500 flex items-center gap-1 mt-1'>
					<AlertCircle className='w-3.5 h-3.5 flex-shrink-0' /> {localError}
				</p>
			)}
		</div>
	);
}
