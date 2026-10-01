"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
	Info,
	Upload,
	Trash2,
} from "lucide-react";
import { COMPANY_BILLING, PAYMENT_TERMS_OPTIONS } from "@/lib/procurement/config";
import {
	calcPackingToBaseQty,
	enrichProductForProcurement,
} from "@/lib/procurement/procurement-line-utils";
import { stateSelectOptions, warehouseSelectOptions } from "@/lib/procurement/warehouse-filter";
import {
	applyTaxSupplyToRates,
	lineNeedsTaxSupplyUpdate,
	resolveTaxSupplyType,
	type TaxSupplyType,
} from "@/lib/procurement/utils";
import {
	applyGstMasterToTaxRates,
	findGstMasterIdByTotalPct,
	getDefaultGstMasterId,
} from "@/lib/procurement/gst-master-utils";
import { loadWarehouses } from "@/app/(app)/masters/warehouse/warehouse-data";
import { resolvePurchaseCostPrice } from "@/lib/pricing/resolve-pricing";
import { AdditionalChargesEditor, ProcurementTotalSummary } from "@/components/procurement/AdditionalChargesEditor";
import BillToShipToSection from "@/app/(app)/sales/orders/components/BillToShipToSection";
import { getActiveSuppliers } from "../../masters/suppliers/supplier-data";
import { getPRById, loadPurchaseRequests } from "../../purchase-requests/pr-data";
import type { POLineItem, POAttachment, PurchaseOrder } from "../po-data";
import { enrichPOLineItem, recalcPO } from "../po-data";
import {
	findPOAddressById,
	getDefaultPOBillShipIds,
	getPOBillToAddresses,
	getPOShipToAddresses,
} from "../po-address-utils";
import { POLineItemsSection } from "./POLineItemsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";

export type POFormValues = Omit<
	PurchaseOrder,
	| "id"
	| "poNumber"
	| "summary"
	| "createdBy"
	| "createdDate"
	| "updatedBy"
	| "updatedDate"
	| "approvedBy"
	| "approvedDate"
	| "activity"
	| "status"
>;

export function emptyPOLine(): POLineItem {
	return {
		uid: `pl-${Date.now()}`,
		productId: 0,
		productCode: "",
		productName: "",
		description: "",
		sku: "",
		category: "",
		hsnCode: "",
		baseUnit: "Unit",
		packagingUnit: "Box",
		conversionQty: 1,
		orderUom: "Unit",
		orderedQtyPack: 1,
		uom: "Unit",
		orderedQty: 1,
		unitPrice: 0,
		discountType: "percentage",
		discountPct: 0,
		discountFlatAmount: 0,
		discountAmount: 0,
		cgstPct: 9,
		sgstPct: 9,
		igstPct: 0,
		grossAmount: 0,
		taxAmount: 0,
		netAmount: 0,
		deliverySchedule: "",
		remarks: "",
		cpSource: "pricing_master",
	};
}

function paymentTermDays(term: string): number {
	const m = term.match(/(\d+)/);
	return m ? Number(m[1]) : 0;
}

export function defaultPOForm(sourcePrId: number | null = null): POFormValues {
	const pr = sourcePrId ? getPRById(sourcePrId) : null;
	const supplier = getActiveSuppliers()[0];

	const lines =
		pr?.lines.map((l) => {
			const info = enrichProductForProcurement(l.productId);
			const cp = resolvePurchaseCostPrice(l.productId, supplier?.id);
			const orderUom = l.requestUom ?? "Unit";
			const orderedQtyPack = l.requestedQty;
			const orderedQty = l.totalQtyBase ?? calcPackingToBaseQty(orderedQtyPack, info?.conversionQty ?? 1);
			return {
				...emptyPOLine(),
				uid: `pl-${l.uid}`,
				productId: l.productId,
				productCode: info?.productCode ?? l.productCode,
				productName: info?.productName ?? l.productName,
				description: l.description,
				sku: info?.sku ?? l.sku,
				category: info?.category ?? l.category,
				hsnCode: info?.hsnCode ?? l.hsnCode,
				baseUnit: info?.baseUnit ?? "Unit",
				packagingUnit: info?.packagingUnit ?? "Box",
				conversionQty: info?.conversionQty ?? 1,
				orderUom,
				orderedQtyPack,
				uom: orderUom,
				orderedQty,
				unitPrice: cp.amount,
				cpSource: cp.source,
				remarks: l.remarks ?? "",
				prLineUid: l.uid,
			};
		}) ?? [];

	const paymentTerms = "net-30";
	const wh = pr?.warehouseId ? loadWarehouses().find((w) => w.id === pr.warehouseId) : null;
	const billToAddresses = getPOBillToAddresses();
	const shipToAddresses = getPOShipToAddresses();
	const addressDefaults = getDefaultPOBillShipIds(
		billToAddresses,
		shipToAddresses,
		pr?.warehouseId,
	);
	return {
		poDate: new Date().toISOString().slice(0, 10),
		supplierId: supplier?.id ?? 0,
		supplierName: supplier?.supplierName ?? "",
		supplierType: supplier?.supplierType ?? "",
		supplierContactPerson: supplier?.contactPerson ?? "",
		supplierMobile: supplier?.mobile || supplier?.phone || "",
		supplierMobileCountry: "+91",
		supplierEmail: supplier?.email ?? "",
		supplierGstin: supplier?.gstNumber ?? "",
		referenceNumber: "",
		currency: "INR",
		paymentTerms,
		creditDays: paymentTermDays(paymentTerms),
		deliveryTerms: "",
		expectedDeliveryDate: "",
		state: pr?.state ?? "",
		warehouseId: pr?.warehouseId ?? null,
		warehouseName: pr?.warehouseName ?? wh?.warehouseName ?? "",
		deliveryAddress: wh?.address ?? "",
		notes: pr?.remarks ?? "",
		sourcePrId: pr?.id ?? null,
		sourcePrNumber: pr?.prNumber ?? "",
		billToAddressId: addressDefaults.billToAddressId,
		shipToAddressId: addressDefaults.shipToAddressId,
		billing: { ...COMPANY_BILLING },
		shipping: {
			shipToLocation: "Pune Warehouse",
			branch: "hq-pune",
			address: "Warehouse 2, Hinjawadi, Pune",
			contactPerson: "Warehouse Manager",
			contactNumber: "9876500000",
			sameAsBilling: false,
		},
		lines,
		terms: [],
		attachments: [],
		additionalCharges: [],
		otherCharges: 0,
	};
}

export function poToFormValues(po: PurchaseOrder): POFormValues {
	const {
		id: _id,
		poNumber: _poNumber,
		summary: _summary,
		status: _status,
		createdBy: _cb,
		createdDate: _cd,
		updatedBy: _ub,
		updatedDate: _ud,
		approvedBy: _ab,
		approvedDate: _ad,
		activity: _activity,
		...rest
	} = po;
	return {
		...rest,
		lines: po.lines.map((l) => enrichPOLineItem({ ...l })),
		supplierContactPerson: po.supplierContactPerson ?? "",
		supplierMobile: po.supplierMobile ?? "",
		supplierMobileCountry: po.supplierMobileCountry ?? "+91",
		supplierEmail: po.supplierEmail ?? "",
		supplierGstin: po.supplierGstin ?? "",
	};
}

function SectionHead({ label, sub, required }: { label: string; sub?: string; required?: boolean }) {
	return (
		<div className="mb-3 pb-2 border-b border-border">
			<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
				{label}
				{required && <span className="text-red-500 ml-1">*</span>}
			</p>
			{sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
		</div>
	);
}

const inputCls = "h-8 rounded-lg text-xs";
const readOnlyCls = cn(inputCls, "bg-muted/30 text-foreground");

function ReadOnlyField({ value }: { value: string }) {
	return (
		<Input value={value || "—"} readOnly className={readOnlyCls} />
	);
}

function formatDisplayDate(iso: string): string {
	if (!iso) return "—";
	const [y, m, d] = iso.split("-");
	if (!y || !m || !d) return iso;
	return `${d}-${m}-${y}`;
}

function paymentTermLabel(value: string): string {
	return PAYMENT_TERMS_OPTIONS.find((o) => o.value === value)?.label ?? (value || "—");
}

export function PurchaseOrderForm({
	form,
	onChange,
	readOnly,
	poNumber = "",
	status,
	submittedDate,
}: {
	form: POFormValues;
	onChange: (f: POFormValues) => void;
	poNumber?: string;
	readOnly?: boolean;
	status?: string;
	submittedDate?: string;
}) {
	const fileRef = useRef<HTMLInputElement>(null);

	const suppliers = getActiveSuppliers();
	const prList = loadPurchaseRequests().filter((p) =>
		["approved", "partially_converted"].includes(p.status),
	);

	const poType: "pr" | "direct" = form.sourcePrId ? "pr" : "direct";

	const preview = useMemo(
		() =>
			recalcPO({
				id: 0,
				poNumber: "",
				...form,
				summary: {
					grossAmount: 0,
					totalDiscount: 0,
					productTotal: 0,
					additionalChargesTotal: 0,
					taxableValue: 0,
					totalCgst: 0,
					totalSgst: 0,
					totalIgst: 0,
					otherCharges: 0,
					grandTotal: 0,
					amountInWords: "",
				},
				status: "draft",
				createdBy: "",
				createdDate: "",
				updatedBy: "",
				updatedDate: "",
				approvedBy: "",
				approvedDate: "",
				activity: [],
			}),
		[form],
	);

	const patch = (p: Partial<POFormValues>) => onChange({ ...form, ...p });

	const setType = (next: "pr" | "direct") => {
		if (readOnly) return;
		if (next === "direct") {
			patch({ sourcePrId: null, sourcePrNumber: "", lines: [] });
			return;
		}
		const pr = prList[0];
		if (pr) loadFromPR(pr.id);
	};

	const loadFromPR = (prId: number) => {
		const pr = getPRById(prId);
		if (!pr) return;
		const wh = pr.warehouseId ? loadWarehouses().find((w) => w.id === pr.warehouseId) : null;
		const lines = pr.lines.map((l) => {
			const info = enrichProductForProcurement(l.productId);
			const cp = resolvePurchaseCostPrice(l.productId, form.supplierId || undefined);
			const orderUom = l.requestUom ?? "Unit";
			const orderedQtyPack = l.requestedQty;
			const orderedQty = l.totalQtyBase ?? calcPackingToBaseQty(orderedQtyPack, info?.conversionQty ?? 1);
			return {
				...emptyPOLine(),
				uid: `pl-${l.uid}`,
				productId: l.productId,
				productCode: info?.productCode ?? l.productCode,
				productName: info?.productName ?? l.productName,
				description: l.description,
				sku: info?.sku ?? l.sku,
				category: info?.category ?? l.category,
				hsnCode: info?.hsnCode ?? l.hsnCode,
				baseUnit: info?.baseUnit ?? "Unit",
				packagingUnit: info?.packagingUnit ?? "Box",
				conversionQty: info?.conversionQty ?? 1,
				orderUom,
				orderedQtyPack,
				uom: orderUom,
				orderedQty,
				unitPrice: cp.amount,
				cpSource: cp.source,
				remarks: l.remarks ?? "",
				prLineUid: l.uid,
			};
		});
		patch({
			sourcePrId: pr.id,
			sourcePrNumber: pr.prNumber,
			state: pr.state,
			warehouseId: pr.warehouseId,
			warehouseName: pr.warehouseName,
			deliveryAddress: wh?.address ?? form.deliveryAddress,
			notes: pr.remarks,
			lines,
			deliveryTerms: `From ${pr.requestedBy} (${pr.prDate})`,
		});
	};

	const previewLines = preview.lines;

	const linkedPr = form.sourcePrId ? getPRById(form.sourcePrId) ?? null : null;
	const displayPoNo = poNumber || "Auto-generated";
	const totalGst =
		preview.summary.totalCgst +
		preview.summary.totalSgst +
		preview.summary.totalIgst;

	const stateOptions = useMemo(() => stateSelectOptions(), []);
	const warehouseOptions = useMemo(
		() => warehouseSelectOptions(form.state),
		[form.state],
	);

	const billToAddresses = useMemo(() => getPOBillToAddresses(), []);
	const shipToAddresses = useMemo(() => getPOShipToAddresses(), []);

	const billToAddress = useMemo(
		() => findPOAddressById(billToAddresses, form.billToAddressId ?? ""),
		[billToAddresses, form.billToAddressId],
	);

	const selectedWarehouse = useMemo(
		() => (form.warehouseId ? loadWarehouses().find((w) => w.id === form.warehouseId) ?? null : null),
		[form.warehouseId],
	);

	const taxSupplyType = useMemo((): TaxSupplyType => {
		const warehouseState = selectedWarehouse?.state ?? form.state ?? "";
		const billToState = billToAddress?.state ?? "";
		return resolveTaxSupplyType(warehouseState, billToState);
	}, [selectedWarehouse, billToAddress, form.state]);

	useEffect(() => {
		if (!form.supplierId) return;
		const billValid = billToAddresses.some((a) => a.id === form.billToAddressId);
		const shipValid = shipToAddresses.some((a) => a.id === form.shipToAddressId);
		if (billValid && shipValid) return;
		const defaults = getDefaultPOBillShipIds(
			billToAddresses,
			shipToAddresses,
			form.warehouseId,
		);
		onChange({
			...form,
			billToAddressId: billValid ? form.billToAddressId : defaults.billToAddressId,
			shipToAddressId: shipValid ? form.shipToAddressId : defaults.shipToAddressId,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps -- auto-select when supplier addresses load
	}, [form.supplierId, billToAddresses.length, shipToAddresses.length]);

	useEffect(() => {
		if (!form.supplierId || form.lines.length === 0) return;
		const needsUpdate = form.lines.some((l) =>
			lineNeedsTaxSupplyUpdate(l.cgstPct, l.sgstPct, l.igstPct, taxSupplyType),
		);
		if (!needsUpdate) return;
		onChange({
			...form,
			lines: form.lines.map((l) => {
				const totalGst = l.cgstPct + l.sgstPct + l.igstPct;
				return { ...l, ...applyTaxSupplyToRates(totalGst, taxSupplyType) };
			}),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps -- re-split GST when supply type changes
	}, [taxSupplyType, form.supplierId]);

	useEffect(() => {
		if (!form.additionalCharges?.length) return;
		const needsUpdate = form.additionalCharges.some((c) =>
			lineNeedsTaxSupplyUpdate(c.cgstPct ?? 0, c.sgstPct ?? 0, c.igstPct ?? 0, taxSupplyType),
		);
		if (!needsUpdate) return;
		patch({
			additionalCharges: form.additionalCharges.map((c) => {
				const totalGst = (c.cgstPct ?? 0) + (c.sgstPct ?? 0) + (c.igstPct ?? 0);
				const gstMasterId =
					c.gstMasterId ?? findGstMasterIdByTotalPct(totalGst) ?? getDefaultGstMasterId();
				return { ...c, ...applyGstMasterToTaxRates(gstMasterId, taxSupplyType) };
			}),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps -- re-split GST when supply type changes
	}, [taxSupplyType]);

	const onStateChange = (state: string) => {
		patch({ state, warehouseId: null, warehouseName: "", deliveryAddress: "" });
	};

	const onWarehouseChange = (val: string) => {
		const wh = loadWarehouses().find((w) => String(w.id) === val);
		const shipId = wh ? `ship-wh-${wh.id}` : form.shipToAddressId;
		const shipValid = shipToAddresses.some((a) => a.id === shipId);
		patch({
			warehouseId: wh?.id ?? null,
			warehouseName: wh?.warehouseName ?? "",
			deliveryAddress: wh?.address ?? form.deliveryAddress,
			shipToAddressId: shipValid ? shipId : form.shipToAddressId,
			shipping: {
				...form.shipping,
				shipToLocation: wh?.warehouseName ?? form.shipping.shipToLocation,
				address: wh?.address ?? form.shipping.address,
			},
		});
	};

	const productTotal = preview.summary.productTotal ?? preview.summary.taxableValue;

	const selectSupplier = (idStr: string) => {
		if (!idStr) {
			patch({
				supplierId: 0,
				supplierName: "",
				billToAddressId: "",
				shipToAddressId: "",
			});
			return;
		}
		const s = suppliers.find((x) => x.id === Number(idStr));
		if (!s) return;
		const defaults = getDefaultPOBillShipIds(
			billToAddresses,
			shipToAddresses,
			form.warehouseId,
		);
		patch({
			supplierId: s.id,
			supplierName: s.supplierName,
			supplierType: s.supplierType,
			supplierContactPerson: s.contactPerson || "",
			supplierMobile: s.mobile || s.phone || "",
			supplierEmail: s.email || "",
			supplierGstin: s.gstNumber || "",
			billToAddressId: form.billToAddressId || defaults.billToAddressId,
			shipToAddressId: form.shipToAddressId || defaults.shipToAddressId,
		});
	};

	const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		patch({
			attachments: [
				...form.attachments,
				{
					uid: `att-${Date.now()}`,
					name: file.name,
					size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
					uploadedAt: new Date().toISOString().slice(0, 10),
					uploadedBy: "Admin",
				} as POAttachment,
			],
		});
		e.target.value = "";
	};

	const prOptions = prList.map((p) => ({
		value: String(p.id),
		label: p.prNumber,
	}));
	const supplierOptions = suppliers.map((s) => ({
		value: String(s.id),
		label: `${s.supplierCode} | ${s.supplierName}`,
		sublabel: `Supplier Type: ${s.supplierType || "—"}`,
	}));

	const detailsGridCls = readOnly
		? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
		: "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5";

	return (
		<div className={cn("rounded-xl border border-border bg-white p-4 shadow-sm", readOnly && "w-full")}>
			<div className="space-y-4">
				{status === "pending_approval" && (
					<div className="flex items-start gap-2.5 rounded-[13px] border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] text-blue-800">
						<Info className="w-4 h-4 shrink-0 mt-0.5" />
						<p>
							This PO is pending approval from Area Manager.
							{submittedDate ? ` Submitted on ${submittedDate}.` : ""}
						</p>
					</div>
				)}

				{!readOnly && (
					<div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
						<label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
							<input
								type="radio"
								checked={poType === "pr"}
								onChange={() => setType("pr")}
							/>
							From Purchase Request
						</label>
						<label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
							<input
								type="radio"
								checked={poType === "direct"}
								onChange={() => setType("direct")}
							/>
							Direct Purchase Order
						</label>
					</div>
				)}

				<div>
					<SectionHead
						label="Order Details"
						sub="Core purchase order information and timeline details."
					/>
					<div className={detailsGridCls}>
						<div className="space-y-1">
							<Label className="text-xs font-medium">PO No.</Label>
							<Input
								value={displayPoNo}
								readOnly
								className={cn(inputCls, "bg-muted/30 font-mono text-muted-foreground")}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">PR Reference</Label>
							{readOnly ? (
								<ReadOnlyField value={form.sourcePrNumber} />
							) : (
								<AutocompleteSelect
									options={prOptions}
									value={form.sourcePrId ? String(form.sourcePrId) : ""}
									onChange={(v) => v && loadFromPR(Number(v))}
									placeholder="Select PR..."
									searchPlaceholder="Search PR..."
									disabled={poType === "direct"}
									className="h-8 rounded-lg text-xs"
								/>
							)}
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">Supplier</Label>
							{readOnly ? (
								<ReadOnlyField value={form.supplierName} />
							) : (
								<AutocompleteSelect
									options={supplierOptions}
									value={form.supplierId ? String(form.supplierId) : ""}
									onChange={selectSupplier}
									placeholder="Select supplier..."
									searchPlaceholder="Search supplier..."
									className="h-8 rounded-lg text-xs"
								/>
							)}
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">PO Date</Label>
							{readOnly ? (
								<ReadOnlyField value={formatDisplayDate(form.poDate)} />
							) : (
								<Input
									type="date"
									value={form.poDate}
									onChange={(e) => patch({ poDate: e.target.value })}
									className={inputCls}
								/>
							)}
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">Delivery Date</Label>
							{readOnly ? (
								<ReadOnlyField value={formatDisplayDate(form.expectedDeliveryDate)} />
							) : (
								<Input
									type="date"
									value={form.expectedDeliveryDate}
									onChange={(e) => patch({ expectedDeliveryDate: e.target.value })}
									className={inputCls}
								/>
							)}
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">Supplier Type</Label>
							<ReadOnlyField value={form.supplierType} />
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">Payment Terms</Label>
							{readOnly ? (
								<ReadOnlyField value={paymentTermLabel(form.paymentTerms)} />
							) : (
								<AutocompleteSelect
									options={PAYMENT_TERMS_OPTIONS}
									value={form.paymentTerms}
									onChange={(v) =>
										patch({
											paymentTerms: String(v),
											creditDays: paymentTermDays(String(v)),
										})
									}
									className={inputCls}
								/>
							)}
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">State</Label>
							{readOnly ? (
								<ReadOnlyField value={form.state} />
							) : (
								<AutocompleteSelect
									options={stateOptions}
									value={form.state}
									onChange={(v) => onStateChange(String(v))}
									placeholder="Select state"
									className={inputCls}
								/>
							)}
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">Warehouse</Label>
							{readOnly ? (
								<ReadOnlyField value={form.warehouseName} />
							) : (
								<AutocompleteSelect
									options={warehouseOptions}
									value={form.warehouseId ? String(form.warehouseId) : ""}
									onChange={(v) => onWarehouseChange(String(v))}
									disabled={!form.state}
									placeholder={form.state ? "Select warehouse" : "Select state first"}
									className={inputCls}
								/>
							)}
						</div>
					</div>
				</div>

				{form.supplierId > 0 && (
					<div className="border-t border-border/60 pt-4">
						<SectionHead label="Bill To / Ship To" required />
						<BillToShipToSection
							billOptions={billToAddresses}
							shipOptions={shipToAddresses}
							billToAddressId={form.billToAddressId ?? ""}
							shipToAddressId={form.shipToAddressId ?? ""}
							onBillToChange={(id) => {
								const addr = findPOAddressById(billToAddresses, id);
								patch({
									billToAddressId: id,
									billing: addr
										? {
												companyName: addr.companyName,
												billingAddress: [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pincode]
													.filter(Boolean)
													.join(", "),
												gstNumber: addr.gstin,
												state: addr.state,
												city: addr.city,
												pincode: addr.pincode,
											}
										: form.billing,
								});
							}}
							onShipToChange={(id) => {
								const addr = findPOAddressById(shipToAddresses, id);
								const whId = id.startsWith("ship-wh-") ? Number(id.replace("ship-wh-", "")) : null;
								const wh = whId ? loadWarehouses().find((w) => w.id === whId) : null;
								patch({
									shipToAddressId: id,
									...(wh
										? {
												warehouseId: wh.id,
												warehouseName: wh.warehouseName,
												state: wh.state,
												deliveryAddress: wh.address,
											}
										: {}),
									shipping: addr
										? {
												...form.shipping,
												shipToLocation: wh?.warehouseName ?? addr.label,
												address: [addr.addressLine1, addr.addressLine2].filter(Boolean).join(", "),
												contactPerson: form.shipping.contactPerson,
												contactNumber: addr.phone !== "—" ? addr.phone : form.shipping.contactNumber,
											}
										: form.shipping,
								});
							}}
						/>
					</div>
				)}

				<POLineItemsSection
					form={form}
					onChange={onChange}
					readOnly={readOnly}
					poType={poType}
					previewLines={previewLines}
					linkedPr={linkedPr}
					taxSupplyType={taxSupplyType}
				/>

				<div className="border-t border-border/60 pt-4">
					<AdditionalChargesEditor
						charges={form.additionalCharges ?? []}
						onChange={(charges) => patch({ additionalCharges: charges })}
						readOnly={readOnly}
						taxSupplyType={taxSupplyType}
					/>
				</div>

				<div className="border-t border-border/60 pt-4">
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start">
						<div className="min-w-0 space-y-4">
							<SectionHead
								label="Remarks & Attachments"
								sub={readOnly ? undefined : "Additional notes and supporting documents."}
							/>
							<div>
								{!readOnly && (
									<p className="mb-1.5 text-xs font-medium text-foreground">Remarks</p>
								)}
								<Textarea
									readOnly={readOnly}
									value={form.notes}
									onChange={(e) => patch({ notes: e.target.value })}
									placeholder="Purpose or internal notes..."
									className={cn(
										"min-h-[90px] rounded-lg text-xs",
										readOnly ? "bg-muted/30 resize-none" : "min-h-[140px] resize-none",
									)}
								/>
							</div>

							<div className="rounded-xl border border-border bg-muted/10 p-3.5">
								{!readOnly && (
									<div className="mb-2.5 flex items-center justify-between gap-2">
										<p className="text-xs font-medium text-foreground">Attachments</p>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="h-8 gap-1.5 rounded-lg text-[11px] font-semibold"
											onClick={() => fileRef.current?.click()}
										>
											<Upload className="h-3.5 w-3.5" /> Add File
										</Button>
									</div>
								)}
								{readOnly && (
									<p className="mb-2 text-xs font-medium text-foreground">Attachments</p>
								)}
								{!readOnly && (
									<input ref={fileRef} type="file" className="hidden" onChange={onFilePick} />
								)}
								{form.attachments.length === 0 ? (
									<p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
										No attachments
									</p>
								) : (
									<ul className="space-y-2">
										{form.attachments.map((a) => (
											<li
												key={a.uid}
												className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs"
											>
												<span className="min-w-0 flex-1 truncate text-foreground">{a.name}</span>
												{!readOnly && (
													<button
														type="button"
														onClick={() =>
															patch({
																attachments: form.attachments.filter((x) => x.uid !== a.uid),
															})
														}
														className="text-red-600"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</button>
												)}
											</li>
										))}
									</ul>
								)}
							</div>
						</div>

						<div className="flex justify-end lg:justify-start">
							<ProcurementTotalSummary
								productTotal={productTotal}
								additionalCharges={form.additionalCharges ?? []}
								taxTotal={totalGst}
								taxSupplyType={taxSupplyType}
								totalCgst={preview.summary.totalCgst}
								totalSgst={preview.summary.totalSgst}
								totalIgst={preview.summary.totalIgst}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
