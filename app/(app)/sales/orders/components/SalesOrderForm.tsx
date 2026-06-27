"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, AlertCircle, Search, Info } from "lucide-react";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import {
	customerMatchesTransactionSearch,
	formatCustomerDropdownLabel,
	formatCustomerDropdownSublabel,
} from "@/lib/masters/entity-display";
import type { Employee } from "@/app/(app)/user-management/employee/employee-data";
import {
	loadWarehouses,
	type WarehouseMaster,
} from "@/app/(app)/masters/warehouse/warehouse-data";
import ProductLinesEditor from "./ProductLinesEditor";
import AdditionalExpensesEditor from "./AdditionalExpensesEditor";
import CustomerInfoDialog from "./CustomerInfoDialog";
import BillToShipToSection from "./BillToShipToSection";
import {
	getCustomerAddressesForSalesOrder,
	getDefaultBillShipAddressIds,
} from "../sales-order-address-utils";
import {
	type SalesOrder,
	type SalesOrderLineItem,
	type SalesOrderAdditionalExpense,
	type SalesOrderFormValues,
	type ProductCatalogItem,
	type OrderStatus,
	type SalesOrderPricingContext,
	ORDER_APPROVAL_THRESHOLD,
	ORDER_STATUS_OPTIONS,
	EDITABLE_ORDER_STATUSES,
	calculateOrderTotalsSummary,
	orderRequiresApproval,
	createEmptyLineItem,
	recalculateLineItem,
	getProductById,
	applyLineTaxFields,
	repriceOrderLineItems,
	resolveTaxSupplyType,
	type TaxSupplyType,
} from "../orders-data";
import { isSezGstCategory } from "@/lib/masters/gst-compliance";
import {
	LUT_SUPPLY_DECLARATION,
	resolveSezLutSupply,
} from "@/lib/settings/gst-tax-config";

export type { SalesOrderFormValues };

function SearchableDropdown<T extends { id: number }>({
	label,
	required,
	value,
	onChange,
	options,
	placeholder,
	error,
	getLabel,
	getSublabel,
	matchOption,
	renderOption,
}: {
	label: string;
	required?: boolean;
	value: number | null;
	onChange: (id: number) => void;
	options: T[];
	placeholder: string;
	error?: string;
	getLabel: (opt: T) => string;
	getSublabel?: (opt: T) => string;
	matchOption?: (opt: T, query: string) => boolean;
	renderOption?: (opt: T) => React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const selected = value !== null && value !== undefined
		? options.find((o) => String(o.id) === String(value))
		: undefined;
	const filtered = options.filter((o) =>
		matchOption
			? matchOption(o, search)
			: getLabel(o).toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<div className='space-y-1'>
			{label ? (
				<Label className='text-xs font-medium'>
					{label} {required && <span className='text-red-500'>*</span>}
				</Label>
			) : null}
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<button
						type='button'
						className={cn(
							"w-full h-8 px-2.5 text-xs text-left border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30 transition-colors",
							error ? "border-red-400" : "border-border",
						)}
					>
						<span
							className={
								selected
									? "text-foreground text-xs"
									: "text-muted-foreground text-xs"
							}
						>
							{selected ? getLabel(selected) : placeholder}
						</span>
						<ChevronsUpDown className='flex-shrink-0 w-4 h-4 text-muted-foreground' />
					</button>
				</PopoverTrigger>
				<PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
					<div className='p-2 border-b border-border'>
						<div className='relative'>
							<Search className='w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none' />
							<Input
								placeholder='Search…'
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className='h-8 pl-8 text-xs'
							/>
						</div>
					</div>
					<div className='max-h-[220px] overflow-y-auto'>
						{filtered.map((opt) => (
							<button
								key={opt.id}
								type='button'
								onClick={() => {
									onChange(opt.id);
									setOpen(false);
									setSearch("");
								}}
								className={cn(
									"w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left transition-colors hover:bg-muted/60",
									selected && selected.id === opt.id && "bg-brand-50",
								)}
							>
								{renderOption ? (
									renderOption(opt)
								) : (
									<span className='flex-1 min-w-0'>
										<span className='block truncate'>{getLabel(opt)}</span>
										{getSublabel?.(opt) && (
											<span className='block text-[10px] text-muted-foreground truncate mt-0.5'>
												{getSublabel(opt)}
											</span>
										)}
									</span>
								)}
								{selected && selected.id === opt.id && (
									<Check className='w-3.5 h-3.5 text-brand-600 flex-shrink-0 ml-auto' />
								)}
							</button>
						))}
						{filtered.length === 0 && (
							<p className='px-3 py-3 text-xs text-center text-muted-foreground'>
								No results found
							</p>
						)}
					</div>
				</PopoverContent>
			</Popover>
			{error && (
				<p className='flex items-center gap-1 text-xs text-red-500'>
					<AlertCircle className='w-3.5 h-3.5 flex-shrink-0' /> {error}
				</p>
			)}
		</div>
	);
}

function SectionDivider({ title }: { title: string }) {
	return (
		<div className='pb-2 border-b border-border'>
			<p className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
				{title}
			</p>
		</div>
	);
}

function StatusSelect({
	value,
	onChange,
	allowedStatuses,
}: {
	value: OrderStatus;
	onChange: (s: OrderStatus) => void;
	allowedStatuses: OrderStatus[];
}) {
	const [open, setOpen] = useState(false);
	const options = ORDER_STATUS_OPTIONS.filter((o) =>
		allowedStatuses.includes(o.value),
	);
	const selected = options.find((o) => o.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type='button'
					className='w-full h-8 px-2.5 text-xs text-left border border-border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30'
				>
					<span>{selected?.label ?? value}</span>
					<ChevronsUpDown className='w-4 h-4 text-muted-foreground' />
				</button>
			</PopoverTrigger>
			<PopoverContent className='w-[--radix-popover-trigger-width] p-1'>
				{options.map((opt) => (
					<button
						key={opt.value}
						type='button'
						onClick={() => {
							onChange(opt.value);
							setOpen(false);
						}}
						className={cn(
							"w-full flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg hover:bg-muted/60",
							value === opt.value && "bg-brand-50",
						)}
					>
						<span className='flex-1'>{opt.label}</span>
						{value === opt.value && (
							<Check className='w-3.5 h-3.5 text-brand-600' />
						)}
					</button>
				))}
			</PopoverContent>
		</Popover>
	);
}

interface SalesOrderFormProps {
	mode: "add" | "edit" | "split";
	orderNumber: string;
	form: SalesOrderFormValues;
	onChange: (form: SalesOrderFormValues) => void;
	errors: Record<string, string>;
	customers: Customer[];
	salesmen: Employee[];
	products: ProductCatalogItem[];
	showStatus?: boolean;
	originalOrder?: SalesOrder;
	auditInfo?: {
		createdBy: string;
		createdDate: string;
		updatedBy: string;
		updatedDate: string;
	};
}

export function validateSalesOrderForm(
	form: SalesOrderFormValues,
): Record<string, string> {
	const e: Record<string, string> = {};
	if (!form.customerId) e.customerId = "Customer is required";
	if (!form.salesManId) e.salesManId = "Salesman is required";
	if (!form.warehouseId) e.warehouseId = "Source warehouse is required";
	if (!form.billToAddressId) e.billToAddressId = "Bill To address is required";
	if (!form.shipToAddressId) e.shipToAddressId = "Ship To address is required";
	if (!form.orderDate) e.orderDate = "Order date is required";
	if (!form.deliveryDate) e.deliveryDate = "Delivery date is required";
	if (form.lineItems.length === 0) e.lineItems = "Add at least one product";
	else {
		const invalid = form.lineItems.some((l) => !l.productId || l.quantity <= 0);
		if (invalid)
			e.lineItems =
				"Each line must have a product and quantity greater than zero";
	}
	return e;
}

export function validateSplitOrderForm(
	form: SalesOrderFormValues,
	originalOrder: SalesOrder,
): Record<string, string> {
	const e = validateSalesOrderForm(form);
	const splitBySource: Record<string, number> = {};

	for (const line of form.lineItems) {
		if (!line.splitSourceLineId || !line.productId || line.quantity <= 0)
			continue;
		const parentLine = originalOrder.lineItems.find(
			(l) => l.id === line.splitSourceLineId,
		);
		if (!parentLine) continue;
		const max = line.maxSplitQty ?? parentLine.quantity;
		const acc = (splitBySource[line.splitSourceLineId] ?? 0) + line.quantity;
		if (acc > max) {
			e.lineItems = `Split quantity cannot exceed available quantity for ${line.productName}`;
			break;
		}
		splitBySource[line.splitSourceLineId] = acc;
	}

	return e;
}

function ImportFromOriginalPopover({
	originalOrder,
	form,
	onChange,
	taxSupplyType,
	zeroGst,
}: {
	originalOrder: SalesOrder;
	form: SalesOrderFormValues;
	onChange: (form: SalesOrderFormValues) => void;
	taxSupplyType: TaxSupplyType;
	zeroGst: boolean;
}) {
	const [open, setOpen] = useState(false);
	const sourceLines = originalOrder.lineItems.filter(
		(l) => l.productId && l.quantity > 0,
	);

	const importLine = (parentLine: SalesOrderLineItem) => {
		const product = parentLine.productId
			? getProductById(parentLine.productId)
			: undefined;
		const qty = 1;
		let newLine = recalculateLineItem({
			...createEmptyLineItem(),
			id: `line-import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			productId: parentLine.productId,
			productCode: parentLine.productCode,
			productName: parentLine.productName,
			availableStock: parentLine.availableStock,
			quantity: qty,
			dealerPrice: parentLine.dealerPrice,
			unitPrice: parentLine.unitPrice,
			discount: parentLine.discount,
			schemeDiscountPercent: parentLine.schemeDiscountPercent,
			schemeDiscountAmount: parentLine.schemeDiscountAmount,
			schemeDiscountType: parentLine.schemeDiscountType,
			schemeDiscountValue: parentLine.schemeDiscountValue,
			appliedSchemeId: parentLine.appliedSchemeId,
			appliedSchemeCode: parentLine.appliedSchemeCode,
			appliedSchemeName: parentLine.appliedSchemeName,
			originalDealerPrice: parentLine.originalDealerPrice,
			finalRateAfterScheme: parentLine.finalRateAfterScheme,
			finalRate: parentLine.finalRate,
			schemeCode: parentLine.schemeCode,
			schemeName: parentLine.schemeName,
			schemeApplied: parentLine.schemeApplied,
			gstAmount: 0,
			lineTotal: 0,
			splitSourceLineId: parentLine.id,
			maxSplitQty: parentLine.quantity,
		});
		if (product) {
			newLine = applyLineTaxFields(
				newLine,
				product.gstRate,
				taxSupplyType,
				zeroGst,
			);
		}
		const existing = form.lineItems.filter((l) => l.productId);
		onChange({ ...form, lineItems: [...existing, newLine] });
		setOpen(false);
	};

	if (sourceLines.length === 0) return null;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type='button'
					className='h-7 px-2.5 text-xs border border-border rounded-lg font-medium text-foreground hover:bg-muted/30 transition-colors'
				>
					Import from Original Order
				</button>
			</PopoverTrigger>
			<PopoverContent className='p-0 w-72' align='end'>
				<div className='px-3 py-2 border-b border-border'>
					<p className='text-xs font-semibold text-foreground'>
						Original order products
					</p>
				</div>
				<div className='max-h-[200px] overflow-y-auto py-1'>
					{sourceLines.map((line) => (
						<button
							key={line.id}
							type='button'
							onClick={() => importLine(line)}
							className='flex flex-col items-start w-full px-3 py-2 text-xs text-left hover:bg-muted/60'
						>
							<span className='font-medium'>{line.productName}</span>
							<span className='text-[11px] text-muted-foreground font-mono'>
								{line.productCode} · Avail: {line.quantity}
							</span>
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}

export default function SalesOrderForm({
	mode,
	orderNumber,
	form,
	onChange,
	errors,
	customers,
	salesmen,
	products,
	showStatus = false,
	originalOrder,
	auditInfo,
}: SalesOrderFormProps) {
	const [customerInfoOpen, setCustomerInfoOpen] = useState(false);

	const warehouses = useMemo(() => {
		return loadWarehouses().filter((w) => w.status === "active");
	}, []);

	const set = <K extends keyof SalesOrderFormValues>(
		key: K,
		val: SalesOrderFormValues[K],
	) => onChange({ ...form, [key]: val });

	const selectedCustomer = useMemo(
		() => customers.find((c) => c.id === form.customerId) ?? null,
		[customers, form.customerId],
	);

	const customerAddresses = useMemo(
		() => (selectedCustomer ? getCustomerAddressesForSalesOrder(selectedCustomer) : []),
		[selectedCustomer],
	);

	const selectedWarehouse = useMemo(
		() => warehouses.find((w) => w.id === form.warehouseId) ?? null,
		[warehouses, form.warehouseId],
	);

	const shipToAddress = useMemo(
		() => customerAddresses.find((a) => a.id === form.shipToAddressId) ?? null,
		[customerAddresses, form.shipToAddressId],
	);

	const sezLutResolution = useMemo(() => {
		if (!selectedCustomer) return { appliesLut: false };
		const category =
			selectedCustomer.gstCategory ||
			(selectedCustomer.gstApplicable ? "regular" : "unregistered");
		return resolveSezLutSupply({
			customerGstCategory: category,
			transactionDate: form.orderDate,
		});
	}, [selectedCustomer, form.orderDate]);

	const taxSupplyType = useMemo((): TaxSupplyType => {
		const sourceState = selectedWarehouse?.state ?? "";
		const destState = shipToAddress?.state ?? "";
		return resolveTaxSupplyType(sourceState, destState);
	}, [selectedWarehouse, shipToAddress]);

	useEffect(() => {
		if (!selectedCustomer || customerAddresses.length === 0) return;
		const billValid = customerAddresses.some((a) => a.id === form.billToAddressId);
		const shipValid = customerAddresses.some((a) => a.id === form.shipToAddressId);
		if (billValid && shipValid) return;
		const defaults = getDefaultBillShipAddressIds(customerAddresses);
		onChange({
			...form,
			billToAddressId: billValid ? form.billToAddressId : defaults.billToAddressId,
			shipToAddressId: shipValid ? form.shipToAddressId : defaults.shipToAddressId,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps -- auto-select when customer addresses load
	}, [selectedCustomer?.id, customerAddresses.length]);

	const pricingContext = useMemo((): SalesOrderPricingContext | null => {
		if (!selectedCustomer?.stateName || !selectedCustomer.customerType || !form.orderDate) {
			return null;
		}
		return {
			stateName: selectedCustomer.stateName,
			customerMasterType: selectedCustomer.customerType,
			orderDate: form.orderDate,
		};
	}, [selectedCustomer, form.orderDate]);

	const totalsSummary = useMemo(
		() =>
			calculateOrderTotalsSummary(form.lineItems, form.additionalExpenses ?? [], {
				sezLutApplies: sezLutResolution.appliesLut,
				taxSupplyType,
			}),
		[form.lineItems, form.additionalExpenses, sezLutResolution.appliesLut, taxSupplyType],
	);

	const needsApproval = orderRequiresApproval(totalsSummary.grandTotal);

	const formatRupee = (n: number) =>
		`₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

	return (
		<>
			<div className='p-4 space-y-4 bg-white border shadow-sm rounded-xl border-border'>
				<SectionDivider title='Order' />
				<div className='grid grid-cols-2 gap-3 md:grid-cols-6 lg:grid-cols-12'>
					<div className='space-y-1 col-span-1 md:col-span-2 lg:col-span-2'>
						<Label className='text-xs font-medium'>Order Number</Label>
						<div className='h-8 px-2.5 border border-border rounded-lg bg-muted/30 flex items-center'>
							<span className='font-mono text-xs font-semibold text-brand-700'>
								{orderNumber}
							</span>
						</div>
					</div>

					<div className='space-y-1 col-span-1 md:col-span-2 lg:col-span-2'>
						<Label className='text-xs font-medium'>
							Order Date <span className='text-red-500'>*</span>
						</Label>
						<Input
							type='date'
							value={form.orderDate}
							onChange={(e) => {
								const orderDate = e.target.value;
								const nextForm = { ...form, orderDate };
								if (pricingContext) {
									nextForm.lineItems = repriceOrderLineItems(
										form.lineItems,
										{ ...pricingContext, orderDate },
										{
											zeroGst: sezLutResolution.appliesLut,
											supplyType: taxSupplyType,
										},
									);
								}
								onChange(nextForm);
							}}
							className={cn(
								"h-8 text-xs rounded-lg",
								errors.orderDate && "border-red-400",
							)}
						/>
						{errors.orderDate && (
							<p className='text-[11px] text-red-500'>{errors.orderDate}</p>
						)}
					</div>

					<div className='space-y-1 col-span-1 md:col-span-2 lg:col-span-2'>
						<Label className='text-xs font-medium'>
							Delivery Date <span className='text-red-500'>*</span>
						</Label>
						<Input
							type='date'
							value={form.deliveryDate}
							min={form.orderDate}
							onChange={(e) => set("deliveryDate", e.target.value)}
							className={cn(
								"h-8 text-xs rounded-lg",
								errors.deliveryDate && "border-red-400",
							)}
						/>
						{errors.deliveryDate && (
							<p className='text-[11px] text-red-500'>{errors.deliveryDate}</p>
						)}
					</div>

					{(showStatus && mode === "edit") || mode === "split" ? (
						<div className='space-y-1 col-span-1 md:col-span-2 lg:col-span-2'>
							<Label className='text-xs font-medium'>Order Status</Label>
							<StatusSelect
								value={form.status}
								onChange={(s) => set("status", s)}
								allowedStatuses={EDITABLE_ORDER_STATUSES}
							/>
						</div>
					) : null}

					<div className='space-y-1 col-span-2 md:col-span-3 lg:col-span-4'>
						<div className='flex items-center gap-1.5'>
							<Label className='text-xs font-medium'>
								Customer <span className='text-red-500'>*</span>
							</Label>
							{selectedCustomer && (
								<button
									type='button'
									onClick={() => setCustomerInfoOpen(true)}
									className='flex items-center justify-center w-5 h-5 transition-colors rounded-full shadow-sm bg-brand-600 hover:bg-brand-700'
									title='View customer details'
								>
									<Info className='w-3 h-3 text-white' />
								</button>
							)}
						</div>
						<SearchableDropdown<Customer>
							label=''
							required
							value={form.customerId}
							onChange={(id) => {
								const c = customers.find((x) => x.id === id);
								const addressDefaults = c
									? getDefaultBillShipAddressIds(
											getCustomerAddressesForSalesOrder(c),
										)
									: { billToAddressId: "", shipToAddressId: "" };
								const updatedForm = {
									...form,
									customerId: id,
									billToAddressId: addressDefaults.billToAddressId,
									shipToAddressId: addressDefaults.shipToAddressId,
								};
								if (c?.salesManId) {
									updatedForm.salesManId = c.salesManId;
								}
								if (c?.stateName && c.customerType && form.orderDate) {
									updatedForm.lineItems = repriceOrderLineItems(
										form.lineItems,
										{
											stateName: c.stateName,
											customerMasterType: c.customerType,
											orderDate: form.orderDate,
										},
										{
											zeroGst: sezLutResolution.appliesLut,
											supplyType: taxSupplyType,
										},
									);
								}
								onChange(updatedForm);
							}}
							options={customers}
							placeholder='Select customer…'
							error={errors.customerId}
							getLabel={formatCustomerDropdownLabel}
							getSublabel={formatCustomerDropdownSublabel}
							matchOption={(c, q) => customerMatchesTransactionSearch(c, q)}
						/>
					</div>

					<div className='space-y-1 col-span-1 md:col-span-2 lg:col-span-2'>
						<SearchableDropdown<Employee>
							label='Salesman'
							required
							value={form.salesManId}
							onChange={(id) => set("salesManId", id)}
							options={salesmen}
							placeholder='Select salesman…'
							error={errors.salesManId}
							getLabel={(s) => `${s.employeeId} — ${s.fullName}`}
						/>
					</div>

					<div className='space-y-1 col-span-2 md:col-span-3 lg:col-span-4'>
						<SearchableDropdown<WarehouseMaster>
							label='Source Warehouse'
							required
							value={form.warehouseId ?? null}
							onChange={(id) => set("warehouseId", id)}
							options={warehouses}
							placeholder='Select source warehouse…'
							error={errors.warehouseId}
							getLabel={(w) => `${w.warehouseCode} — ${w.warehouseName}`}
							getSublabel={(w) => w.state}
						/>
					</div>
				</div>

				{mode === "split" && originalOrder && (
					<p className='text-[11px] text-brand-700 flex items-center gap-1'>
						<Info className='flex-shrink-0 w-3 h-3' />
						Creating split order from Order No:{" "}
						<span className='font-mono font-semibold'>
							{originalOrder.soNumber}
						</span>
						<span className='mx-1 text-muted-foreground'>·</span>
						Reference:{" "}
						<span className='font-mono'>{originalOrder.soNumber}</span>
						<span className='mx-1 text-muted-foreground'>·</span>
						Split From ID: <span className='font-mono'>{originalOrder.id}</span>
					</p>
				)}

				{needsApproval && (mode === "add" || mode === "split") && (
					<p className='text-[11px] text-amber-700 flex items-center gap-1'>
						<Info className='flex-shrink-0 w-3 h-3' />
						Total &gt; ₹{ORDER_APPROVAL_THRESHOLD.toLocaleString("en-IN")} —
						submits as Pending Approval.
					</p>
				)}

				{selectedCustomer &&
					isSezGstCategory(
						selectedCustomer.gstCategory ||
							(selectedCustomer.gstApplicable ? "regular" : "unregistered"),
					) && (
						<div className='rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1'>
							<p className='text-xs font-medium text-foreground'>
								SEZ Customer
								{sezLutResolution.appliesLut
									? " — Supply under LUT (IGST not charged)"
									: " — IGST will be charged"}
							</p>
							{sezLutResolution.appliesLut ? (
								<>
									<p className='text-[11px] font-mono text-muted-foreground'>
										LUT: {sezLutResolution.lutNumber}
									</p>
									<p className='text-[11px] font-medium text-brand-800'>
										{sezLutResolution.declaration ?? LUT_SUPPLY_DECLARATION}
									</p>
								</>
							) : (
								<p className='text-[11px] text-muted-foreground'>
									No active LUT for company GSTIN and financial year.
								</p>
							)}
						</div>
					)}

				<SectionDivider title='Bill To / Ship To' />
				<BillToShipToSection
					addresses={customerAddresses}
					billToAddressId={form.billToAddressId ?? ""}
					shipToAddressId={form.shipToAddressId ?? ""}
					onBillToChange={(id) => set("billToAddressId", id)}
					onShipToChange={(id) => set("shipToAddressId", id)}
					errors={{
						billToAddressId: errors.billToAddressId,
						shipToAddressId: errors.shipToAddressId,
					}}
				/>

				<SectionDivider title='Products' />
				{mode === "split" && originalOrder && (
					<div className='flex items-center justify-end'>
						<ImportFromOriginalPopover
							originalOrder={originalOrder}
							form={form}
							onChange={onChange}
							taxSupplyType={taxSupplyType}
							zeroGst={sezLutResolution.appliesLut}
						/>
					</div>
				)}
				<ProductLinesEditor
					lines={form.lineItems}
					products={products}
					onChange={(lines) => set("lineItems", lines)}
					error={errors.lineItems}
					zeroGst={sezLutResolution.appliesLut}
					pricingContext={pricingContext}
					taxSupplyType={taxSupplyType}
				/>

				<AdditionalExpensesEditor
					expenses={form.additionalExpenses ?? []}
					onChange={(additionalExpenses) => set("additionalExpenses", additionalExpenses)}
				/>

				<SectionDivider title='Total Summary' />
				<div className='flex justify-start'>
					<div className='w-full max-w-md overflow-hidden border rounded-lg border-border bg-muted/20'>
						<div className='divide-y divide-border/60'>
							{[
								{
									label: "Product Subtotal:",
									value: formatRupee(totalsSummary.productSubtotal),
								},
								{
									label: "Product Discount Total:",
									value: formatRupee(totalsSummary.productDiscountTotal),
								},
								{
									label: "Additional Expenses Total:",
									value: formatRupee(totalsSummary.additionalExpensesTotal),
								},
								{
									label: "Expense Discount Total:",
									value: formatRupee(totalsSummary.expenseDiscountTotal),
								},
								{
									label: "Taxable Amount:",
									value: formatRupee(totalsSummary.taxableAmount),
								},
								...(totalsSummary.taxSupplyType === "intra"
									? [
											{
												label: "CGST Total:",
												value: formatRupee(totalsSummary.cgstTotal),
											},
											{
												label: "SGST Total:",
												value: formatRupee(totalsSummary.sgstTotal),
											},
										]
									: [
											{
												label: "IGST Total:",
												value: formatRupee(totalsSummary.igstTotal),
											},
										]),
							].map((row) => (
								<div
									key={row.label}
									className='flex items-center justify-between gap-6 px-3 py-2 text-xs'
								>
									<span className='text-muted-foreground'>{row.label}</span>
									<span className='font-medium text-foreground tabular-nums'>
										{row.value}
									</span>
								</div>
							))}
							<div className='flex items-center justify-between gap-6 px-3 py-2.5 bg-brand-50/50'>
								<span className='text-xs font-semibold text-foreground'>
									Grand Total:
								</span>
								<span className='text-sm font-bold text-brand-700 tabular-nums'>
									{formatRupee(totalsSummary.grandTotal)}
								</span>
							</div>
						</div>
					</div>
				</div>

				{mode === "edit" && auditInfo && (
					<div className='bg-muted/30 rounded-xl p-3 space-y-2 text-[11px]'>
						<p className='font-semibold text-muted-foreground uppercase tracking-wider text-[10px]'>
							Record Info
						</p>
						<div className='grid grid-cols-2 gap-y-1.5 gap-x-4'>
							<div>
								<span className='text-muted-foreground'>Created By</span>
								<p className='font-medium'>{auditInfo.createdBy}</p>
							</div>
							<div>
								<span className='text-muted-foreground'>Created Date</span>
								<p className='font-medium'>{auditInfo.createdDate}</p>
							</div>
							<div>
								<span className='text-muted-foreground'>Updated By</span>
								<p className='font-medium'>{auditInfo.updatedBy}</p>
							</div>
							<div>
								<span className='text-muted-foreground'>Updated Date</span>
								<p className='font-medium'>{auditInfo.updatedDate}</p>
							</div>
						</div>
					</div>
				)}
			</div>

			<CustomerInfoDialog
				customer={selectedCustomer}
				open={customerInfoOpen}
				onOpenChange={setCustomerInfoOpen}
			/>
		</>
	);
}
