"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Edit2 } from "lucide-react";
import {
	type WarehouseMaster,
	type WarehouseStatus,
	loadWarehouses,
	formatStatus,
} from "../warehouse-data";

const STATUS_CFG: Record<
	WarehouseStatus,
	{ bg: string; text: string; dot: string; label: string }
> = {
	active: {
		bg: "bg-emerald-50",
		text: "text-emerald-700",
		dot: "bg-emerald-500",
		label: "Active",
	},
	inactive: {
		bg: "bg-slate-100",
		text: "text-slate-600",
		dot: "bg-slate-400",
		label: "Inactive",
	},
	under_maintenance: {
		bg: "bg-amber-50",
		text: "text-amber-700",
		dot: "bg-amber-500",
		label: "Under Maintenance",
	},
	closed: {
		bg: "bg-red-50",
		text: "text-red-700",
		dot: "bg-red-400",
		label: "Closed",
	},
};

function displayValue(value?: React.ReactNode) {
	return value !== undefined && value !== null && value !== "" ? value : "—";
}

function InfoRow({
	label,
	value,
	mono,
}: {
	label: string;
	value?: React.ReactNode;
	mono?: boolean;
}) {
	return (
		<div className="flex items-start justify-between gap-4 border-b border-border/60 px-3 py-2.5 last:border-0">
			<span className="text-[11px] font-medium text-muted-foreground">
				{label}
			</span>
			<span
				className={cn(
					"text-right text-xs font-medium text-foreground",
					mono && "font-mono",
				)}
			>
				{displayValue(value)}
			</span>
		</div>
	);
}

function StatusPill({ status }: { status: WarehouseStatus }) {
	const cfg = STATUS_CFG[status];
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
				cfg.bg,
				cfg.text,
			)}
		>
			<span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
			{cfg.label}
		</span>
	);
}

function DetailCard({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-xl border border-border bg-white p-3.5">
			<p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
				{title}
			</p>
			<div>{children}</div>
		</div>
	);
}

export default function WarehouseDetailPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const [warehouse, setWarehouse] = useState<WarehouseMaster | null>(null);

	useEffect(() => {
		const list = loadWarehouses();
		setWarehouse(list.find((w) => w.id === Number(id)) ?? null);
	}, [id]);

	if (!warehouse) {
		return (
			<div className="py-16 text-center">
				<p className="text-sm text-muted-foreground">Warehouse not found.</p>
				<Link
					href="/masters/warehouse"
					className="mt-2 inline-block text-xs text-brand-600 hover:underline"
				>
					Back to listing
				</Link>
			</div>
		);
	}

	const primaryContact =
		warehouse.contacts?.find((contact) => contact.isPrimary) ??
		warehouse.contacts?.[0] ??
		null;
	const operatedCustomerName =
		warehouse.operatedBy === "C&F Agent"
			? warehouse.customerType
			: undefined;

	return (
		<FormContainer
			title={warehouse.warehouseName}
			description={`${warehouse.warehouseCode} • ${warehouse.warehouseType} • ${warehouse.city}, ${warehouse.state}`}
			onBack={() => router.push("/masters/warehouse")}
			actions={
				<div className="flex items-center gap-2">
					<StatusPill status={warehouse.status} />
					<Link href={`/masters/warehouse/${warehouse.id}/edit`}>
						<Button
							size="sm"
							className="h-9 gap-1.5 rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700"
						>
							<Edit2 className="h-3.5 w-3.5" /> Edit
						</Button>
					</Link>
				</div>
			}
			noCard={true}
		>
			<div className="w-full space-y-5">
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					<DetailCard title="Basic Details">
						<InfoRow label="Warehouse Name" value={warehouse.warehouseName} />
						<InfoRow label="Warehouse Code" value={warehouse.warehouseCode} mono />
						<InfoRow label="Warehouse Type" value={warehouse.warehouseType} />
						<InfoRow
							label="Operated By"
							value={warehouse.operatedBy}
						/>
						{warehouse.operatedBy === "C&F Agent" && (
							<InfoRow
								label="Customer Name"
								value={operatedCustomerName}
							/>
						)}
						<InfoRow label="Status" value={<StatusPill status={warehouse.status} />} />
					</DetailCard>

					<DetailCard title="Contact Details">
						<div className="space-y-3">
							{(warehouse.contacts?.length
								? warehouse.contacts
								: primaryContact
									? [primaryContact]
									: []
							).map((contact, index) => (
								<div
									key={contact.id || index}
									className="border-b border-border/40 pb-2.5 last:border-0 last:pb-0"
								>
									<div className="mb-1 flex items-center justify-between gap-2">
										<span className="text-xs font-semibold text-foreground">
											{displayValue(contact.contactPerson)}
										</span>
										{contact.isPrimary && (
											<span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold text-brand-600">
												Primary
											</span>
										)}
									</div>
									<div className="grid grid-cols-1 gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-2">
										<div>
											<span className="font-medium">Mobile:</span>{" "}
											<span className="font-mono text-foreground">
												{displayValue(
													contact.mobileCountryCode
														? `${contact.mobileCountryCode} ${contact.mobileNumber}`
														: contact.mobileNumber,
												)}
											</span>
										</div>
										<div>
											<span className="font-medium">Email:</span>{" "}
											<span className="text-foreground">
												{displayValue(contact.emailAddress)}
											</span>
										</div>
									</div>
								</div>
							))}
							<div className="pt-2">
								<InfoRow label="GST Number" value={warehouse.gstNumber} mono />
							</div>
						</div>
					</DetailCard>

					<DetailCard title="Address & Location Details">
						<InfoRow label="Address" value={warehouse.address} />
						<InfoRow label="State" value={warehouse.state} />
						<InfoRow label="District" value={warehouse.district} />
						<InfoRow label="City" value={warehouse.city} />
						<InfoRow label="Pin Code" value={warehouse.pincode} mono />
					</DetailCard>

					<DetailCard title="Capacity & Management Details">
						<InfoRow
							label="Capacity"
							value={warehouse.capacity ? warehouse.capacity.toLocaleString() : undefined}
						/>
						<InfoRow label="Manager" value={warehouse.manager} />
						<InfoRow label="Status" value={formatStatus(warehouse.status)} />
						<InfoRow label="Created By" value={warehouse.createdBy} />
						<InfoRow label="Created Date" value={warehouse.createdDate} />
						<InfoRow label="Updated By" value={warehouse.updatedBy} />
						<InfoRow label="Updated Date" value={warehouse.updatedDate} />
					</DetailCard>
				</div>
			</div>
		</FormContainer>
	);
}
