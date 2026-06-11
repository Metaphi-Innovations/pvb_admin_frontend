"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
	ArrowLeft,
	Save,
	AlertCircle,
} from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	HSNMaster,
	loadHSNMasters,
	saveHSNMasters,
	todayStr,
} from "../../hsn-data";
import { loadGSTMasters } from "../../../gst/gst-data";



function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return (
		<p className='flex items-center gap-1 mt-1 text-[11px] text-red-500'>
			<AlertCircle className='w-3 h-3 flex-shrink-0' />
			{msg}
		</p>
	);
}

function SectionHead({ label, sub }: { label: string; sub?: string }) {
	return (
		<div className='mb-2.5 mt-0.5'>
			<p className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
				{label}
			</p>
			{sub && <p className='text-[11px] text-muted-foreground mt-0.5'>{sub}</p>}
		</div>
	);
}

export default function EditHSNPage() {
	const router = useRouter();
	const params = useParams();
	const id = parseInt(params.id as string);

	const [record, setRecord] = useState<HSNMaster | null>(null);
	const [form, setForm] = useState({
		hsnCode: "",
		hsnDescription: "",
		gstRate: "",
		status: "active" as "active" | "inactive",
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		const records = loadHSNMasters();
		const found = records.find((r) => r.id === id);
		if (!found) {
			router.push("/masters/hsn");
			return;
		}
		setRecord(found);
		setForm({
			hsnCode: found.hsnCode,
			hsnDescription: found.hsnDescription,
			gstRate: found.gstRate,
			status: found.status,
		});
	}, [id, router]);

	const gstRatesList = React.useMemo(() => {
		try {
			const list = loadGSTMasters();
			if (list && list.length > 0) {
				const sorted = [...list].sort(
					(a, b) => a.gstPercentage - b.gstPercentage,
				);
				return Array.from(new Set(sorted.map((g) => `${g.gstPercentage}%`)));
			}
		} catch {
			// ignore
		}
		return ["0%", "5%", "12%", "18%", "28%"];
	}, []);

	const set = (key: string, value: any) => {
		setForm((prev) => ({ ...prev, [key]: value }));
		if (errors[key]) {
			setErrors((prev) => {
				const copy = { ...prev };
				delete copy[key];
				return copy;
			});
		}
	};

	const validate = (): boolean => {
		const e: Record<string, string> = {};
		if (!form.hsnCode.trim()) e.hsnCode = "HSN Code is required";
		if (!form.hsnDescription.trim())
			e.hsnDescription = "HSN Description is required";
		if (!form.gstRate) e.gstRate = "GST Rate is required";
		setErrors(e);
		return Object.keys(e).length === 0;
	};

	const handleSave = () => {
		if (!validate() || !record) return;
		const records = loadHSNMasters();
		const updated = records.map((r) =>
			r.id === id
				? {
						...r,
						hsnCode: form.hsnCode,
						hsnDescription: form.hsnDescription,
						gstRate: form.gstRate,
						status: form.status,
						updatedBy: "Admin",
						updatedDate: todayStr(),
					}
				: r,
		);
		saveHSNMasters(updated);
		router.push("/masters/hsn");
	};

	if (!record) {
		return (
			<AppLayout>
				<div className='flex items-center justify-center h-screen'>
					<p className='text-muted-foreground text-xs'>Loading...</p>
				</div>
			</AppLayout>
		);
	}

	return (
		<AppLayout>
			<div
				className='flex flex-col'
				style={{ minHeight: "calc(100vh - 104px)" }}
			>
				{/* Sticky Header */}
				<div className='sticky top-0 z-10 bg-white border-b border-border px-4 py-2 flex items-center gap-2.5 flex-shrink-0'>
					<button
						type='button'
						onClick={() => router.back()}
						className='p-1 hover:bg-muted rounded transition-colors flex-shrink-0'
					>
						<ArrowLeft className='w-4 h-4 text-muted-foreground' />
					</button>
					<div className='flex-1 min-w-0'>
						<h2 className='text-sm font-semibold leading-none'>Edit HSN</h2>
						<p className='text-[11px] text-muted-foreground mt-0.5'>
							Masters → HSN → {record.hsnCode}
						</p>
					</div>
					<span className='text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700'>
						{record.hsnCode}
					</span>
					<Button
						variant='outline'
						size='sm'
						className='h-7 text-[11px] px-3'
						onClick={() => router.back()}
					>
						Discard
					</Button>
					<Button
						size='sm'
						className='h-7 text-[11px] px-3 gap-1.5 bg-brand-600 text-white hover:bg-brand-700'
						onClick={handleSave}
					>
						<Save className='w-3.5 h-3.5' /> Update HSN
					</Button>
				</div>

				{/* Form Content */}
				<div className='flex-1 overflow-y-auto px-5 py-4'>
					<SectionHead label='HSN Details' />
					<div className='grid grid-cols-4 gap-3'>
						{/* HSN Code */}
						<div className='col-span-2 space-y-1'>
							<Label className='text-xs font-medium'>
								HSN Code <span className='text-red-500'>*</span>
							</Label>
							<Input
								value={form.hsnCode}
								disabled
								readOnly
								className='h-8 text-xs bg-muted/30 text-muted-foreground cursor-not-allowed'
							/>
						</div>

						{/* GST Rate */}
						<div className='col-span-2 space-y-1'>
							<Label className='text-xs font-medium'>
								GST Rate <span className='text-red-500'>*</span>
							</Label>
							<Select
								value={form.gstRate}
								onValueChange={(v) => set("gstRate", v)}
							>
								<SelectTrigger className={cn("h-8 text-xs bg-background w-full", errors.gstRate && "border-red-400 focus:ring-red-300")}>
									<SelectValue placeholder='Select GST rate…' />
								</SelectTrigger>
								<SelectContent className='bg-white border shadow-lg border-border z-[350]'>
									{gstRatesList.map((rate) => (
										<SelectItem key={rate} value={rate} className='text-xs'>
											{rate}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError msg={errors.gstRate} />
						</div>

						{/* HSN Description */}
						<div className='col-span-4 space-y-1'>
							<Label className='text-xs font-medium'>
								HSN Description <span className='text-red-500'>*</span>
							</Label>
							<Textarea
								value={form.hsnDescription}
								onChange={(e) => set("hsnDescription", e.target.value)}
								placeholder='Describe this HSN code...'
								rows={3}
								className={cn(
									"text-xs rounded-lg resize-none min-h-[38px]",
									errors.hsnDescription &&
										"border-red-400 focus-visible:ring-red-300",
								)}
							/>
							<FieldError msg={errors.hsnDescription} />
						</div>
					</div>
				</div>
			</div>
		</AppLayout>
	);
}
