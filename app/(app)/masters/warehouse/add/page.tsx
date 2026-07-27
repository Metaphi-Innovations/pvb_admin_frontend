"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Save, Check, XCircle } from "lucide-react";
import {
	WarehouseForm,
	validateWarehouseForm,
	INITIAL_FORM,
	type WarehouseFormValues,
} from "../components/WarehouseForm";
import { useCreateWarehouse } from "@/hooks/masters";
import { WarehouseListService } from "@/services/warehouse-list.service";

export default function AddWarehousePage() {
	const router = useRouter();
	const [form, setForm] = useState<WarehouseFormValues>({ ...INITIAL_FORM });
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

	const createMutation = useCreateWarehouse();

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
			setTimeout(() => setToast(null), 3200);
			return;
		}

		// const primaryContact = form.contacts.find((c) => c.isPrimary) || form.contacts[0];

		createMutation.mutate(
			{
				warehouse_name: form.warehouseName.trim(),
				operated_by: form.operatedBy || null,
				c_f_agent_id: form.operatedBy === "C&F Agent" ? form.customerType : null,
				gst_applicable: form.gstApplicable,
				gst_number: form.gstApplicable ? form.gstin.trim().toUpperCase() : null,
				registration_type: form.gstApplicable ? form.gstRegistrationType : null,
				registered_legal_name: form.gstApplicable ? form.registeredLegalName.trim() : null,
				registered_gst_address: form.gstApplicable ? form.registeredAddress.trim() : null,
				account_holder_name: form.accountHolderName.trim() || null,
				bank_name: form.bankName.trim() || null,
				branch_name: form.branch.trim() || null,
				account_number: form.accountNumber.trim() || null,
				confirm_account_number: form.confirmAccountNumber.trim() || null,
				ifsc_code: form.ifscCode.trim().toUpperCase() || null,
				swift_code: form.swiftCode.trim() || null,
				address: form.address.trim() || null,
				address_1: form.addressLine2.trim() || null,
				town: form.town.trim() || null,
				state: form.state || null,
				district: form.district || null,
				city: form.city || null,
				pincode: form.pincode || null,
				status: form.status,
				contacts: form.contacts.map((c) => ({
					contact_person: c.contactPerson,
					designation: c.designation || null,
					mobile_country_code: c.mobileCountryCode || "+91",
					mobile_number: c.mobileNumber,
					alternate_contact: c.alternateContact || null,
					email_address: c.emailAddress || null,
					is_primary: Boolean(c.isPrimary),
				})),
				warehouse_documents: form.documents.map((d) => ({
					document_name: d.documentName,
				})),
				files: form.documents.map((d) => d.file).filter((f): f is File => !!f),
			},
			{
				onSuccess: () => {
					setToast({ msg: "Warehouse created successfully.", type: "success" });
					setTimeout(() => router.push("/masters/warehouse"), 900);
				},
				onError: (err) => {
					const msg =
						err instanceof Error
							? err.message
							: WarehouseListService.extractErrorMessage(err, "Failed to save warehouse.");
					setToast({ msg, type: "error" });
					setTimeout(() => setToast(null), 4000);
				},
			},
		);
	};

	return (
		<FormContainer
			title="Add Warehouse"
			description="Masters → Warehouse Master → Add"
			compact
			onBack={() => router.back()}
			actions={
				<div className="flex items-center gap-2">
					<Button variant="outline" className="h-9 text-xs font-semibold rounded-lg" onClick={() => router.back()}>
						Discard
					</Button>
					<Button
						className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
						onClick={handleSave}
						disabled={createMutation.isPending}
					>
						<Save className="w-4 h-4" /> Save
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

			{toast && (
				<div
					className={cn(
						"fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
						"animate-in slide-in-from-top-2 fade-in-0 duration-300",
						toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
					)}
				>
					{toast.type === "success" ? (
						<Check className="flex-shrink-0 w-4 h-4" />
					) : (
						<XCircle className="flex-shrink-0 w-4 h-4" />
					)}
					{toast.msg}
				</div>
			)}
		</FormContainer>
	);
}
