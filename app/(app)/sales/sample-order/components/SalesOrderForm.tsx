"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, AlertCircle, Search } from "lucide-react";
import type { Employee } from "@/app/(app)/user-management/employee/employee-data";
import {
	loadWarehouses,
	type WarehouseMaster,
} from "@/app/(app)/masters/warehouse/warehouse-data";
import ProductLinesEditor from "./ProductLinesEditor";
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
} from "../orders-data";

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
	if (!form.salesManId) e.salesManId = "Salesperson is required";
	if (!form.warehouseId) e.warehouseId = "Source Warehouse is required";
	if (!form.orderDate) e.orderDate = "Order date is required";

	const activeLines = form.lineItems.filter((l) => l.productId && l.quantity > 0);
	if (activeLines.length === 0) {
		e.lineItems = "Add at least one product";
	} else {
		const overStock = activeLines.find((l) => l.quantity > l.availableStock);
		if (overStock) {
			e.lineItems = `Quantity cannot exceed available stock for ${overStock.productName}`;
		}
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
		if (!line.splitSourceLineId || !line.productId || line.quantity <= 0) continue;
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

interface SalesOrderFormProps {
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

export default function SalesOrderForm({
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
}: SalesOrderFormProps) {
	const warehouses = useMemo(() => {
		return loadWarehouses().filter((w) => w.status === "active");
	}, []);

	const set = <K extends keyof SalesOrderFormValues>(
		key: K,
		val: SalesOrderFormValues[K],
	) => onChange({ ...form, [key]: val });

	const activeLines = form.lineItems
		.filter((line) => line.productId && line.quantity > 0)
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
						value={form.warehouseId ?? null}
						onChange={(id) => set("warehouseId", id)}
						options={warehouses}
						placeholder="Select source warehouse…"
						error={errors.warehouseId}
						getLabel={(w) => `${w.warehouseCode} — ${w.warehouseName}`}
						getSublabel={(w) => w.state}
					/>
				</div>

				<div className="space-y-1 md:col-span-2">
					<SearchableDropdown<Employee>
						label="Salesperson"
						required
						value={form.salesManId}
						onChange={(id) => set("salesManId", id)}
						options={salesmen}
						placeholder="Select salesperson…"
						error={errors.salesManId}
						getLabel={(s) => `${s.employeeId} — ${s.fullName}`}
						getSublabel={(s) => `${s.role} · ${s.department}`}
					/>
				</div>

				{(showStatus && mode === "edit") || mode === "split" ? (
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

			{mode === "split" && originalOrder && (
				<p className="text-[11px] text-brand-700">
					Creating split order from{" "}
					<span className="font-mono font-semibold">{originalOrder.soNumber}</span>
				</p>
			)}

			<div className="space-y-1.5">
				<SectionDivider title="Bill To" />
				<div className="rounded-xl border border-border bg-muted/20 px-4 py-3 space-y-2.5">
					<p className="text-sm font-semibold text-foreground">
						{SAMPLE_BILLING_DETAILS.companyName}
					</p>
					<p className="text-[13px] text-foreground leading-relaxed max-w-2xl">
						{SAMPLE_BILLING_DETAILS.address}
					</p>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-border/60">
						<div>
							<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
								GSTIN
							</p>
							<p className="text-xs font-mono text-foreground">
								{SAMPLE_BILLING_DETAILS.gstin}
							</p>
						</div>
						<div>
							<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
								Mobile
							</p>
							<p className="text-xs text-foreground">{SAMPLE_BILLING_DETAILS.mobile}</p>
						</div>
						<div>
							<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
								Contact No.
							</p>
							<p className="text-xs text-foreground">{SAMPLE_BILLING_DETAILS.contactNo}</p>
						</div>
					</div>
				</div>

				<ProductLinesEditor
					lines={form.lineItems}
					products={products}
					onChange={(lines) => set("lineItems", lines)}
					error={errors.lineItems}
					sampleMode
					showHeader
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
