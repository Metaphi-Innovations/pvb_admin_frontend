"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import {
	Plus,
	Check,
	Trash2,
	Pencil,
	AlertCircle,
	X,
	Package,
	Tag,
	Search,
	ChevronsUpDown,
} from "lucide-react";
import {
	type SalesOrderLineItem,
	type ProductCatalogItem,
	type SalesOrderPricingContext,
	createEmptyLineItem,
	applySchemePricingToLine,
	applyManualSchemeToLine,
	removeAppliedSchemeFromLine,
	applyLineTaxFields,
	computeLineTaxBreakdown,
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
import { ProductItemDetailsSection } from "@/components/procurement/ProductItemDetailsSection";
import ProductSchemeOfferDialog, {
	type ProductSchemeOfferDialogMode,
} from "./ProductSchemeOfferDialog";

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

interface InlineEditDraft {
	productId: string;
	quantity: string;
}

const inputCls = "h-8 rounded-lg text-xs";

function EmptyTaxCell() {
	return (
		<td className="px-2 py-1.5 min-w-[100px] text-xs text-muted-foreground">
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
	value: any;
	selectedValues?: any[];
	alreadyAddedProductIds?: any[];
	onSelectMultiple: (selectedProducts: ProductCatalogItem[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [checkedIds, setCheckedIds] = useState<any[]>([]);

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

	const toggleProduct = (id: any) => {
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
	const getProductById = (id: any) => {
		return products.find((p) => String(p.id) === String(id));
	};

	const [quickProductIds, setQuickProductIds] = useState<string[]>([]);
	const [quickQty, setQuickQty] = useState("1");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editDraft, setEditDraft] = useState<Partial<SalesOrderLineItem> | null>(null);
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

	const productOptions = useMemo(
		() =>
			products.map((p) => ({
				value: String(p.id),
				label: `${p.name} (${p.code})`,
				sublabel: `Stock: ${p.stock}`,
			})),
		[products],
	);

	const filledLines = lines.filter((l) => l.productId != null);
	const totalQty = filledLines.reduce((sum, l) => sum + (l.quantity || 0), 0);
	const totalAmount = filledLines.reduce((sum, l) => sum + (l.lineTotal || 0), 0);

	const previewProductId = Number(quickProductIds[0]);
	const previewProduct = previewProductId
		? products.find((p) => p.id === previewProductId)
		: null;

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

	const taxOptions = { zeroGst, supplyType: taxSupplyType };

	const lineFromProduct = (
		productId: number,
		quantity: number,
		existingId?: string,
	): SalesOrderLineItem | null => {
		const product = getProductById(productId) ?? products.find((p) => p.id === productId);
		if (!product) return null;
		let line = createEmptyLineItem();
		if (existingId) line.id = existingId;
		line.productId = productId;
		line.quantity = quantity;
		line = applySchemePricingToLine(line, product, pricingContext, taxOptions);
		return line;
	};

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
			taxOptions,
		);
		onChange(lines.map((entry) => (entry.id === line.id ? updated : entry)));
	};

	const handleRemoveScheme = (line: SalesOrderLineItem) => {
		if (!line.productId) return;
		const product = getProductById(line.productId);
		if (!product) return;
		const updated = removeAppliedSchemeFromLine(line, product, taxOptions);
		onChange(lines.map((entry) => (entry.id === line.id ? updated : entry)));
	};

	const recalculateLineItem = (line: SalesOrderLineItem): SalesOrderLineItem => {
		const finalRate = line.unitPrice - (line.schemeDiscountAmount || 0);
		return {
			...line,
			finalRate,
			lineTotal: Number((line.quantity * finalRate).toFixed(2))
		};
	};

	const computeUpdatedLine = (line: SalesOrderLineItem, patch: Partial<SalesOrderLineItem>): SalesOrderLineItem => {
		let next = { ...line, ...patch } as SalesOrderLineItem;

		if (patch.productId !== undefined && patch.productId !== null) {
			const product = getProductById(patch.productId);
			if (product) {
				next = applySchemePricingToLine(next, product, pricingContext, {
					zeroGst,
					supplyType: taxSupplyType,
				});
			}
		} else if (patch.quantity !== undefined || patch.caseQuantity !== undefined || patch.pieceQuantity !== undefined || patch.quantityType !== undefined) {
			const product = next.productId
				? getProductById(next.productId)
				: undefined;
			const packSize = product?.packSize || 1;

			if (patch.quantityType === "Case") {
				patch.pieceQuantity = 0;
				next.pieceQuantity = 0;
			}

			// If user manually changed total quantity
			if (patch.quantity !== undefined && patch.caseQuantity === undefined && patch.pieceQuantity === undefined && patch.quantityType === undefined) {
				next.quantity = patch.quantity;
				next.caseQuantity = Math.floor(next.quantity / packSize);
				next.pieceQuantity = next.quantity % packSize;
			}
			// If user changed case, piece, or type
			else if (patch.caseQuantity !== undefined || patch.pieceQuantity !== undefined || patch.quantityType !== undefined) {
				const c = patch.caseQuantity !== undefined ? patch.caseQuantity : (next.caseQuantity || 0);
				const p = patch.pieceQuantity !== undefined ? patch.pieceQuantity : (next.pieceQuantity || 0);
				next.caseQuantity = c;
				next.pieceQuantity = p;
				next.quantity = (c * packSize) + p;
			}

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
	};

	const updateLine = (id: string, patch: Partial<SalesOrderLineItem>) => {
		setLocalError(null);
		onChange(
			lines.map((line) => {
				if (line.id !== id) return line;
				return computeUpdatedLine(line, patch);
			}),
		);
	};

	const updateDraft = (patch: Partial<SalesOrderLineItem>) => {
		setEditDraft((prev) => {
			if (!prev) return prev;
			return computeUpdatedLine(prev as SalesOrderLineItem, patch);
		});
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

		onChange([...lines, createEmptyLineItem()]);
		setQuickProductIds([]);
		setQuickQty("1");
	};

	const removeLine = (id: string) => {
		onChange(lines.filter((l) => l.id !== id));
		if (editingId === id) {
			setEditingId(null);
			setEditDraft(null);
		}
	};

	const handleProductSelectMultiple = (lineId: string, selectedProds: ProductCatalogItem[]) => {
		if (selectedProds.length === 0) {
			updateLine(lineId, { productId: null, productCode: "", productName: "" } as Partial<SalesOrderLineItem>);
			return;
		}

		let newLines = [...lines];
		const firstProd = selectedProds[0];
		
		newLines = newLines.map((l) => {
			if (l.id !== lineId) return l;
			let updated = { ...l, productId: firstProd.id } as SalesOrderLineItem;
			updated = applySchemePricingToLine(updated, firstProd, pricingContext, {
				zeroGst,
				supplyType: taxSupplyType,
			});
			return updated;
		});

		for (let i = 1; i < selectedProds.length; i++) {
			const prod = selectedProds[i];
			let newLine = createEmptyLineItem();
			newLine.productId = prod.id;
			newLine.quantity = 1;
			newLine = applySchemePricingToLine(newLine, prod, pricingContext, {
				zeroGst,
				supplyType: taxSupplyType,
			});
			newLines.push(newLine);
		}

		onChange(newLines);
	};

	const [topSelectedProds, setTopSelectedProds] = useState<ProductCatalogItem[]>([]);
	const [topInputQty, setTopInputQty] = useState<string>("1");
	const [topQuantityType, setTopQuantityType] = useState<"Case" | "Piece">("Piece");
	const [topCaseQuantity, setTopCaseQuantity] = useState<number>(0);
	const [topPieceQuantity, setTopPieceQuantity] = useState<number>(0);

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
			const packSize = prod.packSize || 1;
			newLine.quantityType = topQuantityType;
			const totalOverride = Number(topInputQty) || 0;

			// If manual total is provided and no case/piece specified, use total
			if (totalOverride > 0 && topCaseQuantity === 0 && topPieceQuantity === 0) {
				newLine.quantity = totalOverride;
				newLine.caseQuantity = Math.floor(newLine.quantity / packSize);
				newLine.pieceQuantity = newLine.quantity % packSize;
			} else {
				// use case / piece
				const c = topCaseQuantity || 0;
				const p = topPieceQuantity || 0;
				newLine.caseQuantity = c;
				newLine.pieceQuantity = p;
				newLine.quantity = (c * packSize) + p;
			}

			if (newLine.quantity <= 0) {
				setLocalError("Quantity must be greater than zero.");
				return;
			}

			newLine = applySchemePricingToLine(newLine, prod, pricingContext, {
				zeroGst,
				supplyType: taxSupplyType,
			});
			newLines.push(newLine);
		}

		onChange(newLines);
		setTopSelectedProds([]);
		setTopInputQty("1");
		setTopCaseQuantity(0);
		setTopPieceQuantity(0);
		setLocalError(null);
	};

	const totalQuantity = lines.reduce((sum, line) => sum + (line.quantity || 0), 0);

	return (
		<div className="space-y-2">
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
						alreadyAddedProductIds={lines.map((l) => l.productId).filter((id): id is any => id !== null)}
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
										? (((topCaseQuantity || 0) * (topSelectedProds[0].packSize || 1)) + (topQuantityType === "Case" ? 0 : (topPieceQuantity || 0))) || ""
										: (topCaseQuantity || topPieceQuantity ? "—" : "")
								}
								className="h-8 text-xs w-24 bg-muted text-muted-foreground font-semibold"
							/>
						</div>
					</>
				}
				customTableHead={
					<tr className='bg-muted/40'>
						{[
							{ h: "Product", className: "w-[240px]" },
							{ h: "Stock", className: "w-16" },
							{ h: "Type", className: "w-[80px]" },
							{ h: "Cases", className: "w-20" },
							{ h: "Pieces", className: "w-20" },
							{ h: "Total Unit Qty", className: "w-24" },
							{ h: "DP", className: "min-w-[80px]" },
							{ h: "Offer", className: "min-w-[130px]" },
							{ h: "Disc. Amt", className: "min-w-[80px]" },
							{ h: "Final Rate", className: "min-w-[80px]" },
						].map(({ h, className }) => (
							<th
								key={h}
								className={cn(
									"px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap align-middle border-b border-border/60",
									className,
								)}
							>
								{h}
							</th>
						))}
						{(taxSupplyType === "intra"
							? ["CGST", "SGST", "GST"]
							: ["IGST", "GST"]
						).map((h) => (
							<th key={h} className={cn("px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap align-middle border-b border-border/60")}>
								{h}
							</th>
						))}
						{[
							{ h: "Line Total", className: "min-w-[90px]" },
							{ h: "", className: "w-16" },
						].map(({ h, className }) => (
							<th
								key={h || "actions"}
								className={cn(
									"px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap align-middle border-b border-border/60",
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
												.filter((id): id is any => id !== null)}
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
										<span className="text-xs">{line.quantityType}</span>
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
										<span className="text-xs">{line.quantityType === "Case" ? "—" : (line.pieceQuantity || 0)}</span>
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
												localError && draftLine.quantity <= 0 && "border-red-400"
											)}
										/>
									) : (
										<div className="flex flex-col">
											<span className={cn("text-xs font-semibold", localError && line.quantity <= 0 && "text-red-500")}>
												{line.quantity}
											</span>
											<span className="text-[9px] text-muted-foreground">
												Pk: {product?.packSize || 1}
											</span>
										</div>
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
											<td className={cn(TAX_CELL, "min-w-[100px] whitespace-nowrap")}>
												<span className="text-xs">{formatRupee(line.cgstAmount ?? 0)}</span>{" "}
												<span className="text-[10px] text-muted-foreground">({taxBreakdown.cgstRate}%)</span>
											</td>
											<td className={cn(TAX_CELL, "min-w-[100px] whitespace-nowrap")}>
												<span className="text-xs">{formatRupee(line.sgstAmount ?? 0)}</span>{" "}
												<span className="text-[10px] text-muted-foreground">({taxBreakdown.sgstRate}%)</span>
											</td>
											<td className={cn(TAX_CELL, "min-w-[100px] whitespace-nowrap")}>
												<span className="text-xs">{formatRupee(line.gstAmount ?? 0)}</span>{" "}
												<span className="text-[10px] text-muted-foreground">({taxBreakdown.cgstRate + taxBreakdown.sgstRate}%)</span>
											</td>
										</>
									) : (
										<>
											<td className={cn(TAX_CELL, "min-w-[100px] whitespace-nowrap")}>
												<span className="text-xs">{formatRupee(line.igstAmount ?? 0)}</span>{" "}
												<span className="text-[10px] text-muted-foreground">({taxBreakdown.igstRate}%)</span>
											</td>
											<td className={cn(TAX_CELL, "min-w-[100px] whitespace-nowrap")}>
												<span className="text-xs">{formatRupee(line.gstAmount ?? 0)}</span>{" "}
												<span className="text-[10px] text-muted-foreground">({taxBreakdown.igstRate}%)</span>
											</td>
										</>
									)
								) : taxSupplyType === "intra" ? (
									<>
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
													type='button'
													onClick={() => removeLine(line.id)}
													className='p-1.5 hover:bg-red-50 rounded-md transition-colors'
													title='Remove row'
												>
													<Trash2 className='w-3.5 h-3.5 text-red-500' />
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
							Showing{" "}
							<span className="font-medium text-foreground">{filledLines.length}</span>{" "}
							items
						</p>
						<div className="flex flex-wrap items-center gap-3">
							<p className="text-[11px] text-muted-foreground">
								Total unit qty:{" "}
								<span className="font-medium text-foreground tabular-nums">{totalQuantity}</span>
							</p>
							<p className="text-[11px] text-muted-foreground">
								Total amount:{" "}
								<span className="font-medium tabular-nums font-mono">
									{formatRupee(totalAmount)}
								</span>
							</p>
						</div>
					</div>
				}
			/>

			{error && (
				<p className="text-xs text-red-500 flex items-center gap-1">
					<AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
				</p>
			)}
		</div>
	);
}
