"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	ArrowLeft,
	Edit2,
	Ban,
	CheckCircle2,
	ShieldAlert,
	Eye,
	Building2,
	FileText,
	ShoppingBag,
	CreditCard,
	Info,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	type Customer,
	type CustomerStatus,
	loadCustomers,
	saveCustomers,
	todayStr,
	CUSTOMER_TYPE_LABELS,
	PAYMENT_TERMS_OPTIONS,
	formatMobile,
	formatCreditLimit,
	getActiveGSTMasters,
	getActiveTDSMasters,
} from "../customer-data";
import { CustomerStatusControl } from "../components/CustomerStatusControl";
import { readCustomerPermissions } from "../customer-permissions";
import { AppLayout } from "@/components/layout/AppLayout";

const STATUS_CFG: Record<
	CustomerStatus,
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
	draft: {
		bg: "bg-blue-50 border-blue-200",
		text: "text-blue-700",
		dot: "bg-blue-500",
		label: "Draft",
	},
	blocked: {
		bg: "bg-red-50 border-red-200",
		text: "text-red-700",
		dot: "bg-red-400",
		label: "Blocked",
	},
};

function StatusBadge({ status }: { status: CustomerStatus }) {
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

export default function CustomerDetailPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const [customer, setCustomer] = useState<Customer | null>(null);
	const [records, setRecords] = useState<Customer[]>([]);
	const [perms, setPerms] = useState(readCustomerPermissions);
	const [activeSubTab, setActiveSubTab] = useState("overview");
	const [previewDoc, setPreviewDoc] = useState<{
		title: string;
		fileUrl: string;
		fileName: string;
	} | null>(null);

	useEffect(() => {
		setPerms(readCustomerPermissions());
		const list = loadCustomers();
		setRecords(list);
		setCustomer(list.find((c) => c.id === Number(id)) ?? null);
	}, [id]);

	const updateStatus = (
		customerId: number,
		status: CustomerStatus,
		blockReason = "",
	) => {
		const today = todayStr();
		const updated = records.map((r) => {
			if (r.id !== customerId) return r;
			return {
				...r,
				status,
				blockReason: status === "blocked" ? blockReason : "",
				updatedBy: "Admin",
				updatedDate: today,
				lastStatusChange: today,
				statusHistory: [
					...r.statusHistory,
					{
						date: today,
						from: r.status,
						to: status,
						by: "Admin",
						reason: blockReason || `Status -> ${status}`,
					},
				],
			};
		});
		setRecords(updated);
		saveCustomers(updated);
		setCustomer(updated.find((c) => c.id === customerId) ?? null);
	};

	if (!perms.canView) {
		return (
			<div className='flex flex-col items-center gap-3 py-16 text-center'>
				<div className='flex items-center justify-center w-12 h-12 border rounded-xl border-amber-200 bg-amber-50'>
					<ShieldAlert className='w-6 h-6 text-amber-600' />
				</div>
				<h1 className='text-lg font-bold text-foreground'>Access Restricted</h1>
				<p className='max-w-md text-sm text-muted-foreground'>
					You do not have permission to view this customer.
				</p>
				<Link
					href='/masters/customers'
					className='mt-2 text-xs text-brand-600 hover:underline'
				>
					Back to listing
				</Link>
			</div>
		);
	}

	if (!customer) {
		return (
			<div className='py-16 text-center'>
				<p className='text-sm text-muted-foreground'>Customer not found.</p>
				<Link
					href='/masters/customers'
					className='inline-block mt-2 text-xs text-brand-600 hover:underline'
				>
					Back to listing
				</Link>
			</div>
		);
	}

	const gst = getActiveGSTMasters().find((g) => g.id === customer.gstMasterId);
	const tds = getActiveTDSMasters().find((t) => t.id === customer.tdsMasterId);
	const payLabel =
		PAYMENT_TERMS_OPTIONS.find((p) => p.value === customer.paymentTerms)
			?.label ?? customer.paymentTerms;

	const mappedProducts = customer.products || customer.customerProducts || [];
	const branchCount = customer.branches?.length ?? 0;
	const productCount = mappedProducts.length;
	const docCount = (() => {
		const reqCount =
			customer.documents?.requiredDocuments?.filter((d) => d.fileName).length ??
			0;
		const addCount =
			customer.documents?.additionalDocuments?.filter(
				(d) => d.fileName || d.title,
			).length ?? 0;
		return reqCount + addCount;
	})();

	const tabs = [
		{ id: "overview", label: "Overview", icon: Info },
		{ id: "branches", label: `Branches (${branchCount})`, icon: Building2 },
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
							onClick={() => router.push("/masters/customers")}
						>
							<ArrowLeft className='w-4 h-4 text-muted-foreground' />
						</Button>
						<h1 className='text-base font-bold text-foreground'>
							Customer Details
						</h1>
					</div>

					<div className='flex items-center gap-2'>
						<CustomerStatusControl
							customer={customer}
							onStatusChange={updateStatus}
							canEdit={perms.canEdit}
						/>
						{perms.canEdit && (
							<Link href={`/masters/customers/${customer.id}/edit`}>
								<Button
									size='sm'
									className='h-9 gap-1.5 bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 rounded-lg shadow-sm'
								>
									<Edit2 className='w-3.5 h-3.5' /> Edit Customer
								</Button>
							</Link>
						)}
					</div>
				</div>

				{/* ── TOP SUMMARY CARD & KPI BLOCKS ── */}
				<div className='grid grid-cols-1 gap-5 lg:grid-cols-3'>
					{/* Profile Summary Card */}
					<div className='flex flex-col justify-between p-5 bg-white border shadow-sm lg:col-span-2 rounded-xl border-border'>
						<div className='flex items-start gap-4'>
							<div className='flex items-center justify-center flex-shrink-0 w-12 h-12 text-lg font-bold border rounded-full bg-brand-50 border-brand-100 text-brand-600'>
								{customer.customerName.charAt(0).toUpperCase()}
							</div>
							<div className='space-y-1'>
								<div className='flex flex-wrap items-center gap-2'>
									<h2 className='text-base font-bold text-foreground'>
										{customer.customerName}
									</h2>
									<span className='font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md'>
										{customer.customerCode}
									</span>
									<StatusBadge status={customer.status} />
								</div>
								<div className='flex flex-wrap items-center text-xs gap-x-4 gap-y-1 text-muted-foreground'>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>Type:</span>
										{CUSTOMER_TYPE_LABELS[
											customer.customerType.toLowerCase()
										] ?? customer.customerType}
									</span>
									<span>•</span>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Mobile:
										</span>
										{formatMobile(customer.countryCode, customer.mobile)}
									</span>
									<span>•</span>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Email:
										</span>
										{customer.email || "—"}
									</span>
								</div>
								<div className='flex flex-wrap items-center pt-1 text-xs gap-x-4 gap-y-1 text-muted-foreground'>
									{customer.gstApplicable && (
										<span className='flex items-center gap-1'>
											<span className='font-semibold text-foreground'>
												GSTIN:
											</span>
											<span className='font-mono'>{customer.gstin || "—"}</span>
										</span>
									)}
									{customer.gstApplicable && <span>•</span>}
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Territory:
										</span>
										{customer.territoryName || customer.stateName || "—"}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* 4 Compact KPI blocks */}
					<div className='grid grid-cols-2 gap-3'>
						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Credit Limit
							</p>
							<p className='mt-1 font-mono text-lg font-bold text-foreground'>
								{formatCreditLimit(customer.creditLimit)}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Branch Count
							</p>
							<p className='mt-1 font-mono text-lg font-bold text-foreground'>
								{branchCount}
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
							{/* Status Warnings */}
							{customer.status === "blocked" && customer.blockReason && (
								<div className='flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 shadow-sm'>
									<Ban className='mt-0.5 h-4 w-4 flex-shrink-0 text-red-500' />
									<div>
										<p className='text-xs font-bold text-red-700'>
											Blocked - Account Restricted
										</p>
										<p className='mt-0.5 text-xs text-red-600'>
											{customer.blockReason}
										</p>
									</div>
								</div>
							)}

							{customer.status === "inactive" && (
								<div className='flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3 shadow-sm'>
									<CheckCircle2 className='mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600' />
									<p className='text-xs text-amber-700'>
										Inactive customer - hidden from transaction dropdowns.
									</p>
								</div>
							)}

							<div className='p-6 space-y-6 bg-white border shadow-sm rounded-xl border-border'>
								{/* Section 1: Basic Details */}
								<div className='space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Basic Details
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Customer Name'
											value={customer.customerName}
										/>
										<DetailField
											label='Customer Type'
											value={
												CUSTOMER_TYPE_LABELS[
													customer.customerType.toLowerCase()
												] ?? customer.customerType
											}
										/>
										<DetailField
											label='Mobile'
											value={formatMobile(
												customer.countryCode,
												customer.mobile,
											)}
											mono
										/>
										<DetailField label='Email' value={customer.email} />
										<DetailField
											label='Salesman'
											value={customer.salesManName}
										/>
										<DetailField label='Payment Terms' value={payLabel} />
										<DetailField
											label='Interest Rate'
											value={
												customer.interestRate
													? `${customer.interestRate}%`
													: "—"
											}
										/>
									</div>
								</div>

								{/* Section 2: Address & Geography */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Address & Geography
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Billing Address'
											value={customer.address}
										/>
										<DetailField label='State' value={customer.stateName} />
										<DetailField
											label='District'
											value={customer.districtName}
										/>
										<DetailField
											label='Territory'
											value={customer.territoryName}
										/>
										<DetailField
											label='Pin Code'
											value={customer.pincode}
											mono
										/>
									</div>
								</div>

								{/* Section 3: Tax & Registration */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Tax & Registration
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='GST Applicable'
											value={customer.gstApplicable ? "Yes" : "No"}
										/>
										{customer.gstApplicable && (
											<>
												<DetailField
													label='GSTIN'
													value={customer.gstin}
													mono
												/>
												{/* <DetailField
													label='GST Code'
													value={
														gst ? `${gst.gstId} (${gst.gstPercentage}%)` : "—"
													}
													mono
												/> */}
											</>
										)}
										<DetailField
											label='TDS Applicable'
											value={customer.tdsApplicable ? "Yes" : "No"}
										/>
										{customer.tdsApplicable && (
											<DetailField
												label='TDS Section'
												value={tds ? `${tds.tdsCode} - ${tds.tdsRate}%` : "—"}
												mono
											/>
										)}
										<DetailField label='TAN #' value={customer.tan} mono />
										<DetailField label='CIB Regn #' value={customer.cibRegn} />
										<DetailField label='FCO Regn #' value={customer.fcoRegn} />
										<DetailField label='FSSAI #' value={customer.fssai} />
									</div>
								</div>

								{/* Section 4: Commercial Details */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Commercial Details
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Credit Limit'
											value={formatCreditLimit(customer.creditLimit)}
										/>
										<DetailField label='Payment Terms' value={payLabel} />
									</div>
								</div>

								{/* Section 5: System Info */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										System Info
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Created By'
											value={customer.createdBy}
										/>
										<DetailField
											label='Created Date'
											value={customer.createdDate}
										/>
										<DetailField
											label='Updated By'
											value={customer.updatedBy}
										/>
										<DetailField
											label='Updated Date'
											value={customer.updatedDate}
										/>
										<DetailField
											label='Status Changes'
											value={customer.statusHistory.length}
										/>
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
										value={customer.accountHolderName}
									/>
									<DetailField label='Bank Name' value={customer.bankName} />
									<DetailField
										label='Branch Name'
										value={customer.branch || customer.bankBranchAddress}
									/>
									<DetailField
										label='Bank A/c #'
										value={customer.bankAccountNo}
										mono
									/>
									<DetailField
										label='IFSC Code'
										value={customer.ifscCode}
										mono
									/>
									<DetailField
										label='SWIFT Code'
										value={customer.swiftCode}
									/>
								</div>
							</div>
						</div>
					)}

					{/* TAB 2: BRANCH DETAILS */}
					{activeSubTab === "branches" && (
						<div>
							{customer.branches && customer.branches.length > 0 ? (
								<div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
									{customer.branches.map((branch, idx) => (
										<div
											key={idx}
											className='p-5 space-y-4 bg-white border shadow-sm rounded-xl border-border'
										>
											<div className='flex items-center justify-between pb-2 border-b'>
												<h3 className='text-sm font-bold text-foreground'>
													{branch.branchName}
												</h3>
												{branch.isMain && (
													<span className='inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand-50 text-brand-750 border border-brand-200'>
														Primary / Main Branch
													</span>
												)}
											</div>

											<div className='grid grid-cols-1 gap-4 text-xs sm:grid-cols-2'>
												<div className='space-y-1.5 bg-slate-50/50 p-3.5 rounded-lg border border-slate-100'>
													<span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
														Billing Address
													</span>
													<p className='font-semibold text-foreground'>
														{branch.billingAddress?.address || "—"}
													</p>
													<p className='mt-1 text-xs text-muted-foreground'>
														{[
															branch.billingAddress?.city,
															branch.billingAddress?.state,
														]
															.filter(Boolean)
															.join(", ")}
														{branch.billingAddress?.pincode
															? ` - ${branch.billingAddress.pincode}`
															: ""}
													</p>
												</div>

												<div className='space-y-1.5 bg-slate-50/50 p-3.5 rounded-lg border border-slate-100'>
													<span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
														Shipping Address
													</span>
													<p className='font-semibold text-foreground'>
														{branch.shippingAddress?.address || "—"}
													</p>
													<p className='mt-1 text-xs text-muted-foreground'>
														{[
															branch.shippingAddress?.city,
															branch.shippingAddress?.state,
														]
															.filter(Boolean)
															.join(", ")}
														{branch.shippingAddress?.pincode
															? ` - ${branch.shippingAddress.pincode}`
															: ""}
													</p>
												</div>
											</div>

											{branch.documents && branch.documents.length > 0 && (
												<div className='pt-2 space-y-2'>
													<h4 className='text-xs font-bold text-foreground flex items-center gap-1.5'>
														<FileText className='w-3.5 h-3.5 text-muted-foreground' />
														Branch Documents
													</h4>
													<div className='overflow-x-auto border rounded-lg border-border'>
														<table className='w-full text-xs text-left border-collapse'>
															<thead>
																<tr className='font-semibold border-b border-border bg-slate-50 text-muted-foreground'>
																	<th className='px-3 py-2'>Document Name</th>
																	<th className='px-3 py-2'>File Name</th>
																	<th className='px-3 py-2 text-right'>
																		Action
																	</th>
																</tr>
															</thead>
															<tbody>
																{branch.documents.map((doc, dIdx) => (
																	<tr
																		key={dIdx}
																		className='border-b border-border/60 last:border-0 hover:bg-muted/5'
																	>
																		<td className='px-3 py-2 font-semibold text-foreground'>
																			{doc.documentName}
																		</td>
																		<td className='px-3 py-2 font-mono text-muted-foreground'>
																			{doc.fileName || "—"}
																		</td>
																		<td className='px-3 py-2 text-right'>
																			{doc.fileName && doc.fileUrl ? (
																				<Button
																					type='button'
																					variant='link'
																					className='h-auto p-0 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline'
																					onClick={() =>
																						setPreviewDoc({
																							title: doc.documentName,
																							fileUrl: doc.fileUrl!,
																							fileName: doc.fileName!,
																						})
																					}
																				>
																					View
																				</Button>
																			) : (
																				<span className='text-muted-foreground'>
																					—
																				</span>
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
									))}
								</div>
							) : (
								<div className='p-8 text-xs text-center bg-white border shadow-sm rounded-xl border-border text-muted-foreground'>
									No branches configured for this customer.
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
													<th className='px-4 py-3 text-right'>Price</th>
												</tr>
											</thead>
											<tbody>
												{mappedProducts.map((item, idx) => (
													<tr
														key={idx}
														className='border-b border-border/60 last:border-0 hover:bg-slate-50/50'
													>
														<td className='px-4 py-3 font-semibold text-foreground'>
															{item.productName}
														</td>
														<td className='px-4 py-3 font-mono text-xs font-semibold text-brand-700'>
															{item.sku || "—"}
														</td>
														<td className='px-4 py-3 font-mono text-right tabular-nums text-muted-foreground'>
															{item.mrp !== undefined
																? `₹${item.mrp.toLocaleString("en-IN")}`
																: "—"}
														</td>
														<td className='px-4 py-3 font-mono font-bold text-right tabular-nums text-emerald-600'>
															{item.price !== undefined
																? `₹${item.price.toLocaleString("en-IN")}`
																: "—"}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							) : (
								<div className='p-8 text-xs text-center bg-white border shadow-sm rounded-xl border-border text-muted-foreground'>
									No products mapped to this customer.
								</div>
							)}
						</div>
					)}

					{/* TAB 4: DOCUMENTS */}
					{activeSubTab === "documents" && (
						<div>
							{(() => {
								const reqDocs = customer.documents?.requiredDocuments || [];
								const addDocs = customer.documents?.additionalDocuments || [];

								if (reqDocs.length === 0 && addDocs.length === 0) {
									return (
										<div className='p-8 text-xs text-center bg-white border shadow-sm rounded-xl border-border text-muted-foreground'>
											No documents uploaded for this customer.
										</div>
									);
								}

								return (
									<div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
										{/* Required Documents Card */}
										{reqDocs.length > 0 && (
											<div className='p-5 space-y-4 bg-white border shadow-sm rounded-xl border-border'>
												<h3 className='flex items-center justify-between pb-2 text-sm font-bold border-b text-foreground'>
													Required Documents
													<span className='text-xs font-normal text-muted-foreground'>
														{reqDocs.filter((d) => d.fileName).length} of{" "}
														{reqDocs.length} uploaded
													</span>
												</h3>
												<div className='space-y-3'>
													{reqDocs.map((doc, idx) => (
														<div
															key={idx}
															className='flex items-center justify-between p-3 transition-colors border rounded-lg border-border/80 bg-slate-50/50 hover:bg-slate-50'
														>
															<div className='space-y-1'>
																<p className='text-xs font-bold text-foreground flex items-center gap-1.5'>
																	{doc.documentName}
																	{doc.required && (
																		<span className='text-[9px] px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-100 rounded font-bold uppercase'>
																			Required
																		</span>
																	)}
																</p>
																{doc.fileName ? (
																	<button
																		type='button'
																		className='font-mono text-xs font-semibold text-left text-brand-600 hover:text-brand-700 hover:underline'
																		onClick={() =>
																			setPreviewDoc({
																				title: doc.documentName,
																				fileUrl: doc.fileUrl!,
																				fileName: doc.fileName!,
																			})
																		}
																	>
																		{doc.fileName}
																	</button>
																) : (
																	<p className='text-xs text-muted-foreground'>
																		Not uploaded
																	</p>
																)}
															</div>
															<div>
																<span
																	className={cn(
																		"inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-semibold border",
																		doc.fileName
																			? "bg-emerald-50 text-emerald-700 border-emerald-200"
																			: "bg-red-50 text-red-700 border-red-200",
																	)}
																>
																	{doc.fileName ? "Uploaded" : "Pending"}
																</span>
															</div>
														</div>
													))}
												</div>
											</div>
										)}

										{/* Additional Documents Card */}
										{addDocs.length > 0 && (
											<div className='p-5 space-y-4 bg-white border shadow-sm rounded-xl border-border'>
												<h3 className='flex items-center justify-between pb-2 text-sm font-bold border-b text-foreground'>
													Additional Documents
													<span className='text-xs font-normal text-muted-foreground'>
														{addDocs.length} uploaded
													</span>
												</h3>
												<div className='space-y-3'>
													{addDocs.map((doc, idx) => (
														<div
															key={idx}
															className='flex items-center justify-between p-3 transition-colors border rounded-lg border-border/80 bg-slate-50/50 hover:bg-slate-50'
														>
															<div className='space-y-1'>
																<p className='text-xs font-bold text-foreground'>
																	{doc.title}
																</p>
																{doc.fileName ? (
																	<button
																		type='button'
																		className='font-mono text-xs font-semibold text-left text-brand-600 hover:text-brand-700 hover:underline'
																		onClick={() =>
																			setPreviewDoc({
																				title: doc.title,
																				fileUrl: doc.fileUrl!,
																				fileName: doc.fileName!,
																			})
																		}
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
									</div>
								);
							})()}
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
