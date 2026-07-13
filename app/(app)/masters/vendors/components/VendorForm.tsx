"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
	Plus,
	Trash2,
	Upload,
	RefreshCw,
	Check,
	ChevronDown,
	Loader2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	type VendorFormValues,
	type VendorContact,
	type VendorDocument,
	emptyContact,
	todayStr,
} from "../vendor-data";
// import { loadActiveVendorTypeOptions } from "../../vendor-type/vendor-type-data";
// import { PaymentTermsFields } from "@/components/masters/erp/PaymentTermsFields";
// import { getActiveTDSMasters, toTdsSelectOptions } from "../../tds/tds-data";
import { SearchableSelect } from "../../customers/components/SearchableSelect";
import { loadGeoNodes, getStateSelectOptions } from "../../geography/geo-data";
import { loadDocumentTypes } from "../../document-types/document-type-data";
// import { PhoneInput } from "@/components/ui/PhoneInput";
import { cn } from "@/lib/utils";
// import {
// 	Select,
// 	SelectContent,
// 	SelectItem,
// 	SelectTrigger,
// 	SelectValue,
// } from "@/components/ui/select";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { GstRegistrationFields, GstRegisteredToggleControl } from "@/components/masters/GstRegistrationFields";
import { ComplianceCertificationsGrid } from "@/components/masters/erp/ComplianceCertificationsGrid";
import { ErpFormSection } from "@/components/masters/erp/ErpFormSection";
import { BranchAddressFields } from "@/components/masters/erp/BranchAddressFields";
import { ERP } from "@/components/masters/erp/erp-form-styles";
import { ListingStatusToggle } from "@/components/listing";
import { Label } from "@/components/ui/label";
import {
	buildGstCategory,
	deriveGstRegistrationType,
	fetchGstRegistrationDetailsAsync,
	gstApplicableFromCategory,
	gstDetailsToAddressSnapshot,
	GST_REGISTRATION_TYPE_DEFAULT,
	validateGSTIN,
	type GstAddressSnapshot,
} from "@/lib/masters/gst-compliance";

import {
	Field,
	SectionDivider,
	VendorTabBar,
	fieldClass,
} from "./VendorFormLayout";
import { useDropdownSupplierTypes, useTdsDropdown, usePincode, useSupplierPreviewNumber } from "@/hooks/masters";
import { PaymentTermsFields } from "@/components/masters/erp/PaymentTermsFields";

const ALL_TABS = [
	{ id: "basic", label: "Basic Details" },
	{ id: "contact", label: "Contact Information" },
	{ id: "banking", label: "Bank & Commercial" },
	{ id: "documents", label: "Documents & Remarks" },
] as const;

type TabId = (typeof ALL_TABS)[number]["id"];

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

function MobileRow({
	countryCode,
	mobile,
	onCountryCode,
	onMobile,
	disabled,
	hasError,
}: {
	countryCode: string;
	mobile: string;
	onCountryCode: (v: string) => void;
	onMobile: (v: string) => void;
	disabled?: boolean;
	hasError?: boolean;
}) {
	return (
		<div className='flex gap-1.5 flex-1'>
			<CountryCodePicker
				value={countryCode || "+91"}
				onChange={onCountryCode}
				disabled={disabled}
				hasError={hasError}
			/>
			<Input
				value={mobile}
				onChange={(e) => onMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
				placeholder='10-digit mobile'
				className={cn("flex-1 h-8 text-xs", hasError && "border-red-400 focus-visible:ring-red-300")}
				inputMode='numeric'
				disabled={disabled}
			/>
		</div>
	);
}

function Toast({
	msg,
	type,
	onDismiss,
}: {
	msg: string;
	type: "success" | "error";
	onDismiss: () => void;
}) {
	return (
		<div
			className={`fixed top-5 right-5 z-[100] px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${type === "success" ? "bg-emerald-600" : "bg-red-600"
				}`}
		>
			{msg}
			<button type='button' className='ml-3 opacity-80' onClick={onDismiss}>
				×
			</button>
		</div>
	);
}
export function VendorForm({
	form,
	onChange,
	readOnly,
	vendorCode,
}: {
	form: VendorFormValues;
	onChange: (f: VendorFormValues) => void;
	readOnly?: boolean;
	/** Auto-generated code preview (add) or stored code (edit). */
	vendorCode?: string;
}) {
	const [tab, setTab] = useState<TabId>("basic");
	const [fetchingGst, setFetchingGst] = useState(false);
	const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
	const [bulkDocumentTypeIds, setBulkDocumentTypeIds] = useState<string[]>([]);
	const [toast, setToast] = useState<{
		msg: string;
		type: "success" | "error";
	} | null>(null);
	const [gstAddressSnapshot, setGstAddressSnapshot] =
		useState<GstAddressSnapshot | null>(null);

	const [geoNodes, setGeoNodes] = useState<ReturnType<typeof loadGeoNodes>>([]);

	useEffect(() => {
		setGeoNodes(loadGeoNodes());
	}, []);

	const gstRegistered = form.gstRegistered;

	const { data: supplierTypeData = [], isLoading: loadingSupplierTypes } =
		useDropdownSupplierTypes();
	const supplierTypeOptions = useMemo(
		() =>
			(supplierTypeData ?? []).map((item) => ({
				value: item.supplier_type_id,
				label: item.supplierTypeName,
			})),
		[supplierTypeData],
	);
	const { data: tdsData, isLoading: loadingTds } = useTdsDropdown();
	const tdsOptions = useMemo(
		() =>
			(tdsData ?? []).map((item) => ({
				value: item.tdsUuid,
				label: item.sectionCode,
			})),
		[tdsData],
	);

	const pincodeValue = form.billingAddress.pincode?.trim();
	const isCompletePincode = !!pincodeValue && pincodeValue.length === 6;
	const {
		data: pincodeResult,
		isFetching: fetchingPincode,
		isError: pincodeError,
	} = usePincode(isCompletePincode ? pincodeValue : null);

	useEffect(() => {
		if (!pincodeResult || pincodeResult.length === 0) return;
		const match = pincodeResult[0];
		set("billingAddress", {
			...form.billingAddress,
			pincodeId: match.id,
			// city: match.officename || form.billingAddress.city,
			state: match.statename || form.billingAddress.state,
			district: match.district || form.billingAddress.district,
		} as typeof form.billingAddress);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pincodeResult]);

	const stateOptions = useMemo(
		() => getStateSelectOptions(geoNodes),
		[geoNodes],
	);

	const showToast = (msg: string, type: "success" | "error" = "error") => {
		setToast({ msg, type });
	};

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 3000);
		return () => clearTimeout(t);
	}, [toast]);

	const set = <K extends keyof VendorFormValues>(
		k: K,
		v: VendorFormValues[K],
	) => onChange({ ...form, [k]: v });

	const inputCls = cn(
		ERP.input,
		"border-border/70 rounded-md bg-white shadow-none focus-visible:ring-1 focus-visible:ring-brand-500/30",
	);
	const bankFieldClass = inputCls;

	const billingAsBranch = useMemo(
		() => ({
			address: form.billingAddress.line1,
			addressLine2: form.billingAddress.line2,
			country: form.billingAddress.country || "India",
			city: form.billingAddress.city,
			town: form.billingAddress.town ?? "",
			district: form.billingAddress.district ?? "",
			state: form.billingAddress.state,
			pincode: form.billingAddress.pincode,
		}),
		[form.billingAddress],
	);

	const setBillingFromBranch = (addr: {
		address: string;
		addressLine2?: string;
		country?: string;
		city: string;
		town?: string;
		district?: string;
		state: string;
		pincode: string;
	}) => {
		set("billingAddress", {
			...form.billingAddress,
			line1: addr.address,
			line2: addr.addressLine2 ?? "",
			country: addr.country ?? "India",
			city: addr.city,
			town: addr.town ?? "",
			district: addr.district ?? "",
			state: addr.state,
			pincode: addr.pincode,
		});
	};

	const handleFetchGst = async () => {
		if (readOnly) return;
		if (!form.gstNumber.trim()) {
			showToast("Enter GSTIN before fetching details.");
			return;
		}
		if (!validateGSTIN(form.gstNumber)) {
			showToast("Enter a valid 15-character GSTIN.");
			return;
		}
		setFetchingGst(true);
		try {
			const details = await fetchGstRegistrationDetailsAsync(form.gstNumber);
			if (!details) {
				showToast("Could not fetch GST details. Check GSTIN format.");
				return;
			}
			const snap = gstDetailsToAddressSnapshot(details);
			setGstAddressSnapshot(snap);
			const displayName = details.tradeName || details.legalBusinessName;
			onChange({
				...form,
				vendorName: form.vendorName.trim() || displayName,
				companyName: form.companyName.trim() || displayName,
				legalCompanyName: details.legalBusinessName,
				panNumber: form.panNumber.trim() || form.gstNumber.trim().slice(2, 12),
				billingAddress: {
					...form.billingAddress,
					line1: snap.address,
					city: snap.city,
					state: snap.state,
					pincode: snap.pincode,
					country: form.billingAddress.country || "India",
				},
			});
			showToast("GST details fetched and applied.", "success");
		} finally {
			setFetchingGst(false);
		}
	};

	const updateContact = (uid: string, patch: Partial<VendorContact>) => {
		set(
			"contacts",
			form.contacts.map((c) => (c.uid === uid ? { ...c, ...patch } : c)),
		);
	};

	const addContact = () => {
		const lastContact = form.contacts[form.contacts.length - 1];
		if (lastContact && !lastContact.name.trim()) {
			showToast(
				"Please fill the details of the current contact before adding another one.",
			);
			return;
		}
		set("contacts", [...form.contacts, emptyContact()]);
	};
	const removeContact = (uid: string) => {
		if (form.contacts.length <= 1) return;
		set(
			"contacts",
			form.contacts.filter((c) => c.uid !== uid),
		);
	};

	const addSelectedDocumentTypes = () => {
		if (bulkDocumentTypeIds.length === 0) return;

		const selectedIds = Array.from(new Set(bulkDocumentTypeIds));
		const existingTypeIds = new Set(
			form.documents.map((doc) => doc.documentTypeId).filter(Boolean) as string[],
		);
		const activeDocTypes = loadDocumentTypes().filter((d) => d.status === "Active");
		const nextDocuments = [...form.documents];
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
			showToast("All selected document types are already added.");
			return;
		}

		set("documents", nextDocuments);
		setBulkDocumentTypeIds([]);
		showToast(`${addedCount} document${addedCount === 1 ? "" : "s"} added.`, "success");
	};

	const uploadDoc = (uid: string, file: File) => {
		set(
			"documents",
			form.documents.map((d) => {
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
					uploadedAt: todayStr(),
					size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
				};
			}),
		);
	};

	const removeDocumentRow = (uid: string) => {
		const row = form.documents.find((d) => d.uid === uid);
		if (row?.fileUrl && row.fileUrl.startsWith("blob:")) {
			URL.revokeObjectURL(row.fileUrl);
		}
		set(
			"documents",
			form.documents.filter((d) => d.uid !== uid),
		);
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

	return (
		<div className='shadow-sm min-w-0 max-w-full overflow-x-hidden'>
			<VendorTabBar
				tabs={ALL_TABS}
				active={tab}
				onChange={(id) => setTab(id as TabId)}
			/>

			<div className='px-4 py-4 bg-white border border-t-0 rounded-b-lg border-border/60 md:px-5 md:py-4'>
				{tab === "basic" && (
					<div className={ERP.sectionGap}>
						<ErpFormSection title='Basic Information'>
							<div className={ERP.sectionGap}>
								<div className={ERP.grid3}>
									<div className={ERP.field}>
										<Label className={ERP.label}>
											Supplier Type <span className='text-red-500'>*</span>
										</Label>
										<AutocompleteSelect
											disabled={readOnly || loadingSupplierTypes}
											value={form.vendorType}
											onChange={(value) => set("vendorType", String(value))}
											options={supplierTypeOptions}
											placeholder={
												loadingSupplierTypes ? "Loading supplier types…" : "Select supplier type..."
											}
											className={inputCls}
										/>
									</div>
									<div className={ERP.field}>
										<Label className={ERP.label}>Supplier Code</Label>
										<Input
											value={
												vendorCode ||
												(form.vendorType ? "Generating…" : "Select type first")
											}
											readOnly
											disabled
											className='h-8 text-xs font-mono bg-muted/30 cursor-not-allowed'
										/>
									</div>
									<div className={ERP.field}>
										<Label className={ERP.label}>
											Supplier Name <span className='text-red-500'>*</span>
										</Label>
										<Input
											disabled={readOnly}
											value={form.vendorName}
											onChange={(e) => set("vendorName", e.target.value)}
											className={inputCls}
											placeholder='Trade / display name'
										/>
									</div>
								</div>

								<div className={ERP.grid3}>
									<div className={ERP.field}>
										<Label className={ERP.label}>Contact Person</Label>
										<Input
											disabled={readOnly}
											value={form.contactPerson}
											onChange={(e) => set("contactPerson", e.target.value)}
											className={inputCls}
											placeholder='Primary contact name'
										/>
									</div>
									<div className={ERP.field}>
										<Label className={ERP.label}>Mobile Number</Label>
										<MobileRow
											countryCode={form.mobileCountryCode}
											mobile={form.mobile}
											onCountryCode={(v) => set("mobileCountryCode", v)}
											onMobile={(v) => set("mobile", v)}
											disabled={readOnly}
										/>
									</div>
									<div className={ERP.field}>
										<Label className={ERP.label}>Email Address</Label>
										<Input
											type='email'
											disabled={readOnly}
											value={form.email}
											onChange={(e) => set("email", e.target.value)}
											className={inputCls}
											placeholder='vendor@company.com'
										/>
									</div>
								</div>
							</div>
						</ErpFormSection>

						<ErpFormSection
							title='GST & Tax Registration'
							headerRight={
								<GstRegisteredToggleControl
									active={form.gstRegistered}
									readOnly={readOnly}
									onChange={(yes) => {
										const gstRegistrationType = yes
											? form.gstRegistrationType || GST_REGISTRATION_TYPE_DEFAULT
											: GST_REGISTRATION_TYPE_DEFAULT;
										const gstCategory = buildGstCategory(yes, gstRegistrationType);
										onChange({
											...form,
											gstRegistered: yes,
											gstRegistrationType,
											gstNumber: yes ? form.gstNumber : "",
											gstCategory,
											gstApplicable: gstApplicableFromCategory(gstCategory),
										});
									}}
								/>
							}
						>
							<GstRegistrationFields
								showRegisteredToggle={false}
								namePrefix='vendor'
								values={{
									gstRegistered: form.gstRegistered,
									gstRegistrationType: form.gstRegistrationType,
									gstin: form.gstNumber,
								}}
								onChange={(gst) => {
									const gstCategory = buildGstCategory(
										gst.gstRegistered,
										gst.gstRegistrationType,
									);
									onChange({
										...form,
										gstRegistered: gst.gstRegistered,
										gstRegistrationType: gst.gstRegistrationType,
										gstNumber: gst.gstin,
										gstCategory,
										gstApplicable: gstApplicableFromCategory(gstCategory),
									});
								}}
								readOnly={readOnly}
								fetchingGst={fetchingGst}
								onFetchGst={handleFetchGst}
								inputClassName={inputCls}
								footer={
									<div
										className={cn(
											"space-y-2",
											form.gstRegistered ? "pt-1.5 border-t border-border/50" : "",
										)}
									>
										<div className={ERP.grid2}>
											<div className={ERP.field}>
												<Label className={ERP.label}>
													PAN Number <span className='text-red-500'>*</span>
												</Label>
												<Input
													disabled={readOnly}
													value={form.panNumber}
													onChange={(e) =>
														set("panNumber", e.target.value.toUpperCase())
													}
													className={cn(inputCls, "font-mono uppercase")}
													maxLength={10}
													placeholder='ABCDE1234F'
												/>
											</div>
											<div className={ERP.field}>
												<Label className={ERP.label}>TAN Number</Label>
												<Input
													disabled={readOnly}
													value={form.tanNumber}
													onChange={(e) =>
														set("tanNumber", e.target.value.toUpperCase())
													}
													className={cn(inputCls, "font-mono uppercase")}
													maxLength={10}
													placeholder='AAAA99999A'
												/>
											</div>
										</div>
										<div className="flex flex-wrap items-end gap-3">
											<div className={ERP.field}>
												<Label className={ERP.label}>TDS Applicable</Label>
												<div className='flex h-8 items-center'>
													<ListingStatusToggle
														active={form.tdsApplicable}
														onChange={(yes) =>
															!readOnly &&
															onChange({
																...form,
																tdsApplicable: yes,
																tdsMasterId: yes ? form.tdsMasterId : "",
															})
														}
														disabled={readOnly}
													/>
												</div>
											</div>
											{form.tdsApplicable ? (
												<div className={cn(ERP.field, "min-w-[200px] flex-1")}>
													<Label className={ERP.label}>
														TDS Section <span className='text-red-500'>*</span>
													</Label>
													<SearchableSelect
														value={form.tdsMasterId}
														onChange={(value) => set("tdsMasterId", value)}
														options={tdsOptions}
														placeholder={loadingTds ? "Loading TDS sections…" : "Select TDS..."}
														disabled={readOnly || loadingTds}
													/>
												</div>
											) : null}
										</div>
									</div>
								}
							/>
						</ErpFormSection>

						<ErpFormSection title='Compliance & Certifications' bodyClassName='p-2'>
							<ComplianceCertificationsGrid
								rows={["msme"]}
								values={{
									msmeRegistered: form.msmeRegistered,
									msmeNumber: form.msmeNumber,
									fssaiRegistered: false,
									fssai: "",
									cibRegistered: false,
									cibRegn: "",
									fcoRegistered: false,
									fcoRegn: "",
								}}
								onChange={(compliance) =>
									onChange({
										...form,
										msmeRegistered: compliance.msmeRegistered,
										msmeNumber: compliance.msmeNumber,
									})
								}
								readOnly={readOnly}
							/>
						</ErpFormSection>

						{/* <ErpFormSection title='Registered Address'>
							<BranchAddressFields
								address={billingAsBranch}
								onChange={setBillingFromBranch}
								readOnly={readOnly}
								stateOptions={stateOptions}
							/>
						</ErpFormSection> */}
						<ErpFormSection
							title='Registered Address'
							headerRight={
								isCompletePincode ? (
									fetchingPincode ? (
										<span className='flex items-center gap-1 text-[11px] text-muted-foreground'>
											<Loader2 className='w-3 h-3 animate-spin' /> Looking up pincode…
										</span>
									) : pincodeError || (pincodeResult && pincodeResult.length === 0) ? (
										<span className='text-[11px] text-red-600'>Pincode not found</span>
									) : pincodeResult && pincodeResult.length > 0 ? (
										<span className='flex items-center gap-1 text-[11px] text-emerald-600'>
											<Check className='w-3 h-3' /> Pincode matched
										</span>
									) : null
								) : null
							}
						>
							<BranchAddressFields
								address={billingAsBranch}
								onChange={setBillingFromBranch}
								readOnly={readOnly}
								stateOptions={stateOptions}
							/>
						</ErpFormSection>
					</div>
				)}

				{tab === "contact" && (
					<div className='w-full space-y-3'>
						<SectionDivider
							title='Contact Persons'
							subtitle='Primary and additional contacts'
						/>
						{form.contacts.map((c, idx) => (
							<div
								key={c.uid}
								className={cn(
									"rounded-lg border border-border/50 p-3.5",
									idx === 0 && "border-brand-200/80 bg-brand-50/20",
								)}
							>
								{idx === 0 && (
									<p className='text-[10px] font-semibold uppercase tracking-wider text-brand-600 mb-2.5'>
										Primary Contact
									</p>
								)}
								<div className='grid items-end grid-cols-1 gap-3 md:grid-cols-12'>
									<Field
										label='Contact Person Name'
										className='col-span-1 md:col-span-2'
									>
										<Input
											disabled={readOnly}
											value={c.name}
											onChange={(e) =>
												updateContact(c.uid, { name: e.target.value })
											}
											className={fieldClass}
											placeholder='e.g. Rajesh Kumar'
										/>
									</Field>
									<Field
										label='Designation'
										className='col-span-1 md:col-span-2'
									>
										<Input
											disabled={readOnly}
											value={c.designation}
											onChange={(e) =>
												updateContact(c.uid, { designation: e.target.value })
											}
											className={fieldClass}
											placeholder='e.g. Account Manager'
										/>
									</Field>
									<Field
										label='Mobile Number'
										className='col-span-1 md:col-span-3'
									>
										<MobileRow
											countryCode={c.countryCode}
											mobile={c.mobile}
											onCountryCode={(v) =>
												updateContact(c.uid, { countryCode: v })
											}
											onMobile={(v) => updateContact(c.uid, { mobile: v })}
											disabled={readOnly}
										/>
									</Field>
									<Field label='Email ID' className='col-span-1 md:col-span-3'>
										<Input
											type='email'
											disabled={readOnly}
											value={c.email}
											onChange={(e) =>
												updateContact(c.uid, { email: e.target.value })
											}
											className={fieldClass}
											placeholder='e.g. rajesh@company.com'
										/>
									</Field>
									{!readOnly && form.contacts.length > 1 && (
										<div className='flex items-end justify-start col-span-1 pb-1 md:col-span-1 md:justify-center'>
											<Button
												type='button'
												variant='ghost'
												size='sm'
												className='h-8 px-2 text-red-600 animate-none'
												onClick={() => removeContact(c.uid)}
											>
												<Trash2 className='w-3.5 h-3.5' />
											</Button>
										</div>
									)}
								</div>
							</div>
						))}
						{!readOnly && (
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-8 text-xs border-dashed'
								onClick={addContact}
							>
								<Plus className='w-3.5 h-3.5 mr-1' /> Add Contact Person
							</Button>
						)}
					</div>
				)}

				{tab === "banking" && (
					<div className={ERP.sectionGap}>
						<ErpFormSection title='Payment Terms'>
							<PaymentTermsFields
								values={{
									paymentType: form.paymentType,
									creditDays: form.creditDays,
									advancePercentage: form.advancePercentage,
								}}
								onChange={(patch) => onChange({ ...form, ...patch })}
								readOnly={readOnly}
								inputClassName={bankFieldClass}
							/>
						</ErpFormSection>

						<ErpFormSection title='Bank Details'>
							<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'>
								<div className={ERP.field}>
									<Label className={ERP.label}>Account Holder Name</Label>
									<Input
										disabled={readOnly}
										value={form.accountHolderName}
										onChange={(e) => set("accountHolderName", e.target.value)}
										className={bankFieldClass}
									/>
								</div>
								<div className={ERP.field}>
									<Label className={ERP.label}>Bank Name</Label>
									<Input
										disabled={readOnly}
										value={form.bankName}
										onChange={(e) => set("bankName", e.target.value)}
										className={bankFieldClass}
									/>
								</div>
								<div className={ERP.field}>
									<Label className={ERP.label}>Branch Name</Label>
									<Input
										disabled={readOnly}
										value={form.branch}
										onChange={(e) => set("branch", e.target.value)}
										className={bankFieldClass}
									/>
								</div>
								<div className={ERP.field}>
									<Label className={ERP.label}>Account Number</Label>
									<Input
										disabled={readOnly}
										value={form.accountNumber}
										onChange={(e) => set("accountNumber", e.target.value)}
										className={cn(bankFieldClass, "font-mono")}
									/>
								</div>
								<div className={ERP.field}>
									<Label className={ERP.label}>Confirm Account Number</Label>
									<Input
										disabled={readOnly}
										value={form.confirmAccountNumber}
										onChange={(e) => set("confirmAccountNumber", e.target.value)}
										className={cn(bankFieldClass, "font-mono")}
									/>
								</div>
								<div className={ERP.field}>
									<Label className={ERP.label}>IFSC Code</Label>
									<Input
										disabled={readOnly}
										value={form.ifscCode}
										onChange={(e) =>
											set("ifscCode", e.target.value.toUpperCase())
										}
										className={cn(bankFieldClass, "font-mono uppercase")}
									/>
								</div>
								<div className={ERP.field}>
									<Label className={ERP.label}>SWIFT Code</Label>
									<Input
										disabled={readOnly}
										value={form.swiftCode}
										onChange={(e) => set("swiftCode", e.target.value.toUpperCase())}
										className={cn(bankFieldClass, "font-mono uppercase")}
										placeholder='Optional'
									/>
								</div>
							</div>
						</ErpFormSection>
					</div>
				)}

				{tab === "documents" && (
					<div className='w-full space-y-4'>
						<section>
							<SectionDivider title='Documents' required />
							{!readOnly && (
								<div className='p-3 mb-3 border rounded-lg border-border bg-muted/20'>
									<div className='grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]'>
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
												className='h-8 text-xs font-normal'
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
											{bulkDocumentTypeIds.length > 0 && (
												<div className='flex flex-wrap gap-2 pt-2'>
													{bulkDocumentTypeIds.map((id) => {
														const docType = loadDocumentTypes().find((d) => d.id === id);
														return (
															<span
																key={id}
																className='inline-flex items-center gap-2 rounded-full border border-border bg-white px-2.5 py-1 text-[11px] text-foreground'
															>
																<span className='max-w-[220px] truncate'>
																	{docType ? docType.title : id}
																</span>
																<button
																	type='button'
																	onClick={() =>
																		setBulkDocumentTypeIds((prev) =>
																			prev.filter((item) => item !== id),
																		)
																	}
																	className='text-muted-foreground hover:text-red-600'
																	aria-label={`Remove ${docType ? docType.title : id}`}
																>
																	<Trash2 className='w-3 h-3' />
																</button>
															</span>
														);
													})}
												</div>
											)}
										</div>
										<div className='flex items-end'>
											<Button
												type='button'
												variant='outline'
												size='sm'
												className='h-8 gap-1.5 text-xs border-dashed'
												disabled={bulkDocumentTypeIds.length === 0}
												onClick={addSelectedDocumentTypes}
											>
												<Plus className='w-3.5 h-3.5 mr-1' /> Add Selected
											</Button>
										</div>
									</div>
								</div>
							)}
							{form.documents.length === 0 ? (
								<div className='rounded-lg border border-dashed border-border/60 px-4 py-6 text-center'>
									<p className='text-xs text-muted-foreground'>
										Select document types above and click Add Selected to upload files.
									</p>
								</div>
							) : (
								<div className='overflow-x-auto border rounded-lg border-border/50'>
									<table className='w-full text-xs min-w-[640px]'>
										<thead>
											<tr className='text-left border-b bg-muted/25 border-border/50 text-muted-foreground'>
												<th className='px-3 py-2 font-medium'>Document Name</th>
												<th className='px-3 py-2 font-medium'>Upload File</th>
												<th className='px-3 py-2 text-right w-36' />
											</tr>
										</thead>
										<tbody>
											{form.documents.map((doc) => (
												<DocRow
													key={doc.uid}
													doc={doc}
													readOnly={readOnly}
													fileRef={(el) => {
														fileRefs.current[doc.uid] = el;
													}}
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
											))}
										</tbody>
									</table>
								</div>
							)}
						</section>

						<section>
							<SectionDivider title='Remarks' />
							<Textarea
								disabled={readOnly}
								value={form.remarks}
								onChange={(e) => set("remarks", e.target.value)}
								placeholder='Internal notes about this supplier…'
								className='min-h-[80px] text-sm resize-none rounded-lg border-border/70'
							/>
						</section>
					</div>
				)}
			</div>
			{toast && (
				<Toast
					msg={toast.msg}
					type={toast.type}
					onDismiss={() => setToast(null)}
				/>
			)}
		</div>
	);
}

function DocRow({
	doc,
	readOnly,
	fileRef,
	onUpload,
	onDelete,
	onPickFile,
	onOpenFile,
	canReupload,
}: {
	doc: VendorDocument;
	readOnly?: boolean;
	fileRef: (el: HTMLInputElement | null) => void;
	onUpload: (file: File) => void;
	onDelete: () => void;
	onPickFile: () => void;
	onOpenFile: () => void;
	canReupload: boolean;
}) {
	return (
		<tr className='border-b border-border/40 last:border-0 hover:bg-muted/10'>
			<td className='px-3 py-2'>
				<span className='text-xs font-medium text-foreground'>
					{doc.documentName || "—"}
				</span>
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
