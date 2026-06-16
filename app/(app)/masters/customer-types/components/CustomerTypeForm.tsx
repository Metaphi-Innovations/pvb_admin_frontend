"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
	AlertCircle,
	X,
	User,
	ChevronsUpDown,
	Check,
	Plus,
	Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type CustomerTypeDocument } from "../customer-type-data";
import { loadDocumentTypes } from "../../document-types/document-type-data";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";

function DocumentNameField({
	value,
	documentTypeId,
	onChange,
	readOnly,
	error,
}: {
	value: string;
	documentTypeId?: string;
	onChange: (next: { documentName: string; documentTypeId?: string }) => void;
	readOnly?: boolean;
	error?: string;
}) {
	const activeDocTypes = useMemo(
		() => loadDocumentTypes().filter((d) => d.status === "Active"),
		[],
	);
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement | null>(null);
	const filtered = useMemo(() => {
		const q = value.trim().toLowerCase();
		if (!q) return activeDocTypes;
		return activeDocTypes.filter(
			(d) =>
				d.title.toLowerCase().includes(q) ||
				d.description.toLowerCase().includes(q) ||
				d.id.toLowerCase().includes(q),
		);
	}, [activeDocTypes, value]);
	const selected = activeDocTypes.find((d) => d.id === documentTypeId);

	useEffect(() => {
		if (!open || readOnly) return;

		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (target && rootRef.current?.contains(target)) return;
			setOpen(false);
		};

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};

		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open, readOnly]);

	return (
		<div className='relative w-full space-y-1' ref={rootRef}>
			<div className='relative'>
				<Input
					disabled={readOnly}
					value={value}
					onChange={(e) => {
						onChange({
							documentName: e.target.value,
							documentTypeId: undefined,
						});
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					onClick={() => setOpen(true)}
					onKeyDown={(e) => {
						if (!readOnly) {
							if (e.key === "Escape") setOpen(false);
							else setOpen(true);
						}
					}}
					className={cn(
						"h-8 text-xs border-border/60 pr-9 bg-white w-full",
						error && "border-red-400 focus-visible:ring-red-300",
					)}
					placeholder='Type or select document type'
				/>
				<button
					type='button'
					tabIndex={-1}
					className='absolute -translate-y-1/2 right-2 top-1/2 text-muted-foreground'
					onMouseDown={(e) => e.preventDefault()}
					onClick={() => {
						if (!readOnly) setOpen(true);
					}}
				>
					<ChevronsUpDown className='w-3.5 h-3.5' />
				</button>
			</div>
			{open && !readOnly && (
				<div className='absolute left-0 z-50 w-full mt-1 bg-white border rounded-lg shadow-lg top-full border-border/60'>
					<div className='py-1 overflow-y-auto max-h-56'>
						{filtered.length === 0 ? (
							<p className='px-3 py-3 text-xs text-muted-foreground'>
								No matching document types
							</p>
						) : (
							filtered.map((docType) => (
								<button
									key={docType.id}
									type='button'
									className={cn(
										"w-full px-3 py-2 text-left hover:bg-muted/60 flex items-start gap-2",
										selected?.id === docType.id && "bg-brand-50",
									)}
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => {
										onChange({
											documentName: docType.title,
											documentTypeId: docType.id,
										});
										setOpen(false);
									}}
								>
									<div className='flex-1 min-w-0'>
										<div className='flex items-center min-w-0 gap-2'>
											<span className='text-xs font-medium truncate text-foreground'>
												{docType.title}
											</span>
											{selected?.id === docType.id && (
												<Check className='w-3 h-3 text-brand-600 shrink-0' />
											)}
										</div>
										{docType.description && (
											<p className='text-[10px] text-muted-foreground truncate mt-0.5'>
												{docType.description}
											</p>
										)}
									</div>
								</button>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}

export interface CustomerTypeFormValues {
	customerTypeCode: string;
	customerType: string;
	description: string;
	documentTypes: CustomerTypeDocument[];
}

export const DEFAULT_CUSTOMER_TYPE_FORM: CustomerTypeFormValues = {
	customerTypeCode: "",
	customerType: "",
	description: "",
	documentTypes: [],
};

export function validateCustomerTypeForm(
	form: CustomerTypeFormValues,
): Record<string, string> {
	const errors: Record<string, string> = {};
	if (!form.customerType.trim()) {
		errors.customerType = "Customer type is required";
	}
	if (!form.customerTypeCode.trim()) {
		errors.customerTypeCode = "Customer type code is required";
	}
	if (!form.documentTypes || form.documentTypes.length === 0) {
		errors.documentTypes = "At least one document type is required";
	}
	return errors;
}

function SectionHead({ label, sub, required }: { label: string; sub?: string; required?: boolean }) {
	return (
		<div className='mb-2.5 mt-0.5'>
			<p className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center'>
				{label}
				{required && <span className='text-red-500 ml-1'>*</span>}
			</p>
			{sub && <p className='text-[11px] text-muted-foreground mt-0.5'>{sub}</p>}
		</div>
	);
}

export function CustomerTypeForm({
	form,
	onChange,
	errors,
	onClearError,
	readOnly,
	triggerToast,
}: {
	form: CustomerTypeFormValues;
	onChange: (form: CustomerTypeFormValues) => void;
	errors: Record<string, string>;
	onClearError: (key: string) => void;
	readOnly?: boolean;
	triggerToast?: (message: string, type: "success" | "error") => void;
}) {
	const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

	const docTypesList = useMemo(() => {
		return loadDocumentTypes().filter((d) => d.status === "Active");
	}, []);

	const autocompleteOptions = useMemo(() => {
		return docTypesList.map((d) => ({
			value: d.id,
			label: d.title,
		}));
	}, [docTypesList]);

	const set = <K extends keyof CustomerTypeFormValues>(
		key: K,
		value: CustomerTypeFormValues[K],
	) => {
		onChange({ ...form, [key]: value });
		onClearError(key);
	};

	const handleAddDocument = () => {
		if (selectedDocIds.length === 0) {
			triggerToast?.("Please select at least one document type", "error");
			return;
		}
		const existingIds = new Set(
			(form.documentTypes || []).map((d) => d.documentTypeId),
		);
		const selectedDocs = docTypesList.filter((d) =>
			selectedDocIds.includes(d.id),
		);
		const newDocs = selectedDocs.filter((d) => !existingIds.has(d.id));

		if (newDocs.length === 0) {
			triggerToast?.("Selected document types are already added", "error");
			return;
		}

		const updated = [
			...(form.documentTypes || []),
			...newDocs.map((doc) => ({
				id: `DOC-${Math.floor(100000 + Math.random() * 900000)}`,
				documentTypeId: doc.id,
				documentName: doc.title,
			})),
		];
		set("documentTypes", updated);
		setSelectedDocIds([]);
		triggerToast?.(
			newDocs.length === 1 ? "Document type added" : "Document types added",
			"success",
		);
	};

	const handleRemoveDocument = (id: string) => {
		const updated = (form.documentTypes || []).filter((d) => d.id !== id);
		set("documentTypes", updated);
		triggerToast?.("Document type removed", "success");
	};

	const handleManualDocument = () => {
		const updated = [
			...(form.documentTypes || []),
			{
				id: `DOC-${Math.floor(100000 + Math.random() * 900000)}`,
				documentName: "",
				documentTypeId: undefined,
			},
		];
		set("documentTypes", updated);
	};

	const handleUpdateDocument = (
		id: string,
		patch: Partial<CustomerTypeDocument>,
	) => {
		const updated = (form.documentTypes || []).map((d) =>
			d.id === id ? { ...d, ...patch } : d,
		);
		set("documentTypes", updated);
	};

	const handleClearAllDocuments = () => {
		set("documentTypes", []);
		triggerToast?.("All document types removed", "success");
	};

	const inputCls = (key: string) =>
		cn(
			"h-8 text-xs",
			errors[key] && "border-red-400 focus-visible:ring-red-300",
		);

	return (
		<div className='w-full space-y-4'>
			{/* Top Header Block */}
			<div className='flex items-start gap-2.5 pb-3 border-b border-border'>
				<div className='flex items-center justify-center flex-shrink-0 border rounded-lg w-7 h-7 bg-brand-50 border-brand-100'>
					<User className='w-3.5 h-3.5 text-brand-600' />
				</div>
				<div>
					<p className='text-xs font-semibold text-foreground'>
						Customer Type Master
					</p>
					<p className='text-[11px] text-muted-foreground'>
						Customer type classification and document requirements
					</p>
				</div>
			</div>

			<div className='pt-1 space-y-5'>
				<div>
					<SectionHead label='Customer Type Details' required />
					<div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
						{/* Customer Type Code */}
						<div className='space-y-1'>
							<Label className='text-xs font-medium'>
								Customer Type Code <span className='text-red-500'>*</span>
							</Label>
							<Input
								value={form.customerTypeCode}
								onChange={(e) =>
									set("customerTypeCode", e.target.value.toUpperCase())
								}
								placeholder='Auto-generated code'
								className={cn(inputCls("customerTypeCode"), "font-mono")}
								disabled={readOnly}
								readOnly
							/>
							{errors.customerTypeCode && (
								<p className='flex items-center gap-1 mt-1 text-[11px] text-red-500'>
									<AlertCircle className='w-3.5 h-3.5 flex-shrink-0' />
									{errors.customerTypeCode}
								</p>
							)}
						</div>

						{/* Customer Type */}
						<div className='space-y-1'>
							<Label className='text-xs font-medium'>
								Customer Type <span className='text-red-500'>*</span>
							</Label>
							<Input
								value={form.customerType}
								onChange={(e) => set("customerType", e.target.value)}
								placeholder='e.g. Farmer'
								className={inputCls("customerType")}
								disabled={readOnly}
							/>
							{errors.customerType && (
								<p className='flex items-center gap-1 mt-1 text-[11px] text-red-500'>
									<AlertCircle className='w-3.5 h-3.5 flex-shrink-0' />
									{errors.customerType}
								</p>
							)}
						</div>

						{/* Description */}
						<div className='space-y-1 md:col-span-2 md:col-start-1'>
							<Label className='text-xs font-medium'>Description</Label>
							<Textarea
								value={form.description}
								onChange={(e) => set("description", e.target.value)}
								placeholder='Description...'
								className='min-h-[96px] text-xs resize-none rounded-lg'
								disabled={readOnly}
							/>
						</div>
					</div>
				</div>

				{/* Document Type Checklist */}
				<div className='pt-4 space-y-3 border-t border-border/60'>
					<div>
						<SectionHead
							label='Document Type Required'
							sub='Add list of documents required for this customer type.'
							required
						/>
					</div>

					{/* Add Controls */}
					{!readOnly && (
						<div className='flex items-end gap-3 p-3 border rounded-lg bg-muted/20 border-border'>
							{/* Document Type Dropdown */}
							<div className='flex-1 space-y-1'>
								<Label className='text-[11px] font-medium text-muted-foreground'>
									Document Details
								</Label>
								<AutocompleteSelect
									options={autocompleteOptions}
									value={selectedDocIds}
									onChange={(val) =>
										setSelectedDocIds(Array.isArray(val) ? val : [])
									}
									multiple
									placeholder='Select Document Type'
									searchPlaceholder='Search document type...'
									className='h-8 text-xs bg-white border-border'
								/>
							</div>

							<Button
								type='button'
								onClick={handleAddDocument}
								size='sm'
								className='flex-shrink-0 h-8 px-4 text-xs text-white bg-brand-600 hover:bg-brand-700'
							>
								Add
							</Button>
						</div>
					)}

					{errors.documentTypes && (
						<p className='flex items-center gap-1 text-[11px] text-red-500'>
							<AlertCircle className='w-3.5 h-3.5 flex-shrink-0' />
							{errors.documentTypes}
						</p>
					)}

					{/* Document Checklist Table */}
					<div className='overflow-hidden bg-white border rounded-lg border-border'>
						<table className='w-full divide-y table-fixed divide-border'>
							<colgroup>
								<col style={{ width: "50px" }} />
								<col style={{ width: "60%" }} />
								<col />
							</colgroup>
							<thead className='bg-muted/40'>
								<tr>
									<th
										style={{ width: "50px" }}
										className='px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground'
									>
										Sr.
									</th>
									<th
										style={{ width: "60%" }}
										className='px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground'
									>
										Document Details
									</th>
									{!readOnly ? (
										<th className='px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground'>
											Action
										</th>
									) : (
										<th className='px-3 py-2 text-[11px] font-semibold text-muted-foreground'></th>
									)}
								</tr>
							</thead>
							<tbody className='divide-y divide-border/60'>
								{!form.documentTypes || form.documentTypes.length === 0 ? (
									<tr>
										<td
											colSpan={3}
											className='px-3 py-6 text-xs text-center text-muted-foreground'
										>
											No documents added yet.
										</td>
									</tr>
								) : (
									form.documentTypes.map((doc, idx) => (
										<tr
											key={doc.id}
											className='transition-colors hover:bg-muted/10'
										>
											<td
												style={{ width: "50px" }}
												className='px-3 py-2.5 text-xs text-muted-foreground font-medium'
											>
												{idx + 1}
											</td>
											<td
												style={{ width: "60%" }}
												className='px-3 py-2.5 text-xs text-foreground font-medium max-w-0 font-mono'
											>
												{readOnly ? (
													<span title={doc.documentName}>
														{doc.documentName || "—"}
													</span>
												) : (
													<DocumentNameField
														value={doc.documentName}
														documentTypeId={doc.documentTypeId}
														readOnly={readOnly}
														onChange={(patch) =>
															handleUpdateDocument(doc.id, patch)
														}
													/>
												)}
											</td>
											{!readOnly ? (
												<td className='px-3 py-2 text-right'>
													<Button
														type='button'
														variant='ghost'
														size='sm'
														onClick={() => handleRemoveDocument(doc.id)}
														className='inline-flex items-center justify-center w-6 h-6 p-0 text-red-600 rounded-md hover:text-red-700 hover:bg-red-50'
													>
														<X className='w-3.5 h-3.5' />
													</Button>
												</td>
											) : (
												<td className='px-3 py-2.5'></td>
											)}
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
					{!readOnly && (
						<div className='mt-2.5 flex flex-wrap gap-2'>
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-8 text-xs bg-white border-dashed'
								onClick={handleManualDocument}
							>
								<Plus className='w-3.5 h-3.5 mr-1' /> Add Manual Document
							</Button>
							{(form.documentTypes || []).length > 0 && (
								<Button
									type='button'
									variant='outline'
									size='sm'
									className='h-8 text-xs text-red-600 bg-white border-red-200 hover:bg-red-50 hover:text-red-700'
									onClick={handleClearAllDocuments}
								>
									<Trash2 className='w-3.5 h-3.5 mr-1' /> Remove All
								</Button>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
