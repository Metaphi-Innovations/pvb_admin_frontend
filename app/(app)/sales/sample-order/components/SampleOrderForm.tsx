"use client";

import React, { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, AlertCircle, Search, Info } from "lucide-react";
import type { Employee } from "@/app/(app)/user-management/employee/employee-data";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import {
	customerMatchesTransactionSearch,
	formatCustomerDropdownLabel,
	formatCustomerDropdownSublabel,
} from "@/lib/masters/entity-display";
import { useCustomerDetails, useCustomersDropdown, useWarehousesDropdown, useProductPricingDropdown } from "@/hooks/sales/use-sales-orders";
import { setDynamicPricingRecords } from "@/app/(app)/masters/pricing/pricing-data";
import {
	loadWarehouses,
	type WarehouseMaster,
} from "@/app/(app)/masters/warehouse/warehouse-data";
import ProductLinesEditor from "./ProductLinesEditor";
import BillToShipToSection from "@/app/(app)/sales/orders/components/BillToShipToSection";
import {
	getCustomerAddressesForSalesOrder,
	getDefaultBillShipAddressIds,
} from "@/app/(app)/sales/orders/sales-order-address-utils";
import {
	type SalesOrder,
	type SalesOrderFormValues,
	type ProductCatalogItem,
	type OrderStatus,
	SAMPLE_BILLING_DETAILS,
	EDITABLE_ORDER_STATUSES,
	ORDER_STATUS_OPTIONS,
	calculateOrderTotalsSummary,
	recalculateSampleOrderLineItem,
	repriceSampleOrderLineItems,
} from "../orders-data";

export type { SalesOrderFormValues };

function SearchableDropdown<T extends { id: number | string }>({
	label,
	required,
	value,
	onChange,
	options,
	placeholder,
	error,
	getLabel,
	getSublabel,
}: {
	label: string;
	required?: boolean;
	value: number | string | null;
	onChange: (id: any) => void;
	options: T[];
	placeholder: string;
	error?: string;
	getLabel: (opt: T) => string;
	getSublabel?: (opt: T) => string;
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const selected =
		value !== null && value !== undefined
			? options.find((o) => String(o.id) === String(value))
			: undefined;
	const filtered = options.filter((o) =>
		getLabel(o).toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<div className="space-y-1">
			{label ? (
				<Label className="text-xs font-medium">
					{label} {required && <span className="text-red-500">*</span>}
				</Label>
			) : null}
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
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
						<ChevronsUpDown className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
					</button>
				</PopoverTrigger>
				<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
					<div className="p-2 border-b border-border">
						<div className="relative">
							<Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
							<Input
								placeholder="Search…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="h-8 pl-8 text-xs"
							/>
						</div>
					</div>
					<div className="max-h-[220px] overflow-y-auto">
						{filtered.map((opt) => (
							<button
								key={opt.id}
								type="button"
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
								<span className="flex-1 min-w-0">
									<span className="block truncate">{getLabel(opt)}</span>
									{getSublabel?.(opt) && (
										<span className="block text-[10px] text-muted-foreground truncate mt-0.5">
											{getSublabel(opt)}
										</span>
									)}
								</span>
								{selected && selected.id === opt.id && (
									<Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 ml-auto" />
								)}
							</button>
						))}
						{filtered.length === 0 && (
							<p className="px-3 py-3 text-xs text-center text-muted-foreground">
								No results found
							</p>
						)}
					</div>
				</PopoverContent>
			</Popover>
			{error && (
				<p className="flex items-center gap-1 text-xs text-red-500">
					<AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
				</p>
			)}
		</div>
	);
}

function SectionDivider({ title }: { title: string }) {
	return (
		<div className="pb-1 border-b border-border">
			<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
					type="button"
					className="w-full h-8 px-2.5 text-xs text-left border border-border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30"
				>
					<span>{selected?.label ?? value}</span>
					<ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-[--radix-popover-trigger-width] p-1">
				{options.map((opt) => (
					<button
						key={opt.value}
						type="button"
						onClick={() => {
							onChange(opt.value);
							setOpen(false);
						}}
						className={cn(
							"w-full flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg hover:bg-muted/60",
							value === opt.value && "bg-brand-50",
						)}
					>
						<span className="flex-1">{opt.label}</span>
						{value === opt.value && (
							<Check className="w-3.5 h-3.5 text-brand-600" />
						)}
					</button>
				))}
			</PopoverContent>
		</Popover>
	);
}

export function validateSalesOrderForm(
	form: SalesOrderFormValues,
): Record<string, string> {
	const e: Record<string, string> = {};
	if (!form.customerId) e.customerId = "Customer is required";
	if (!form.salesManId) e.salesManId = "Salesperson is required";
	if (!form.warehouseId) e.warehouseId = "Source Warehouse is required";
	if (!form.billToAddressId) e.billToAddressId = "Bill To address is required";
	if (!form.shipToAddressId) e.shipToAddressId = "Ship To address is required";
	if (!form.orderDate) e.orderDate = "Order date is required";

	const activeLines = form.lineItems.filter((l: any) => l.productId && l.quantity > 0);
	if (activeLines.length === 0) {
		e.lineItems = "Add at least one product";
	}
	return e;
}

interface SampleOrderFormProps {
	mode: "add" | "edit" | "split";
	orderNumber: string;
	form: SalesOrderFormValues;
	onChange: (form: SalesOrderFormValues) => void;
	errors: Record<string, string>;
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

export default function SampleOrderForm({
	mode,
	orderNumber,
	form,
	onChange,
	errors,
	salesmen,
	products,
	showStatus = false,
	originalOrder,
	auditInfo,
}: SampleOrderFormProps) {
	const { data: customerData } = useCustomersDropdown();
	const { data: customerDetails } = useCustomerDetails(
		form.customerId ? String(form.customerId) : null,
	);
	const { data: backendWarehousesData } = useWarehousesDropdown();
	const { data: pricingData } = useProductPricingDropdown();

	useEffect(() => {
		if (pricingData) {
			const mapped = pricingData.map((pr: any) => ({
				id: pr.id,
				productId: pr.product_id,
				state: pr.state_name,
				customerType: pr.customer_type?.customer_type_name || "",
				status: pr.is_active ? "active" : "inactive",
				dealerPrice: Number(pr.dealer_price || 0),
				costPrice: Number(pr.cost_price || 0),
			}));
			setDynamicPricingRecords(mapped as any);
		} else {
			setDynamicPricingRecords(null);
		}
	}, [pricingData]);

	const customers = useMemo(() => {
		if (!customerData) return [];
		return customerData.map((c: any) => ({
			id: c.customer_id,
			customerCode: c.customer_code,
			customerName: c.customer_name,
			customerType: c.customer_type?.customer_type_name || "",
			status: c.is_active ? "active" : "inactive",
			mobile: c.mobile_no || "",
			email: c.email || "",
			gstApplicable: c.gst_applicable,
			gstin: c.gstin_no || "",
			registeredLegalName: c.registered_legal_name || "",
			registeredAddress: c.registered_gst_address || "",
			pan: c.pan_no || "",
			paymentType: c.payment_type || "Credit",
			creditLimit: Number(c.credit_limit || 0),
			creditDays: Number(c.credit_days || 0),
			branches: [],
			stateName: c.registered_gst_state || c.state_name || c.state || "",
			salesManId: c.salesman_id || c.sales_man_id || null,
		}));
	}, [customerData]);

	const selectedCustomer = useMemo(() => {
		const base = customers.find((c) => String(c.id) === String(form.customerId)) ?? null;
		if (!base) return null;
		if (customerDetails) {
			const branches = (customerDetails.branches || []).map((b: any, index: number) => ({
				branchName: b.branch_name,
				isMain: b.is_main_branch,
				billingAddress: {
					address: `${b.billing_address_line_1 || ""} ${b.billing_address_line_2 || ""}`.trim(),
					city: b.billing_city || "",
					state: b.billing_state || "",
					pincode: b.billing_pincode || "",
					gstin: customerDetails.gstin_no || "",
				},
				shippingAddress: {
					address: `${b.shipping_address_line_1 || ""} ${b.shipping_address_line_2 || ""}`.trim(),
					city: b.shipping_city || "",
					state: b.shipping_state || "",
					pincode: b.shipping_pincode || "",
					gstin: customerDetails.gstin_no || "",
				},
			}));
			const mainBranch = branches.find((br: any) => br.isMain) || branches[0] || null;
			const stateName = mainBranch?.billingAddress.state || base.stateName || "";
			return {
				...base,
				branches,
				stateName,
				mobile: customerDetails.mobile_no || base.mobile,
				email: customerDetails.email || base.email,
				gstApplicable: customerDetails.gst_applicable ?? base.gstApplicable,
				gstin: customerDetails.gstin_no || base.gstin,
				registeredLegalName: customerDetails.registered_legal_name || base.registeredLegalName,
				registeredAddress: customerDetails.registered_gst_address || base.registeredAddress,
				pan: customerDetails.pan_no || base.pan,
				creditLimit: Number(customerDetails.credit_limit ?? base.creditLimit),
				creditDays: Number(customerDetails.credit_days ?? base.creditDays),
			};
		}
		return base;
	}, [customers, form.customerId, customerDetails]);

	const customerAddresses = useMemo(
		() => (selectedCustomer ? getCustomerAddressesForSalesOrder(selectedCustomer as any) : []),
		[selectedCustomer],
	);

	const billToAddresses = useMemo(() => {
		return customerAddresses.filter((a) => a.id.includes("billing") || a.id.includes("registered") || a.id.includes("main"));
	}, [customerAddresses]);

	const shipToAddresses = useMemo(() => {
		return customerAddresses.filter((a) => a.id.includes("shipping") || a.id.includes("registered") || a.id.includes("main"));
	}, [customerAddresses]);

	const shipToAddress = useMemo(
		() => customerAddresses.find((a) => a.id === form.shipToAddressId) ?? null,
		[customerAddresses, form.shipToAddressId],
	);

	const pricingContext = useMemo(() => {
		if (!selectedCustomer) return null;
		const stateName = shipToAddress?.state || selectedCustomer.stateName || "";
		return {
			stateName,
			customerMasterType: selectedCustomer.customerType || "",
			orderDate: form.orderDate,
		};
	}, [selectedCustomer, shipToAddress, form.orderDate]);

	useEffect(() => {
		if (!selectedCustomer || customerAddresses.length === 0) return;
		const billValid = customerAddresses.some((a) => a.id === form.billToAddressId);
		const shipValid = customerAddresses.some((a) => a.id === form.shipToAddressId);
		if (billValid && shipValid) return;
		const defaults = getDefaultBillShipAddressIds(customerAddresses);
		onChange({
			...form,
			billToAddressId: form.billToAddressId || defaults.billToAddressId,
			shipToAddressId: form.shipToAddressId || defaults.shipToAddressId,
		});
	}, [selectedCustomer, customerAddresses, form.billToAddressId, form.shipToAddressId, onChange, form]);

	const warehouses = useMemo(() => {
		return (backendWarehousesData || []).map((w: any) => ({
			id: w.warehouse_id,
			warehouseName: w.warehouse_name,
			warehouseCode: w.warehouse_code,
			status: w.status?.toLowerCase() || "active",
			state: w.state || "",
		})).filter((w) => w.status === "active") as any;
	}, [backendWarehousesData]);

	const set = <K extends keyof SalesOrderFormValues>(
		key: K,
		val: SalesOrderFormValues[K],
	) => onChange({ ...form, [key]: val });

	const activeLines = form.lineItems
		.filter((line: any) => line.productId && line.quantity > 0)
		.map(recalculateSampleOrderLineItem);
	const totals = calculateOrderTotalsSummary(activeLines);

	const formatRupee = (value: number) =>
		`₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

	return (
		<div className="p-4 space-y-3 bg-white border shadow-sm rounded-xl border-border">
			<SectionDivider title="Sample Order" />
			<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
				<div className="space-y-1">
					<Label className="text-xs font-medium">Sample Order No.</Label>
					<div className="h-8 px-2.5 border border-border rounded-lg bg-muted/30 flex items-center">
						<span className="font-mono text-xs font-semibold text-brand-700">
							{orderNumber}
						</span>
					</div>
				</div>

				<div className="space-y-1">
					<Label className="text-xs font-medium">
						Order Date <span className="text-red-500">*</span>
					</Label>
					<Input
						type="date"
						value={form.orderDate}
						onChange={(e) => set("orderDate", e.target.value)}
						className={cn("h-8 text-xs rounded-lg", errors.orderDate && "border-red-400")}
					/>
					{errors.orderDate && (
						<p className="text-[11px] text-red-500">{errors.orderDate}</p>
					)}
				</div>

				<div className="space-y-1 md:col-span-2">
					<SearchableDropdown<WarehouseMaster>
						label="Source Warehouse"
						required
						value={form.warehouseId !== undefined && form.warehouseId !== null ? form.warehouseId : null}
						onChange={(id) => set("warehouseId", id)}
						options={warehouses}
						placeholder="Select source warehouse…"
						error={errors.warehouseId}
						getLabel={(w) => w.warehouseCode ? `${w.warehouseCode} — ${w.warehouseName}` : w.warehouseName}
						getSublabel={(w) => w.state}
					/>
				</div>

				<div className="space-y-1 md:col-span-2 col-span-2">
					<Label className="text-xs font-medium">
						Customer <span className="text-red-500">*</span>
					</Label>
					<SearchableDropdown<any>
						label=""
						required
						value={form.customerId !== undefined && form.customerId !== null ? form.customerId : null}
						onChange={(id) => {
							const c = customers.find((x) => x.id === id) as any;
							const addressDefaults = c
								? getDefaultBillShipAddressIds(
										getCustomerAddressesForSalesOrder(c as any),
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
							if (c?.stateName && c.customerType) {
								updatedForm.lineItems = repriceSampleOrderLineItems(
									form.lineItems,
									{
										stateName: c.stateName,
										customerMasterType: c.customerType,
									}
								);
							}
							onChange(updatedForm);
						}}
						options={customers as any}
						placeholder="Select customer…"
						error={errors.customerId}
						getLabel={formatCustomerDropdownLabel}
						getSublabel={formatCustomerDropdownSublabel}
					/>
				</div>

				<div className="space-y-1 md:col-span-2">
					<SearchableDropdown<Employee>
						label="Salesperson"
						required
						value={form.salesManId !== undefined && form.salesManId !== null ? form.salesManId : null}
						onChange={(id) => set("salesManId", id)}
						options={salesmen}
						placeholder="Select salesperson…"
						error={errors.salesManId}
						getLabel={(s) => s.employeeId ? `${s.employeeId} — ${s.fullName}` : s.fullName}
						getSublabel={(s) => `${s.role} · ${s.department}`}
					/>
				</div>

				{showStatus && mode === "edit" ? (
					<div className="space-y-1 md:col-span-2">
						<Label className="text-xs font-medium">Order Status</Label>
						<StatusSelect
							value={form.status}
							onChange={(s) => set("status", s)}
							allowedStatuses={EDITABLE_ORDER_STATUSES}
						/>
					</div>
				) : null}
			</div>

			<div className="space-y-1">
				<Label className="text-xs font-medium">Remarks</Label>
				<Textarea
					value={form.remarks}
					onChange={(e) => set("remarks", e.target.value)}
					placeholder="Optional notes for this sample order…"
					rows={2}
					className="text-xs rounded-lg border border-border resize-none min-h-[56px]"
				/>
			</div>

			<div className="space-y-1.5">
				{selectedCustomer && (
					<BillToShipToSection
						billToAddressId={form.billToAddressId ?? ""}
						shipToAddressId={form.shipToAddressId ?? ""}
						onBillToChange={(id) => set("billToAddressId", id)}
						onShipToChange={(id) => {
							const addr = shipToAddresses.find((a) => a.id === id);
							const stateName = addr?.state || selectedCustomer?.stateName || "";
							const nextForm = { ...form, shipToAddressId: id };
							if (selectedCustomer?.customerType) {
								nextForm.lineItems = repriceSampleOrderLineItems(
									form.lineItems,
									{
										stateName,
										customerMasterType: selectedCustomer.customerType,
									}
								);
							}
							onChange(nextForm);
						}}
						billOptions={billToAddresses}
						shipOptions={shipToAddresses}
						errors={errors}
					/>
				)}

				<ProductLinesEditor
					lines={form.lineItems}
					products={products}
					onChange={(lines) => set("lineItems", lines)}
					error={errors.lineItems}
					sampleMode
					showHeader
					pricingContext={pricingContext}
				/>
			</div>

			<SectionDivider title="Total Summary" />
			<div className="flex justify-end pt-0">
				<div className="w-full max-w-md overflow-hidden border rounded-lg border-border bg-muted/20">
					<div className="divide-y divide-border/60">
						{[
							{ label: "Product Subtotal", value: totals.productSubtotal },
							{ label: "Product Discount Total", value: totals.productDiscountTotal },
							{ label: "Taxable Amount", value: totals.taxableAmount },
						].map(({ label, value }) => (
							<div
								key={label}
								className="flex items-center justify-between gap-6 px-3 py-2 text-xs"
							>
								<span className="text-muted-foreground">{label}:</span>
								<span className="font-medium text-foreground tabular-nums">
									{formatRupee(value)}
								</span>
							</div>
						))}
						<div className="flex items-center justify-between gap-6 px-3 py-2.5 bg-brand-50/50">
							<span className="text-xs font-semibold text-foreground">Grand Total:</span>
							<span className="text-sm font-bold text-brand-700 tabular-nums">
								{formatRupee(totals.grandTotal)}
							</span>
						</div>
					</div>
				</div>
			</div>

			{mode === "edit" && auditInfo && (
				<div className="bg-muted/30 rounded-xl p-3 space-y-2 text-[11px]">
					<p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
						Record Info
					</p>
					<div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
						<div>
							<span className="text-muted-foreground">Created By</span>
							<p className="font-medium">{auditInfo.createdBy}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Created Date</span>
							<p className="font-medium">{auditInfo.createdDate}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Updated By</span>
							<p className="font-medium">{auditInfo.updatedBy}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Updated Date</span>
							<p className="font-medium">{auditInfo.updatedDate}</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
