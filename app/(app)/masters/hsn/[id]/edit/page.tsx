"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { ActiveInactiveToggle } from "@/components/ui/ActiveInactiveToggle";
import {
	type HSNMaster,
	loadHSNMasters,
	saveHSNMasters,
	hsnToForm,
	formToHsn,
	validateHsnForm,
	sanitizeHsnCodeInput,
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

export default function EditHSNPage() {
	const router = useRouter();
	const params = useParams();
	const id = parseInt(params.id as string);

	const [record, setRecord] = useState<HSNMaster | null>(null);
	const [form, setForm] = useState(hsnToForm({
		id: 0,
		hsnCode: "",
		hsnDescription: "",
		gstRate: "",
		status: "active",
		createdBy: "",
		createdDate: "",
		updatedBy: "",
		updatedDate: "",
	}));
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		const records = loadHSNMasters();
		const found = records.find((r) => r.id === id);
		if (!found) {
			router.push("/masters/hsn");
			return;
		}
		setRecord(found);
		setForm(hsnToForm(found));
	}, [id, router]);

	const gstOptions = useMemo(() => {
		try {
			const list = loadGSTMasters().filter((g) => g.status === "active");
			if (list.length > 0) {
				return [...list]
					.sort((a, b) => a.gstPercentage - b.gstPercentage)
					.map((g) => ({
						value: `${g.gstPercentage}%`,
						label: `${g.gstPercentage}%`,
					}));
			}
		} catch {
			// ignore
		}
		return ["0%", "5%", "12%", "18%", "28%"].map((rate) => ({
			value: rate,
			label: rate,
		}));
	}, []);

	const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
		setForm((prev) => ({ ...prev, [key]: value }));
		if (errors[key]) {
			setErrors((prev) => {
				const copy = { ...prev };
				delete copy[key];
				return copy;
			});
		}
	};

	const handleSave = () => {
		if (!record) return;
		const records = loadHSNMasters();
		const normalizedForm = {
			...form,
			hsnCode: sanitizeHsnCodeInput(form.hsnCode ?? ""),
		};
		const fieldErrors = validateHsnForm(normalizedForm, records, record.id);
		if (Object.keys(fieldErrors).length > 0) {
			setErrors(fieldErrors);
			return;
		}
		const updated = records.map((r) =>
			r.id === id ? formToHsn(normalizedForm, id, record) : r,
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

				<div className='flex-1 overflow-y-auto px-5 py-4 max-w-2xl'>
					<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
						<div className='space-y-1'>
							<Label className='text-xs font-medium'>
								HSN Code <span className='text-red-500'>*</span>
							</Label>
							<Input
								value={form.hsnCode}
								onChange={(e) =>
									set("hsnCode", sanitizeHsnCodeInput(e.target.value))
								}
								placeholder='e.g. 38089199'
								className={cn("h-8 text-xs font-mono", errors.hsnCode && "border-red-400")}
								inputMode='numeric'
								maxLength={8}
							/>
							<FieldError msg={errors.hsnCode} />
						</div>

						<div className='space-y-1'>
							<Label className='text-xs font-medium'>
								GST Rate <span className='text-red-500'>*</span>
							</Label>
							<AutocompleteSelect
								options={gstOptions}
								value={form.gstRate ?? ""}
								onChange={(value) => set("gstRate", value)}
								placeholder='Select GST rate…'
								error={!!errors.gstRate}
								className='h-8 text-xs'
							/>
							<FieldError msg={errors.gstRate} />
						</div>

						<div className='sm:col-span-2 space-y-1'>
							<Label className='text-xs font-medium'>
								HSN Description <span className='text-red-500'>*</span>
							</Label>
							<Textarea
								value={form.hsnDescription}
								onChange={(e) => set("hsnDescription", e.target.value)}
								placeholder='Describe this HSN code…'
								rows={3}
								className={cn(
									"text-xs rounded-lg resize-none min-h-[72px]",
									errors.hsnDescription && "border-red-400",
								)}
							/>
							<FieldError msg={errors.hsnDescription} />
						</div>

						<div className='sm:col-span-2 flex items-center justify-between rounded-lg border border-border px-3 py-2'>
							<div>
								<p className='text-xs font-medium text-foreground'>Status</p>
								<p className='text-[11px] text-muted-foreground'>
									{form.status === "active" ? "Active" : "Inactive"}
								</p>
							</div>
							<ActiveInactiveToggle
								active={form.status === "active"}
								onChange={(isActive) =>
									set("status", isActive ? "active" : "inactive")
								}
							/>
						</div>
					</div>
				</div>
			</div>
		</AppLayout>
	);
}
