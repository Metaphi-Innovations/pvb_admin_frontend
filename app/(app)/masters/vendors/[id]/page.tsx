"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	Edit2,
	Ban,
	CheckCircle2,
	Eye,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	type Vendor,
	type VendorStatus,
	getVendorById,
	formatCreditPeriod,
} from "../vendor-data";
import { loadProducts } from "../../products/product-data";

const STATUS_CFG: Record<VendorStatus, { bg: string; text: string; dot: string; label: string }> = {
	active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
	inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Inactive" },
};

function InfoRow({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
	return (
		<div className="flex items-start justify-between gap-4 border-b border-border/60 px-3 py-2.5 last:border-0">
			<span className="text-[11px] font-medium text-muted-foreground">{label}</span>
			<span className={cn("text-right text-xs font-medium text-foreground", mono && "font-mono")}>
				{value !== undefined && value !== "" ? value : "-"}
			</span>
		</div>
	);
}

function StatusPill({ status }: { status: VendorStatus }) {
	const st = STATUS_CFG[status];
	return (
		<span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", st.bg, st.text)}>
			<span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
			{st.label}
		</span>
	);
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-xl border border-border bg-white p-3.5">
			<p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
			<div>{children}</div>
		</div>
	);
}

export default function VendorDetailPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const [vendor, setVendor] = useState<Vendor | null>(null);
	const [previewDoc, setPreviewDoc] = useState<{ title: string; fileUrl: string; fileName: string } | null>(null);

	useEffect(() => {
		const v = getVendorById(Number(id));
		if (v) {
			setVendor(v);
		}
	}, [id]);

	const activeProducts = useMemo(() => {
		try {
			return loadProducts().filter((p) => p.status === "active");
		} catch {
			return [];
		}
	}, []);

	const getProductMetadataString = (prodId: string) => {
		const prod = activeProducts.find((item) => item.productId === prodId);
		if (!prod) return "";
		const parts: string[] = [];
		if (prod.category) parts.push(`Category: ${prod.category}`);
		if (prod.subCategory) parts.push(`Sub Category: ${prod.subCategory}`);
		if (prod.baseUnit) parts.push(`Base Unit: ${prod.baseUnit}`);
		if (prod.packagingUnit) parts.push(`Packaging Unit: ${prod.packagingUnit}`);
		if (prod.hsnCode) parts.push(`HSN: ${prod.hsnCode}`);
		if (prod.gstRate) parts.push(`GST: ${prod.gstRate}`);
		return parts.join(" | ");
	};

	if (!vendor) {
		return (
			<div className="py-16 text-center">
				<p className="text-sm text-muted-foreground">Vendor not found.</p>
				<Link href="/masters/vendors" className="mt-2 inline-block text-xs text-brand-600 hover:underline">
					Back to listing
				</Link>
			</div>
		);
	}

	const addressStr = [vendor.billingAddress?.line1, vendor.billingAddress?.line2].filter(Boolean).join(", ");

	return (
		<FormContainer
			title={vendor.vendorName}
			description={`${vendor.vendorCode} • ${vendor.mobileCountryCode || "+91"} ${vendor.mobile} • ${vendor.email || "No email"}`}
			onBack={() => router.push("/masters/vendors")}
			actions={
				<div className="flex items-center gap-2">
					<StatusPill status={vendor.status} />
					<Link href={`/masters/vendors/${vendor.id}/edit`}>
						<Button size="sm" className="h-9 gap-1.5 bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 rounded-lg">
							<Edit2 className="w-3.5 h-3.5" /> Edit
						</Button>
					</Link>
				</div>
			}
			noCard={true}
		>
			<div className="w-full space-y-5">
				{vendor.status === "inactive" && (
					<div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
						<CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
						<p className="text-xs text-slate-700">Inactive vendor - hidden from transaction vendor dropdowns.</p>
					</div>
				)}

				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					<DetailCard title="Basic Details">
						<InfoRow label="Vendor Name" value={vendor.vendorName} />
						<InfoRow label="Company Name" value={vendor.companyName} />
						<InfoRow label="Mobile" value={`${vendor.mobileCountryCode || "+91"} ${vendor.mobile}`} mono />
						<InfoRow label="Email" value={vendor.email} />
						<InfoRow label="Status" value={<StatusPill status={vendor.status} />} />
						<InfoRow label="Tags" value={vendor.tags} />
					</DetailCard>

					<DetailCard title="Tax & Registration">
						<InfoRow label="GST Applicable" value={vendor.gstApplicable ? "Yes" : "No"} />
						{vendor.gstApplicable && (
							<>
								<InfoRow label="GSTIN" value={vendor.gstNumber} mono />
								<InfoRow label="Legal Company Name" value={vendor.legalCompanyName} />
							</>
						)}
						<InfoRow label="TDS Applicable" value={vendor.tdsApplicable ? "Yes" : "No"} />
						{vendor.tdsApplicable && (
							<InfoRow label="TDS Percentage" value={vendor.tdsPercentage === "custom" ? `${vendor.tdsCustomPercent}%` : `${vendor.tdsPercentage}%`} mono />
						)}
						<InfoRow label="TCS Applicable" value={vendor.tcsApplicable ? "Yes" : "No"} />
						<InfoRow label="PAN Number" value={vendor.panNumber} mono />
					</DetailCard>

					<DetailCard title="Billing Address">
						<InfoRow label="Address" value={addressStr} />
						<InfoRow label="State" value={vendor.billingAddress?.state} />
						<InfoRow label="City" value={vendor.billingAddress?.city} />
						<InfoRow label="Country" value={vendor.billingAddress?.country} />
						<InfoRow label="Pin Code" value={vendor.billingAddress?.pincode} mono />
					</DetailCard>

					<DetailCard title="Commercial Details">
						<InfoRow label="Credit Period" value={formatCreditPeriod(vendor)} />
					</DetailCard>

					<DetailCard title="Bank Details">
						<InfoRow label="Account Holder Name" value={vendor.accountHolderName} />
						<InfoRow label="Bank Name" value={vendor.bankName} />
						<InfoRow label="Branch Name" value={vendor.branch} />
						<InfoRow label="Bank A/c #" value={vendor.accountNumber} mono />
						<InfoRow label="IFSC Code" value={vendor.ifscCode} mono />
						<InfoRow label="SWIFT Code" value={vendor.swiftCode} />
					</DetailCard>

					<DetailCard title="Record Info">
						<InfoRow label="Created By" value={vendor.createdBy} />
						<InfoRow label="Created Date" value={vendor.createdDate} />
						<InfoRow label="Updated By" value={vendor.updatedBy} />
						<InfoRow label="Updated Date" value={vendor.updatedDate} />
						<InfoRow label="Remarks" value={vendor.remarks} />
					</DetailCard>
				</div>

				{/* Contact Persons Section */}
				{vendor.contacts && vendor.contacts.length > 0 && (
					<div className="rounded-xl border border-border bg-white p-4">
						<p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contact Persons</p>
						<div className="overflow-x-auto rounded-lg border border-border">
							<table className="w-full text-left text-xs border-collapse">
								<thead>
									<tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold">
										<th className="py-2 px-3 w-12 text-center">Sr.</th>
										<th className="py-2 px-3">Name</th>
										<th className="py-2 px-3">Designation</th>
										<th className="py-2 px-3">Mobile</th>
										<th className="py-2 px-3">Email</th>
									</tr>
								</thead>
								<tbody>
									{vendor.contacts.map((contact, idx) => (
										<tr key={contact.uid} className="border-b border-border/60 last:border-0 hover:bg-muted/10">
											<td className="py-2 px-3 text-center text-muted-foreground">{idx + 1}</td>
											<td className="py-2 px-3 font-medium text-foreground">{contact.name}</td>
											<td className="py-2 px-3 text-muted-foreground">{contact.designation || "-"}</td>
											<td className="py-2 px-3 text-muted-foreground">{contact.countryCode || "+91"} {contact.mobile}</td>
											<td className="py-2 px-3 text-muted-foreground">{contact.email || "-"}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* Product Mapping Section */}
				{vendor.vendorProducts && vendor.vendorProducts.length > 0 && (
					<div className="rounded-xl border border-border bg-white p-4">
						<p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Product Mappings</p>
						<div className="overflow-x-auto rounded-lg border border-border">
							<table className="w-full text-left text-xs border-collapse">
								<thead>
									<tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold">
										<th className="py-2 px-3 w-12 text-center">Sr.</th>
										<th className="py-2 px-3">Product (SKU - Name)</th>
										<th className="py-2 px-3 w-40">MRP</th>
										<th className="py-2 px-3 w-40">Cost Price</th>
									</tr>
								</thead>
								<tbody>
									{vendor.vendorProducts.map((p, idx) => (
										<tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-muted/10">
											<td className="py-2 px-3 text-center text-muted-foreground">{idx + 1}</td>
											<td className="py-2 px-3">
												<div className="flex flex-col gap-0.5">
													<span className="font-semibold text-foreground">
														{p.sku || p.productId} — {p.productName}
													</span>
													<span className="text-[10px] text-muted-foreground select-none">
														{getProductMetadataString(p.productId)}
													</span>
												</div>
											</td>
											<td className="py-2 px-3 text-muted-foreground font-mono">
												{p.mrp !== undefined && p.mrp !== null
													? `₹${p.mrp.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
													: "—"}
											</td>
											<td className="py-2 px-3 font-semibold text-foreground font-mono">
												{p.price !== undefined && p.price !== null
													? `₹${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
													: "—"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* Document Section */}
				{vendor.documents && vendor.documents.some(d => d.fileName || d.fileUrl) && (
					<div className="rounded-xl border border-border bg-white p-4">
						<p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Uploaded Documents</p>
						<div className="overflow-x-auto rounded-lg border border-border">
							<table className="w-full text-left text-xs border-collapse">
								<thead>
									<tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold">
										<th className="py-2 px-3 w-12 text-center">Sr.</th>
										<th className="py-2 px-3">Document Name</th>
										<th className="py-2 px-3">File Name</th>
										<th className="py-2 px-3 w-28 text-right">Action</th>
									</tr>
								</thead>
								<tbody>
									{vendor.documents
										.filter(d => d.fileName || d.fileUrl)
										.map((doc, idx) => (
											<tr key={doc.uid} className="border-b border-border/60 last:border-0 hover:bg-muted/10">
												<td className="py-2 px-3 text-center text-muted-foreground">{idx + 1}</td>
												<td className="py-2 px-3 font-medium text-foreground">{doc.documentName}</td>
												<td className="py-2 px-3 text-muted-foreground">{doc.fileName || "Uploaded File"}</td>
												<td className="py-2 px-3 text-right">
													{doc.fileUrl && (
														<Button
															type="button"
															variant="outline"
															size="sm"
															className="h-7 text-[11px] px-2.5 gap-1"
															onClick={() => setPreviewDoc({ title: doc.documentName, fileUrl: doc.fileUrl!, fileName: doc.fileName || "file" })}
														>
															<Eye className="w-3.5 h-3.5" /> View
														</Button>
													)}
												</td>
											</tr>
										))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>

			{/* Image / PDF Preview Modal */}
			<Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
				<DialogContent className="max-w-2xl bg-white">
					<DialogHeader>
						<DialogTitle className="text-sm font-semibold">{previewDoc?.title}</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg border-border bg-muted/10 min-h-[300px]">
						{previewDoc && (
							/\.(jpe?g|png|webp|gif)$/i.test(previewDoc.fileName) ? (
								<img
									src={previewDoc.fileUrl}
									alt={previewDoc.title}
									className="max-h-[50vh] max-w-full object-contain rounded-md animate-in zoom-in-95 duration-200"
								/>
							) : (
								<div className="text-center space-y-4">
									<div className="inline-flex p-3 rounded-full bg-brand-50 border border-brand-100 text-brand-600">
										<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
										</svg>
									</div>
									<div>
										<p className="text-xs font-semibold text-foreground">{previewDoc.fileName}</p>
										<p className="text-[11px] text-muted-foreground mt-1">This file type cannot be previewed directly.</p>
									</div>
									<a
										href={previewDoc.fileUrl}
										target="_blank"
										rel="noreferrer"
										className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
									>
										Open in new tab
									</a>
								</div>
							)
						)}
					</div>
				</DialogContent>
			</Dialog>
		</FormContainer>
	);
}
