"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
	ArrowLeft,
	Edit2,
	Info,
	FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadCustomerTypes, type CustomerTypeRecord } from "../customer-type-data";
import { AppLayout } from "@/components/layout/AppLayout";

const STATUS_CFG = {
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
} as const;

function StatusBadge({ status }: { status: "active" | "inactive" }) {
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

export default function CustomerTypeDetailPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const [customerType, setCustomerType] = useState<CustomerTypeRecord | null>(null);
	const [activeSubTab, setActiveSubTab] = useState("overview");

	useEffect(() => {
		const list = loadCustomerTypes();
		setCustomerType(list.find((c) => c.id === Number(id)) ?? null);
	}, [id]);

	if (!customerType) {
		return (
			<div className='py-16 text-center'>
				<p className='text-sm text-muted-foreground'>Customer Type not found.</p>
				<Link
					href='/masters/customer-types'
					className='inline-block mt-2 text-xs text-brand-600 hover:underline'
				>
					Back to listing
				</Link>
			</div>
		);
	}

	const docCount = customerType.documentTypes?.length ?? 0;

	const tabs = [
		{ id: "overview", label: "Overview", icon: Info },
		{ id: "documents", label: `Required Documents (${docCount})`, icon: FileText },
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
							onClick={() => router.push("/masters/customer-types")}
						>
							<ArrowLeft className='w-4 h-4 text-muted-foreground' />
						</Button>
						<h1 className='text-base font-bold text-foreground'>
							Customer Type Details
						</h1>
					</div>

					<div className='flex items-center gap-2'>
						<StatusBadge status={customerType.status} />
						<Link href={`/masters/customer-types/${customerType.id}/edit`}>
							<Button
								size='sm'
								className='h-9 gap-1.5 bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 rounded-lg shadow-sm'
							>
								<Edit2 className='w-3.5 h-3.5' /> Edit Customer Type
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
								{customerType.customerType.charAt(0).toUpperCase()}
							</div>
							<div className='space-y-1'>
								<div className='flex flex-wrap items-center gap-2'>
									<h2 className='text-base font-bold text-foreground'>
										{customerType.customerType}
									</h2>
									<span className='font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md'>
										{customerType.customerTypeCode}
									</span>
									<StatusBadge status={customerType.status} />
								</div>
								<div className='flex flex-wrap items-center text-xs gap-x-4 gap-y-1 text-muted-foreground mt-1'>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>Description:</span>
										{customerType.description || "—"}
									</span>
								</div>
								<div className='flex flex-wrap items-center pt-1 text-xs gap-x-4 gap-y-1 text-muted-foreground'>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Required Docs:
										</span>
										{docCount} types
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* 4 Compact KPI blocks */}
					<div className='grid grid-cols-2 gap-3'>
						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Code
							</p>
							<p className='mt-1 font-mono text-xs font-bold text-foreground'>
								{customerType.customerTypeCode}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Required Docs
							</p>
							<p className='mt-1 font-mono text-base font-bold text-foreground'>
								{docCount}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Status
							</p>
							<p className='mt-1 text-xs font-bold text-foreground truncate capitalize'>
								{customerType.status}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Created By
							</p>
							<p className='mt-1 text-xs font-bold text-foreground truncate'>
								{customerType.createdBy || "Admin"}
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
								{/* Section 1: Customer Type Information */}
								<div className='space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Customer Type Information
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Customer Type Code'
											value={customerType.customerTypeCode}
											mono
										/>
										<DetailField
											label='Customer Type'
											value={customerType.customerType}
										/>
										<DetailField
											label='Description'
											value={customerType.description}
										/>
										<DetailField
											label='Status'
											value={<StatusBadge status={customerType.status} />}
										/>
									</div>
								</div>

								{/* Section 2: Audit Details */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Audit Details
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Created By'
											value={customerType.createdBy}
										/>
										<DetailField
											label='Created Date'
											value={customerType.createdDate}
										/>
										<DetailField
											label='Updated By'
											value={customerType.updatedBy}
										/>
										<DetailField
											label='Updated Date'
											value={customerType.updatedDate}
										/>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* TAB 2: REQUIRED DOCUMENTS */}
					{activeSubTab === "documents" && (
						<div>
							{docCount > 0 ? (
								<div className='overflow-hidden bg-white border shadow-sm rounded-xl border-border'>
									<div className='overflow-x-auto'>
										<table className='w-full text-xs text-left border-collapse'>
											<thead>
												<tr className='font-semibold border-b border-border bg-slate-50 text-muted-foreground'>
													<th className='px-4 py-3 w-16 text-center'>Sr. No.</th>
													<th className='px-4 py-3'>Document Type</th>
												</tr>
											</thead>
											<tbody>
												{customerType.documentTypes?.map((item, idx) => (
													<tr
														key={item.id || idx}
														className='border-b border-border/60 last:border-0 hover:bg-slate-50/50'
													>
														<td className='px-4 py-3 text-center font-medium text-muted-foreground'>
															{idx + 1}
														</td>
														<td className='px-4 py-3 font-semibold text-foreground'>
															{item.documentName}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							) : (
								<div className='p-8 text-xs text-center bg-white border shadow-sm rounded-xl border-border text-muted-foreground'>
									No required document types configured for this customer type.
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</AppLayout>
	);
}
