"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";
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
	warehouseFormToRecordFields,
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
			...warehouseFormToRecordFields(form),
			createdBy: "Admin",
			createdDate: todayStr(),
			updatedBy: "Admin",
			updatedDate: todayStr(),
		};
		saveWarehouses([...records, newRecord]);
		setToast({ msg: "Warehouse created successfully.", type: "success" });
		setTimeout(() => router.push("/masters/warehouse"), 900);
	};

	return (
		<FormContainer
			title="Add Warehouse"
			description="Masters → Warehouse Master → Add"
			onBack={() => router.back()}
			actions={
				<div className="flex items-center gap-2">
					<Button variant="outline" className="h-9 text-xs font-semibold rounded-lg" onClick={() => router.back()}>
						Discard
					</Button>
					<Button
						className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
						onClick={handleSave}
					>
						<Save className='w-4 h-4' /> Save
					</Button>
				</div>
			}
		>
			<WarehouseForm
				form={form}
				onChange={setForm}
				errors={errors}
				onClearError={clearErr}
			/>

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
		</FormContainer>
	);
}
