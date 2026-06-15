"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	ArrowLeft,
	Edit2,
	Building2,
	Info,
	Users,
	CheckCircle2,
} from "lucide-react";
import {
	type WarehouseMaster,
	type WarehouseStatus,
	loadWarehouses,
	formatStatus,
} from "../warehouse-data";
import { AppLayout } from "@/components/layout/AppLayout";

const STATUS_CFG: Record<
	WarehouseStatus,
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
	under_maintenance: {
		bg: "bg-amber-50 border-amber-200",
		text: "text-amber-750",
		dot: "bg-amber-500",
		label: "Under Maintenance",
	},
	closed: {
		bg: "bg-red-50 border-red-200",
		text: "text-red-700",
		dot: "bg-red-500",
		label: "Closed",
	},
};

function StatusBadge({ status }: { status: WarehouseStatus }) {
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

export default function WarehouseDetailPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const [warehouse, setWarehouse] = useState<WarehouseMaster | null>(null);
	const [activeSubTab, setActiveSubTab] = useState("overview");

	useEffect(() => {
		const list = loadWarehouses();
		setWarehouse(list.find((w) => w.id === Number(id)) ?? null);
	}, [id]);

	if (!warehouse) {
		return (
			<div className='py-16 text-center'>
				<p className='text-sm text-muted-foreground'>Warehouse not found.</p>
				<Link
					href='/masters/warehouse'
					className='inline-block mt-2 text-xs text-brand-600 hover:underline'
				>
					Back to listing
				</Link>
			</div>
		);
	}

	const operatedCustomerName =
		warehouse.operatedBy === "C&F Agent"
			? warehouse.customerType
			: undefined;

	const contactCount = warehouse.contacts?.length ?? 0;
	const formattedCapacity = warehouse.capacity
		? `${warehouse.capacity.toLocaleString()} Sq Ft`
		: "—";

	const tabs = [
		{ id: "overview", label: "Overview", icon: Info },
		{ id: "contacts", label: `Contacts (${contactCount})`, icon: Users },
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
							onClick={() => router.push("/masters/warehouse")}
						>
							<ArrowLeft className='w-4 h-4 text-muted-foreground' />
						</Button>
						<h1 className='text-base font-bold text-foreground'>
							Warehouse Details
						</h1>
					</div>

					<div className='flex items-center gap-2'>
						<StatusBadge status={warehouse.status} />
						<Link href={`/masters/warehouse/${warehouse.id}/edit`}>
							<Button
								size='sm'
								className='h-9 gap-1.5 bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 rounded-lg shadow-sm'
							>
								<Edit2 className='w-3.5 h-3.5' /> Edit Warehouse
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
								{warehouse.warehouseName.charAt(0).toUpperCase()}
							</div>
							<div className='space-y-1'>
								<div className='flex flex-wrap items-center gap-2'>
									<h2 className='text-base font-bold text-foreground'>
										{warehouse.warehouseName}
									</h2>
									<span className='font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md'>
										{warehouse.warehouseCode}
									</span>
									<StatusBadge status={warehouse.status} />
								</div>
								<div className='flex flex-wrap items-center text-xs gap-x-4 gap-y-1 text-muted-foreground'>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>Type:</span>
										{warehouse.warehouseType || "—"}
									</span>
									<span>•</span>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Operated By:
										</span>
										{warehouse.operatedBy || "—"}
									</span>
									{warehouse.operatedBy === "C&F Agent" && (
										<>
											<span>•</span>
											<span className='flex items-center gap-1'>
												<span className='font-semibold text-foreground'>
													Customer Name:
												</span>
												{operatedCustomerName || "—"}
											</span>
										</>
									)}
								</div>
								<div className='flex flex-wrap items-center pt-1 text-xs gap-x-4 gap-y-1 text-muted-foreground'>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											GSTIN:
										</span>
										<span className='font-mono'>{warehouse.gstNumber || "—"}</span>
									</span>
									<span>•</span>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Manager:
										</span>
										{warehouse.manager || "—"}
									</span>
									<span>•</span>
									<span className='flex items-center gap-1'>
										<span className='font-semibold text-foreground'>
											Capacity:
										</span>
										{formattedCapacity}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* 4 Compact KPI blocks */}
					<div className='grid grid-cols-2 gap-3'>
						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Capacity
							</p>
							<p className='mt-1 font-mono text-base font-bold text-foreground'>
								{formattedCapacity}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Operated By
							</p>
							<p className='mt-1 text-xs font-bold truncate text-foreground'>
								{warehouse.operatedBy || "—"}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Contacts
							</p>
							<p className='mt-1 font-mono text-base font-bold text-foreground'>
								{contactCount}
							</p>
						</div>

						<div className='flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border'>
							<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
								Manager
							</p>
							<p className='mt-1 text-xs font-bold truncate text-foreground'>
								{warehouse.manager || "—"}
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
								{/* Section 1: Warehouse Information */}
								<div className='space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Warehouse Information
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Warehouse Name'
											value={warehouse.warehouseName}
										/>
										<DetailField
											label='Warehouse Code'
											value={warehouse.warehouseCode}
											mono
										/>
										<DetailField
											label='Warehouse Type'
											value={warehouse.warehouseType}
										/>
										<DetailField
											label='Operated By'
											value={warehouse.operatedBy}
										/>
										<DetailField
											label='GST Number'
											value={warehouse.gstNumber}
											mono
										/>
										<DetailField label="" value=" "></DetailField>
									</div>
								</div>

								{/* Section 2: Address & Location */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Address & Location
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Address'
											value={warehouse.address}
										/>
										<DetailField label='City' value={warehouse.city} />
										<DetailField label='District' value={warehouse.district} />
										<DetailField label='State' value={warehouse.state} />
										<DetailField
											label='Pin Code'
											value={warehouse.pincode}
											mono
										/>
										<DetailField label="" value=" "></DetailField>
									</div>
								</div>

								{/* Section 3: Capacity & Management */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										Capacity & Management
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField
											label='Capacity'
											value={formattedCapacity}
										/>
										<DetailField label='Manager' value={warehouse.manager} />
										<DetailField label="" value=" "></DetailField>
									</div>
								</div>

								{/* Section 4: System Information */}
								<div className='pt-2 space-y-3'>
									<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
										System Information
									</h3>
									<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
										<DetailField label='Status' value={formatStatus(warehouse.status)} />
										<DetailField
											label='Created By'
											value={warehouse.createdBy}
										/>
										<DetailField
											label='Created Date'
											value={warehouse.createdDate}
										/>
										<DetailField
											label='Updated By'
											value={warehouse.updatedBy}
										/>
										<DetailField
											label='Updated Date'
											value={warehouse.updatedDate}
										/>
										<DetailField label="" value=" "></DetailField>
									</div>
								</div>

								{/* Section 5: C&F Customer Details */}
								{warehouse.operatedBy === "C&F Agent" && (
									<div className='pt-2 space-y-3'>
										<h3 className='pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground'>
											C&F Customer Details
										</h3>
										<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1'>
											<DetailField
												label='Customer Name'
												value={operatedCustomerName}
											/>
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{/* TAB 2: CONTACTS */}
					{activeSubTab === "contacts" && (
						<div>
							{warehouse.contacts && warehouse.contacts.length > 0 ? (
								<div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
									{warehouse.contacts.map((contact, idx) => (
										<div
											key={contact.id || idx}
											className='p-5 space-y-4 bg-white border shadow-sm rounded-xl border-border'
										>
											<div className='flex items-center justify-between pb-2 border-b'>
												<h3 className='text-sm font-bold text-foreground'>
													{contact.contactPerson}
												</h3>
												{contact.isPrimary && (
													<span className='inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand-50 text-brand-750 border border-brand-200'>
														Primary Contact
													</span>
												)}
											</div>

											<div className='grid grid-cols-1 gap-4 text-xs sm:grid-cols-2'>
												<div className='space-y-1 bg-slate-50/50 p-3.5 rounded-lg border border-slate-100'>
													<span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
														Mobile Number
													</span>
													<p className='mt-1 font-mono font-semibold text-foreground'>
														{contact.mobileCountryCode || "+91"} {contact.mobileNumber}
													</p>
												</div>

												<div className='space-y-1 bg-slate-50/50 p-3.5 rounded-lg border border-slate-100'>
													<span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
														Email Address
													</span>
													<p className='mt-1 font-semibold text-foreground'>
														{contact.emailAddress || "—"}
													</p>
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className='p-8 text-xs text-center bg-white border shadow-sm rounded-xl border-border text-muted-foreground'>
									No contact details configured for this warehouse.
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</AppLayout>
	);
}
