"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { cn } from "@/lib/utils";
import {
	AlertCircle,
	ChevronsUpDown,
	Check,
	XCircle,
	ChevronDown,
	Trash2,
	Upload,
	Plus,
} from "lucide-react";
import {
	// WAREHOUSE_STATUSES,
	OPERATED_BY_OPTIONS,
	type WarehouseStatus,
	type OperatedBy,
	type WarehouseContact,
	type WarehouseDocument,
	type WarehouseMaster,
} from "../warehouse-data";
import { loadCustomers } from "../../customers/customer-data";
import { validateGSTIN, validateIFSC } from "../../customers/customer-data";
import { loadCustomerTypes } from "../../customer-types/customer-type-data";
import { loadDocumentTypes } from "../../document-types/document-type-data";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { ErpFormSection } from "@/components/masters/erp/ErpFormSection";
import { BranchAddressFields } from "@/components/masters/erp/BranchAddressFields";
import type { BranchAddress } from "@/app/(app)/masters/customers/components/CustomerForm";
import {
	loadGeoNodes,
	getStateSelectOptions,
} from "@/app/(app)/masters/geography/geo-data";
import {
	GstRegistrationFields,
	GstRegisteredToggleControl,
} from "@/components/masters/GstRegistrationFields";
import { BankDetailsFields } from "@/components/masters/BankDetailsFields";
import {
	fetchGstRegistrationDetailsAsync,
	GST_REGISTRATION_TYPE_DEFAULT,
} from "@/lib/masters/gst-compliance";
import { useCfDropdown, usePincode } from "@/hooks/masters";

const PHONE_COUNTRY_CODES = [
	{ code: "+91", label: "🇮🇳 +91 (India)" },
	{ code: "+1", label: "🇺🇸 +1 (USA)" },
	{ code: "+44", label: "🇬🇧 +44 (UK)" },
	{ code: "+971", label: "🇦🇪 +971 (UAE)" },
	{ code: "+65", label: "🇸🇬 +65 (Singapore)" },
];

function CountryCodePicker({
	value,
	onChange,
	disabled,
	hasError,
}: {
	value: string;
	onChange: (v: string) => void;
	disabled?: boolean;
	hasError?: boolean;
}) {
	const [open, setOpen] = useState(false);
	return (
		<Popover open={open && !disabled} onOpenChange={setOpen}>
			<PopoverTrigger asChild disabled={disabled}>
				<button
					type='button'
					disabled={disabled}
					className={cn(
						"h-8 px-2 text-xs border border-border rounded-lg bg-background flex items-center gap-1 hover:bg-muted/30 transition-colors flex-shrink-0",
						hasError && "border-red-400",
						disabled && "opacity-50 pointer-events-none bg-muted/30",
					)}
				>
					<span className='font-medium text-foreground'>{value}</span>
					<ChevronDown className='w-3 h-3 text-muted-foreground' />
				</button>
			</PopoverTrigger>
			<PopoverContent align='start' className='p-1 bg-white w-52'>
				{PHONE_COUNTRY_CODES.map((cc) => (
					<button
						key={cc.code}
						type='button'
						onClick={() => {
							onChange(cc.code);
							setOpen(false);
						}}
						className={cn(
							"w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-muted/60 transition-colors flex items-center justify-between",
							value === cc.code && "bg-brand-50 text-brand-700",
						)}
					>
						{cc.label}
						{value === cc.code && <Check className='w-3 h-3 text-brand-600' />}
					</button>
				))}
			</PopoverContent>
		</Popover>
	);
}

export interface WarehouseFormValues {
	warehouseName: string;
	gstApplicable: boolean;
	gstRegistrationType: string;
	gstin: string;
	registeredLegalName: string;
	registeredAddress: string;
	accountHolderName: string;
	bankName: string;
	branch: string;
	accountNumber: string;
	confirmAccountNumber: string;
	ifscCode: string;
	swiftCode: string;
	address: string;
	addressLine2: string;
	town: string;
	state: string;
	district: string;
	city: string;
	pincode: string;
	status: WarehouseStatus;
	operatedBy: OperatedBy;
	customerType: string;
	contacts: WarehouseContact[];
	documents: WarehouseDocument[];
}

export const INITIAL_FORM: WarehouseFormValues = {
	warehouseName: "",
	gstApplicable: false,
	gstRegistrationType: GST_REGISTRATION_TYPE_DEFAULT,
	gstin: "",
	registeredLegalName: "",
	registeredAddress: "",
	accountHolderName: "",
	bankName: "",
	branch: "",
	accountNumber: "",
	confirmAccountNumber: "",
	ifscCode: "",
	swiftCode: "",
	address: "",
	addressLine2: "",
	town: "",
	state: "",
	district: "",
	city: "",
	pincode: "",
	status: "Active",
	operatedBy: "Self",
	customerType: "",
	contacts: [
		{
			id: "CON-1",
			contactPerson: "",
			designation: "",
			mobileNumber: "",
			emailAddress: "",
			alternateContact: "",
			isPrimary: true,
			mobileCountryCode: "+91",
		},
	],
	documents: [],
};

export function warehouseRecordToForm(record: WarehouseMaster): WarehouseFormValues {
	let contacts = record.contacts;
	if (!contacts || contacts.length === 0) {
		contacts = [
			{
				id: "CON-1",
				contactPerson: record.contactPerson || "",
				designation: record.manager || "",
				mobileNumber: record.mobileNumber || "",
				emailAddress: record.emailAddress || "",
				alternateContact: "",
				isPrimary: true,
				mobileCountryCode: "+91",
			},
		];
	}

	return {
		warehouseName: record.warehouseName,
		gstApplicable: record.gstApplicable ?? !!record.gstNumber?.trim(),
		gstRegistrationType: record.gstRegistrationType || GST_REGISTRATION_TYPE_DEFAULT,
		gstin: record.gstNumber || "",
		registeredLegalName: record.registeredLegalName || "",
		registeredAddress: record.registeredAddress || "",
		accountHolderName: record.accountHolderName || "",
		bankName: record.bankName || "",
		branch: record.branch || "",
		accountNumber: record.accountNumber || "",
		confirmAccountNumber: record.accountNumber || "",
		ifscCode: record.ifscCode || "",
		swiftCode: record.swiftCode || "",
		address: record.address,
		addressLine2: record.addressLine2 || "",
		town: record.town || "",
		state: record.state,
		district: record.district,
		city: record.city,
		pincode: record.pincode,
		status: record.status,
		operatedBy: record.operatedBy,
		customerType: record.customerType || "",
		contacts,
		documents: record.documents || [],
	};
}

export function warehouseFormToRecordFields(
	form: WarehouseFormValues,
): Pick<
	WarehouseMaster,
	| "warehouseName"
	| "warehouseType"
	| "gstApplicable"
	| "gstNumber"
	| "gstRegistrationType"
	| "registeredLegalName"
	| "registeredAddress"
	| "accountHolderName"
	| "bankName"
	| "branch"
	| "accountNumber"
	| "ifscCode"
	| "swiftCode"
	| "contactPerson"
	| "mobileNumber"
	| "emailAddress"
	| "address"
	| "addressLine2"
	| "town"
	| "state"
	| "district"
	| "city"
	| "pincode"
	| "manager"
	| "status"
	| "operatedBy"
	| "customerType"
	| "contacts"
	| "documents"
> {
	const primaryContact = form.contacts.find((c) => c.isPrimary) || form.contacts[0];
	return {
		warehouseName: form.warehouseName,
		warehouseType: "Central Warehouse",
		gstApplicable: form.gstApplicable,
		gstNumber: form.gstApplicable ? form.gstin.trim().toUpperCase() : "",
		gstRegistrationType: form.gstApplicable ? form.gstRegistrationType : GST_REGISTRATION_TYPE_DEFAULT,
		registeredLegalName: form.gstApplicable ? form.registeredLegalName.trim() : "",
		registeredAddress: form.gstApplicable ? form.registeredAddress.trim() : "",
		accountHolderName: form.accountHolderName.trim(),
		bankName: form.bankName.trim(),
		branch: form.branch.trim(),
		accountNumber: form.accountNumber.trim(),
		ifscCode: form.ifscCode.trim().toUpperCase(),
		swiftCode: form.swiftCode.trim(),
		contactPerson: primaryContact?.contactPerson ?? "",
		mobileNumber: primaryContact?.mobileNumber ?? "",
		emailAddress: primaryContact?.emailAddress ?? "",
		address: form.address.trim(),
		addressLine2: form.addressLine2.trim(),
		town: form.town.trim(),
		state: form.state,
		district: form.district,
		city: form.city,
		pincode: form.pincode,
		manager: primaryContact?.designation?.trim() || "",
		status: form.status,
		operatedBy: form.operatedBy,
		customerType: form.operatedBy === "C&F Agent" ? form.customerType : undefined,
		contacts: form.contacts,
		documents: form.documents || [],
	};
}

export function validateWarehouseForm(
	form: WarehouseFormValues,
): Record<string, string> {
	const e: Record<string, string> = {};
	if (!form.warehouseName.trim())
		e.warehouseName = "Warehouse Name is required";
	if (form.gstApplicable) {
		if (!form.gstRegistrationType.trim()) {
			e.gstRegistrationType = "Registration type is required";
		}
		if (!form.gstin.trim()) {
			e.gstin = "GSTIN is required when GST is applicable";
		} else if (!validateGSTIN(form.gstin)) {
			e.gstin = "Enter a valid 15-character GSTIN";
		}
	}
	if (form.accountNumber && form.accountNumber !== form.confirmAccountNumber) {
		e.confirmAccountNumber = "Account number mismatch";
	}
	if (form.ifscCode.trim() && !validateIFSC(form.ifscCode)) {
		e.ifscCode = "Invalid IFSC format";
	}
	if (!form.address.trim())
		e.address = "Address Line 1 is required";
	if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim()))
		e.pincode = "Enter valid 6-digit pincode";
	if (form.pincode.trim().length === 6 && !form.state.trim())
		e.state = "State is required for a valid pincode";
	if (form.pincode.trim().length === 6 && !form.city.trim())
		e.city = "City is required for a valid pincode";
	if (form.operatedBy === "C&F Agent" && !form.customerType?.trim()) {
		e.customerType = "C&F Agent is required for C&F operated warehouse.";
	}

	if (!form.contacts || form.contacts.length === 0) {
		e.contacts = "At least one contact is required";
	} else {
		form.contacts.forEach((c, index) => {
			if (!c.contactPerson.trim()) {
				e[`contactPerson_${index}`] = "Contact Person is required";
			}
			if (!c.mobileNumber.trim()) {
				e[`mobileNumber_${index}`] = "Mobile Number is required";
			} else if (!/^\d{10}$/.test(c.mobileNumber.trim())) {
				e[`mobileNumber_${index}`] = "Enter valid 10-digit number";
			}
			if (
				c.emailAddress.trim() &&
				!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.emailAddress.trim())
			) {
				e[`emailAddress_${index}`] = "Enter valid email address";
			}
		});
	}
	return e;
}

// ── Autocomplete (matches EmployeeForm AC) ────────────────────────────────────
interface ACOption {
	label: string;
	value: string;
}
function AC({
	label,
	value,
	onChange,
	options,
	placeholder,
	required,
	error,
	disabled,
	emptyMessage,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: ACOption[];
	placeholder?: string;
	required?: boolean;
	error?: string;
	disabled?: boolean;
	emptyMessage?: string;
}) {
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState("");
	const filtered = q
		? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
		: options;
	const selected = options.find((o) => o.value === value);
	return (
		<div className='space-y-1'>
			<Label className='text-xs font-medium'>
				{label}
				{required && <span className='text-red-500 ml-0.5'>*</span>}
			</Label>
			<Popover
				open={open && !disabled}
				onOpenChange={(v) => {
					if (!disabled) {
						setOpen(v);
						if (!v) setQ("");
					}
				}}
			>
				<PopoverTrigger asChild>
					<button
						type='button'
						disabled={disabled}
						className={cn(
							"w-full h-8 px-2.5 text-xs text-left border border-border rounded-lg bg-background flex items-center justify-between transition-colors",
							disabled
								? "opacity-50 cursor-not-allowed bg-muted/30"
								: "hover:bg-muted/30",
							error && "border-red-400",
						)}
					>
						<span
							className={cn(
								"truncate mr-1.5",
								selected ? "text-foreground" : "text-muted-foreground",
							)}
						>
							{selected
								? selected.label.split(" — ")[0]
								: placeholder || "Select…"}
						</span>
						<ChevronsUpDown className='w-3.5 h-3.5 text-muted-foreground flex-shrink-0' />
					</button>
				</PopoverTrigger>
				<PopoverContent
					className='w-[--radix-popover-trigger-width] min-w-[280px] p-0'
					align='start'
				>
					<div className='p-1.5 border-b border-border'>
						<Input
							placeholder='Search…'
							value={q}
							onChange={(e) => setQ(e.target.value)}
							className='text-xs h-7 focus-visible:ring-0'
							autoFocus
						/>
					</div>
					<div className='py-1 overflow-y-auto max-h-48'>
						{filtered.length === 0 ? (
							<p className='px-3 py-4 text-xs text-center whitespace-pre-line text-muted-foreground'>
								{emptyMessage || "No options"}
							</p>
						) : (
							filtered.map((opt) => (
								<button
									type='button'
									key={opt.value}
									onClick={() => {
										onChange(opt.value);
										setOpen(false);
										setQ("");
									}}
									className={cn(
										"w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors",
										selected?.value === opt.value && "bg-brand-50",
									)}
								>
									<div className='flex-1 min-w-0'>
										<span className='block truncate'>{opt.label}</span>
									</div>
									{selected?.value === opt.value && (
										<Check className='flex-shrink-0 w-3 h-3 text-brand-600' />
									)}
								</button>
							))
						)}
					</div>
				</PopoverContent>
			</Popover>
			{error && (
				<p className='flex items-center gap-1 text-[11px] text-red-500'>
					<AlertCircle className='flex-shrink-0 w-3 h-3' />
					{error}
				</p>
			)}
		</div>
	);
}

function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return (
		<p className='text-[11px] text-red-500 flex items-center gap-1 mt-1'>
			<AlertCircle className='flex-shrink-0 w-3 h-3' />
			{msg}
		</p>
	);
}

function SectionHead({
	label,
	sub,
	required,
}: {
	label: string;
	sub?: string;
	required?: boolean;
}) {
	return (
		<div className='mb-1.5'>
			<p className='flex items-center text-xs font-bold tracking-wider uppercase text-foreground'>
				{label}
				{required && <span className='ml-1 text-red-500'>*</span>}
			</p>
			{sub && <p className='text-[11px] text-muted-foreground mt-0.5'>{sub}</p>}
		</div>
	);
}

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
		<div className='relative space-y-1' ref={rootRef}>
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
						"h-8 text-xs border-border/60 pr-9",
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
			{error && <p className='text-[11px] text-red-500'>{error}</p>}
		</div>
	);
}

function DocRow({
	doc,
	readOnly,
	fileRef,
	onNameChange,
	onUpload,
	onDelete,
	onPickFile,
	onOpenFile,
	canReupload,
}: {
	doc: WarehouseDocument;
	readOnly?: boolean;
	fileRef: (el: HTMLInputElement | null) => void;
	onNameChange: (patch: {
		documentName: string;
		documentTypeId?: string;
	}) => void;
	onUpload: (file: File) => void;
	onDelete: () => void;
	onPickFile: () => void;
	onOpenFile: () => void;
	canReupload: boolean;
}) {
	return (
		<tr className='border-b border-border/40 last:border-0 hover:bg-muted/10'>
			<td className='px-3 py-2'>
				<DocumentNameField
					value={doc.documentName}
					documentTypeId={doc.documentTypeId}
					readOnly={readOnly}
					onChange={onNameChange}
				/>
			</td>
			<td className='px-3 py-2'>
				<input
					type='file'
					className='hidden'
					ref={fileRef}
					onChange={(e) => {
						const f = e.target.files?.[0];
						if (f) onUpload(f);
						e.target.value = "";
					}}
				/>
				{doc.fileName ? (
					<div className='flex items-center gap-2'>
						<button
							type='button'
							className='text-brand-600 hover:underline text-left truncate max-w-[220px]'
							onClick={onOpenFile}
						>
							{doc.fileName}
						</button>
					</div>
				) : readOnly ? (
					<span className='text-muted-foreground'>---</span>
				) : (
					<Button
						type='button'
						variant='outline'
						size='sm'
						className='h-8 text-[11px] max-w-[180px] truncate'
						onClick={onPickFile}
					>
						<Upload className='w-3 h-3 mr-1 shrink-0' />
						Choose File
					</Button>
				)}
			</td>
			<td className='px-3 py-2'>
				{!readOnly && (
					<div className='flex items-center justify-end gap-2'>
						<Button
							type='button'
							variant='outline'
							size='sm'
							className='h-7 px-2.5 text-[11px]'
							onClick={onPickFile}
							disabled={!canReupload}
						>
							Reupload
						</Button>
						<button
							type='button'
							className='p-1.5 rounded-md hover:bg-red-50 text-red-600 disabled:opacity-30'
							onClick={onDelete}
							title='Remove row'
						>
							<Trash2 className='w-3.5 h-3.5' />
						</button>
					</div>
				)}
			</td>
		</tr>
	);
}

const normalizeCustomerType = (value?: string) =>
	value?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";

const cfCustomerTypeAliases = ["cf", "cnf", "candf", "cfagent", "candfagent"];

const isCustomerCf = (customer: any) => {
	const directType = customer.customerType;
	if (!directType) return false;

	const normalizedDirect = normalizeCustomerType(directType);
	if (cfCustomerTypeAliases.includes(normalizedDirect)) return true;

	// Resolve through Customer Type Master
	try {
		const customerTypesList = loadCustomerTypes();
		const match = customerTypesList.find((ct) => {
			const typeStr = String(directType);
			return (
				typeStr === String(ct.id) ||
				typeStr.toLowerCase() === ct.customerTypeCode?.toLowerCase() ||
				typeStr.toLowerCase() === ct.customerType?.toLowerCase()
			);
		});
		if (match) {
			const normalizedMaster = normalizeCustomerType(match.customerType);
			return cfCustomerTypeAliases.includes(normalizedMaster);
		}
	} catch (e) {
		console.error("Error matching customer type master:", e);
	}
	return false;
};

export function WarehouseForm({
	form,
	onChange,
	errors,
	onClearError,
}: {
	form: WarehouseFormValues;
	onChange: (f: WarehouseFormValues) => void;
	errors: Record<string, string>;
	onClearError: (key: string) => void;
}) {
	const [toast, setToast] = useState<{
		msg: string;
		type: "success" | "error";
	} | null>(null);
	const [fetchingGst, setFetchingGst] = useState(false);

	React.useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 3200);
		return () => clearTimeout(t);
	}, [toast]);

	const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
	const [bulkDocumentTypeIds, setBulkDocumentTypeIds] = useState<string[]>([]);

	const addDocumentRow = () => {
		const incompleteIndex = (form.documents || []).findIndex(
			(doc) => !doc.documentName.trim(),
		);
		if (incompleteIndex !== -1) {
			setToast({
				msg: "Please fill the current document before adding another.",
				type: "error",
			});
			return;
		}

		set("documents", [
			...(form.documents || []),
			{
				uid: `d-${Date.now()}`,
				documentName: "",
				documentTypeId: undefined,
				file: undefined,
				fileUrl: undefined,
				uploaded: false,
				fileName: "",
				uploadedAt: "",
				size: "",
			},
		]);
	};

	const pincodeQuery = usePincode(
		/^\d{6}$/.test(form.pincode.trim()) ? form.pincode.trim() : null,
	);
	const pincodeRecords = pincodeQuery.data ?? [];

	useEffect(() => {
		if (pincodeRecords.length === 0) return;

		const first = pincodeRecords[0];

		updateWarehouseAddress({
			...warehouseAddress,
			state: first.statename || warehouseAddress.state,
			district: first.district || warehouseAddress.district,
			...(pincodeRecords.length === 1
				? { town: first.officename || warehouseAddress.town, city: first.officename || warehouseAddress.city }
				: {}),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pincodeRecords]);

	const addSelectedDocumentTypes = () => {
		if (bulkDocumentTypeIds.length === 0) return;
		const incompleteIndex = (form.documents || []).findIndex(
			(doc) => !doc.documentName.trim(),
		);
		if (incompleteIndex !== -1) {
			setToast({
				msg: "Please fill the current document before adding another.",
				type: "error",
			});
			return;
		}

		const selectedIds = Array.from(new Set(bulkDocumentTypeIds));
		const existingTypeIds = new Set(
			(form.documents || [])
				.map((doc) => doc.documentTypeId)
				.filter(Boolean) as string[],
		);
		const activeDocTypes = loadDocumentTypes().filter(
			(d) => d.status === "Active",
		);
		const nextDocuments = [...(form.documents || [])];
		let addedCount = 0;

		for (const docType of activeDocTypes) {
			if (!selectedIds.includes(docType.id)) continue;
			if (existingTypeIds.has(docType.id)) continue;

			nextDocuments.push({
				uid: `d-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
				documentName: docType.title,
				documentTypeId: docType.id,
				file: undefined,
				fileUrl: undefined,
				uploaded: false,
				fileName: "",
				uploadedAt: "",
				size: "",
			});
			existingTypeIds.add(docType.id);
			addedCount += 1;
		}

		if (addedCount === 0) {
			setToast({
				msg: "All selected document types are already added.",
				type: "error",
			});
			return;
		}

		set("documents", nextDocuments);
		setBulkDocumentTypeIds([]);
		setToast({
			msg: `${addedCount} document${addedCount === 1 ? "" : "s"} added.`,
			type: "success",
		});
	};

	const uploadDoc = (uid: string, file: File) => {
		set(
			"documents",
			(form.documents || []).map((d) => {
				if (d.uid !== uid) return d;
				if (d.fileUrl && d.fileUrl.startsWith("blob:")) {
					URL.revokeObjectURL(d.fileUrl);
				}
				return {
					...d,
					file,
					fileUrl: URL.createObjectURL(file),
					uploaded: true,
					fileName: file.name,
					uploadedAt: new Date().toISOString().slice(0, 10),
					size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
				};
			}),
		);
	};

	const updateDocument = (uid: string, patch: Partial<WarehouseDocument>) => {
		set(
			"documents",
			(form.documents || []).map((d) =>
				d.uid === uid ? { ...d, ...patch } : d,
			),
		);
	};

	const removeDocumentRow = (uid: string) => {
		const row = (form.documents || []).find((d) => d.uid === uid);
		if (row?.fileUrl && row.fileUrl.startsWith("blob:")) {
			URL.revokeObjectURL(row.fileUrl);
		}
		set(
			"documents",
			(form.documents || []).filter((d) => d.uid !== uid),
		);
	};

	const clearAllDocuments = () => {
		(form.documents || []).forEach((doc) => {
			if (doc.fileUrl && doc.fileUrl.startsWith("blob:")) {
				URL.revokeObjectURL(doc.fileUrl);
			}
		});
		set("documents", []);
		setToast({ msg: "All documents removed.", type: "success" });
	};

	const openFile = (url?: string) => {
		if (!url) return;
		const trimmedUrl = url.trim();
		if (!trimmedUrl) return;
		const isAbsolute =
			/^https?:\/\//i.test(trimmedUrl) ||
			/^blob:/i.test(trimmedUrl) ||
			/^data:/i.test(trimmedUrl);
		const safeUrl = isAbsolute ? trimmedUrl : `https://${trimmedUrl}`;
		window.open(safeUrl, "_blank", "noopener,noreferrer");
	};

	const cfDropdownQuery = useCfDropdown();

	const cfCustomers = useMemo(() => {
		const items = cfDropdownQuery.data ?? [];

		const options = items.map((customer) => {
			const suffix = (customer.mobile_no || "").trim();
			return {
				value: customer.customer_id,
				label: suffix ? `${customer.customer_name} — ${suffix}` : customer.customer_name,
			};
		});

		if (form.customerType && !options.some((o) => o.value === form.customerType)) {
			options.push({ value: form.customerType, label: form.customerType });
		}

		return options;
	}, [cfDropdownQuery.data, form.customerType]);

	const set = <K extends keyof WarehouseFormValues>(
		key: K,
		value: WarehouseFormValues[K],
	) => {
		const next = { ...form, [key]: value };
		if (key === "state") {
			next.district = "";
			next.city = "";
		}
		if (key === "district") {
			next.city = "";
		}
		if (key === "operatedBy" && value !== "C&F Agent") {
			next.customerType = "";
			if (errors.customerType) onClearError("customerType");
		}
		onChange(next);
		if (errors[key as string]) onClearError(key as string);
	};

	const updateContact = (
		index: number,
		field: keyof WarehouseContact,
		val: any,
	) => {
		const newContacts = [...form.contacts];
		newContacts[index] = { ...newContacts[index], [field]: val };
		onChange({ ...form, contacts: newContacts });
		const errKey = `${field}_${index}`;
		if (errors[errKey]) onClearError(errKey);
	};

	const addContact = () => {
		const lastContact = form.contacts[form.contacts.length - 1];
		if (
			lastContact &&
			(!lastContact.contactPerson.trim() || !lastContact.mobileNumber.trim())
		) {
			setToast({
				msg: "Please fill in the active contact details before adding another.",
				type: "error",
			});
			return;
		}
		const newId = `CON-${Date.now()}`;
		const newContacts = [
			...form.contacts,
			{
				id: newId,
				contactPerson: "",
				designation: "",
				mobileNumber: "",
				emailAddress: "",
				alternateContact: "",
				isPrimary: false,
				mobileCountryCode: "+91",
			},
		];
		onChange({ ...form, contacts: newContacts });
		setToast({ msg: "Contact added successfully.", type: "success" });
	};

	const removeContact = (index: number) => {
		if (form.contacts.length <= 1) {
			setToast({ msg: "At least one contact is required.", type: "error" });
			return;
		}
		const contactToRemove = form.contacts[index];
		if (contactToRemove.isPrimary) {
			setToast({
				msg: "Cannot remove primary contact. Mark another contact as primary first.",
				type: "error",
			});
			return;
		}
		const newContacts = form.contacts.filter((_, i) => i !== index);
		onChange({ ...form, contacts: newContacts });
		setToast({ msg: "Contact removed successfully.", type: "success" });
	};

	const setPrimaryContact = (index: number) => {
		const newContacts = form.contacts.map((c, i) => ({
			...c,
			isPrimary: i === index,
		}));
		onChange({ ...form, contacts: newContacts });
		setToast({ msg: "Primary contact updated.", type: "success" });
	};

	const [geoNodes] = useState(() =>
		typeof window !== "undefined" ? loadGeoNodes() : [],
	);
	const stateOptions = useMemo(
		() => getStateSelectOptions(geoNodes),
		[geoNodes],
	);

	const warehouseAddress = useMemo<BranchAddress>(
		() => ({
			address: form.address,
			addressLine2: form.addressLine2,
			country: "India",
			district: form.district,
			town: form.town,
			city: form.city,
			state: form.state,
			pincode: form.pincode,
		}),
		[
			form.address,
			form.addressLine2,
			form.district,
			form.town,
			form.city,
			form.state,
			form.pincode,
		],
	);

	const updateWarehouseAddress = (addr: BranchAddress) => {
		onChange({
			...form,
			address: addr.address,
			addressLine2: addr.addressLine2 ?? "",
			district: addr.district ?? "",
			town: addr.town ?? "",
			city: addr.city,
			state: addr.state,
			pincode: addr.pincode,
		});
		if (errors.address) onClearError("address");
		if (errors.pincode) onClearError("pincode");
		if (errors.state) onClearError("state");
		if (errors.city) onClearError("city");
		if (errors.town) onClearError("town");
		if (errors.district) onClearError("district");
	};

	const handleFetchGst = async () => {
		if (!form.gstin.trim()) {
			setToast({ msg: "Enter GSTIN before fetching details.", type: "error" });
			return;
		}
		if (!validateGSTIN(form.gstin)) {
			setToast({ msg: "Enter a valid 15-character GSTIN.", type: "error" });
			return;
		}
		setFetchingGst(true);
		try {
			const details = await fetchGstRegistrationDetailsAsync(form.gstin);
			if (!details) {
				setToast({ msg: "Could not fetch GST details. Check GSTIN format.", type: "error" });
				return;
			}
			onChange({
				...form,
				registeredLegalName: details.legalBusinessName || details.tradeName || "",
				registeredAddress: details.registeredAddress || "",
				warehouseName: form.warehouseName.trim() || details.tradeName || details.legalBusinessName || "",
			});
			setToast({ msg: "GST details fetched and applied.", type: "success" });
		} finally {
			setFetchingGst(false);
		}
	};

	const inputCls = (key: string) =>
		cn(
			"h-8 text-xs",
			errors[key] && "border-red-400 focus-visible:ring-red-300",
		);


	return (
		<div className='w-full space-y-3'>
			{/* ── Section 1: Basic Details ─────────────────────────── */}
			<div>
				<SectionHead
					label='Warehouse Basic Details'
					sub='Identity, classification, and operational status'
					required
				/>
				<div className='grid grid-cols-12 gap-2.5'>
					{/* Warehouse Name */}
					<div className='col-span-12 sm:col-span-4 space-y-1'>
						<Label className='text-xs font-medium'>
							Warehouse Name <span className='text-red-500'>*</span>
						</Label>
						<Input
							value={form.warehouseName}
							onChange={(e) => set("warehouseName", e.target.value)}
							placeholder='e.g., Central Distribution Hub'
							className={inputCls("warehouseName")}
						/>
						<FieldError msg={errors.warehouseName} />
					</div>

					{/* Operated By */}
					<div className='col-span-12 sm:col-span-4'>
						<AC
							label='Operated By'
							value={form.operatedBy}
							onChange={(v) => set("operatedBy", v as OperatedBy)}
							options={OPERATED_BY_OPTIONS.filter(Boolean).map((o) => ({
								value: o,
								label: o,
							}))}
							placeholder='Select operator…'
						/>
					</div>

					{/* Customer Name (Conditional) */}
					{form.operatedBy === "C&F Agent" && (
						<div className='col-span-12 sm:col-span-4 space-y-1'>
							<AC
								label='C&F Agent'
								value={form.customerType}
								onChange={(v) => set("customerType", v)}
								options={cfCustomers}
								placeholder='Select C&F Agent'
								required={form.operatedBy === "C&F Agent"}
								error={errors.customerType}
								emptyMessage='No C&F Agent found. Please add a customer with Customer Type C&F.'
							/>
							{cfCustomers.length === 0 && (
								<p className='text-[11px] text-amber-600 mt-1'>
									No C&F Agent found. Please add a customer with Customer Type
									C&F.
								</p>
							)}
						</div>
					)}
				</div>
			</div>

			{/* ── Section 2: Contact Details ────────────────────────── */}
			<div className='pt-3 border-t border-border/60'>
				<SectionHead
					label='Contact Details'
					sub='Add one or more warehouse contact persons.'
					required
				/>

				<div className='space-y-2'>
					{form.contacts.map((contact, index) => {
						const nameErr = errors[`contactPerson_${index}`];
						const mobErr = errors[`mobileNumber_${index}`];
						const emailErr = errors[`emailAddress_${index}`];

						return (
							<div
								key={contact.id}
								className='p-2.5 space-y-2 border border-border/80 bg-slate-50/50 rounded-lg'
							>
								<div className='grid items-end grid-cols-1 gap-2.5 md:grid-cols-12'>
									{/* Contact Person */}
									<div className='col-span-1 space-y-1 md:col-span-2'>
										<Label className='text-xs font-medium'>
											Contact Person <span className='text-red-500'>*</span>
										</Label>
										<Input
											value={contact.contactPerson}
											onChange={(e) =>
												updateContact(index, "contactPerson", e.target.value)
											}
											placeholder='e.g., Rajesh Kumar'
											className={cn(
												"h-8 text-xs",
												nameErr && "border-red-400 focus-visible:ring-red-300",
											)}
										/>
										<FieldError msg={nameErr} />
									</div>

									{/* Designation */}
									<div className='col-span-1 space-y-1 md:col-span-2'>
										<Label className='text-xs font-medium'>Designation</Label>
										<Input
											value={contact.designation || ""}
											onChange={(e) =>
												updateContact(index, "designation", e.target.value)
											}
											placeholder='e.g., Warehouse Manager'
											className='h-8 text-xs'
										/>
									</div>

									{/* Mobile Number */}
									<div className='col-span-1 space-y-1 md:col-span-2'>
										<Label className='text-xs font-medium'>
											Mobile Number <span className='text-red-500'>*</span>
										</Label>
										<div className='flex gap-1.5'>
											<CountryCodePicker
												value={contact.mobileCountryCode || "+91"}
												onChange={(v) =>
													updateContact(index, "mobileCountryCode", v)
												}
												hasError={!!mobErr}
											/>
											<Input
												value={contact.mobileNumber}
												onChange={(e) =>
													updateContact(
														index,
														"mobileNumber",
														e.target.value.replace(/\D/g, "").slice(0, 10),
													)
												}
												placeholder='10-digit mobile'
												className={cn(
													"flex-1 h-8 text-xs",
													mobErr && "border-red-400 focus-visible:ring-red-300",
												)}
												inputMode='numeric'
											/>
										</div>
										<FieldError msg={mobErr} />
									</div>

									{/* Email Address */}
									<div className='col-span-1 space-y-1 md:col-span-2'>
										<Label className='text-xs font-medium'>Email Address</Label>
										<Input
											value={contact.emailAddress}
											onChange={(e) =>
												updateContact(index, "emailAddress", e.target.value)
											}
											placeholder='e.g., rajesh@example.com'
											type='email'
											className={cn(
												"h-8 text-xs",
												emailErr && "border-red-400 focus-visible:ring-red-300",
											)}
										/>
										<FieldError msg={emailErr} />
									</div>

									{/* Alternate Contact */}
									<div className='col-span-1 space-y-1 md:col-span-2'>
										<Label className='text-xs font-medium'>Alternate Contact</Label>
										<Input
											value={contact.alternateContact || ""}
											onChange={(e) =>
												updateContact(
													index,
													"alternateContact",
													e.target.value.replace(/\D/g, "").slice(0, 10),
												)
											}
											placeholder='10-digit mobile'
											className='h-8 text-xs'
											inputMode='numeric'
										/>
									</div>

									{/* Primary Radio & Remove Button */}
									<div className='flex items-center col-span-1 gap-2 md:col-span-2'>
										{/* Primary Toggle */}
										<label className='inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-foreground select-none'>
											<input
												type='radio'
												name='primary-contact'
												checked={!!contact.isPrimary}
												onChange={() => setPrimaryContact(index)}
												className='h-3.5 w-3.5 rounded-full border-border text-brand-600 focus:ring-brand-500'
											/>
											<span>Primary</span>
										</label>

										{/* Remove Button */}
										{!contact.isPrimary && (
											<button
												type='button'
												onClick={() => removeContact(index)}
												className='p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 animate-in fade-in zoom-in duration-150'
												title='Remove Contact'
											>
												<XCircle className='w-4 h-4' />
											</button>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>

				<div className='mt-2'>
					<Button
						type='button'
						variant='outline'
						onClick={addContact}
						className='h-8 text-[11px] font-semibold rounded-lg gap-1 border-brand-500 text-brand-600 hover:bg-brand-50 hover:text-brand-700 transition-colors'
					>
						Add Contact
					</Button>
				</div>
			</div>

			{/* Toast */}
			{toast && (
				<div
					className={cn(
						"fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium bg-slate-900",
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

			{/* ── Section 3: Address Details ────────────────────────── */}
			<div className='pt-3 border-t border-border/60'>
				<SectionHead
					label='Address & Location Details'
					sub='Warehouse location and postal address'
				/>

				<BranchAddressFields
					address={warehouseAddress}
					onChange={updateWarehouseAddress}
					stateOptions={stateOptions}
					showDistrict
					errors={{
						address: errors.address,
						pincode: errors.pincode,
						state: errors.state,
						city: errors.city,
						town: errors.town,
						district: errors.district,
					}}
				/>
			</div>

			{/* ── Section 4: GST & Tax Details ──────────────────────── */}
			<div className='pt-3 border-t border-border/60'>
				<ErpFormSection
					title='GST & Tax Details'
					headerRight={
						<div className='ml-auto'>
							<GstRegisteredToggleControl
								label='GST Applicable'
								active={form.gstApplicable}
								onChange={(yes) => {
									onChange({
										...form,
										gstApplicable: yes,
										gstRegistrationType: yes
											? form.gstRegistrationType || GST_REGISTRATION_TYPE_DEFAULT
											: GST_REGISTRATION_TYPE_DEFAULT,
										gstin: yes ? form.gstin : "",
										registeredLegalName: yes ? form.registeredLegalName : "",
										registeredAddress: yes ? form.registeredAddress : "",
									});
									if (!yes) onClearError("gstin");
								}}
							/>
						</div>
					}
				>
					<GstRegistrationFields
						showRegisteredToggle={false}
						values={{
							gstRegistered: form.gstApplicable,
							gstRegistrationType: form.gstRegistrationType,
							gstin: form.gstin,
							registeredLegalName: form.registeredLegalName,
							registeredAddress: form.registeredAddress,
						}}
						onChange={(gst) => {
							onChange({
								...form,
								gstApplicable: gst.gstRegistered,
								gstRegistrationType: gst.gstRegistrationType,
								gstin: gst.gstin,
								registeredLegalName: gst.registeredLegalName ?? "",
								registeredAddress: gst.registeredAddress ?? "",
							});
							if (!gst.gstRegistered) onClearError("gstin");
						}}
						errors={errors}
						fetchingGst={fetchingGst}
						onFetchGst={handleFetchGst}
						inputClassName='h-8 text-xs'
					/>
				</ErpFormSection>
			</div>

			{/* ── Section 5: Bank Details ─────────────────────────── */}
			<div className='pt-3 border-t border-border/60'>
				<ErpFormSection title='Bank Details'>
					<BankDetailsFields
						values={{
							accountHolderName: form.accountHolderName,
							bankName: form.bankName,
							branch: form.branch,
							accountNumber: form.accountNumber,
							confirmAccountNumber: form.confirmAccountNumber,
							ifscCode: form.ifscCode,
							swiftCode: form.swiftCode,
						}}
						onChange={(bank) =>
							onChange({
								...form,
								...bank,
							})
						}
						errors={errors}
						inputClassName='h-8 text-xs'
					/>
				</ErpFormSection>
			</div>

			{/* ── Section 6: Documents ─────────────────────────────── */}
			<div className='pt-3 border-t border-border/60'>
				<SectionHead
					label='Warehouse Documents'
					sub='Upload related documents, GST certificates, agreements etc.'
				/>

				<div className='p-2.5 mb-2 border rounded-lg border-border bg-muted/25'>
					<div className='grid grid-cols-1 gap-2.5 md:grid-cols-[minmax(0,1fr)_auto]'>
						<div className='space-y-1'>
							<label className='text-xs font-medium text-foreground'>
								Document Types
							</label>
							<AutocompleteSelect
								options={loadDocumentTypes()
									.filter((d) => d.status === "Active")
									.map((d) => ({
										value: d.id,
										label: `${d.documentTypeCode} - ${d.title}`,
										trailing: (
											<span className='text-[10px] text-muted-foreground'>
												{d.description || "Document type"}
											</span>
										),
									}))}
								value={bulkDocumentTypeIds}
								onChange={(val) =>
									setBulkDocumentTypeIds(
										Array.isArray(val) ? val.map(String) : [],
									)
								}
								multiple
								placeholder='Search or select document types...'
								searchPlaceholder='Search document type...'
								className='h-8 text-xs font-normal bg-white'
								renderTriggerLabel={(selected) => {
									if (!Array.isArray(selected) || selected.length === 0) {
										return "Search or select document types...";
									}
									if (selected.length === 1) {
										return selected[0].label;
									}
									return `${selected.length} document types selected`;
								}}
							/>
						</div>
						<div className='flex items-end'>
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-8 gap-1.5 text-xs border-dashed bg-white'
								disabled={bulkDocumentTypeIds.length === 0}
								onClick={addSelectedDocumentTypes}
							>
								<Plus className='w-3.5 h-3.5 mr-1' /> Add Selected
							</Button>
						</div>
					</div>
				</div>

				<div className='overflow-x-auto bg-white border rounded-lg border-border/50'>
					<table className='w-full text-xs min-w-[640px]'>
						<thead>
							<tr className='text-left border-b bg-muted/25 border-border/50 text-muted-foreground'>
								<th className='px-3 py-2 font-medium'>Document Name</th>
								<th className='px-3 py-2 font-medium'>Upload File</th>
								<th className='px-3 py-2 text-right w-36' />
							</tr>
						</thead>
						<tbody>
							{(form.documents || []).length === 0 ? (
								<tr>
									<td
										colSpan={3}
										className='px-3 py-6 text-xs text-center text-muted-foreground'
									>
										No documents added yet. Select a document type above or
										click "Add Manual Document".
									</td>
								</tr>
							) : (
								form.documents.map((doc) => (
									<DocRow
										key={doc.uid}
										doc={doc}
										fileRef={(el) => {
											fileRefs.current[doc.uid] = el;
										}}
										onNameChange={(patch) => updateDocument(doc.uid, patch)}
										onUpload={(file) => uploadDoc(doc.uid, file)}
										onDelete={() => removeDocumentRow(doc.uid)}
										onPickFile={() => {
											fileRefs.current[doc.uid]?.click();
										}}
										onOpenFile={() => openFile(doc.fileUrl)}
										canReupload={
											!!doc.fileName || !!doc.fileUrl || !!doc.uploaded
										}
									/>
								))
							)}
						</tbody>
					</table>
				</div>

				<div className='mt-2.5 flex flex-wrap gap-2'>
					<Button
						type='button'
						variant='outline'
						size='sm'
						className='h-8 text-xs bg-white border-dashed'
						onClick={addDocumentRow}
					>
						<Plus className='w-3.5 h-3.5 mr-1' /> Add Manual Document
					</Button>
					{(form.documents || []).length > 0 && (
						<Button
							type='button'
							variant='outline'
							size='sm'
							className='h-8 text-xs text-red-600 bg-white border-red-200 hover:bg-red-50 hover:text-red-700'
							onClick={clearAllDocuments}
						>
							<Trash2 className='w-3.5 h-3.5 mr-1' /> Remove All
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
