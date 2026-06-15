"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
	ArrowLeft,
	Edit2,
	CheckCircle2,
	XCircle,
	ShoppingCart,
	Info,
	Building2,
	FileText,
	Clock,
	Download,
	Eye,
	Paperclip,
} from "lucide-react";
import {
	getPRById,
	loadPurchaseRequests,
	savePurchaseRequests,
	approvePR,
	rejectPR,
	PR_STATUS_CFG,
	type PRStatus,
	type PurchaseRequest,
	type PRLineItem,
} from "../pr-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import {
	PRApprovalModal,
	type PRApprovalAction,
} from "../components/PRApprovalModal";
import { Toast } from "../../components/ProcurementUI";

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: PRStatus }) {
	const cfg = PR_STATUS_CFG[status] || {
		bg: "bg-slate-100 border-slate-200",
		text: "text-slate-600",
		dot: "bg-slate-400",
		label: status,
	};
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
				cfg.bg.includes("border") ? cfg.bg : `${cfg.bg} border-current/10`,
				cfg.text,
			)}
		>
			<span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
			{cfg.label}
		</span>
	);
}

// ── Detail Field Row ─────────────────────────────────────────────────────────
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
			<div
				className={cn(
					"text-xs font-semibold text-foreground break-all",
					mono && "font-mono",
				)}
			>
				{displayVal}
			</div>
		</div>
	);
}

// ── Normalization for unit matching ──────────────────────────────────────────
const normalizeProductKey = (value?: string) =>
	(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

// ── Main View Page ────────────────────────────────────────────────────────────
export default function PRViewPage() {
	const params = useParams();
	const router = useRouter();
	const id = Number(params.id);
	const [pr, setPr] = useState(getPRById(id));
	const [approvalOpen, setApprovalOpen] = useState(false);
	const [approvalAction, setApprovalAction] =
		useState<PRApprovalAction>("approve");
	const [toast, setToast] = useState<{
		msg: string;
		type: "success" | "error";
	} | null>(null);
	const [activeSubTab, setActiveSubTab] = useState("overview");

	const masterProducts = loadProducts();

	useEffect(() => {
		setPr(getPRById(id));
	}, [id]);

	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => setToast(null), 3200);
		return () => clearTimeout(timer);
	}, [toast]);

	if (!pr) {
		return (
			<AppLayout>
				<div className='p-8 text-sm font-semibold text-muted-foreground'>
					Purchase Request not found.{" "}
					<Link
						href='/procurement/purchase-requests'
						className='text-brand-650 hover:underline'
					>
						Back to listing
					</Link>
				</div>
			</AppLayout>
		);
	}

	const openApproval = (action: PRApprovalAction) => {
		setApprovalAction(action);
		setApprovalOpen(true);
	};

	const getProductUnits = (line: PRLineItem) => {
		const lineCode = normalizeProductKey(line.productCode);
		const lineName = normalizeProductKey(line.productName);

		const lineCodeNum = line.productCode.match(/\d+/)?.[0];
		const lineCodeNumInt = lineCodeNum ? parseInt(lineCodeNum, 10) : null;

		const match = masterProducts.find((product) => {
			const productIdKey = normalizeProductKey(product.productId);
			const productNameKey = normalizeProductKey(product.productName);

			const prodCodeNum = product.productId.match(/\d+/)?.[0];
			const prodCodeNumInt = prodCodeNum ? parseInt(prodCodeNum, 10) : null;

			if (lineCode && lineCode === productIdKey) return true;
			if (lineName && lineName === productNameKey) return true;
			if (
				line.productName &&
				product.productName &&
				(product.productName
					.toLowerCase()
					.includes(line.productName.toLowerCase()) ||
					line.productName
						.toLowerCase()
						.includes(product.productName.toLowerCase()))
			) {
				return true;
			}
			if (
				lineCodeNumInt !== null &&
				prodCodeNumInt !== null &&
				lineCodeNumInt === prodCodeNumInt
			) {
				return true;
			}
			return false;
		});

		return {
			baseUnit: match?.baseUnit || "—",
			packagingUnit: match?.packagingUnit || "—",
		};
	};

	const tabs = [
		{ id: "overview", label: "Overview", icon: Info },
		{ id: "products", label: `Products (${pr.lines.length})`, icon: Building2 },
		{
			id: "activity",
			label: `Activity Log (${pr.activity.length})`,
			icon: Clock,
		},
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
							onClick={() => router.push("/procurement/purchase-requests")}
						>
							<ArrowLeft className='w-4 h-4 text-muted-foreground' />
						</Button>
						<h1 className='text-base font-bold text-foreground'>
							Purchase Request Details
						</h1>
					</div>

					<div className='flex items-center gap-2'>
						{pr.status === "pending_approval" && (
							<>
								<Button
									variant='outline'
									size='sm'
									className='h-9 text-xs font-semibold gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800'
									onClick={() => openApproval("reject")}
								>
									<XCircle className='w-3.5 h-3.5' /> Reject
								</Button>
								<Button
									size='sm'
									className='h-9 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white'
									onClick={() => openApproval("approve")}
								>
									<CheckCircle2 className='w-3.5 h-3.5' /> Approve
								</Button>
							</>
						)}
						{["draft", "rejected"].includes(pr.status) && (
							<Link href={`/procurement/purchase-requests/${id}/edit`}>
								<Button
									variant='outline'
									size='sm'
									className='h-9 text-xs font-semibold gap-1.5 border-border hover:bg-muted'
								>
									<Edit2 className='w-3.5 h-3.5' /> Edit Request
								</Button>
							</Link>
						)}
						{pr.status === "approved" && (
							<Link href={`/procurement/purchase-orders/new?prId=${id}`}>
								<Button
									size='sm'
									className='h-9 text-xs font-semibold gap-1.5 bg-brand-600 hover:bg-brand-700 text-white'
								>
									<ShoppingCart className='w-3.5 h-3.5' /> Create PO
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
								PR
							</div>
							<div className='space-y-1'>
								<div className='flex flex-wrap items-center gap-2'>
									<h2 className='text-base font-bold text-foreground'>
										{pr.prNumber}
									</h2>
									<StatusBadge status={pr.status} />
								</div>
								<div className='flex flex-wrap items-center text-xs gap-x-4 gap-y-1 text-muted-foreground'>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Requested By:
										</span>
										{pr.requestedBy || "—"}
									</span>
									<span>•</span>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Request Date:
										</span>
										{pr.prDate || "—"}
									</span>
									<span>•</span>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Required By Date:
										</span>
										{pr.requiredByDate || "—"}
									</span>
								</div>
								<div className='flex flex-wrap items-center pt-1 text-xs gap-x-4 gap-y-1 text-muted-foreground'>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Total Products:
										</span>
										{pr.lines.length} products
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* 4 Compact KPI blocks */}
					<div className='grid grid-cols-2 gap-3'>
						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Request Date
							</p>
							<p className='mt-1 text-xs font-bold truncate text-foreground'>
								{pr.prDate || "—"}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Required By
							</p>
							<p className='mt-1 text-xs font-bold truncate text-foreground'>
								{pr.requiredByDate || "—"}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Total Products
							</p>
							<p className='mt-1 text-xs font-bold truncate text-foreground'>
								{pr.lines.length}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Current Status
							</p>
							<p className='mt-1 text-xs font-bold truncate text-foreground'>
								{PR_STATUS_CFG[pr.status]?.label || pr.status}
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
							<div className='p-6 space-y-6 bg-white border shadow-sm rounded-xl border-border'>
								{/* Section 1: Request Information */}
								<div className='space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Request Information
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Purchase Request No.'
											value={pr.prNumber}
											mono
										/>
										<DetailField label='Request Date' value={pr.prDate} />
										<DetailField label='Requested By' value={pr.requestedBy} />
										<DetailField
											label='Required By Date'
											value={pr.requiredByDate}
										/>
										{/* <DetailField label='Department / Warehouse' value='—' /> */}
										<DetailField
											label='Status'
											value={<StatusBadge status={pr.status} />}
										/>
										<DetailField label='Created Date' value={pr.createdDate} />
										<DetailField label='Created By' value={pr.createdBy} />
										<DetailField label='Updated Date' value={pr.updatedDate} />
										<DetailField label='Updated By' value={pr.updatedBy} />
										{pr.approvedDate && (
											<DetailField
												label='Approved Date'
												value={pr.approvedDate}
											/>
										)}
										{pr.approvedBy && (
											<DetailField label='Approved By' value={pr.approvedBy} />
										)}
									</div>
								</div>

								{/* Section 3: Remarks & Attachments */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Remarks & Attachments
									</h3>
									<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
										<div>
											<span className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider'>
												Remarks
											</span>
											<p className='p-3 mt-1 text-xs font-semibold leading-relaxed whitespace-pre-wrap border rounded-lg text-foreground bg-slate-50 border-slate-100'>
												{pr.remarks || "No remarks provided."}
											</p>
										</div>
										<div>
											<span className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider'>
												Attachments
											</span>
											{pr.attachments && pr.attachments.length > 0 ? (
												<div className='mt-1.5 space-y-2 max-w-sm'>
													{pr.attachments.map((file) => (
														<div
															key={file.uid}
															className='flex items-center justify-between p-2 bg-white border rounded-lg shadow-sm border-border'
														>
															<div className='flex items-center min-w-0 gap-2'>
																<Paperclip className='w-3.5 h-3.5 text-brand-600 flex-shrink-0' />
																<div className='min-w-0'>
																	<p className='text-xs font-semibold truncate text-foreground'>
																		{file.name}
																	</p>
																	<p className='text-[9px] text-muted-foreground font-medium'>
																		{file.size} • Uploaded by {file.uploadedBy}
																	</p>
																</div>
															</div>
															<div className='flex items-center gap-1'>
																<Button
																	size='icon'
																	variant='ghost'
																	className='w-7 h-7 hover:bg-slate-100'
																>
																	<Download className='w-3.5 h-3.5 text-muted-foreground hover:text-foreground' />
																</Button>
															</div>
														</div>
													))}
												</div>
											) : (
												<p className='mt-1 text-xs italic text-muted-foreground'>
													No attachments.
												</p>
											)}
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* TAB 2: PRODUCTS */}
					{activeSubTab === "products" && (
						<div className='space-y-5'>
							<div className='p-6 space-y-3 bg-white border shadow-sm rounded-xl border-border'>
								<h3 className='pb-1 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
									Product Details
								</h3>
								<div className='overflow-x-auto bg-white border rounded-lg border-border'>
									<table className='w-full text-xs text-left border-collapse min-w-[800px]'>
										<thead>
											<tr className='font-semibold border-b border-border bg-slate-50 text-muted-foreground'>
												<th className='w-12 px-4 py-2 text-center'>Sr.</th>
												<th className='px-4 py-2'>Product Name</th>
												<th className='px-4 py-2 w-28'>Code</th>
												<th className='px-4 py-2 w-28'>Base Unit</th>
												<th className='px-4 py-2 w-36'>Packaging Unit</th>
												<th className='w-24 px-4 py-2 text-right'>Qty</th>
												<th className='px-4 py-2'>Remarks</th>
											</tr>
										</thead>
										<tbody className='divide-y divide-border/60'>
											{pr.lines.map((line, idx) => {
												const units = getProductUnits(line);
												return (
													<tr
														key={line.uid}
														className='font-medium hover:bg-slate-50/50'
													>
														<td className='px-4 py-2 text-center text-muted-foreground'>
															{idx + 1}
														</td>
														<td className='px-4 py-2'>
															<div>
																<p className='font-semibold text-foreground'>
																	{line.productName}
																</p>
																{line.description && (
																	<p className='text-[10px] text-muted-foreground mt-0.5'>
																		{line.description}
																	</p>
																)}
															</div>
														</td>
														<td className='px-4 py-2 font-mono font-semibold text-brand-700'>
															{line.productCode}
														</td>
														<td className='px-4 py-2'>{units.baseUnit}</td>
														<td className='px-4 py-2'>{units.packagingUnit}</td>
														<td className='px-4 py-2 font-mono font-bold text-right text-brand-650'>
															{line.requestedQty} {line.uom}
														</td>
														<td className='px-4 py-2 text-muted-foreground'>
															{line.remarks || "—"}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}

					{/* TAB 3: ACTIVITY */}
					{activeSubTab === "activity" && (
						<div className='space-y-5'>
							<div className='p-6 space-y-4 bg-white border shadow-sm rounded-xl border-border'>
								<h3 className='pb-1 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
									Activity & Status Log
								</h3>
								{pr.activity && pr.activity.length > 0 ? (
									<div className='relative pl-6 ml-3 space-y-6 border-l border-border'>
										{pr.activity.map((act, idx) => (
											<div key={idx} className='relative'>
												<span className='absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-100 border border-brand-400'>
													<span className='h-1.5 w-1.5 rounded-full bg-brand-600' />
												</span>
												<div>
													<p className='text-xs font-bold text-foreground'>
														{act.action}{" "}
														<span className='text-[11px] font-semibold text-muted-foreground'>
															by {act.by}
														</span>
													</p>
													<p className='text-[10px] text-muted-foreground font-semibold mt-0.5'>
														{act.date}
													</p>
													{act.note && (
														<p className='max-w-lg p-2 mt-1 text-xs italic border rounded text-muted-foreground bg-slate-50 border-slate-100/60'>
															Note: {act.note}
														</p>
													)}
												</div>
											</div>
										))}
									</div>
								) : (
									<p className='text-xs italic text-muted-foreground'>
										No activity log recorded.
									</p>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			<PRApprovalModal
				open={approvalOpen}
				onClose={() => setApprovalOpen(false)}
				pr={pr}
				action={approvalAction}
				onConfirm={(remarks) => {
					const updated =
						approvalAction === "approve"
							? approvePR(pr, remarks)
							: rejectPR(pr, remarks);
					savePurchaseRequests(
						loadPurchaseRequests().map((p) =>
							p.id === updated.id ? updated : p,
						),
					);
					setPr(updated);
					setToast({
						msg: approvalAction === "approve" ? "PR approved." : "PR rejected.",
						type: "success",
					});
				}}
			/>
			{toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
		</AppLayout>
	);
}
