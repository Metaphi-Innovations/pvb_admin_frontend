"use client";

import React, { useMemo, useRef, useState } from "react";
import {
	X,
	Plus,
	Search,
	Upload,
	Trash2,
	Download,
	Eye,
	Package,
	Info,
} from "lucide-react";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import {
	addProcurementProduct,
	loadProcurementProducts,
	type ProcurementProduct,
} from "@/lib/procurement/products-data";
import { formatCurrency } from "@/lib/procurement/utils";
import { getActiveSuppliers } from "../../masters/suppliers/supplier-data";
import { getPRById, loadPurchaseRequests } from "../../purchase-requests/pr-data";
import type { POLineItem, POAttachment, PurchaseOrder } from "../po-data";
import { recalcPO } from "../po-data";
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
		uom: "",
		orderedQty: 1,
		unitPrice: 0,
		discountPct: 0,
		cgstPct: 9,
		sgstPct: 9,
		igstPct: 0,
		grossAmount: 0,
		taxAmount: 0,
		netAmount: 0,
		deliverySchedule: "",
	};
}

function paymentTermDays(term: string): number {
	const m = term.match(/(\d+)/);
	return m ? Number(m[1]) : 0;
}

export function defaultPOForm(sourcePrId: number | null = null): POFormValues {
	const pr = sourcePrId ? getPRById(sourcePrId) : null;
	const supplier = getActiveSuppliers()[0];
	const products = loadProcurementProducts();

	const lines =
		pr?.lines.map((l) => {
			const p = products.find((x) => x.id === l.productId);
			return {
				...emptyPOLine(),
				uid: `pl-${l.uid}`,
				productId: l.productId,
				productCode: l.productCode,
				productName: l.productName,
				description: l.description,
				uom: l.uom,
				orderedQty: l.requestedQty,
				unitPrice: p?.estimatedUnitPrice ?? 0,
				prLineUid: l.uid,
			};
		}) ?? [];

	const paymentTerms = "net-30";
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
		notes: pr?.remarks ?? "",
		sourcePrId: pr?.id ?? null,
		sourcePrNumber: pr?.prNumber ?? "",
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
		supplierContactPerson: po.supplierContactPerson ?? "",
		supplierMobile: po.supplierMobile ?? "",
		supplierMobileCountry: po.supplierMobileCountry ?? "+91",
		supplierEmail: po.supplierEmail ?? "",
		supplierGstin: po.supplierGstin ?? "",
	};
}

function SectionHead({ label, sub, required }: { label: string; sub?: string; required?: boolean }) {
	return (
		<div className="mb-2.5 mt-0.5">
			<p className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center">
				{label}
				{required && <span className="text-red-500 ml-1">*</span>}
			</p>
			{sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
		</div>
	);
}

const inputCls = "h-8 rounded-lg text-xs";

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
	const [showProductModal, setShowProductModal] = useState(false);
	const [showQuickProduct, setShowQuickProduct] = useState(false);
	const [prodSearch, setProdSearch] = useState("");
	const [prodCategory, setProdCategory] = useState("");
	const [selectedProdIds, setSelectedProdIds] = useState<number[]>([]);
	const [quickProduct, setQuickProduct] = useState({
		name: "",
		code: "",
		categoryName: "",
		uom: "",
		description: "",
	});

	const products = loadProcurementProducts();
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
		const lines = pr.lines.map((l) => {
			const p = products.find((x) => x.id === l.productId);
			return {
				...emptyPOLine(),
				uid: `pl-${l.uid}`,
				productId: l.productId,
				productCode: l.productCode,
				productName: l.productName,
				description: l.description,
				uom: l.uom,
				orderedQty: l.requestedQty,
				unitPrice: p?.estimatedUnitPrice ?? 0,
				prLineUid: l.uid,
			};
		});
		patch({
			sourcePrId: pr.id,
			sourcePrNumber: pr.prNumber,
			notes: pr.remarks,
			lines,
			deliveryTerms: `From ${pr.requestedBy} (${pr.prDate})`,
		});
	};

	const updateLine = (uid: string, p: Partial<POLineItem>) =>
		patch({ lines: form.lines.map((l) => (l.uid === uid ? { ...l, ...p } : l)) });

	const addSelectedProducts = () => {
		if (!selectedProdIds.length) return;
		const lines = selectedProdIds
			.map((id) => products.find((p) => p.id === id))
			.filter((p): p is ProcurementProduct => !!p)
			.map((p) => ({
				...emptyPOLine(),
				uid: `pl-${p.id}-${Date.now()}`,
				productId: p.id,
				productCode: p.code,
				productName: p.name,
				description: p.description,
				uom: p.uom,
				unitPrice: p.estimatedUnitPrice,
			}));
		patch({ lines: [...form.lines, ...lines] });
		setSelectedProdIds([]);
		setShowProductModal(false);
	};

	const filteredProducts = products.filter((p) => {
		const q = prodSearch.toLowerCase();
		const mSearch =
			!q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
		const mCategory = !prodCategory || p.categoryName === prodCategory;
		return mSearch && mCategory;
	});

	const categories = Array.from(new Set(products.map((p) => p.categoryName)));
	const previewLines = preview.lines;

	const linkedPr = form.sourcePrId ? getPRById(form.sourcePrId) : null;
	const displayPoNo = poNumber || "Auto-generated";
	const totalQty = form.lines.reduce((s, l) => s + l.orderedQty, 0);
	const totalGst =
		preview.summary.totalCgst +
		preview.summary.totalSgst +
		preview.summary.totalIgst;

	const getRequestedQty = (line: POLineItem) => {
		if (!line.prLineUid || !linkedPr) return null;
		return (
			linkedPr.lines.find((l) => l.uid === line.prLineUid)?.requestedQty ??
			line.orderedQty
		);
	};

	const selectSupplier = (idStr: string) => {
		if (!idStr) {
			patch({ supplierId: 0, supplierName: "" });
			return;
		}
		const s = suppliers.find((x) => x.id === Number(idStr));
		if (!s) return;
		patch({
			supplierId: s.id,
			supplierName: s.supplierName,
			supplierType: s.supplierType,
			supplierContactPerson: s.contactPerson || "",
			supplierMobile: s.mobile || s.phone || "",
			supplierEmail: s.email || "",
			supplierGstin: s.gstNumber || "",
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
		label: s.supplierName,
	}));

	return (
		<div className="rounded-xl border border-border bg-white p-5 shadow-sm">
			<div className="space-y-5">
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
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
						<div className="space-y-1">
							<Label className="text-xs font-medium">PO No.</Label>
							<Input
								value={displayPoNo}
								readOnly
								className={cn(
									inputCls,
									"bg-muted/30 font-mono text-muted-foreground",
								)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">PR Reference</Label>
							<AutocompleteSelect
								options={prOptions}
								value={form.sourcePrId ? String(form.sourcePrId) : ""}
								onChange={(v) => v && loadFromPR(Number(v))}
								placeholder="Select PR..."
								searchPlaceholder="Search PR..."
								disabled={readOnly || poType === "direct"}
								className="h-8 rounded-lg text-xs"
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">Supplier</Label>
							<AutocompleteSelect
								options={supplierOptions}
								value={form.supplierId ? String(form.supplierId) : ""}
								onChange={selectSupplier}
								placeholder="Select supplier..."
								searchPlaceholder="Search supplier..."
								disabled={readOnly}
								className="h-8 rounded-lg text-xs"
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">PO Date</Label>
							<Input
								type="date"
								disabled={readOnly}
								value={form.poDate}
								onChange={(e) => patch({ poDate: e.target.value })}
								className={inputCls}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs font-medium">Delivery Date</Label>
							<Input
								type="date"
								disabled={readOnly}
								value={form.expectedDeliveryDate}
								onChange={(e) => patch({ expectedDeliveryDate: e.target.value })}
								className={inputCls}
							/>
						</div>
					</div>
				</div>

				<div className="border-t border-border/60 pt-4">
					<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
						<SectionHead
							label={poType === "pr" ? "Products from PR" : "Products"}
							sub="Verify line items, order quantities, tax settings and prices."
						/>
						<span className="inline-flex h-6 items-center rounded-full bg-brand-50 px-2.5 text-[11px] font-semibold text-brand-700">
							{form.lines.length} item{form.lines.length === 1 ? "" : "s"}
						</span>
					</div>

					{poType === "direct" && form.lines.length === 0 && !readOnly ? (
						<div className="py-10 px-4 text-center rounded-lg border border-dashed border-border bg-muted/10">
							<Package className="w-10 h-10 mx-auto text-muted-foreground/70 mb-2" />
							<p className="text-sm font-semibold text-foreground">
								No products added yet
							</p>
							<Button
								type="button"
								variant="outline"
								className="mt-3 h-8 rounded-lg border-dashed text-xs font-semibold"
								onClick={() => setShowProductModal(true)}
							>
								<Plus className="w-3.5 h-3.5" /> Add first product
							</Button>
						</div>
					) : (
						<>
							{poType === "direct" && !readOnly && (
								<div className="mb-3">
									<Button
										type="button"
										onClick={() => setShowProductModal(true)}
										className="h-8 gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700"
									>
										<Plus className="w-3.5 h-3.5" /> Add Product
									</Button>
								</div>
							)}
							<div className="overflow-x-auto rounded-lg border border-border bg-white">
								<table className="min-w-full table-fixed">
									<thead className="bg-muted/30">
										<tr className="border-b border-border">
											<th className="w-12 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">
												Sr.
											</th>
											<th className="min-w-[180px] px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">
												Product
											</th>
											{poType === "pr" && (
												<th className="w-32 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">
													Requested Qty
												</th>
											)}
											<th className="w-32 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">
												Ordered Qty
											</th>
											<th className="w-24 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">
												Unit
											</th>
											<th className="w-28 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">
												Rate
											</th>
											<th className="w-24 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">
												GST %
											</th>
											<th className="w-32 px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground font-mono">
												Total
											</th>
											{!readOnly && (
												<th className="w-14 px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">
													Action
												</th>
											)}
										</tr>
									</thead>
									<tbody className="divide-y divide-border/60">
										{form.lines.map((line, idx) => {
											const reqQty = getRequestedQty(line);
											const gstPct = line.cgstPct + line.sgstPct + line.igstPct;
											const calcLine = previewLines.find((l) => l.uid === line.uid);
											return (
												<tr
													key={line.uid}
													className="align-top transition-colors hover:bg-muted/10"
												>
													<td className="px-3 py-2.5 text-xs text-muted-foreground">
														{idx + 1}
													</td>
													<td className="px-3 py-2.5 text-xs font-medium text-foreground">
														{line.productName}
													</td>
													{poType === "pr" && (
														<td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">
															{reqQty ?? "—"}
														</td>
													)}
													<td className="px-3 py-2.5">
														<Input
															type="number"
															min={0}
															disabled={readOnly}
															value={line.orderedQty}
															onChange={(e) =>
																updateLine(line.uid, {
																	orderedQty: Number(e.target.value) || 0,
																})
															}
															className={cn(inputCls, "w-20")}
														/>
													</td>
													<td className="px-3 py-2.5 text-xs text-muted-foreground">
														{line.uom || "—"}
													</td>
													<td className="px-3 py-2.5">
														<Input
															type="number"
															min={0}
															disabled={readOnly}
															value={line.unitPrice}
															onChange={(e) =>
																updateLine(line.uid, {
																	unitPrice: Number(e.target.value) || 0,
																})
															}
															className={cn(inputCls, "w-24")}
														/>
													</td>
													<td className="px-3 py-2.5">
														<Input
															type="number"
															min={0}
															disabled={readOnly}
															value={gstPct}
															onChange={(e) => {
																const gst = Number(e.target.value) || 0;
																updateLine(line.uid, {
																	cgstPct: gst / 2,
																	sgstPct: gst / 2,
																	igstPct: 0,
																});
															}}
															className={cn(inputCls, "w-16")}
														/>
													</td>
													<td className="px-3 py-2.5 text-right font-semibold text-xs tabular-nums font-mono">
														{formatCurrency(calcLine?.netAmount ?? line.netAmount)}
													</td>
													{!readOnly && (
														<td className="px-3 py-2.5 text-right">
															<Button
																type="button"
																variant="ghost"
																size="sm"
																onClick={() =>
																	patch({
																		lines: form.lines.filter((x) => x.uid !== line.uid),
																	})
																}
																className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:bg-red-50 hover:text-red-600"
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</td>
													)}
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</>
					)}
				</div>

				<div className="border-t border-border/60 pt-4">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
						<div className="flex-1 flex flex-col">
							<SectionHead
								label="Remarks"
								sub="Add internal context or notes for review."
							/>
							<div className="flex-1 flex flex-col">
								<Textarea
									disabled={readOnly}
									value={form.notes}
									onChange={(e) => patch({ notes: e.target.value })}
									placeholder="Purpose or internal notes..."
									className="flex-1 min-h-[160px] rounded-xl text-xs resize-none"
								/>
							</div>
						</div>

						<div className="flex-1 flex flex-col">
							<div className="flex-1 rounded-xl border border-border bg-white p-3.5 flex flex-col justify-between">
								<div>
									<div className="mb-2.5 flex items-center justify-between gap-2">
										<SectionHead
											label="Attachments"
											sub="Supporting documents."
										/>
										{!readOnly && (
											<Button
												type="button"
												variant="outline"
												size="sm"
												className="h-8 gap-1.5 rounded-lg text-[11px] font-semibold"
												onClick={() => fileRef.current?.click()}
											>
												<Upload className="h-3.5 w-3.5" /> Add File
											</Button>
										)}
									</div>
									{!readOnly && (
										<input
											ref={fileRef}
											type="file"
											className="hidden"
											onChange={onFilePick}
										/>
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
													<span className="min-w-0 flex-1 truncate text-foreground">
														{a.name}
													</span>
													<Eye className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
													<Download className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
													{!readOnly && (
														<button
															type="button"
															onClick={() =>
																patch({
																	attachments: form.attachments.filter(
																		(x) => x.uid !== a.uid,
																	),
																})
															}
															className="text-red-600 transition-colors hover:text-red-700"
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
						</div>

						<div className="flex-1 flex flex-col">
							<div className="flex-1 rounded-xl border border-border bg-white p-3.5 flex flex-col justify-between">
								<div>
									<SectionHead label="PO Summary" />
									<div className="space-y-2 text-xs">
										<div className="flex justify-between">
											<span className="text-muted-foreground">Items</span>
											<span className="font-semibold tabular-nums">
												{form.lines.length}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">Total qty</span>
											<span className="font-semibold tabular-nums">
												{totalQty}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">Subtotal</span>
											<span className="font-semibold tabular-nums">
												{formatCurrency(preview.summary.grossAmount)}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">GST</span>
											<span className="font-semibold tabular-nums">
												{formatCurrency(totalGst)}
											</span>
										</div>
										<div className="flex justify-between items-center border-t border-border/40 pt-2 mt-1">
											<span className="text-muted-foreground">Other charges</span>
											<input
												type="number"
												disabled={readOnly}
												value={form.otherCharges}
												onChange={(e) =>
													patch({ otherCharges: Number(e.target.value) || 0 })
												}
												className="w-24 text-right text-xs font-semibold bg-transparent border-0 p-0 focus:outline-none focus:ring-0 tabular-nums text-foreground focus:border-0"
											/>
										</div>
										<div className="flex justify-between border-t border-border/60 pt-2 mt-2">
											<span className="font-bold text-foreground">Grand total</span>
											<span className="font-bold text-brand-700 tabular-nums">
												{formatCurrency(preview.summary.grandTotal)}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{showProductModal && (
				<div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
					<div className="bg-white rounded-[13px] border border-border w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-xl">
						<div
							className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30"
						>
							<h3 className="text-[13px] font-bold text-foreground">
								Select Products
							</h3>
							<button
								type="button"
								className="p-1.5 hover:bg-muted rounded-[9px] transition-colors"
								onClick={() => setShowProductModal(false)}
							>
								<X className="w-4 h-4" />
							</button>
						</div>
						<div className="p-4 space-y-3">
							<div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto_auto] gap-2">
								<div className="relative">
									<Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
									<Input
										className="pl-8 h-[38px] rounded-lg text-xs"
										placeholder="Search product..."
										value={prodSearch}
										onChange={(e) => setProdSearch(e.target.value)}
									/>
								</div>
								<select
									className="h-[38px] px-2 text-[13px] rounded-lg border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
									value={prodCategory}
									onChange={(e) => setProdCategory(e.target.value)}
								>
									<option value="">All categories</option>
									{categories.map((c) => (
										<option key={c} value={c}>
											{c}
										</option>
									))}
								</select>
								<Button
									variant="outline"
									className="h-[38px] text-xs font-semibold rounded-lg"
									onClick={() => setShowQuickProduct(true)}
								>
									Create Product
								</Button>
								<Button
									className="h-[38px] text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white"
									onClick={addSelectedProducts}
								>
									Add Selected
								</Button>
							</div>
							<div className="border border-border rounded-lg overflow-auto max-h-[48vh] bg-white">
								<table className="w-full text-xs">
									<thead>
										<tr className="border-b border-border bg-muted/20">
											<th className="px-3 py-2.5 w-8 text-center">
												<input
													type="checkbox"
													checked={
														filteredProducts.length > 0 &&
														filteredProducts.every((p) => selectedProdIds.includes(p.id))
													}
													onChange={(e) => {
														if (e.target.checked) {
															const toAdd = filteredProducts.map((p) => p.id);
															setSelectedProdIds((prev) => Array.from(new Set([...prev, ...toAdd])));
														} else {
															const toRemove = new Set(filteredProducts.map((p) => p.id));
															setSelectedProdIds((prev) => prev.filter((id) => !toRemove.has(id)));
														}
													}}
													className="rounded border-border text-brand-600 focus:ring-brand-500 cursor-pointer"
												/>
											</th>
											<th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">
												Product
											</th>
											<th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">
												Category
											</th>
											<th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground font-mono">
												UOM
											</th>
											<th className="px-3 py-2.5 text-right text-[11px] font-semibold text-muted-foreground font-mono">
												Est. Price
											</th>
										</tr>
									</thead>
									<tbody>
										{filteredProducts.map((p) => (
											<tr
												key={p.id}
												className="border-b border-border/50 hover:bg-muted/10 last:border-0"
											>
												<td className="px-3 py-2 text-center">
													<input
														type="checkbox"
														checked={selectedProdIds.includes(p.id)}
														onChange={(e) =>
															setSelectedProdIds((prev) =>
																e.target.checked
																	? [...prev, p.id]
																	: prev.filter((x) => x !== p.id),
															)
														}
														className="rounded border-border text-brand-600 focus:ring-brand-500"
													/>
												</td>
												<td className="px-3 py-2 font-medium text-foreground">
													{p.name}
												</td>
												<td className="px-3 py-2 text-muted-foreground">
													{p.categoryName}
												</td>
												<td className="px-3 py-2 font-mono text-muted-foreground">
													{p.uom}
												</td>
												<td className="px-3 py-2 text-right font-mono text-foreground">
													{formatCurrency(p.estimatedUnitPrice)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			)}

			{showQuickProduct && (
				<div className="fixed inset-0 z-[60] bg-black/35 flex justify-end">
					<div className="w-full max-w-sm bg-white h-full border-l border-border p-5 space-y-4 shadow-2xl flex flex-col justify-between">
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-semibold text-foreground">
									Create Product
								</h3>
								<button
									type="button"
									className="p-1.5 hover:bg-muted rounded-[9px] transition-colors"
									onClick={() => setShowQuickProduct(false)}
								>
									<X className="w-4 h-4" />
								</button>
							</div>
							<div className="space-y-3">
								<div className="space-y-1">
									<Label className="text-xs font-medium">Product Name</Label>
									<Input
										placeholder="e.g., Nitrogen Fertilizer"
										value={quickProduct.name}
										onChange={(e) =>
											setQuickProduct((p) => ({ ...p, name: e.target.value }))
										}
										className="h-9 rounded-lg text-xs"
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-xs font-medium">Product Code</Label>
									<Input
										placeholder="e.g., PRD-0044"
										value={quickProduct.code}
										onChange={(e) =>
											setQuickProduct((p) => ({ ...p, code: e.target.value }))
										}
										className="h-9 rounded-lg text-xs"
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-xs font-medium">Category</Label>
									<Input
										placeholder="e.g., Fertilizers"
										value={quickProduct.categoryName}
										onChange={(e) =>
											setQuickProduct((p) => ({
												...p,
												categoryName: e.target.value,
											}))
										}
										className="h-9 rounded-lg text-xs"
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-xs font-medium">UOM</Label>
									<Input
										placeholder="e.g., KG"
										value={quickProduct.uom}
										onChange={(e) =>
											setQuickProduct((p) => ({ ...p, uom: e.target.value }))
										}
										className="h-9 rounded-lg text-xs"
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-xs font-medium">Description</Label>
									<Textarea
										rows={3}
										placeholder="Optional description..."
										value={quickProduct.description}
										onChange={(e) =>
											setQuickProduct((p) => ({
												...p,
												description: e.target.value,
											}))
										}
										className="rounded-lg text-xs resize-none"
									/>
								</div>
							</div>
						</div>
						<div className="flex justify-end gap-2 border-t border-border pt-4 mt-4">
							<Button
								variant="outline"
								className="h-9 text-xs font-semibold rounded-lg"
								onClick={() => setShowQuickProduct(false)}
							>
								Cancel
							</Button>
							<Button
								className="h-9 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white"
								onClick={() => {
									if (!quickProduct.name.trim() || !quickProduct.code.trim())
										return;
									const created = addProcurementProduct({
										code: quickProduct.code.trim(),
										name: quickProduct.name.trim(),
										categoryName: quickProduct.categoryName.trim() || "General",
										uom: quickProduct.uom.trim() || "PCS",
										description: quickProduct.description.trim(),
										estimatedUnitPrice: 0,
									});
									setSelectedProdIds((p) => [...p, created.id]);
									setQuickProduct({
										name: "",
										code: "",
										categoryName: "",
										uom: "",
										description: "",
									});
									setShowQuickProduct(false);
								}}
							>
								Save Product
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
