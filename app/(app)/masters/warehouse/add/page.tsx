"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, X, Check, XCircle } from "lucide-react";
import {
	type WarehouseMaster,
	loadWarehouses,
	saveWarehouses,
	nextWarehouseId,
	generateWarehouseCode,
	todayStr,
} from "../warehouse-data";
import {
	WarehouseForm,
	validateWarehouseForm,
	INITIAL_FORM,
	type WarehouseFormValues,
} from "../components/WarehouseForm";

export default function AddWarehousePage() {
	const router = useRouter();
	const [records, setRecords] = useState<WarehouseMaster[]>([]);
	const [form, setForm] = useState<WarehouseFormValues>({ ...INITIAL_FORM });
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [toast, setToast] = useState<{
		msg: string;
		type: "success" | "error";
	} | null>(null);

	useEffect(() => {
		setRecords(loadWarehouses());
	}, []);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 3200);
		return () => clearTimeout(t);
	}, [toast]);

	const clearErr = (key: string) => {
		setErrors((prev) => {
			const copy = { ...prev };
			delete copy[key];
			return copy;
		});
	};

	const handleSave = () => {
		const e = validateWarehouseForm(form);
		setErrors(e);
		if (Object.keys(e).length > 0) {
			setToast({ msg: "Please fix the errors before saving.", type: "error" });
			return;
		}
		const nextIdVal = nextWarehouseId(records);
		const newRecord: WarehouseMaster = {
			id: nextIdVal,
			warehouseCode: generateWarehouseCode(nextIdVal),
			warehouseName: form.warehouseName,
			warehouseType: form.warehouseType,
			gstNumber: form.gstNumber,
			contactPerson: form.contactPerson,
			mobileNumber: form.mobileNumber,
			emailAddress: form.emailAddress,
			address: form.address,
			state: form.state,
			district: form.district,
			city: form.city,
			pincode: form.pincode,
			capacity: Number(form.capacity) || 0,
			manager: form.manager,
			status: form.status,
			operatedBy: form.operatedBy,
			createdBy: "Admin",
			createdDate: todayStr(),
			updatedBy: "Admin",
			updatedDate: todayStr(),
		};
		saveWarehouses([...records, newRecord]);
		setToast({ msg: "Warehouse created successfully.", type: "success" });
		setTimeout(() => router.push("/masters/warehouse"), 900);
	};

	const autoCode = generateWarehouseCode(nextWarehouseId(records));

	return (
		<AppLayout>
			<div className="flex flex-col h-full">
				<div className="sticky top-0 z-10 flex items-center flex-shrink-0 gap-3 px-5 py-3 bg-white border-b border-border">
					<button
						type="button"
						onClick={() => router.back()}
						className="flex items-center justify-center flex-shrink-0 w-8 h-8 transition-colors border rounded-lg border-border hover:bg-muted"
					>
						<ArrowLeft className='w-4 h-4 text-muted-foreground' />
					</button>
					<div className='flex-1 min-w-0'>
						<h2 className='text-sm font-semibold leading-none text-foreground'>
							Add Warehouse
						</h2>
						<p className='text-[11px] text-muted-foreground mt-0.5'>
							Masters → Warehouse Master → Add
						</p>
					</div>
					<span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
						{autoCode}
					</span>
					<Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()}>
						Discard
					</Button>
					<Button
						size="sm"
						className="h-7 text-[11px] gap-1.5 px-3 bg-brand-600 text-white hover:bg-brand-700"
						onClick={handleSave}
					>
						<Save className='w-3.5 h-3.5' /> Save
					</Button>
				</div>

				{/* Form Content */}
				<div className="flex-1 px-6 py-6 overflow-y-auto bg-muted/10">
					<WarehouseForm
						form={form}
						onChange={setForm}
						errors={errors}
						onClearError={clearErr}
						warehouseCode={autoCode}
					/>
				</div>
			</div>

			{/* Toast */}
			{toast && (
				<div
					className={cn(
						"fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
						"animate-in slide-in-from-top-2 fade-in-0 duration-300",
						toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
					)}
				>
					{toast.type === "success" ? (
						<Check className='flex-shrink-0 w-4 h-4' />
					) : (
						<XCircle className='flex-shrink-0 w-4 h-4' />
					)}
					{toast.msg}
				</div>
			)}
		</AppLayout>
	);
}
