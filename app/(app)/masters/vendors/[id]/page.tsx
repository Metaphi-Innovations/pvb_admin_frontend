"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	ArrowLeft,
	Edit2,
	Ban,
	CheckCircle2,
	Eye,
	Building2,
	FileText,
	ShoppingBag,
	Info,
	Users,
	CreditCard,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	type Vendor,
	type VendorStatus,
	getVendorById,
	formatCreditPeriod,
} from "../vendor-data";
import { loadProducts } from "../../products/product-data";
import { AppLayout } from "@/components/layout/AppLayout";

const STATUS_CFG: Record<
	VendorStatus,
	{ bg: string; text: string; dot: string; label: string }
> = {
	active: {
		bg: "bg-emerald-50 border-emerald-200",
		text: "text-emerald-700",
		dot: "bg-emerald-500",
		label: "Active",
	},
	inactive: {
		bg: "bg-slate-100 border-slate-200",
		text: "text-slate-600",
		dot: "bg-slate-400",
		label: "Inactive",
	},
};

function StatusBadge({ status }: { status: VendorStatus }) {
	const cfg = STATUS_CFG[status] || {
		bg: "bg-slate-100 border-slate-200",
		text: "text-slate-600",
		dot: "bg-slate-400",
		label: status,
	};
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
				cfg.bg,
				cfg.text,
			)}
		>
			<span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
			{cfg.label}
		</span>
	);
}

function DetailField({
	label,
	value,
	mono,
}: {
	label: string;
	value?: React.ReactNode;
	mono?: boolean;
}) {
	const displayVal =
		value !== undefined && value !== null && value !== "" ? value : "—";
	return (
		<div className='py-2 space-y-1 border-b border-border/50 last:border-0'>
			<span className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider'>
				{label}
			</span>
			<p
				className={cn(
					"text-xs font-semibold text-foreground",
					mono && "font-mono",
				)}
			>
				{displayVal}
			</p>
		</div>
	);
}

export default function VendorDetailPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const [vendor, setVendor] = useState<Vendor | null>(null);
	const [activeSubTab, setActiveSubTab] = useState("overview");
	const [previewDoc, setPreviewDoc] = useState<{
		title: string;
		fileUrl: string;
		fileName: string;
	} | null>(null);

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
			<div className='py-16 text-center'>
				<p className='text-sm text-muted-foreground'>Vendor not found.</p>
				<Link
					href='/masters/vendors'
					className='inline-block mt-2 text-xs text-brand-600 hover:underline'
				>
					Back to listing
				</Link>
			</div>
		);
	}

	const addressStr = [
		vendor.billingAddress?.line1,
		vendor.billingAddress?.line2,
	]
		.filter(Boolean)
		.join(", ");

	const contactCount = vendor.contacts?.length ?? 0;
	const productCount = vendor.vendorProducts?.length ?? 0;
	const docCount = vendor.documents?.filter((d) => d.fileName || d.fileUrl).length ?? 0;

	const tabs = [
		{ id: "overview", label: "Overview", icon: Info },
		{ id: "contacts", label: `Contacts (${contactCount})`, icon: Users },
		{ id: "bank", label: "Bank Details", icon: CreditCard },
		{
			id: "products",
			label: `Products Mapped (${productCount})`,
			icon: ShoppingBag,
		},
		{ id: "documents", label: `Documents (${docCount})`, icon: FileText },
	];

	return (
		<AppLayout>
			<div className='w-full space-y-6'>
				{/* ── HEADER SECTION ── */}
				<div className='flex flex-col gap-4 pb-5 border-b sm:flex-row sm:items-center sm:justify-between border-border/80'>
					<div className='flex items-center gap-3'>
						<Button
							variant='outline'
							size='icon'
							className='w-8 h-8 rounded-lg hover:bg-muted border-border'
							onClick={() => router.push("/masters/vendors")}
						>
							<ArrowLeft className='w-4 h-4 text-muted-foreground' />
						</Button>
						<h1 className='text-base font-bold text-foreground'>
							Vendor Details
						</h1>
					</div>

					<div className='flex items-center gap-2'>
						<StatusBadge status={vendor.status} />
						<Link href={`/masters/vendors/${vendor.id}/edit`}>
							<Button
								size='sm'
								className='h-9 gap-1.5 bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 rounded-lg shadow-sm'
							>
								<Edit2 className='w-3.5 h-3.5' /> Edit Vendor
							</Button>
						</Link>
					</div>
				</div>

				{/* ── TOP SUMMARY CARD & KPI BLOCKS ── */}
				<div className='grid grid-cols-1 gap-5 lg:grid-cols-3'>
					{/* Profile Summary Card */}
					<div className='flex flex-col justify-between p-5 bg-white border shadow-sm lg:col-span-2 rounded-xl border-border'>
						<div className='flex items-start gap-4'>
							<div className='flex items-center justify-center flex-shrink-0 w-12 h-12 text-lg font-bold border rounded-full bg-brand-50 border-brand-100 text-brand-600'>
								{vendor.vendorName.charAt(0).toUpperCase()}
							</div>
							<div className='space-y-1'>
								<div className='flex flex-wrap items-center gap-2'>
									<h2 className='text-base font-bold text-foreground'>
										{vendor.vendorName}
									</h2>
									<span className='font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md'>
										{vendor.vendorCode}
									</span>
									<StatusBadge status={vendor.status} />
								</div>
								<div className='flex flex-wrap items-center text-xs gap-x-4 gap-y-1 text-muted-foreground'>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>Type:</span>
										{vendor.tags || "Standard"}
									</span>
									<span>•</span>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Mobile:
										</span>
										{`${vendor.mobileCountryCode || "+91"} ${vendor.mobile}`}
									</span>
									<span>•</span>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Email:
										</span>
										{vendor.email || "—"}
									</span>
								</div>
								<div className='flex flex-wrap items-center pt-1 text-xs gap-x-4 gap-y-1 text-muted-foreground'>
									{vendor.gstApplicable && (
										<span className='flex items-center gap-1'>
											<span className='font-semibold text-foreground'>
												GSTIN:
											</span>
											<span className='font-mono'>{vendor.gstNumber || "—"}</span>
										</span>
									)}
									{vendor.gstApplicable && <span>•</span>}
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Credit Period:
										</span>
										{formatCreditPeriod(vendor)}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* 4 Compact KPI blocks */}
					<div className='grid grid-cols-2 gap-3'>
						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Credit Period
							</p>
							<p className='mt-1 font-mono text-lg font-bold text-foreground'>
								{formatCreditPeriod(vendor)}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Contacts
							</p>
							<p className='mt-1 font-mono text-lg font-bold text-foreground'>
								{contactCount}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Products Mapped
							</p>
							<p className='mt-1 font-mono text-lg font-bold text-foreground'>
								{productCount}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Documents
							</p>
							<p className='mt-1 font-mono text-lg font-bold text-foreground'>
								{docCount}
							</p>
						</div>
					</div>
				</div>

				{/* ── UNDERLINE TAB NAVIGATION ── */}
				<div className='border-b border-border'>
					<div className='flex gap-6'>
						{tabs.map((t) => {
							const active = activeSubTab === t.id;
							const Icon = t.icon;
							return (
								<button
									key={t.id}
									className={cn(
										"pb-3 text-xs font-semibold border-b-2 transition-colors focus:outline-none flex items-center gap-1.5",
										active
											? "border-brand-600 text-brand-600 font-bold"
											: "border-transparent text-muted-foreground hover:text-foreground",
									)}
									onClick={() => setActiveSubTab(t.id)}
								>
									<Icon className='w-3.5 h-3.5' />
									{t.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* ── TAB CONTENT ── */}
				<div className='w-full'>
					{/* TAB 1: OVERVIEW */}
					{activeSubTab === "overview" && (
						<div className='space-y-5'>
							{vendor.status === "inactive" && (
								<div className='flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm'>
									<CheckCircle2 className='mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500' />
									<p className='text-xs text-slate-700'>
										Inactive vendor - hidden from transaction vendor dropdowns.
									</p>
								</div>
							)}

							<div className='p-6 space-y-6 bg-white border shadow-sm rounded-xl border-border'>
								{/* Section 1: Basic Details */}
								<div className='space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Vendor Information
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Vendor Name'
											value={vendor.vendorName}
										/>
										<DetailField
											label='Company Name'
											value={vendor.companyName}
										/>
										<DetailField
											label='Mobile'
											value={`${vendor.mobileCountryCode || "+91"} ${vendor.mobile}`}
											mono
										/>
										<DetailField label='Email' value={vendor.email} />
										<DetailField
											label='Credit Period'
											value={formatCreditPeriod(vendor)}
										/>
										<DetailField
											label='Tags'
											value={vendor.tags}
										/>
										<DetailField label="" value=" "></DetailField>
									</div>
								</div>

								{/* Section 2: Address */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Billing Address
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Address'
											value={addressStr}
										/>
										<DetailField label='City' value={vendor.billingAddress?.city} />
										<DetailField label='State' value={vendor.billingAddress?.state} />
										<DetailField label='Country' value={vendor.billingAddress?.country} />
										<DetailField
											label='Pin Code'
											value={vendor.billingAddress?.pincode}
											mono
										/>
										<DetailField label="" value=" "></DetailField>
									</div>
								</div>

								{/* Section 3: Tax & Registration */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										GST & Tax Details
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='GST Applicable'
											value={vendor.gstApplicable ? "Yes" : "No"}
										/>
										{vendor.gstApplicable && (
											<>
												<DetailField
													label='GSTIN'
													value={vendor.gstNumber}
													mono
												/>
												<DetailField
													label='Legal Company Name'
													value={vendor.legalCompanyName}
												/>
											</>
										)}
										<DetailField
											label='PAN Number'
											value={vendor.panNumber}
											mono
										/>
										<DetailField label="" value=" "></DetailField>
									</div>
								</div>

								{/* Section 4: TDS & TCS Details */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										TDS & TCS Details
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='TDS Applicable'
											value={vendor.tdsApplicable ? "Yes" : "No"}
										/>
										{vendor.tdsApplicable && (
											<DetailField
												label='TDS Percentage'
												value={
													vendor.tdsPercentage === "custom"
														? `${vendor.tdsCustomPercent}%`
														: `${vendor.tdsPercentage}%`
												}
												mono
											/>
										)}
										<DetailField
											label='TCS Applicable'
											value={vendor.tcsApplicable ? "Yes" : "No"}
										/>
										<DetailField label="" value=" "></DetailField>
									</div>
								</div>

								{/* Section 6: Record Info / Additional Information */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Additional Information
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Created By'
											value={vendor.createdBy}
										/>
										<DetailField
											label='Created Date'
											value={vendor.createdDate}
										/>
										<DetailField
											label='Updated By'
											value={vendor.updatedBy}
										/>
										<DetailField
											label='Updated Date'
											value={vendor.updatedDate}
										/>
										<DetailField
											label='Remarks'
											value={vendor.remarks}
										/>
										<DetailField label="" value=" "></DetailField>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* TAB: BANK DETAILS */}
					{activeSubTab === "bank" && (
						<div className='p-6 space-y-6 bg-white border shadow-sm rounded-xl border-border'>
							<div className='space-y-3'>
								<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
									Bank Details
								</h3>
								<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
									<DetailField
										label='Account Holder Name'
										value={vendor.accountHolderName}
									/>
									<DetailField label='Bank Name' value={vendor.bankName} />
									<DetailField
										label='Branch Name'
										value={vendor.branch}
									/>
									<DetailField
										label='Bank A/c #'
										value={vendor.accountNumber}
										mono
									/>
									<DetailField
										label='IFSC Code'
										value={vendor.ifscCode}
										mono
									/>
									<DetailField
										label='SWIFT Code'
										value={vendor.swiftCode}
									/>
									<DetailField label="" value=" "></DetailField>
								</div>
							</div>
						</div>
					)}

					{/* TAB 2: CONTACTS */}
					{activeSubTab === "contacts" && (
						<div>
							{vendor.contacts && vendor.contacts.length > 0 ? (
								<div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
									{vendor.contacts.map((contact, idx) => (
										<div
											key={contact.uid || idx}
											className='p-5 space-y-4 bg-white border shadow-sm rounded-xl border-border'
										>
											<div className='flex items-center justify-between pb-2 border-b'>
												<h3 className='text-sm font-bold text-foreground'>
													{contact.name}
												</h3>
												<span className='inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand-50 text-brand-750 border border-brand-200'>
													{contact.designation || "Contact Person"}
												</span>
											</div>

											<div className='grid grid-cols-1 gap-4 text-xs sm:grid-cols-2'>
												<div className='space-y-1 bg-slate-50/50 p-3.5 rounded-lg border border-slate-100'>
													<span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
														Mobile
													</span>
													<p className='mt-1 font-mono font-semibold text-foreground'>
														{contact.countryCode || "+91"} {contact.mobile}
													</p>
												</div>

												<div className='space-y-1 bg-slate-50/50 p-3.5 rounded-lg border border-slate-100'>
													<span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
														Email
													</span>
													<p className='mt-1 font-semibold text-foreground'>
														{contact.email || "—"}
													</p>
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className='p-8 text-xs text-center bg-white border shadow-sm rounded-xl border-border text-muted-foreground'>
									No contacts configured for this vendor.
								</div>
							)}
						</div>
					)}

					{/* TAB 3: PRODUCT MAPPING */}
					{activeSubTab === "products" && (
						<div>
							{productCount > 0 ? (
								<div className='overflow-hidden bg-white border shadow-sm rounded-xl border-border'>
									<div className='overflow-x-auto'>
										<table className='w-full text-xs text-left border-collapse'>
											<thead>
												<tr className='font-semibold border-b border-border bg-slate-50 text-muted-foreground'>
													<th className='px-4 py-3'>Product Name</th>
													<th className='px-4 py-3'>SKU / Code</th>
													<th className='px-4 py-3 text-right'>MRP</th>
													<th className='px-4 py-3 text-right'>Cost Price</th>
													<th className='px-4 py-3 text-center'>Status</th>
												</tr>
											</thead>
											<tbody>
												{vendor.vendorProducts?.map((item, idx) => (
													<tr
														key={item.id || idx}
														className='border-b border-border/60 last:border-0 hover:bg-slate-50/50'
													>
														<td className='px-4 py-3 font-semibold text-foreground'>
															<div className='flex flex-col gap-0.5'>
																<span className='font-semibold text-foreground'>
																	{item.productName}
																</span>
																<span className='text-[10px] text-muted-foreground select-none'>
																	{getProductMetadataString(item.productId)}
																</span>
															</div>
														</td>
														<td className='px-4 py-3 font-mono text-xs font-semibold text-brand-700'>
															{item.sku || "—"}
														</td>
														<td className='px-4 py-3 font-mono text-right tabular-nums text-muted-foreground'>
															{item.mrp !== undefined && item.mrp !== null
																? `₹${item.mrp.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
																: "—"}
														</td>
														<td className='px-4 py-3 font-mono font-bold text-right tabular-nums text-emerald-600'>
															{item.price !== undefined && item.price !== null
																? `₹${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
																: "—"}
														</td>
														<td className='px-4 py-3 text-center'>
															<span
																className={cn(
																	"inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-semibold border",
																	item.status === "Active"
																		? "bg-emerald-50 text-emerald-700 border-emerald-200"
																		: "bg-slate-50 text-slate-600 border-slate-200",
																)}
															>
																{item.status || "—"}
															</span>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							) : (
								<div className='p-8 text-xs text-center bg-white border shadow-sm rounded-xl border-border text-muted-foreground'>
									No products mapped to this vendor.
								</div>
							)}
						</div>
					)}

					{/* TAB 4: DOCUMENTS */}
					{activeSubTab === "documents" && (
						<div>
							{docCount === 0 && (!vendor.remarks || !vendor.remarks.trim()) ? (
								<div className='p-8 text-xs text-center bg-white border shadow-sm rounded-xl border-border text-muted-foreground'>
									No documents uploaded for this vendor.
								</div>
							) : (
								<div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
									{/* Documents List Card */}
									{docCount > 0 && (
										<div className='p-5 space-y-4 bg-white border shadow-sm rounded-xl border-border'>
											<h3 className='pb-2 text-sm font-bold border-b text-foreground'>
												Uploaded Documents
											</h3>
											<div className='space-y-3'>
												{vendor.documents
													?.filter((d) => d.fileName || d.fileUrl)
													.map((doc, idx) => (
														<div
															key={doc.uid || idx}
															className='flex items-center justify-between p-3 transition-colors border rounded-lg border-border/80 bg-slate-50/50 hover:bg-slate-50'
														>
															<div className='space-y-1'>
																<p className='text-xs font-bold text-foreground'>
																	{doc.documentName}
																</p>
																{doc.fileName ? (
																	<button
																		type='button'
																		className='font-mono text-xs font-semibold text-left text-brand-600 hover:text-brand-700 hover:underline'
																		onClick={() => {
																			if (doc.fileUrl) {
																				setPreviewDoc({
																					title: doc.documentName,
																					fileUrl: doc.fileUrl,
																					fileName: doc.fileName,
																				});
																			}
																		}}
																	>
																		{doc.fileName}
																	</button>
																) : (
																	<p className='text-xs text-muted-foreground'>
																		—
																	</p>
																)}
															</div>
															<div>
																<span className='inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200'>
																	Uploaded
																</span>
															</div>
														</div>
													))}
											</div>
										</div>
									)}

									{/* Remarks Card */}
									<div className='p-5 space-y-4 bg-white border shadow-sm rounded-xl border-border'>
										<h3 className='pb-2 text-sm font-bold border-b text-foreground'>
											Remarks & Notes
										</h3>
										<p className='text-xs font-medium leading-relaxed whitespace-pre-wrap text-foreground'>
											{vendor.remarks?.trim() || "No remarks provided."}
										</p>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Image / PDF Preview Modal */}
			<Dialog
				open={!!previewDoc}
				onOpenChange={(open) => !open && setPreviewDoc(null)}
			>
				<DialogContent className='max-w-2xl bg-white'>
					<DialogHeader>
						<DialogTitle className='text-sm font-semibold'>
							{previewDoc?.title}
						</DialogTitle>
					</DialogHeader>
					<div className='flex flex-col items-center justify-center p-4 border border-dashed rounded-lg border-border bg-muted/10 min-h-[300px]'>
						{previewDoc &&
							(/\.(jpe?g|png|webp|gif)$/i.test(previewDoc.fileName) ? (
								<img
									src={previewDoc.fileUrl}
									alt={previewDoc.title}
									className='max-h-[50vh] max-w-full object-contain rounded-md animate-in zoom-in-95 duration-200'
								/>
							) : (
								<div className='space-y-4 text-center'>
									<div className='inline-flex p-3 border rounded-full bg-brand-50 border-brand-100 text-brand-600'>
										<svg
											className='w-8 h-8'
											fill='none'
											viewBox='0 0 24 24'
											stroke='currentColor'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
											/>
										</svg>
									</div>
									<div>
										<p className='text-xs font-semibold text-foreground'>
											{previewDoc.fileName}
										</p>
										<p className='text-[11px] text-muted-foreground mt-1'>
											This file type cannot be previewed directly.
										</p>
									</div>
									<a
										href={previewDoc.fileUrl}
										target='_blank'
										rel='noreferrer'
										className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-xs font-medium text-white hover:bg-brand-700 transition-colors'
									>
										Open in new tab
									</a>
								</div>
							))}
					</div>
				</DialogContent>
			</Dialog>
		</AppLayout>
	);
}
