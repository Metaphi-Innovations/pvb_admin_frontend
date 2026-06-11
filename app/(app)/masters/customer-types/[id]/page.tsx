"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Edit2 } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadCustomerTypes, type CustomerTypeRecord } from "../customer-type-data";

const STATUS_CFG = {
	active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
	inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Inactive" },
} as const;

function displayValue(value?: React.ReactNode) {
	return value !== undefined && value !== null && value !== "" ? value : "—";
}

function InfoRow({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
	return (
		<div className="flex items-start justify-between gap-4 border-b border-border/60 px-3 py-2.5 last:border-0">
			<span className="text-[11px] font-medium text-muted-foreground">{label}</span>
			<span className={cn("text-right text-xs font-medium text-foreground", mono && "font-mono")}>
				{displayValue(value)}
			</span>
		</div>
	);
}

function StatusPill({ status }: { status: keyof typeof STATUS_CFG }) {
	const cfg = STATUS_CFG[status];
	return (
		<span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", cfg.bg, cfg.text)}>
			<span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
			{cfg.label}
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

export default function CustomerTypeDetailPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const [customerType, setCustomerType] = useState<CustomerTypeRecord | null>(null);

	useEffect(() => {
		const list = loadCustomerTypes();
		setCustomerType(list.find((c) => c.id === Number(id)) ?? null);
	}, [id]);

	if (!customerType) {
		return (
			<div className="py-16 text-center">
				<p className="text-sm text-muted-foreground">Customer Type not found.</p>
				<Link href="/masters/customer-types" className="mt-2 inline-block text-xs text-brand-600 hover:underline">
					Back to listing
				</Link>
			</div>
		);
	}

	return (
		<FormContainer
			title={customerType.customerType}
			description={`${customerType.customerTypeCode} • Customer Type Details`}
			onBack={() => router.push("/masters/customer-types")}
			actions={
				<div className="flex items-center gap-2">
					<StatusPill status={customerType.status} />
					<Link href={`/masters/customer-types/${customerType.id}/edit`}>
						<Button size="sm" className="h-9 gap-1.5 rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700">
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
						<InfoRow label="Customer Type ID" value={String(customerType.id)} mono />
						<InfoRow label="Customer Type Code" value={customerType.customerTypeCode} mono />
						<InfoRow label="Customer Type" value={customerType.customerType} />
						<InfoRow label="Description" value={customerType.description} />
						<InfoRow label="Status" value={<StatusPill status={customerType.status} />} />
					</DetailCard>

					<DetailCard title="Document Type Required">
						<InfoRow label="Total Documents" value={String(customerType.documentTypes?.length ?? 0)} />
						<InfoRow
							label="Document Coverage"
							value={customerType.documentTypes?.length ? "Configured" : "No documents required"}
						/>
					</DetailCard>

					<DetailCard title="Audit Details">
						<InfoRow label="Created By" value="Admin" />
						<InfoRow label="Created Date" value="—" />
						<InfoRow label="Updated By" value="—" />
						<InfoRow label="Updated Date" value="—" />
					</DetailCard>
				</div>

				<DetailCard title="Document Type Required">
					<div className="overflow-hidden rounded-lg border border-border bg-white">
						<table className="min-w-full divide-y divide-border table-fixed">
							<colgroup>
								<col style={{ width: "50px" }} />
								<col style={{ width: "60%" }} />
								<col />
							</colgroup>
							<thead className="bg-muted/40">
								<tr>
									<th style={{ width: "50px" }} className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Sr.</th>
									<th style={{ width: "60%" }} className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Document Details</th>
									<th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground" />
								</tr>
							</thead>
							<tbody className="divide-y divide-border/60">
								{!customerType.documentTypes || customerType.documentTypes.length === 0 ? (
									<tr>
										<td colSpan={3} className="px-3 py-6 text-center text-xs text-muted-foreground">
											No documents required.
										</td>
									</tr>
								) : (
									customerType.documentTypes.map((doc, idx) => (
										<tr key={doc.id} className="transition-colors hover:bg-muted/10">
											<td style={{ width: "50px" }} className="px-3 py-2.5 font-medium text-xs text-muted-foreground">
												{idx + 1}
											</td>
											<td style={{ width: "60%" }} className="max-w-0 truncate px-3 py-2.5 font-mono text-xs font-medium text-foreground" title={doc.documentName}>
												{doc.documentName}
											</td>
											<td className="px-3 py-2.5" />
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</DetailCard>
			</div>
		</FormContainer>
	);
}
