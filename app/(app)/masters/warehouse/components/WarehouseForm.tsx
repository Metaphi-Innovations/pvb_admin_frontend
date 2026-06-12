"use client";

import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { cn } from "@/lib/utils";
import { AlertCircle, ChevronsUpDown, Check, XCircle, ChevronDown } from "lucide-react";
import {
	WAREHOUSE_TYPES,
	WAREHOUSE_STATUSES,
	OPERATED_BY_OPTIONS,
	STATE_OPTIONS,
	MANAGER_OPTIONS,
	getDistrictsForState,
	getCitiesForDistrict,
	type WarehouseType,
	type WarehouseStatus,
	type OperatedBy,
	type WarehouseContact,
} from "../warehouse-data";
import { loadCustomers } from "../../customers/customer-data";
import { loadCustomerTypes } from "../../customer-types/customer-type-data";

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
	warehouseType: WarehouseType;
	gstNumber: string;
	address: string;
	state: string;
	district: string;
	city: string;
	pincode: string;
	capacity: string;
	manager: string;
	status: WarehouseStatus;
	operatedBy: OperatedBy;
	customerType: string;
	contacts: WarehouseContact[];
}

export const INITIAL_FORM: WarehouseFormValues = {
	warehouseName: "",
	warehouseType: "Central Warehouse",
	gstNumber: "",
	address: "",
	state: "",
	district: "",
	city: "",
	pincode: "",
	capacity: "",
	manager: "",
	status: "active",
	operatedBy: "Self",
	customerType: "",
	contacts: [
		{
			id: "CON-1",
			contactPerson: "",
			mobileNumber: "",
			emailAddress: "",
			isPrimary: true,
			mobileCountryCode: "+91",
		},
	],
};

function validateWarehouseGST(v: string): boolean {
	return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
		v.trim().toUpperCase(),
	);
}

export function validateWarehouseForm(
	form: WarehouseFormValues,
): Record<string, string> {
	const e: Record<string, string> = {};
	if (!form.warehouseName.trim())
		e.warehouseName = "Warehouse Name is required";
	if (form.gstNumber.trim() && !validateWarehouseGST(form.gstNumber))
		e.gstNumber = "Enter a valid GST number";
	if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim()))
		e.pincode = "Enter valid 6-digit pincode";
	if (form.operatedBy === "C&F Agent" && !form.customerType?.trim()) {
		e.customerType = "Customer name is required for C&F operated warehouse.";
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
								selected ? "text-foreground" : "text-muted-foreground"
							)}
						>
							{selected ? selected.label.split(" — ")[0] : (placeholder || "Select…")}
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
		const match = customerTypesList.find(ct => {
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
	warehouseCode,
}: {
	form: WarehouseFormValues;
	onChange: (f: WarehouseFormValues) => void;
	errors: Record<string, string>;
	onClearError: (key: string) => void;
	warehouseCode: string;
}) {
	const [toast, setToast] = useState<{
		msg: string;
		type: "success" | "error";
	} | null>(null);

	React.useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 3200);
		return () => clearTimeout(t);
	}, [toast]);

	const cfCustomers = useMemo(() => {
		try {
			const allCustomers = loadCustomers();
			const filtered = allCustomers.filter((customer) => {
				// Always include currently selected customer so it shows and prefills
				if (form.customerType && customer.customerName === form.customerType) {
					return true;
				}
				return isCustomerCf(customer);
			});

			const options = filtered.map((customer) => {
				const suffix = (customer.mobile || "").trim() || (customer.gstin || "").trim();
				return {
					value: customer.customerName,
					label: suffix ? `${customer.customerName} — ${suffix}` : customer.customerName,
				};
			});

			// If the currently selected customer is not in the list, force add it
			if (form.customerType && !options.some((o) => o.value === form.customerType)) {
				options.push({
					value: form.customerType,
					label: form.customerType,
				});
			}

			return options;
		} catch (e) {
			console.error("Failed to load C&F customers:", e);
			return [];
		}
	}, [form.customerType]);

	const set = (key: keyof WarehouseFormValues, value: string | boolean) => {
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
		if (errors[key]) onClearError(key);
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
				mobileNumber: "",
				emailAddress: "",
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

	const districts = getDistrictsForState(form.state);
	const cities = getCitiesForDistrict(form.district);

	const inputCls = (key: string) =>
		cn(
			"h-8 text-xs",
			errors[key] && "border-red-400 focus-visible:ring-red-300",
		);

	return (
		<div className='w-full space-y-5'>
			{/* ── Section 1: Basic Details ─────────────────────────── */}
			<div>
				<SectionHead
					label='Warehouse Basic Details'
					sub='Identity, classification, and operational status'
				/>
				<div className='grid grid-cols-12 gap-3'>
					{/* Warehouse Code */}
					<div className='col-span-1 space-y-1'>
						<Label className='text-xs font-medium'>
							Warehouse Code
						</Label>
						<Input
							value={warehouseCode}
							disabled
							className='h-8 font-mono text-xs cursor-not-allowed bg-muted/30 text-muted-foreground'
						/>
					</div>

					{/* Warehouse Name */}
					<div
						className={cn(
							form.operatedBy === "C&F Agent" ? "col-span-2" : "col-span-2",
							"space-y-1",
						)}
					>
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

					{/* Warehouse Type */}
					<div
						className={cn(
							form.operatedBy === "C&F Agent" ? "col-span-2" : "col-span-2",
						)}
					>
						<AC
							label='Warehouse Type'
							value={form.warehouseType}
							onChange={(v) => set("warehouseType", v)}
							options={WAREHOUSE_TYPES.filter(Boolean).map((t) => ({
								value: t,
								label: t,
							}))}
							placeholder='Select type…'
						/>
					</div>

					{/* Operated By */}
					<div className='col-span-2'>
						<AC
							label='Operated By'
							value={form.operatedBy}
							onChange={(v) => set("operatedBy", v)}
							options={OPERATED_BY_OPTIONS.filter(Boolean).map((o) => ({
								value: o,
								label: o,
							}))}
							placeholder='Select operator…'
						/>
					</div>

					{/* Customer Name (Conditional) */}
					{form.operatedBy === "C&F Agent" && (
						<div className='col-span-2 space-y-1'>
							<AC
								label='Customer Name'
								value={form.customerType}
								onChange={(v) => set("customerType", v)}
								options={cfCustomers}
								placeholder='Select C&F customer'
								required={form.operatedBy === "C&F Agent"}
								error={errors.customerType}
								emptyMessage='No C&F customers found. Please add a customer with Customer Type C&F.'
							/>
							{cfCustomers.length === 0 && (
								<p className='text-[11px] text-amber-600 mt-1'>
									No C&F customers found. Please add a customer with Customer Type C&F.
								</p>
							)}
						</div>
					)}

					{/* GST Number */}
					<div className='col-span-2 space-y-1'>
						<Label className='text-xs font-medium'>GST Number</Label>
						<Input
							value={form.gstNumber}
							onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
							placeholder='e.g., 27AABCT1234F1ZA'
							className={cn("h-8 font-mono text-xs", errors.gstNumber && "border-red-400 focus-visible:ring-red-300")}
							maxLength={15}
						/>
						<FieldError msg={errors.gstNumber} />
					</div>
				</div>
			</div>

			{/* ── Section 2: Contact Details ────────────────────────── */}
			<div className='pt-4 border-t border-border/60'>
				<div className='flex items-center justify-between mb-3'>
					<div>
						<p className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
							Contact Details
						</p>
						<p className='text-[11px] text-muted-foreground mt-0.5'>
							Add one or more warehouse contact persons.
						</p>
					</div>
				</div>

				<div className='space-y-3'>
					{form.contacts.map((contact, index) => {
						const nameErr = errors[`contactPerson_${index}`];
						const mobErr = errors[`mobileNumber_${index}`];
						const emailErr = errors[`emailAddress_${index}`];

						return (
							<div
								key={contact.id}
								className='p-3 space-y-3 border border-border/80 bg-slate-50/50 rounded-xl'
							>
								<div className='grid items-end grid-cols-1 gap-3 md:grid-cols-12'>
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
													updateContact(index, "mobileNumber", e.target.value.replace(/\D/g, "").slice(0, 10))
												}
												placeholder='10-digit mobile'
												className={cn("flex-1 h-8 text-xs", mobErr && "border-red-400 focus-visible:ring-red-300")}
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

									{/* Primary Radio & Remove Button */}
									<div className='flex items-center col-span-1 gap-3 pt-2 pb-2 md:col-span-2 md:pt-0'>
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

				<div className='mt-3'>
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
			<div className='pt-4 border-t border-border/60'>
				<SectionHead
					label='Address & Location Details'
					sub='Warehouse location and postal address'
				/>

				<div className='grid grid-cols-12 gap-3'>
					{/* Address Textarea */}
					<div className='col-span-5 space-y-1 '>
						<Label className='text-xs font-medium'>Address</Label>
						<Textarea
							value={form.address}
							onChange={(e) => set("address", e.target.value)}
							placeholder='Street address, building, area...'
							rows={2}
							className='text-xs resize-none rounded-lg min-h-[100px]'
						/>
					</div>
				</div>

				<div className='grid grid-cols-12 gap-3 mt-2'>
					{/* State */}
					<div className='col-span-2'>
						<AC
							label='State'
							value={form.state}
							onChange={(v) => set("state", v)}
							options={STATE_OPTIONS.filter(Boolean).map((s) => ({
								value: s,
								label: s,
							}))}
							placeholder='Select state…'
						/>
					</div>

					{/* District */}
					<div className='col-span-2'>
						<AC
							label='District'
							value={form.district}
							onChange={(v) => set("district", v)}
							disabled={!form.state}
							options={districts
								.filter(Boolean)
								.map((d) => ({ value: d, label: d }))}
							placeholder={
								form.state ? "Select district…" : "Select state first"
							}
						/>
					</div>

					{/* City */}
					<div className='col-span-2'>
						<AC
							label='City'
							value={form.city}
							onChange={(v) => set("city", v)}
							disabled={!form.district}
							options={cities
								.filter(Boolean)
								.map((c) => ({ value: c, label: c }))}
							placeholder={
								form.district ? "Select city…" : "Select district first"
							}
						/>
					</div>

					{/* Pincode */}
					<div className='col-span-2 space-y-1'>
						<Label className='text-xs font-medium'>Pincode</Label>
						<Input
							value={form.pincode}
							onChange={(e) =>
								set("pincode", e.target.value.replace(/\D/g, ""))
							}
							placeholder='e.g., 411028'
							maxLength={6}
							className={inputCls("pincode")}
						/>
						<FieldError msg={errors.pincode} />
					</div>
				</div>
			</div>

			{/* ── Section 4: Capacity & Management Details ──────────── */}
			<div className='pt-4 border-t border-border/60'>
				<SectionHead
					label='Capacity & Management Details'
					sub='Size, volume capacity, and assigned manager'
				/>
				<div className='grid grid-cols-12 gap-3'>
					{/* Capacity */}
					<div className='col-span-2 space-y-1'>
						<Label className='text-xs font-medium'>Capacity (sq.ft)</Label>
						<Input
							value={form.capacity}
							onChange={(e) => set("capacity", e.target.value)}
							placeholder='e.g., 20000'
							type='number'
							className='h-8 text-xs'
						/>
					</div>

					{/* Manager */}
					<div className='col-span-2'>
						<AC
							label='Manager'
							value={form.manager}
							onChange={(v) => set("manager", v)}
							options={MANAGER_OPTIONS.filter(Boolean).map((m) => ({
								value: m,
								label: m,
							}))}
							placeholder='Select manager…'
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
