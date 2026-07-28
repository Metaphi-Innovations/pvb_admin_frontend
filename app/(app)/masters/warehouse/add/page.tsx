"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Save, Check, XCircle } from "lucide-react";
import {
	WarehouseForm,
	validateWarehouseForm,
	validateWarehouseFormStep,
	WAREHOUSE_FORM_STEPS,
	INITIAL_FORM,
	type WarehouseFormValues,
	type WarehouseFormStepId,
} from "../components/WarehouseForm";
import { useCreateWarehouse } from "@/hooks/masters";
import { WarehouseListService } from "@/services/warehouse-list.service";

export default function AddWarehousePage() {
	const router = useRouter();
	const [form, setForm] = useState<WarehouseFormValues>({ ...INITIAL_FORM });
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
	const [stepIndex, setStepIndex] = useState(0);

	const createMutation = useCreateWarehouse();
	const currentStep = WAREHOUSE_FORM_STEPS[stepIndex];
	const isFirstStep = stepIndex === 0;
	const isLastStep = stepIndex === WAREHOUSE_FORM_STEPS.length - 1;

	const clearErr = (key: string) => {
		setErrors((prev) => {
			const copy = { ...prev };
			delete copy[key];
			return copy;
		});
	};

	const handleNext = () => {
		const stepErrors = validateWarehouseFormStep(form, currentStep.id as WarehouseFormStepId);
		setErrors(stepErrors);
		if (Object.keys(stepErrors).length > 0) {
			setToast({ msg: "Please fix the errors before continuing.", type: "error" });
			setTimeout(() => setToast(null), 3200);
			return;
		}
		setErrors({});
		setStepIndex((i) => Math.min(i + 1, WAREHOUSE_FORM_STEPS.length - 1));
	};

	const handleBack = () => {
		setErrors({});
		setStepIndex((i) => Math.max(i - 1, 0));
	};

	const handleSave = () => {
		const e = validateWarehouseForm(form);
		setErrors(e);
		if (Object.keys(e).length > 0) {
			const firstStepWithError = WAREHOUSE_FORM_STEPS.findIndex((step) => {
				const stepErrors = validateWarehouseFormStep(form, step.id);
				return Object.keys(stepErrors).length > 0;
			});
			if (firstStepWithError >= 0) setStepIndex(firstStepWithError);
			setToast({ msg: "Please fix the errors before saving.", type: "error" });
			setTimeout(() => setToast(null), 3200);
			return;
		}

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
					router.push("/masters/warehouse");
				},
				onError: (err) => {
					const msg =
						err instanceof Error
							? err.message
							: WarehouseListService.extractErrorMessage(err, "Failed to create warehouse.");
					setToast({ msg, type: "error" });
					setTimeout(() => setToast(null), 4000);
				},
			},
		);
	};

	return (
		<FormContainer
			title="Add Warehouse"
			description={`Masters → Warehouse Master → Add · Step ${stepIndex + 1} of ${WAREHOUSE_FORM_STEPS.length}: ${currentStep.label}`}
			compact
			onBack={() => router.back()}
			actions={
				<div className="flex items-center gap-2">
					<Button variant="outline" className="h-9 text-xs font-semibold rounded-lg" onClick={() => router.back()}>
						Discard
					</Button>
					{!isFirstStep && (
						<Button
							variant="outline"
							className="h-9 text-xs font-semibold rounded-lg gap-1"
							onClick={handleBack}
						>
							<ChevronLeft className="w-4 h-4" /> Back
						</Button>
					)}
					{!isLastStep ? (
						<Button
							className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
							onClick={handleNext}
						>
							Next <ChevronRight className="w-4 h-4" />
						</Button>
					) : (
						<Button
							className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
							onClick={handleSave}
							disabled={createMutation.isPending}
						>
							<Save className="w-4 h-4" /> Save
						</Button>
					)}
				</div>
			}
		>
			<div className="mb-3 flex flex-wrap gap-1.5">
				{WAREHOUSE_FORM_STEPS.map((step, idx) => (
					<button
						key={step.id}
						type="button"
						onClick={() => {
							if (idx <= stepIndex) {
								setErrors({});
								setStepIndex(idx);
							}
						}}
						className={cn(
							"rounded-full px-2.5 py-1 text-[10px] font-semibold border transition-colors",
							idx === stepIndex
								? "bg-brand-600 text-white border-brand-600"
								: idx < stepIndex
									? "bg-brand-50 text-brand-700 border-brand-200 cursor-pointer"
									: "bg-muted/40 text-muted-foreground border-border cursor-default",
						)}
					>
						{idx + 1}. {step.label}
					</button>
				))}
			</div>

			<WarehouseForm
				form={form}
				onChange={setForm}
				errors={errors}
				onClearError={clearErr}
				activeStep={currentStep.id}
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
