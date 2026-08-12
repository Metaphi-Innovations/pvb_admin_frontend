"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Info,
	Upload,
	Trash2,
} from "lucide-react";
import { COMPANY_BILLING, PAYMENT_TYPE_OPTIONS } from "@/lib/procurement/config";
import {
	calcPackingToBaseQty,
	enrichProductForProcurement,
	enrichProductFromDropdown,
	resolvePOLineCostPrice,
} from "@/lib/procurement/procurement-line-utils";
import {
	exceedsMaxLineQty,
	maxLineQtyMessage,
} from "@/lib/quantity-limits";
import {
	applyTaxSupplyToRates,
	lineNeedsTaxSupplyUpdate,
	resolveTaxSupplyType,
	type TaxSupplyType,
} from "@/lib/procurement/utils";
import { AdditionalChargesEditor, ProcurementTotalSummary } from "@/components/procurement/AdditionalChargesEditor";
import BillToShipToSection from "@/app/(app)/sales/orders/components/BillToShipToSection";
import { useSupplierDropdown, useSupplierDetail } from "@/hooks/masters/use-suppliers";
import { useWarehouseDropdown } from "@/hooks/masters/use-warehouses";
import { useProductDropdown } from "@/hooks/masters/use-products";
import {
	usePurchaseOrderPreviewNumber,
	usePurchaseRequest,
	usePurchaseRequestList,
} from "@/hooks/procurement";
import { axiosInstance } from "@/api/axios";
import type { PRLineItem } from "../../purchase-requests/pr-data";
import type {
	PurchaseRequestDetail,
} from "@/services/purchase-request.service";
import type { ProductDropdownItem } from "@/services/product-dropdown.service";
import type { POLineItem, POAttachment, PurchaseOrder } from "../po-data";
import { applyTaxSupplyToPOLines, enrichPOLineItem, recalcPO } from "../po-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { findProductRef } from "@/lib/pricing/resolve-pricing";
import {
	billingFromPOAddress,
	findPOAddressById,
	getDefaultPOBillShipIds,
	getPOBillToAddressesFromWarehouses,
	getPOShipToAddressesFromWarehouses,
} from "../po-address-utils";
import type { SalesOrderCustomerAddress } from "@/app/(app)/sales/orders/sales-order-address-utils";
import { POLineItemsSection } from "./POLineItemsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import {
	preventInvalidNumberKeys,
	sanitizeIntegerInput,
} from "./number-input-guards";

/** Minimal PR shape needed by line items (PR Qty column). */
export type LinkedPurchaseRequest = {
	lines: PRLineItem[];
};

const INDIAN_STATES = [
	"Maharashtra",
	"Gujarat",
	"Karnataka",
	"Tamil Nadu",
	"Delhi",
	"Telangana",
	"Uttar Pradesh",
	"West Bengal",
	"Rajasthan",
	"Madhya Pradesh",
	"Punjab",
	"Haryana",
	"Bihar",
	"Kerala",
	"Andhra Pradesh",
];

export type POFormErrors = Partial<
	Record<"supplierId" | "warehouseId" | "poDate" | "expectedDeliveryDate" | "state" | "lines", string>
>;

function isSupplierSelected(supplierId: POFormValues["supplierId"]): boolean {
	if (supplierId === null || supplierId === undefined) return false;
	if (supplierId === 0 || supplierId === "0" || supplierId === "") return false;
	return true;
}

function getValidPOLines(lines: POLineItem[]) {
	return lines.filter(
		(l) => l.productId && l.productId !== 0 && l.productId !== "0",
	);
}

export function validatePOForm(form: POFormValues): POFormErrors {
	const e: POFormErrors = {};
	if (!isSupplierSelected(form.supplierId)) {
		e.supplierId = "Supplier is required";
	}
	if (!form.warehouseId) {
		e.warehouseId = "Warehouse is required";
	}
	if (!form.state?.trim()) {
		e.state = "State is required";
	}
	if (!form.poDate?.trim()) {
		e.poDate = "PO date is required";
	}
	if (!form.expectedDeliveryDate?.trim()) {
		e.expectedDeliveryDate = "Delivery date is required";
	}
	const validLines = getValidPOLines(form.lines);
	if (validLines.length === 0) {
		e.lines = "At least one product is required";
	} else if (validLines.some((l) => (l.orderedQtyPack ?? 0) <= 0)) {
		e.lines = "Each line must have a quantity greater than zero";
	} else if (validLines.some((l) => exceedsMaxLineQty(l.orderedQtyPack ?? 0))) {
		e.lines = maxLineQtyMessage("Ordered quantity");
	}
	return e;
}

const PO_ERROR_FIELD_ORDER = [
	"supplierId",
	"poDate",
	"expectedDeliveryDate",
	"state",
	"warehouseId",
	"lines",
] as const;

export function focusFirstPOError(errors: POFormErrors) {
	for (const key of PO_ERROR_FIELD_ORDER) {
		if (!errors[key]) continue;
		const el = document.getElementById(`po-field-${key}`);
		if (!el) continue;
		el.scrollIntoView({ behavior: "smooth", block: "center" });
		const focusable = el.querySelector<HTMLElement>("button, input, textarea, select");
		if (focusable) {
			focusable.focus({ preventScroll: true });
		}
		break;
	}
}

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
	| "attachments"
> & {
	attachments: File[];
	existingAttachments?: POAttachment[];
};

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

export function resolveProductGstPct(
	productId: number | string,
	dbProducts?: ProductDropdownItem[],
): number {
	const dbProd = (dbProducts || []).find(
		(x) => String(x.product_id) === String(productId),
	);
	if (dbProd?.gst_rate?.gstPercentage != null && dbProd.gst_rate.gstPercentage !== "") {
		const n = Number(dbProd.gst_rate.gstPercentage);
		if (Number.isFinite(n)) return n;
	}
	const local = loadProducts().find((p) => String(p.id) === String(productId));
	if (local?.gstRate) {
		const n = parseFloat(String(local.gstRate).replace(/%/g, ""));
		if (Number.isFinite(n)) return n;
	}
	const ref = findProductRef(productId);
	if (ref?.gstRate) {
		const n = parseFloat(String(ref.gstRate).replace(/%/g, ""));
		if (Number.isFinite(n)) return n;
	}
	return 18;
}

export function mapPRLinesToPOLines(
	lines: PRLineItem[],
	supplierId?: number | string,
	dbProducts?: ProductDropdownItem[],
	taxSupplyType: TaxSupplyType = "intra",
): POLineItem[] {
	const localSupplierId =
		typeof supplierId === "number"
			? supplierId
			: Number(supplierId) || undefined;

	return lines
		.filter((l) => l.productId && String(l.productId) !== "0")
		.map((l) => {
			const info =
				enrichProductFromDropdown(l.productId, dbProducts) ??
				enrichProductForProcurement(l.productId);
			const fromPrRate = Number(l.ratePerSku) || 0;
			const cp = resolvePOLineCostPrice(
				l.productId,
				dbProducts,
				localSupplierId,
			);
			const unitPrice =
				fromPrRate > 0
					? fromPrRate
					: info?.ratePerSku && info.ratePerSku > 0
						? info.ratePerSku
						: cp.amount;
			const gstPct = resolveProductGstPct(l.productId, dbProducts);
			const taxRates = applyTaxSupplyToRates(gstPct, taxSupplyType);
			const orderUom = l.requestUom ?? "Unit";
			const orderedQtyPack = l.requestedQty;
			const orderedQty =
				l.totalQtyBase ??
				calcPackingToBaseQty(orderedQtyPack, info?.conversionQty ?? l.conversionQty ?? 1);
			return {
				...emptyPOLine(),
				uid: `pl-${l.uid}`,
				productId: l.productId,
				productCode: info?.productCode ?? l.productCode,
				productName: info?.productName ?? l.productName,
				description: l.description || info?.description || "",
				sku: info?.sku || l.sku,
				category: info?.category ?? l.category,
				hsnCode: info?.hsnCode || l.hsnCode,
				baseUnit: info?.baseUnit ?? l.baseUnit ?? "Unit",
				packagingUnit: info?.packagingUnit ?? l.packagingUnit ?? "Box",
				conversionQty: info?.conversionQty ?? l.conversionQty ?? 1,
				orderUom,
				orderedQtyPack,
				uom: orderUom,
				orderedQty,
				unitPrice,
				cpSource: fromPrRate > 0 || (info?.ratePerSku ?? 0) > 0 ? "pricing_master" : cp.source,
				remarks: l.remarks ?? "",
				prLineUid: l.uid,
				...taxRates,
			};
		});
}

/** Apply live PR detail onto a PO form (lines + reference fields). */
export function applyPurchaseRequestDetailToForm(
	form: POFormValues,
	detail: PurchaseRequestDetail,
	dbProducts?: ProductDropdownItem[],
	taxSupplyType: TaxSupplyType = "intra",
): POFormValues {
	return {
		...form,
		sourcePrId: detail.id,
		sourcePrNumber: detail.prNumber,
		notes: detail.remarks || form.notes,
		deliveryTerms: detail.requestedBy
			? `From ${detail.requestedBy}${detail.prDate ? ` (${detail.prDate})` : ""}`
			: form.deliveryTerms,
		lines: mapPRLinesToPOLines(
			detail.lines,
			form.supplierId,
			dbProducts,
			taxSupplyType,
		),
	};
}

export function defaultPOForm(sourcePrId: string | null = null): POFormValues {
	return {
		poDate: new Date().toISOString().slice(0, 10),
		supplierId: "",
		supplierName: "",
		supplierType: "",
		supplierContactPerson: "",
		supplierMobile: "",
		supplierMobileCountry: "+91",
		supplierEmail: "",
		supplierGstin: "",
		referenceNumber: "",
		currency: "INR",
		paymentType: "Credit",
		creditDays: 30,
		deliveryTerms: "",
		expectedDeliveryDate: "",
		state: "Maharashtra",
		warehouseId: null,
		warehouseName: "",
		deliveryAddress: "",
		notes: "",
		sourcePrId,
		sourcePrNumber: "",
		billToAddressId: "",
		shipToAddressId: "",
		billing: {
			companyName: COMPANY_BILLING.companyName,
			billingAddress: "",
			gstNumber: "",
			state: "",
			city: "",
			pincode: "",
		},
		shipping: {
			shipToLocation: "",
			branch: "",
			address: "",
			contactPerson: "",
			contactNumber: "",
			sameAsBilling: false,
		},
		lines: [],
		terms: [],
		attachments: [],
		existingAttachments: [],
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
		attachments,
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
		attachments: [],
		existingAttachments: attachments || [],
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
	if (!iso) return "";
	const [y, m, d] = iso.split("-");
	if (!y || !m || !d) return "";
	return `${d}-${m}-${y}`;
}

export function PurchaseOrderForm({
	form,
	onChange,
	readOnly,
	poNumber: poNumberProp = "",
	onPoNumberChange,
	status,
	submittedDate,
	errors = {},
	showReceiptContext = false,
}: {
	form: POFormValues;
	onChange: (f: POFormValues) => void;
	/** Optional controlled PO number from parent (edit/view). Create mode fetches by state. */
	poNumber?: string;
	/** Notified when preview PO number changes (create mode). */
	onPoNumberChange?: (poNumber: string) => void;
	readOnly?: boolean;
	status?: string;
	submittedDate?: string;
	errors?: POFormErrors;
	/** Show Received / Invoiced qty per line (3-way match adjustment). */
	showReceiptContext?: boolean;
}) {
	const fileRef = useRef<HTMLInputElement>(null);

	const { data: dbSuppliers } = useSupplierDropdown();
	const suppliers = dbSuppliers || [];
	const { data: dbProducts } = useProductDropdown();
	const isDbSupplier = Boolean(form.supplierId && typeof form.supplierId === "string" && !/^\d+$/.test(form.supplierId));
	const { data: dbSupplierDetail } = useSupplierDetail(
		isDbSupplier ? String(form.supplierId) : null
	);
	const shouldPreviewPoNumber = !readOnly && typeof onPoNumberChange === "function";
	const previewQuery = usePurchaseOrderPreviewNumber(
		form.state || "Maharashtra",
		shouldPreviewPoNumber,
	);
	const fetchedPoNumber = previewQuery.data ?? "";
	const poNumber = shouldPreviewPoNumber
		? fetchedPoNumber || poNumberProp
		: poNumberProp;
	const poNumberLoading =
		shouldPreviewPoNumber &&
		(previewQuery.isLoading || previewQuery.isFetching);

	useEffect(() => {
		if (!shouldPreviewPoNumber || !onPoNumberChange) return;
		onPoNumberChange(fetchedPoNumber);
	}, [shouldPreviewPoNumber, fetchedPoNumber, onPoNumberChange]);

	const appliedPrIdRef = useRef<string | null>(null);
	const formRef = useRef(form);
	formRef.current = form;

	const [forcePrMode, setForcePrMode] = useState(() => Boolean(form.sourcePrId));

	const { data: prListResult } = usePurchaseRequestList(
		{
			page: 1,
			pageSize: 100,
			search: "",
			ordering: "-created_at",
			apiFilters: { status: "Approved" },
		},
		!readOnly,
	);

	const sourcePrIdStr = form.sourcePrId ? String(form.sourcePrId) : null;
	const { data: prDetail } = usePurchaseRequest(sourcePrIdStr);

	const poType: "pr" | "direct" =
		form.sourcePrId || forcePrMode ? "pr" : "direct";

	useEffect(() => {
		if (form.sourcePrId) setForcePrMode(true);
	}, [form.sourcePrId]);

	const preview = useMemo(
		() =>
			recalcPO({
				id: "preview",
				poNumber: "",
				...form,
				attachments: form.existingAttachments || [],
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
			setForcePrMode(false);
			appliedPrIdRef.current = null;
			patch({ sourcePrId: null, sourcePrNumber: "", lines: [] });
			return;
		}
		setForcePrMode(true);
	};

	const selectPR = (prId: string) => {
		if (readOnly || !prId) return;
		appliedPrIdRef.current = null;
		const match = (prListResult?.items ?? []).find((p) => p.id === prId);
		patch({
			sourcePrId: prId,
			sourcePrNumber: match?.prNumber ?? "",
			lines: [],
		});
	};

	const previewLines = preview.lines;

	const linkedPr: LinkedPurchaseRequest | null = prDetail
		? { lines: prDetail.lines }
		: null;
	const displayPoNo = poNumberLoading && !poNumber
		? "Generating…"
		: poNumber || "Auto-generated";
	const totalGst =
		preview.summary.totalCgst +
		preview.summary.totalSgst +
		preview.summary.totalIgst;

	const stateOptions = useMemo(() => INDIAN_STATES.map((s) => ({ value: s, label: s })), []);
	/** State-filtered list for the PO warehouse (Ship To) dropdown. */
	const { data: dbWarehouses } = useWarehouseDropdown(form.state || undefined);
	/** All warehouses so Bill To can pick any warehouse address. */
	const { data: allWarehouses } = useWarehouseDropdown();
	const warehouseOptions = useMemo(
		() =>
			(dbWarehouses || []).map((w) => ({
				value: String(w.warehouse_id),
				label: w.warehouse_name,
			})),
		[dbWarehouses],
	);

	const billToAddresses = useMemo(
		() => getPOBillToAddressesFromWarehouses(allWarehouses || []),
		[allWarehouses],
	);
	const shipToAddresses = useMemo((): SalesOrderCustomerAddress[] => {
		if (!form.warehouseId) return [];
		const selected = (dbWarehouses || []).filter(
			(w) => String(w.warehouse_id) === String(form.warehouseId),
		);
		return getPOShipToAddressesFromWarehouses(selected);
	}, [dbWarehouses, form.warehouseId]);

	const selectedWarehouse = useMemo(
		() =>
			form.warehouseId
				? (dbWarehouses || []).find((w) => String(w.warehouse_id) === String(form.warehouseId)) ??
					(allWarehouses || []).find((w) => String(w.warehouse_id) === String(form.warehouseId)) ??
					null
				: null,
		[form.warehouseId, dbWarehouses, allWarehouses],
	);

	const selectedBillAddress = useMemo(() => {
		const fromOptions = findPOAddressById(billToAddresses, form.billToAddressId ?? "");
		if (fromOptions) return fromOptions;
		if (!form.billing.billingAddress) return null;
		return {
			id: form.billToAddressId || "bill-saved",
			label: "Bill To",
			companyName: form.billing.companyName || COMPANY_BILLING.companyName,
			addressLine1: form.billing.billingAddress,
			addressLine2: "",
			city: form.billing.city || "",
			state: form.billing.state || "",
			pincode: form.billing.pincode || "",
			gstin: form.billing.gstNumber || COMPANY_BILLING.gstNumber,
			phone: "—",
			email: "—",
		};
	}, [billToAddresses, form.billToAddressId, form.billing]);

	const selectedShipAddress = useMemo(() => {
		const fromOptions = findPOAddressById(shipToAddresses, form.shipToAddressId ?? "");
		if (fromOptions) return fromOptions;
		if (!form.warehouseId || !form.shipping.address) return null;
		const primaryContact =
			selectedWarehouse?.contacts?.find((c) => c.is_primary) ?? selectedWarehouse?.contacts?.[0];
		return {
			id: `ship-wh-${form.warehouseId}`,
			label: `${form.warehouseName} — Ship To`,
			companyName: selectedWarehouse?.registered_legal_name || COMPANY_BILLING.companyName,
			addressLine1: form.shipping.address,
			addressLine2: "",
			city: selectedWarehouse?.city || "",
			state: form.state || selectedWarehouse?.state || "",
			pincode: selectedWarehouse?.pincode || "",
			gstin: selectedWarehouse?.gst_number || COMPANY_BILLING.gstNumber,
			phone: form.shipping.contactNumber || primaryContact?.mobile_number || "—",
			email: primaryContact?.email_address || "—",
		};
	}, [shipToAddresses, form.shipToAddressId, form.warehouseId, form.warehouseName, form.shipping, form.state, selectedWarehouse]);

	const selectedSupplier = useMemo(() => {
		if (!form.supplierId) return null;
		const dbSup = (dbSuppliers || []).find((s) => String(s.supplier_id) === String(form.supplierId));
		if (dbSup) {
			return {
				id: dbSup.supplier_id,
				supplierName: dbSup.supplier_name,
				state: dbSup.state || "",
			};
		}
		if (dbSupplierDetail) {
			return {
				id: dbSupplierDetail.supplier_id,
				supplierName: dbSupplierDetail.supplier_name,
				state: dbSupplierDetail.state || "",
			};
		}
		return null;
	}, [form.supplierId, dbSuppliers, dbSupplierDetail]);

	const taxSupplyType = useMemo((): TaxSupplyType => {
		const warehouseState = selectedWarehouse?.state ?? form.state ?? "";
		const supplierState = selectedSupplier?.state ?? "";
		return resolveTaxSupplyType(warehouseState, supplierState);
	}, [selectedWarehouse, selectedSupplier, form.state]);

	useEffect(() => {
		if (readOnly || !prDetail || !sourcePrIdStr) return;
		if (prDetail.id !== sourcePrIdStr) return;
		if (appliedPrIdRef.current === prDetail.id) return;

		const current = formRef.current;
		// Edit / already-hydrated: keep existing lines, just mark applied
		if (current.lines.length > 0 && current.sourcePrNumber) {
			appliedPrIdRef.current = prDetail.id;
			return;
		}

		appliedPrIdRef.current = prDetail.id;
		onChange(
			applyPurchaseRequestDetailToForm(
				current,
				prDetail,
				dbProducts,
				taxSupplyType,
			),
		);
	}, [
		prDetail,
		sourcePrIdStr,
		readOnly,
		onChange,
		dbProducts,
		taxSupplyType,
	]);

	// Backfill rate / HSN / SKU / GST from product master for PR-sourced lines
	useEffect(() => {
		if (readOnly || !dbProducts?.length || !form.sourcePrId) return;
		const needsEnrich = form.lines.some((l) => {
			if (!l.prLineUid) return false;
			const gstPct = resolveProductGstPct(l.productId, dbProducts);
			const expected = applyTaxSupplyToRates(gstPct, taxSupplyType);
			const gstMismatch =
				Math.abs((l.cgstPct ?? 0) - expected.cgstPct) > 0.001 ||
				Math.abs((l.sgstPct ?? 0) - expected.sgstPct) > 0.001 ||
				Math.abs((l.igstPct ?? 0) - expected.igstPct) > 0.001;
			return (
				!l.unitPrice ||
				l.unitPrice <= 0 ||
				!l.hsnCode ||
				!l.sku ||
				gstMismatch
			);
		});
		if (!needsEnrich) return;

		const nextLines = form.lines.map((l) => {
			if (!l.prLineUid) return l;
			const info = enrichProductFromDropdown(l.productId, dbProducts);
			const cp = resolvePOLineCostPrice(l.productId, dbProducts);
			const gstPct = resolveProductGstPct(l.productId, dbProducts);
			const taxRates = applyTaxSupplyToRates(gstPct, taxSupplyType);
			return {
				...l,
				sku: l.sku || info?.sku || "",
				hsnCode: l.hsnCode || info?.hsnCode || "",
				unitPrice:
					l.unitPrice > 0
						? l.unitPrice
						: info && info.ratePerSku > 0
							? info.ratePerSku
							: cp.amount,
				cpSource: l.unitPrice > 0 ? l.cpSource : "pricing_master",
				...taxRates,
			};
		});
		const changed = nextLines.some((l, i) => {
			const prev = form.lines[i];
			return (
				l.unitPrice !== prev.unitPrice ||
				l.hsnCode !== prev.hsnCode ||
				l.sku !== prev.sku ||
				l.cgstPct !== prev.cgstPct ||
				l.sgstPct !== prev.sgstPct ||
				l.igstPct !== prev.igstPct
			);
		});
		if (changed) onChange({ ...form, lines: nextLines });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dbProducts, form.sourcePrId, readOnly, taxSupplyType]);

	useEffect(() => {
		if (!form.supplierId) return;
		if (!form.warehouseId) {
			if (form.shipToAddressId) {
				onChange({
					...form,
					shipToAddressId: "",
				});
			}
			return;
		}
		const billValid = billToAddresses.some((a) => a.id === form.billToAddressId);
		const shipValid = shipToAddresses.some((a) => a.id === form.shipToAddressId);
		if (billValid && shipValid) return;
		const defaults = getDefaultPOBillShipIds(
			billToAddresses,
			shipToAddresses,
			form.warehouseId,
		);
		const nextBillId = billValid ? form.billToAddressId : defaults.billToAddressId;
		const nextShipId = shipValid ? form.shipToAddressId : defaults.shipToAddressId;
		const billAddr = findPOAddressById(billToAddresses, nextBillId ?? "");
		onChange({
			...form,
			billToAddressId: nextBillId,
			shipToAddressId: nextShipId,
			...(billValid ? {} : { billing: billingFromPOAddress(billAddr) }),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps -- auto-select when addresses load
	}, [form.supplierId, form.warehouseId, billToAddresses.length, shipToAddresses.length]);

	useEffect(() => {
		if (form.lines.length === 0) return;
		const nextLines = applyTaxSupplyToPOLines(form.lines, taxSupplyType);
		const changed = nextLines.some(
			(line, index) =>
				line.cgstPct !== form.lines[index]?.cgstPct ||
				line.sgstPct !== form.lines[index]?.sgstPct ||
				line.igstPct !== form.lines[index]?.igstPct,
		);
		if (!changed) return;
		onChange({ ...form, lines: nextLines });
		// eslint-disable-next-line react-hooks/exhaustive-deps -- re-split GST when supply type changes
	}, [taxSupplyType, form.warehouseId, selectedSupplier?.state, form.state]);

	useEffect(() => {
		if (!form.additionalCharges?.length) return;
		const needsUpdate = form.additionalCharges.some((c) =>
			lineNeedsTaxSupplyUpdate(c.cgstPct ?? 0, c.sgstPct ?? 0, c.igstPct ?? 0, taxSupplyType),
		);
		if (!needsUpdate) return;
		patch({
			additionalCharges: form.additionalCharges.map((c) => {
				const totalGst = (c.cgstPct ?? 0) + (c.sgstPct ?? 0) + (c.igstPct ?? 0);
				return { ...c, ...applyTaxSupplyToRates(totalGst, taxSupplyType) };
			}),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps -- re-split GST when supply type changes
	}, [taxSupplyType]);

	const getUpdatedLinesForState = (
		_state: string,
		currentLines: POLineItem[],
		supplyType: TaxSupplyType = taxSupplyType,
	) => applyTaxSupplyToPOLines(currentLines, supplyType);

	const onStateChange = (state: string) => {
		const nextTaxSupplyType = resolveTaxSupplyType(state, selectedSupplier?.state ?? "");
		const updatedLines = getUpdatedLinesForState(state, form.lines, nextTaxSupplyType);
		const billStillValid =
			!!form.billToAddressId &&
			billToAddresses.some((a) => a.id === form.billToAddressId);
		patch({
			state,
			warehouseId: null,
			warehouseName: "",
			deliveryAddress: "",
			billToAddressId: billStillValid ? form.billToAddressId : "",
			shipToAddressId: "",
			billing: billStillValid
				? form.billing
				: {
						companyName: COMPANY_BILLING.companyName,
						billingAddress: "",
						gstNumber: "",
						state: "",
						city: "",
						pincode: "",
					},
			shipping: {
				shipToLocation: "",
				branch: "",
				address: "",
				contactPerson: "",
				contactNumber: "",
				sameAsBilling: false,
			},
			lines: updatedLines,
		});
	};

	const onWarehouseChange = (val: string) => {
		const wh = (dbWarehouses || []).find((w) => String(w.warehouse_id) === val) ?? null;
		const addressStr = wh ? [wh.address, wh.address_1].filter(Boolean).join(", ") : "";
		const primaryContact = wh?.contacts?.find((c) => c.is_primary) ?? wh?.contacts?.[0];
		const nextState = wh?.state || form.state || "";
		const nextTaxSupplyType = resolveTaxSupplyType(nextState, selectedSupplier?.state ?? "");
		const updatedLines = getUpdatedLinesForState(nextState, form.lines, nextTaxSupplyType);

		const billStillValid =
			!!form.billToAddressId &&
			billToAddresses.some((a) => a.id === form.billToAddressId);
		const nextBillId = billStillValid
			? form.billToAddressId
			: wh
				? `bill-wh-${wh.warehouse_id}`
				: "";
		const billAddr = findPOAddressById(billToAddresses, nextBillId ?? "");

		patch({
			warehouseId: wh ? wh.warehouse_id : null,
			warehouseName: wh?.warehouse_name || "",
			deliveryAddress: addressStr,
			state: nextState,
			billToAddressId: nextBillId,
			shipToAddressId: wh ? `ship-wh-${wh.warehouse_id}` : "",
			billing: billingFromPOAddress(
				billAddr ??
					(wh
						? {
								id: `bill-wh-${wh.warehouse_id}`,
								label: `${wh.warehouse_name} — Bill To`,
								companyName: wh.registered_legal_name || COMPANY_BILLING.companyName,
								addressLine1: wh.address || "",
								addressLine2: wh.address_1 || "",
								city: wh.city || "",
								state: wh.state || "",
								pincode: wh.pincode || "",
								gstin: wh.gst_number || COMPANY_BILLING.gstNumber,
								phone: primaryContact?.mobile_number || "—",
								email: primaryContact?.email_address || "—",
							}
						: null),
			),
			shipping: wh
				? {
						shipToLocation: wh.warehouse_name || "",
						branch: "",
						address: addressStr,
						contactPerson: primaryContact?.contact_person || "Warehouse Manager",
						contactNumber: primaryContact?.mobile_number || "",
						sameAsBilling: false,
					}
				: {
						shipToLocation: "",
						branch: "",
						address: "",
						contactPerson: "",
						contactNumber: "",
						sameAsBilling: false,
					},
			lines: updatedLines,
		});
	};

	const onBillToChange = (id: string) => {
		const addr = findPOAddressById(billToAddresses, id);
		patch({
			billToAddressId: id,
			billing: billingFromPOAddress(addr),
		});
	};

	const productTotal = preview.summary.productTotal ?? preview.summary.taxableValue;

	const selectSupplier = async (idStr: string) => {
		if (!idStr) {
			patch({
				supplierId: 0,
				supplierName: "",
				supplierType: "",
				supplierContactPerson: "",
				supplierMobile: "",
				supplierEmail: "",
				supplierGstin: "",
				billToAddressId: "",
				shipToAddressId: "",
			});
			return;
		}

		try {
			const response = await axiosInstance.get(`/master/supplier/details/${idStr}`);
			const s = response.data?.data;
			if (!s) return;

			const localWarehouseId =
				typeof form.warehouseId === "number"
					? form.warehouseId
					: form.warehouseId && /^\d+$/.test(String(form.warehouseId))
						? Number(form.warehouseId)
						: null;
			const defaults = getDefaultPOBillShipIds(
				billToAddresses,
				shipToAddresses,
				localWarehouseId,
			);
			const warehouseState = selectedWarehouse?.state ?? form.state ?? "";
			const nextTaxSupplyType = resolveTaxSupplyType(warehouseState, s.state || "");
			const updatedLines =
				form.lines.length > 0
					? applyTaxSupplyToPOLines(form.lines, nextTaxSupplyType)
					: form.lines;
			patch({
				supplierId: s.supplier_id,
				supplierName: s.supplier_name,
				supplierType: s.supplier_type?.supplier_type_name || "",
				supplierContactPerson: s.contact_person || "",
				supplierMobile: s.mobile_number || "",
				supplierEmail: s.email || "",
				supplierGstin: s.gstin_number || "",
				billToAddressId: form.billToAddressId || defaults.billToAddressId,
				shipToAddressId: form.shipToAddressId || defaults.shipToAddressId,
				lines: updatedLines,
			});
		} catch (err) {
			console.error("Failed to fetch supplier details:", err);
		}
	};

	const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		patch({
			attachments: [
				...form.attachments,
				file,
			],
		});
		e.target.value = "";
	};

	const prOptions = (prListResult?.items ?? []).map((p) => ({
		value: p.id,
		label: p.prNumber,
		sublabel: p.requestedBy || undefined,
	}));
	const supplierOptions = (suppliers || []).map((s: any) => ({
		value: String(s.supplier_id || s.id || ""),
		label: `${s.supplier_code || s.supplierCode || ""} | ${s.supplier_name || s.supplierName || ""}`,
		sublabel: `Supplier Type: ${s.supplier_type?.supplier_type_name || s.supplierType || "—"}`,
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
								className={cn(
									inputCls,
									"bg-muted/30 font-mono text-muted-foreground",
									poNumberLoading && "opacity-70",
								)}
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
									onChange={(v) => v && selectPR(String(v))}
									placeholder="Select PR..."
									searchPlaceholder="Search PR..."
									disabled={poType === "direct"}
									className="h-8 rounded-lg text-xs"
								/>
							)}
						</div>
						<div id="po-field-supplierId" className="space-y-1">
							<Label className="text-xs font-medium">
								Supplier <span className="text-red-500">*</span>
							</Label>
							{readOnly ? (
								<ReadOnlyField value={form.supplierName} />
							) : (
								<AutocompleteSelect
									options={supplierOptions}
									value={form.supplierId ? String(form.supplierId) : ""}
									onChange={selectSupplier}
									placeholder="Select supplier..."
									searchPlaceholder="Search supplier..."
									error={!!errors.supplierId}
									className="h-8 rounded-lg text-xs"
								/>
							)}
							{errors.supplierId && (
								<p className="text-[11px] text-red-500">{errors.supplierId}</p>
							)}
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">Supplier Type</Label>
							<ReadOnlyField value={form.supplierType} />
						</div>
						<div id="po-field-poDate" className="space-y-1">
							<Label className="text-xs font-medium">
								PO Date <span className="text-red-500">*</span>
							</Label>
							{readOnly ? (
								<ReadOnlyField value={formatDisplayDate(form.poDate)} />
							) : (
								<Input
									type="date"
									value={form.poDate}
									onChange={(e) => patch({ poDate: e.target.value })}
									className={cn(inputCls, errors.poDate && "border-red-400")}
								/>
							)}
							{errors.poDate && (
								<p className="text-[11px] text-red-500">{errors.poDate}</p>
							)}
						</div>
						<div id="po-field-expectedDeliveryDate" className="space-y-1">
							<Label className="text-xs font-medium">
								Delivery Date <span className="text-red-500">*</span>
							</Label>
							{readOnly ? (
								<ReadOnlyField value={formatDisplayDate(form.expectedDeliveryDate)} />
							) : (
								<Input
									type="date"
									value={form.expectedDeliveryDate}
									onChange={(e) => patch({ expectedDeliveryDate: e.target.value })}
									className={cn(inputCls, errors.expectedDeliveryDate && "border-red-400")}
								/>
							)}
							{errors.expectedDeliveryDate && (
								<p className="text-[11px] text-red-500">{errors.expectedDeliveryDate}</p>
							)}
						</div>
						
						<div className="space-y-1">
							<Label className="text-xs font-medium">Payment Type</Label>
							{readOnly ? (
								<ReadOnlyField value={form.paymentType} />
							) : (
								<AutocompleteSelect
									options={PAYMENT_TYPE_OPTIONS}
									value={form.paymentType}
									onChange={(v) =>
										patch({
											paymentType: String(v),
											creditDays:
												String(v) === "Credit" ? form.creditDays || 30 : 0,
										})
									}
									className={inputCls}
								/>
							)}
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">Credit Days</Label>
							{readOnly ? (
								<ReadOnlyField value={String(form.creditDays ?? "")} />
							) : (
								<Input
									type="text"
									inputMode="numeric"
									value={form.paymentType === "Credit" ? String(form.creditDays ?? "") : "0"}
									disabled={form.paymentType !== "Credit"}
									onChange={(e) =>
										patch({
											creditDays: Number(sanitizeIntegerInput(e.target.value) || 0),
										})
									}
									onKeyDown={preventInvalidNumberKeys}
									className={cn(inputCls, form.paymentType !== "Credit" && "bg-muted/30 text-muted-foreground")}
									placeholder="Enter Credit Days"
								/>
							)}
						</div>
						<div id="po-field-state" className="space-y-1">
							<Label className="text-xs font-medium">State</Label>
							{readOnly ? (
								<ReadOnlyField value={form.state} />
							) : (
								<AutocompleteSelect
									options={stateOptions}
									value={form.state}
									onChange={(v) => onStateChange(String(v))}
									placeholder="Select state"
									error={!!errors.state}
									className={inputCls}
								/>
							)}
							{errors.state && (
								<p className="text-[11px] text-red-500">{errors.state}</p>
							)}
						</div>
						<div id="po-field-warehouseId" className="space-y-1">
							<Label className="text-xs font-medium">
								Warehouse <span className="text-red-500">*</span>
							</Label>
							{readOnly ? (
								<ReadOnlyField value={form.warehouseName} />
							) : (
								<AutocompleteSelect
									options={warehouseOptions}
									value={form.warehouseId ? String(form.warehouseId) : ""}
									onChange={(v) => onWarehouseChange(String(v))}
									placeholder="Select warehouse"
									error={!!errors.warehouseId}
									className={inputCls}
								/>
							)}
							{errors.warehouseId && (
								<p className="text-[11px] text-red-500">{errors.warehouseId}</p>
							)}
						</div>
					</div>
				</div>

				{Boolean(form.supplierId) && form.supplierId !== 0 && form.supplierId !== "0" && (
					<div className="border-t border-border/60 pt-4">
						<SectionHead label="Bill To / Ship To" required />
						<BillToShipToSection
							billOptions={billToAddresses}
							shipOptions={shipToAddresses}
							billToAddressId={form.billToAddressId ?? ""}
							shipToAddressId={form.shipToAddressId ?? ""}
							billAddress={selectedBillAddress}
							shipAddress={selectedShipAddress}
							readOnly={readOnly}
							shipLocked
							onBillToChange={onBillToChange}
							onShipToChange={() => {}}
							emptyHint="Select a warehouse to load Ship To. Bill To lists all warehouse addresses."
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
					supplierState={selectedSupplier?.state}
					linesError={errors.lines}
					showReceiptContext={showReceiptContext}
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
								{((form.existingAttachments ?? []).length === 0 && form.attachments.length === 0) ? (
									<p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
										No attachments
									</p>
								) : (
									<ul className="space-y-2">
										{(form.existingAttachments ?? []).map((a) => (
											<li
												key={a.uid}
												className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs"
											>
												{a.url ? (
													<a
														href={a.url}
														target="_blank"
														rel="noreferrer"
														className="min-w-0 flex-1 truncate text-foreground hover:text-brand-700 hover:underline"
														title={a.name}
													>
														{a.name}
													</a>
												) : (
													<span className="min-w-0 flex-1 truncate text-foreground">{a.name}</span>
												)}
												{!readOnly && (
													<button
														type="button"
														onClick={() =>
															patch({
																existingAttachments: (form.existingAttachments ?? []).filter((x) => x.uid !== a.uid),
															})
														}
														className="text-red-600"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</button>
												)}
											</li>
										))}
										{form.attachments.map((file, idx) => (
											<li
												key={`new-${idx}`}
												className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs bg-slate-50/50"
											>
												<span className="min-w-0 flex-1 truncate text-foreground">
													{file.name}
													<span className="text-[10px] text-muted-foreground ml-1">(New)</span>
												</span>
												{!readOnly && (
													<button
														type="button"
														onClick={() =>
															patch({
																attachments: form.attachments.filter((_, i) => i !== idx),
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
