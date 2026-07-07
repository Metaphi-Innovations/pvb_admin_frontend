"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
	Info,
	Upload,
	Trash2,
} from "lucide-react";
import { COMPANY_BILLING, PAYMENT_TYPE_OPTIONS } from "@/lib/procurement/config";
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
import { useSupplierDropdown, useSupplierDetail } from "@/hooks/masters/use-suppliers";
import { useWarehouseDropdown } from "@/hooks/masters/use-warehouses";
import { axiosInstance } from "@/api/axios";
import { getPRById, loadPurchaseRequests } from "../../purchase-requests/pr-data";
import type { POLineItem, POAttachment, PurchaseOrder } from "../po-data";
import { applyTaxSupplyToPOLines, enrichPOLineItem, recalcPO } from "../po-data";
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
	Record<"supplierId" | "warehouseId" | "poDate" | "lines", string>
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
	if (!form.poDate?.trim()) {
		e.poDate = "PO date is required";
	}
	const validLines = getValidPOLines(form.lines);
	if (validLines.length === 0) {
		e.lines = "At least one product is required";
	} else if (validLines.some((l) => (l.orderedQtyPack ?? 0) <= 0)) {
		e.lines = "Each line must have a quantity greater than zero";
	}
	return e;
}

const PO_ERROR_FIELD_ORDER = ["supplierId", "poDate", "warehouseId", "lines"] as const;

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

	const wh = pr?.warehouseId ? loadWarehouses().find((w) => w.id === pr.warehouseId) : null;
	const addressStr = wh ? [wh.address, wh.addressLine2].filter(Boolean).join(", ") : "";

	return {
		poDate: new Date().toISOString().slice(0, 10),
		supplierId: supplier?.id ? String(supplier.id) : "",
		supplierName: supplier?.supplierName ?? "",
		supplierType: supplier?.supplierType ?? "",
		supplierContactPerson: supplier?.contactPerson ?? "",
		supplierMobile: supplier?.mobile || supplier?.phone || "",
		supplierMobileCountry: "+91",
		supplierEmail: supplier?.email ?? "",
		supplierGstin: supplier?.gstNumber ?? "",
		referenceNumber: "",
		currency: "INR",
		paymentType: "Credit",
		creditDays: 30,
		deliveryTerms: "",
		expectedDeliveryDate: "",
		state: pr?.state ?? "",
		warehouseId: pr?.warehouseId ?? null,
		warehouseName: pr?.warehouseName ?? wh?.warehouseName ?? "",
		deliveryAddress: addressStr,
		notes: pr?.remarks ?? "",
		sourcePrId: pr?.id ?? null,
		sourcePrNumber: pr?.prNumber ?? "",
		billToAddressId: wh ? `bill-wh-${wh.id}` : "",
		shipToAddressId: wh ? `ship-wh-${wh.id}` : "",
		billing: wh
			? {
					companyName: COMPANY_BILLING.companyName,
					billingAddress: addressStr,
					gstNumber: COMPANY_BILLING.gstNumber,
					state: wh.state || "",
					city: wh.city || "",
					pincode: wh.pincode || "",
				}
			: {
					companyName: COMPANY_BILLING.companyName,
					billingAddress: "",
					gstNumber: "",
					state: "",
					city: "",
					pincode: "",
				},
		shipping: wh
			? {
					shipToLocation: wh.warehouseName || "",
					branch: "",
					address: addressStr,
					contactPerson: "Warehouse Manager",
					contactNumber: wh.mobileNumber || "",
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
		lines,
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
	if (!iso) return "—";
	const [y, m, d] = iso.split("-");
	if (!y || !m || !d) return iso;
	return `${d}-${m}-${y}`;
}

export function PurchaseOrderForm({
	form,
	onChange,
	readOnly,
	poNumber = "",
	status,
	submittedDate,
	errors = {},
}: {
	form: POFormValues;
	onChange: (f: POFormValues) => void;
	poNumber?: string;
	readOnly?: boolean;
	status?: string;
	submittedDate?: string;
	errors?: POFormErrors;
}) {
	const fileRef = useRef<HTMLInputElement>(null);

	const { data: dbSuppliers } = useSupplierDropdown();
	const suppliers = dbSuppliers || [];
	const isDbSupplier = Boolean(form.supplierId && typeof form.supplierId === "string" && !/^\d+$/.test(form.supplierId));
	const { data: dbSupplierDetail } = useSupplierDetail(
		isDbSupplier ? String(form.supplierId) : null
	);
	const prList = loadPurchaseRequests().filter((p) =>
		["approved", "partially_converted"].includes(p.status),
	);

	const poType: "pr" | "direct" = form.sourcePrId ? "pr" : "direct";

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
			const localSupplierId =
				typeof form.supplierId === "number" ? form.supplierId : Number(form.supplierId) || undefined;
			const cp = resolvePurchaseCostPrice(l.productId, localSupplierId);
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

	const linkedPr =
		form.sourcePrId && typeof form.sourcePrId === "number"
			? getPRById(form.sourcePrId) ?? null
			: form.sourcePrId && /^\d+$/.test(String(form.sourcePrId))
				? getPRById(Number(form.sourcePrId)) ?? null
				: null;
	const displayPoNo = poNumber || "Auto-generated";
	const totalGst =
		preview.summary.totalCgst +
		preview.summary.totalSgst +
		preview.summary.totalIgst;

	const stateOptions = useMemo(() => INDIAN_STATES.map((s) => ({ value: s, label: s })), []);
	const { data: dbWarehouses } = useWarehouseDropdown(form.state || undefined);
	const warehouseOptions = useMemo(() => {
		const list = (dbWarehouses || []).map((w) => ({
			value: String(w.warehouse_id),
			label: w.warehouse_name,
		}));
		if (list.length === 0) {
			return loadWarehouses().map((w) => ({
				value: String(w.id),
				label: w.warehouseName,
			}));
		}
		return list;
	}, [dbWarehouses]);

	const billToAddresses = useMemo(() => getPOBillToAddresses(), []);
	const shipToAddresses = useMemo(() => getPOShipToAddresses(), []);

	const billToAddress = useMemo(
		() => findPOAddressById(billToAddresses, form.billToAddressId ?? ""),
		[billToAddresses, form.billToAddressId],
	);

	const selectedWarehouse = useMemo(
		() => (form.warehouseId ? (dbWarehouses || []).find((w) => String(w.warehouse_id) === String(form.warehouseId)) ?? (() => {
			const staticWh = loadWarehouses().find((w) => String(w.id) === String(form.warehouseId));
			if (!staticWh) return null;
			return {
				warehouse_id: String(staticWh.id),
				warehouse_name: staticWh.warehouseName,
				address: staticWh.address,
				address_1: staticWh.addressLine2 || "",
				state: staticWh.state,
				district: staticWh.district,
				city: staticWh.city,
				town: staticWh.town || "",
				pincode: staticWh.pincode || "",
				gst_applicable: staticWh.gstApplicable,
				gst_number: staticWh.gstNumber,
				registered_legal_name: staticWh.registeredLegalName || "",
				contacts: [
					{
						warehouse_contact_id: "1",
						contact_person: staticWh.contactPerson,
						mobile_number: staticWh.mobileNumber,
						email_address: staticWh.emailAddress,
						is_primary: true,
					}
				],
			};
		})() : null),
		[form.warehouseId, dbWarehouses],
	);

	const selectedBillAddress = useMemo(() => {
		if (!form.warehouseId || !form.billing.billingAddress) return null;
		const primaryContact = selectedWarehouse?.contacts?.find((c) => c.is_primary) ?? selectedWarehouse?.contacts?.[0];
		return {
			id: `bill-wh-${form.warehouseId}`,
			label: `${form.warehouseName} — Bill To`,
			companyName: form.billing.companyName || COMPANY_BILLING.companyName,
			addressLine1: form.billing.billingAddress,
			addressLine2: "",
			city: form.billing.city || "",
			state: form.billing.state || "",
			pincode: form.billing.pincode || "",
			gstin: form.billing.gstNumber || COMPANY_BILLING.gstNumber,
			phone: primaryContact?.mobile_number || "—",
			email: primaryContact?.email_address || "—",
		};
	}, [form.warehouseId, form.warehouseName, form.billing, selectedWarehouse]);

	const selectedShipAddress = useMemo(() => {
		if (!form.warehouseId || !form.shipping.address) return null;
		const primaryContact = selectedWarehouse?.contacts?.find((c) => c.is_primary) ?? selectedWarehouse?.contacts?.[0];
		return {
			id: `ship-wh-${form.warehouseId}`,
			label: `${form.warehouseName} — Ship To`,
			companyName: form.billing.companyName || COMPANY_BILLING.companyName,
			addressLine1: form.shipping.address,
			addressLine2: "",
			city: form.billing.city || form.shipping.address.split(",").slice(-3, -2)[0]?.trim() || "",
			state: form.state || "",
			pincode: form.billing.pincode || form.shipping.address.split(",").slice(-1)[0]?.trim() || "",
			gstin: form.billing.gstNumber || COMPANY_BILLING.gstNumber,
			phone: form.shipping.contactNumber || primaryContact?.mobile_number || "—",
			email: primaryContact?.email_address || "—",
		};
	}, [form.warehouseId, form.warehouseName, form.shipping, form.state, form.billing, selectedWarehouse]);

	const selectedSupplier = useMemo(() => {
		if (!form.supplierId) return null;
		const local = getActiveSuppliers().find((s) => String(s.id) === String(form.supplierId));
		if (local) return local;
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
		if (!form.supplierId) return;
		if (!form.warehouseId) {
			if (form.billToAddressId || form.shipToAddressId) {
				onChange({
					...form,
					billToAddressId: "",
					shipToAddressId: "",
				});
			}
			return;
		}
		const billValid = billToAddresses.some((a) => a.id === form.billToAddressId) || form.billToAddressId?.startsWith("bill-wh-");
		const shipValid = shipToAddresses.some((a) => a.id === form.shipToAddressId) || form.shipToAddressId?.startsWith("ship-wh-");
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
				const gstMasterId =
					c.gstMasterId ?? findGstMasterIdByTotalPct(totalGst) ?? getDefaultGstMasterId();
				return { ...c, ...applyGstMasterToTaxRates(gstMasterId, taxSupplyType) };
			}),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps -- re-split GST when supply type changes
	}, [taxSupplyType]);

	const getUpdatedLinesForState = async (
		state: string,
		currentLines: POLineItem[],
		supplyType: TaxSupplyType = taxSupplyType,
	) => {
		const targetState = selectedSupplier?.state || state;
		let lines = currentLines;
		if (currentLines.length > 0 && targetState) {
			try {
				const pricingPromises = currentLines.map(async (line) => {
					try {
						const res = await axiosInstance.post("/master/product/pricing", {
							product_id: line.productId,
							state_name: targetState,
						});
						if (res.data?.success && res.data?.data) {
							return {
								productId: line.productId,
								cost_price: res.data.data.cost_price,
								success: true,
							};
						}
					} catch (err) {
						console.error(`Failed to fetch pricing for state ${state}:`, err);
					}
					return { productId: line.productId, success: false };
				});

				const resolvedPricings = await Promise.all(pricingPromises);
				const pricingMap = new Map(resolvedPricings.map((p) => [p.productId, p]));

				lines = currentLines.map((line) => {
					const apiPricing = pricingMap.get(line.productId);
					if (apiPricing && apiPricing.success) {
						return {
							...line,
							unitPrice: apiPricing.cost_price,
							cpSource: "pricing_master" as const,
						};
					}
					return line;
				});
			} catch (err) {
				console.error("Failed to update line items pricing:", err);
			}
		}
		return applyTaxSupplyToPOLines(lines, supplyType);
	};

	const onStateChange = async (state: string) => {
		const nextTaxSupplyType = resolveTaxSupplyType(state, selectedSupplier?.state ?? "");
		const updatedLines = await getUpdatedLinesForState(state, form.lines, nextTaxSupplyType);
		patch({
			state,
			warehouseId: null,
			warehouseName: "",
			deliveryAddress: "",
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
			lines: updatedLines,
		});
	};

	const onWarehouseChange = async (val: string) => {
		const wh = (dbWarehouses || []).find((w) => String(w.warehouse_id) === val) || (() => {
			const staticWh = loadWarehouses().find((w) => String(w.id) === val);
			if (!staticWh) return null;
			return {
				warehouse_id: String(staticWh.id),
				warehouse_name: staticWh.warehouseName,
				address: staticWh.address,
				address_1: staticWh.addressLine2 || "",
				state: staticWh.state,
				district: staticWh.district,
				city: staticWh.city,
				town: staticWh.town || "",
				pincode: staticWh.pincode || "",
				gst_applicable: staticWh.gstApplicable,
				gst_number: staticWh.gstNumber,
				registered_legal_name: staticWh.registeredLegalName || "",
				contacts: [
					{
						warehouse_contact_id: "1",
						contact_person: staticWh.contactPerson,
						mobile_number: staticWh.mobileNumber,
						email_address: staticWh.emailAddress,
						is_primary: true,
					}
				],
			};
		})();
		const addressStr = wh ? [wh.address, wh.address_1].filter(Boolean).join(", ") : "";
		const primaryContact = wh?.contacts?.find((c) => c.is_primary) ?? wh?.contacts?.[0];
		const nextState = wh?.state || form.state || "";
		const nextTaxSupplyType = resolveTaxSupplyType(nextState, selectedSupplier?.state ?? "");
		const updatedLines = await getUpdatedLinesForState(nextState, form.lines, nextTaxSupplyType);

		patch({
			warehouseId: wh ? wh.warehouse_id : null,
			warehouseName: wh?.warehouse_name || "",
			deliveryAddress: addressStr,
			state: nextState,
			billToAddressId: wh ? `bill-wh-${wh.warehouse_id}` : "",
			shipToAddressId: wh ? `ship-wh-${wh.warehouse_id}` : "",
			billing: wh
				? {
						companyName: wh.registered_legal_name || COMPANY_BILLING.companyName,
						billingAddress: addressStr,
						gstNumber: wh.gst_number || COMPANY_BILLING.gstNumber,
						state: wh.state || "",
						city: wh.city || "",
						pincode: wh.pincode || "",
					}
				: {
						companyName: COMPANY_BILLING.companyName,
						billingAddress: "",
						gstNumber: "",
						state: "",
						city: "",
						pincode: "",
					},
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

		// Try to find if it is a local mock supplier first (for backwards compatibility/safety)
		const localMock = getActiveSuppliers().find((x) => String(x.id) === idStr);
		if (localMock) {
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
			const nextTaxSupplyType = resolveTaxSupplyType(warehouseState, localMock.state ?? "");
			const updatedLines =
				form.lines.length > 0
					? applyTaxSupplyToPOLines(form.lines, nextTaxSupplyType)
					: form.lines;
			patch({
				supplierId: localMock.id,
				supplierName: localMock.supplierName,
				supplierType: localMock.supplierType,
				supplierContactPerson: localMock.contactPerson || "",
				supplierMobile: localMock.mobile || localMock.phone || "",
				supplierEmail: localMock.email || "",
				supplierGstin: localMock.gstNumber || "",
				billToAddressId: form.billToAddressId || defaults.billToAddressId,
				shipToAddressId: form.shipToAddressId || defaults.shipToAddressId,
				lines: updatedLines,
			});
			return;
		}

		// Otherwise, fetch detailed supplier info from backend
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

	const prOptions = prList.map((p) => ({
		value: String(p.id),
		label: p.prNumber,
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
						<span className="font-medium text-foreground">Direct Purchase Order</span>
						{/* Phase 1: PO type selector disabled — direct PO only for now
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
						*/}
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
						{/* <div className="space-y-1">
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
						</div> */}
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
									type="number"
									min={0}
									value={form.creditDays}
									onChange={(e) =>
										patch({
											creditDays: Number(e.target.value),
										})
									}
									className={inputCls}
									placeholder="Enter Credit Days"
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
							readOnly={true}
							onBillToChange={() => {}}
							onShipToChange={() => {}}
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
												<span className="min-w-0 flex-1 truncate text-foreground">{a.name}</span>
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
