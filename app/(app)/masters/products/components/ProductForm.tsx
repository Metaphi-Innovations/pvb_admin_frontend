"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	AlertCircle,
	Eye,
	Image as ImageIcon,
	Upload,
	X,
	Plus,
	ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
// import { loadHSNMasters } from "../../hsn/hsn-data";
import {
	type Product,
	type ProductImage,
	type ProductUrl,
	type ProductStatus,
	AUTHORITY_OPTIONS,
	PRODUCT_PACKAGING_UNIT_OPTIONS,
	PRODUCT_UNIT_OPTIONS,
	calculateNetWeightPerPackagingUnit,
	createProductImageFromFile,
	createProductUrl,
	formatNetWeightDisplay,
	getImagePreviewUrl,
	getMouFromUnit,
	isAllowedProductImageFile,
	isValidProductUrl,
	// loadActiveCategoryOptions,
	loadActiveCfuOptions,
	loadActiveFormOptions,
	// loadActiveSegmentOptions,
	// loadActiveSupplierOptions,
	// loadProducts,
	// generateProductCode,
	normalizeProductUnit,
	resolveProductCodeForSave,
	resolveProductTaxFromHsn,
	// resolveSupplierCode,
	todayStr,
} from "../product-data";
import { resolveProductAccountingDefaults } from "@/lib/accounts/erp-accounting-mapping";
import { IndianRupeeInput } from "@/components/ui/IndianRupeeInput";
import { ListingStatusToggle } from "@/components/listing";
import { useCategoriesDropdown, useSegmentsDropdown, useHsnDropdown, useSuppliersDropdown, useCfuDropdown, useFormulationDropdown } from "@/hooks/masters";

/** Matches Prisma Decimal(18, 4) for mrp / pack_size / unit_per_packing. */
const DECIMAL_18_4_MAX = 99_999_999_999_999.9999;
/** Matches Prisma Decimal(12, 2) for cost_price. */
const COST_PRICE_MAX = 9_999_999_999.99;
const PACK_SIZE_MAX = DECIMAL_18_4_MAX;
const UNIT_PER_CASE_MAX = DECIMAL_18_4_MAX;
const MRP_MAX = DECIMAL_18_4_MAX;
const QTY_FRACTION_DIGITS = 4;

function clampNumber(value: number, max: number): number {
	if (!Number.isFinite(value)) return 0;
	if (value < 0) return 0;
	if (value > max) return max;
	return value;
}

function limitDecimalInput(
	raw: string,
	max: number,
	fractionDigits: number,
): string {
	let next = raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
	if (!next) return "";

	const hasDot = next.includes(".");
	const [intPartRaw = "", fracPartRaw = ""] = next.split(".");
	const intPart = intPartRaw.replace(/^0+(?=\d)/, "") || (hasDot ? "0" : intPartRaw);
	const fracPart = fracPartRaw.slice(0, fractionDigits);
	next = hasDot ? `${intPart}.${fracPart}` : intPart;

	const numeric = Number(next);
	if (Number.isFinite(numeric) && numeric > max) {
		return String(max);
	}
	return next;
}

export interface ProductFormValues {
	productCode: string;
	supplier: string;
	supplierCode: string;
	productName: string;
	scientificName: string;
	segment: string;
	segmentId?: string;
	category: string;
	categoryId?: string;
	subCategory?: string;
	form: string;
	formId?: string;
	cfu: string;
	cfuId?: string;
	authority: string;
	sku: string;
	hsnCode: string;
	hsnId: string;
	gstRate: string;
	gstId: string;
	packSize: string;
	baseUnit: string;
	mou: string;
	unitPerCase: string;
	packagingUnit: string;
	netWeightPerPackagingUnit: string;
	grossWeight: string;
	mrp: string;
	costPrice: string;
	status: ProductStatus;
	inventoryAccount: string;
	salesAccount: string;
	purchaseAccount: string;
	cogsAccount: string;
}

export const DEFAULT_PRODUCT_FORM: ProductFormValues = {
	productCode: "",
	supplier: "",
	supplierCode: "",
	productName: "",
	scientificName: "",
	segment: "",
	category: "",
	form: "",
	cfu: "",
	authority: "",
	sku: "",
	hsnCode: "",
	hsnId: "",
	gstRate: "",
	gstId: "",
	packSize: "",
	baseUnit: "",
	mou: "",
	unitPerCase: "",
	packagingUnit: "",
	netWeightPerPackagingUnit: "",
	grossWeight: "",
	mrp: "",
	costPrice: "",
	status: "active",
	inventoryAccount: "",
	salesAccount: "",
	purchaseAccount: "",
	cogsAccount: "",
};

export function productToFormValues(product: Product): ProductFormValues {
	const tax =
		typeof window !== "undefined" && product.hsnCode
			? resolveProductTaxFromHsn(product.hsnCode)
			: null;
	const acctDefaults = resolveProductAccountingDefaults();
	const packSize = product.packSize ?? product.unitSize;
	const unitPerCase = product.unitPerCase ?? product.unitsPerCase;
	const baseUnit = normalizeProductUnit(product.baseUnit ?? "");
	const mou = getMouFromUnit(baseUnit) ?? normalizeProductUnit(product.mou ?? "");
	const netWeight =
		calculateNetWeightPerPackagingUnit(packSize, unitPerCase, baseUnit) ??
		product.netWeightPerPackagingUnit ??
		product.netWeight;

	return {
		productCode: product.productCode || "",
		supplier: product.supplier ?? "",
		supplierCode: product.supplierCode ?? "",
		productName: product.productName,
		scientificName: product.scientificName ?? "",
		segment: product.segment,
		segmentId: product.segmentId,
		category: product.category,
		categoryId: product.categoryId,
		form: product.form ?? product.formulation ?? "",
		formId: product.formId,
		cfu: product.cfu ?? "",
		cfuId: product.cfuId,
		authority: product.authority ?? "",
		sku: product.sku ?? "",
		hsnCode: product.hsnCode,
		hsnId: tax ? String(tax.hsnId) : product.hsnId ? String(product.hsnId) : "",
		gstRate: tax?.gstRate ?? product.gstRate,
		gstId: tax?.gstId
			? String(tax.gstId)
			: product.gstId
				? String(product.gstId)
				: "",
		packSize: packSize !== undefined ? String(packSize) : "",
		baseUnit,
		mou,
		unitPerCase: unitPerCase !== undefined ? String(unitPerCase) : "",
		packagingUnit: product.packagingUnit ?? "",
		netWeightPerPackagingUnit:
			netWeight !== undefined ? String(netWeight) : "",
		grossWeight:
			product.grossWeight !== undefined ? String(product.grossWeight) : "",
		mrp: product.mrp != null ? String(product.mrp) : "",
		costPrice: product.costPrice != null ? String(product.costPrice) : "",
		status: product.status,
		inventoryAccount: product.inventoryAccount ?? acctDefaults.inventoryAccount,
		salesAccount: product.salesAccount ?? acctDefaults.salesAccount,
		purchaseAccount: product.purchaseAccount ?? acctDefaults.purchaseAccount,
		cogsAccount: product.cogsAccount ?? acctDefaults.cogsAccount,
	};
}

function FieldError({ msg }: { msg?: string }) {
	if (!msg) return null;
	return (
		<p className='flex items-center gap-1 mt-1 text-[11px] text-red-500'>
			<AlertCircle className='w-3.5 h-3.5 flex-shrink-0' />
			{msg}
		</p>
	);
}

function SectionHead({ label, sub }: { label: string; sub?: string }) {
	return (
		<div className='mb-2.5'>
			<p className='text-xs font-bold uppercase tracking-wider text-foreground'>
				{label}
			</p>
			{sub && <p className='text-[11px] text-muted-foreground mt-0.5'>{sub}</p>}
		</div>
	);
}

function SelectField({
	label,
	required,
	value,
	onChange,
	options,
	placeholder,
	disabled,
	error,
	className,
}: {
	label: string;
	required?: boolean;
	value: string;
	onChange: (v: string) => void;
	options: { value: string; label: string }[];
	placeholder?: string;
	disabled?: boolean;
	error?: string;
	className?: string;
}) {
	return (
		<div className={cn("space-y-1", className)}>
			<Label className='text-xs font-medium'>
				{label}
				{required && <span className='text-red-500 ml-0.5'>*</span>}
			</Label>
			<AutocompleteSelect
				options={options}
				value={value}
				onChange={onChange}
				placeholder={placeholder ?? "Select…"}
				disabled={disabled}
				error={!!error}
				className='h-8 text-xs'
			/>
			<FieldError msg={error} />
		</div>
	);
}

function applyPackagingCalculations(values: ProductFormValues): ProductFormValues {
	const next = { ...values };
	const packSize = parseFloat(next.packSize);
	const unitPerCase = parseFloat(next.unitPerCase);
	const baseUnit = normalizeProductUnit(next.baseUnit);

	if (baseUnit) {
		next.baseUnit = baseUnit;
		next.mou = getMouFromUnit(baseUnit) ?? "";
	}

	const calculated = calculateNetWeightPerPackagingUnit(
		isNaN(packSize) ? undefined : packSize,
		isNaN(unitPerCase) ? undefined : unitPerCase,
		baseUnit || undefined,
	);
	next.netWeightPerPackagingUnit =
		calculated !== undefined ? String(calculated) : "";

	return next;
}


export function ProductForm({
	form,
	onChange,
	errors,
	onClearError,
	productImages = [],
	productUrls = [],
	previewNumber,
	onImageAdd,
	onImageRemove,
	onUrlAdd,
	onUrlRemove,
	readOnly,
	isNew,
}: {
	form: ProductFormValues;
	onChange: (form: ProductFormValues) => void;
	errors: Record<string, string>;
	onClearError: (key: string) => void;
	productImages?: ProductImage[];
	productUrls?: ProductUrl[];
	onImageAdd?: (items: ProductImage[]) => void;
	onImageRemove?: (id: string) => void;
	previewNumber?: string;
	onUrlAdd?: (item: ProductUrl) => void;
	onUrlRemove?: (id: string) => void;
	readOnly?: boolean;
	isNew?: boolean;
}) {

	/** Digits only: {pack size in g/ml}{4-digit serial}. Gms/Ml as-is; Kg/Ltr × 1000. */
	const computeProductCode = (
		packSize: string,
		baseUnit: string,
		lastProductCode?: string | null,
	) => {
		const pack = parseFloat(packSize);
		if (isNaN(pack) || pack <= 0) return "";

		const unit = normalizeProductUnit(baseUnit);

		let weight: number;
		if (unit === "Gms" || unit === "Ml") {
			weight = pack;
		} else if (unit === "Kg" || unit === "Ltr") {
			weight = pack * 1000;
		} else {
			return "";
		}

		let nextSerial = 1;
		if (lastProductCode) {
			const digitsOnly = String(lastProductCode).replace(/\D/g, "");
			if (digitsOnly.length >= 4) {
				const lastSerial = parseInt(digitsOnly.slice(-4), 10);
				if (!isNaN(lastSerial)) nextSerial = lastSerial + 1;
			}
		}

		const serial = String(nextSerial).padStart(4, "0");
		return `${Math.round(weight)}${serial}`;
	};

	const set = <K extends keyof ProductFormValues>(
		key: K,
		value: ProductFormValues[K],
	) => {
		let next = { ...form, [key]: value } as ProductFormValues;

		if (key === "packSize" || key === "unitPerCase" || key === "baseUnit") {
			next = applyPackagingCalculations(next);

			if (isNew && (key === "packSize" || key === "baseUnit")) {
				const generated = computeProductCode(
					next.packSize,
					next.baseUnit,
					previewNumber,
				);
				if (generated) {
					next.productCode = generated;
					onClearError("productCode");
				}
			}
		}

		onChange(next);
		onClearError(key);
	};

	useEffect(() => {
		if (!isNew) return;

		const generated = computeProductCode(
			form.packSize,
			form.baseUnit,
			previewNumber,
		);

		if (generated && generated !== form.productCode) {
			onChange({ ...form, productCode: generated });
			onClearError("productCode");
		}
	}, [previewNumber, form.packSize, form.baseUnit]);

	const handleSupplierChange = (supplierId: string) => {
		const supplierItem = suppliersData?.find((s) => s.supplier_id === supplierId);
		onChange({
			...form,
			supplier: supplierId,
			supplierCode: supplierItem?.supplierCode || form.supplierCode,
		});
		onClearError("supplier");
		onClearError("supplierCode");
	};

	const { data: categoriesData } = useCategoriesDropdown();
	const { data: segmentsData } = useSegmentsDropdown();
	const { data: hsnData } = useHsnDropdown();
	const { data: suppliersData } = useSuppliersDropdown();
	const { data: cfuData } = useCfuDropdown();
	const { data: formulationData } = useFormulationDropdown();

	const segmentOptions = useMemo(() => {
		if (!segmentsData) return [];
		return segmentsData.map((s) => ({ value: s.id, label: s.segmentName }));
	}, [segmentsData]);

	const categoryOptions = useMemo(() => {
		if (!categoriesData) return [];
		return categoriesData.map((c) => ({ value: c.id, label: c.categoryName }));
	}, [categoriesData]);

	const handleCategoryChange = (categoryId: string) => {
		const label =
			categoryOptions.find((option) => option.value === categoryId)?.label ?? "";
		onChange({ ...form, categoryId, category: label });
		onClearError("category");
	};

	const cfuOptions = useMemo(() => {
		if (!cfuData) return [];
		return cfuData.map((c) => ({ value: c.id, label: c.cfuName }));
	}, [cfuData]);

	const formOptions = useMemo(() => {
		if (!formulationData) return [];
		return formulationData.map((f) => ({ value: f.id, label: f.label }));
	}, [formulationData]);

	const supplierOptions = useMemo(() => {
		if (!suppliersData) return [];
		return suppliersData.map((s) => ({
			value: s.supplier_id,
			label: s.supplierName,
		}));
	}, [suppliersData]);

	const hsnOptions = useMemo(() => {
		if (!hsnData) return [];
		return hsnData.map((h) => ({
			value: h.id,
			label: h.hsnCode
				? `${h.hsnCode}${h.hsnDescription ? ` — ${h.hsnDescription}` : ""}`
				: h.hsnDescription || h.id,
			searchText: `${h.hsnCode} ${h.hsnDescription}`,
		}));
	}, [hsnData]);

	const unitOptions = useMemo(() => [...PRODUCT_UNIT_OPTIONS], []);

	const packagingUnitOptions = useMemo(() => {
		const base = [...PRODUCT_PACKAGING_UNIT_OPTIONS];
		if (
			form.packagingUnit &&
			!base.some((o) => o.value === form.packagingUnit)
		) {
			return [
				{ value: form.packagingUnit, label: form.packagingUnit },
				...base,
			];
		}
		return base;
	}, [form.packagingUnit]);

	const netWeightDisplay = formatNetWeightDisplay(
		form.packSize && !isNaN(Number(form.packSize))
			? Number(form.packSize)
			: undefined,
		form.unitPerCase && !isNaN(Number(form.unitPerCase))
			? Number(form.unitPerCase)
			: undefined,
		form.baseUnit,
	);

	const handleHSNChange = (hsnUuid: string) => {
		if (!hsnUuid) {
			onChange({ ...form, hsnCode: "", hsnId: "", gstRate: "", gstId: "" });
			onClearError("hsnCode");
			onClearError("gstRate");
			return;
		}
		const hsnItem = hsnData?.find((h) => h.id === hsnUuid);
		onChange({
			...form,
			hsnCode: hsnUuid,           // store UUID — matches dropdown value & API hsn_id
			hsnId: hsnUuid,
			gstRate: hsnItem?.gstRate ?? "",
			gstId: hsnItem?.gstId ?? "",
		});
		onClearError("hsnCode");
		onClearError("gstRate");
	};

	const inputCls = (key: string) =>
		cn(
			"h-8 text-xs placeholder:text-slate-500 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-200",
			errors[key] && "border-red-400 focus-visible:ring-red-300",
		);

	const formGrid = "grid grid-cols-2 md:grid-cols-4 gap-3";

	const decimalInput = (
		key: "packSize" | "unitPerCase" | "grossWeight",
		value: string,
	) => {
		const max =
			key === "packSize"
				? PACK_SIZE_MAX
				: key === "unitPerCase"
					? UNIT_PER_CASE_MAX
					: DECIMAL_18_4_MAX;
		set(key, limitDecimalInput(value, max, QTY_FRACTION_DIGITS));
	};

	const moneyInput = (key: "mrp" | "costPrice", value: number) => {
		const max = key === "mrp" ? MRP_MAX : COST_PRICE_MAX;
		const clamped = clampNumber(value, max);
		set(key, clamped > 0 ? String(clamped) : "");
	};

	const imageInputRef = useRef<HTMLInputElement | null>(null);
	const [linkUrl, setLinkUrl] = useState("");
	const [linkUrlError, setLinkUrlError] = useState("");
	const [urlDialogOpen, setUrlDialogOpen] = useState(false);
	const [previewImage, setPreviewImage] = useState<ProductImage | null>(null);
	const [uploadingImages, setUploadingImages] = useState(false);
	const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
	const [pendingStatusActive, setPendingStatusActive] = useState<boolean | null>(null);

	const handleStatusChange = (nextActive: boolean) => {
		if (readOnly) return;
		if (nextActive === (form.status === "active")) return;
		setPendingStatusActive(nextActive);
		setStatusConfirmOpen(true);
	};

	const confirmStatusChange = () => {
		if (pendingStatusActive == null) return;
		set("status", pendingStatusActive ? "active" : "inactive");
		setStatusConfirmOpen(false);
		setPendingStatusActive(null);
	};

	const handleImageFiles = async (files: File[]) => {
		const valid = files.filter(isAllowedProductImageFile);
		if (!valid.length || !onImageAdd) return;
		setUploadingImages(true);
		try {
			const items = await Promise.all(valid.map(createProductImageFromFile));
			onImageAdd(items);
		} finally {
			setUploadingImages(false);
		}
	};

	const handleAddUrl = () => {
		const trimmed = linkUrl.trim();
		if (!trimmed) {
			setLinkUrlError("URL is required");
			return;
		}
		if (!isValidProductUrl(trimmed)) {
			setLinkUrlError("Enter a valid URL (https://…)");
			return;
		}
		onUrlAdd?.(createProductUrl(trimmed));
		setLinkUrl("");
		setLinkUrlError("");
		setUrlDialogOpen(false);
	};

	return (
		<div className='w-full space-y-4'>
			{/* Basic & classification */}
			<div>
				<SectionHead label='Product Information' />
				<div className={formGrid}>
					<div className='space-y-1'>
						<Label className='text-xs font-medium'>
							Product Code <span className='text-red-500'>*</span>
						</Label>
						<Input
							value={form.productCode}
							onChange={(e) =>
								set("productCode", e.target.value.toUpperCase())
							}
							placeholder='Auto-generated'
							className={cn("font-mono", inputCls("productCode"))}
							disabled={true}
						/>
						{/* <p className='text-[10px] text-muted-foreground leading-snug'>
							Auto-filled.
						</p> */}
						<FieldError msg={errors.productCode} />
					</div>

					<SelectField
						label='Supplier'
						value={form.supplier}
						onChange={handleSupplierChange}
						options={supplierOptions}
						placeholder='Select supplier…'
						disabled={readOnly}
						error={errors.supplier}
					/>

					<div className='space-y-1'>
						<Label className='text-xs font-medium'>Supplier Code</Label>
						<Input
							value={form.supplierCode}
							onChange={(e) =>
								set("supplierCode", e.target.value.toUpperCase())
							}
							placeholder='Auto-filled from supplier'
							className={cn("font-mono", inputCls("supplierCode"))}
							disabled={readOnly}
						/>
					</div>

					<div className='space-y-1'>
						<Label className='text-xs font-medium'>
							Product Name <span className='text-red-500'>*</span>
						</Label>
						<Input
							value={form.productName}
							onChange={(e) => set("productName", e.target.value)}
							placeholder='Enter product name'
							className={cn(inputCls("productName"), "bg-white")}
							disabled={readOnly}
						/>
						<FieldError msg={errors.productName} />
					</div>

					<div className='space-y-1'>
						<Label className='text-xs font-medium'>Scientific Name</Label>
						<Input
							value={form.scientificName}
							onChange={(e) => set("scientificName", e.target.value)}
							placeholder='e.g. Trichoderma viride'
							className={inputCls("scientificName")}
							disabled={readOnly}
						/>
					</div>

					<div className='space-y-1'>
						<Label className='text-xs font-medium'>
							SKU <span className='text-red-500'>*</span>
						</Label>
						<Input
							value={form.sku}
							onChange={(e) => set("sku", e.target.value.toUpperCase())}
							placeholder='e.g. FERT-WSF-019'
							className={cn("font-mono", inputCls("sku"))}
							disabled={readOnly}
						/>
						<FieldError msg={errors.sku} />
					</div>

					<SelectField
						label='Segment'
						required
						value={form.segmentId || ""}
						onChange={(segmentId) => {
							const label =
								segmentOptions.find((option) => option.value === segmentId)
									?.label ?? "";
							onChange({ ...form, segmentId, segment: label });
							onClearError("segment");
						}}
						options={segmentOptions}
						placeholder='Select segment…'
						disabled={readOnly}
						error={errors.segment}
					/>

					<SelectField
						label='Category'
						required
						value={form.categoryId || ""}
						onChange={handleCategoryChange}
						options={categoryOptions}
						placeholder='Select category…'
						disabled={readOnly}
						error={errors.category}
					/>

					<SelectField
						label='Form'
						required
						value={form.formId || ""}
						onChange={(formId) => {
							const label =
								formOptions.find((option) => option.value === formId)?.label ?? "";
							onChange({ ...form, formId, form: label });
							onClearError("form");
						}}
						options={formOptions}
						placeholder='Select form…'
						disabled={readOnly}
						error={errors.form}
					/>

					<SelectField
						label='CFU'
						value={form.cfuId || ""}
						onChange={(cfuId) => {
							const label =
								cfuOptions.find((option) => option.value === cfuId)?.label ?? "";
							onChange({ ...form, cfuId, cfu: label });
							onClearError("cfu");
						}}
						options={cfuOptions}
						placeholder='Select CFU…'
						disabled={readOnly}
					/>

					<SelectField
						label='Authority'
						value={form.authority}
						onChange={(v) => set("authority", v)}
						options={AUTHORITY_OPTIONS.map((o) => ({
							value: o.value,
							label: o.label,
						}))}
						placeholder='Select authority…'
						disabled={readOnly}
					/>
				</div>
			</div>

			{/* Tax */}
			<div className='pt-3 border-t border-border/60'>
				<SectionHead label='Tax & Compliance' />
				<div className={formGrid}>
					<SelectField
						label='HSN Code'
						required
						value={form.hsnCode}
						onChange={handleHSNChange}
						options={hsnOptions}
						placeholder='Select HSN code…'
						disabled={readOnly}
						error={errors.hsnCode}
					/>

					<div className='space-y-1'>
						<Label className='text-xs font-medium'>
							GST % <span className='text-red-500'>*</span>
						</Label>
						<Input
							value={form.gstRate}
							readOnly
							disabled
							placeholder='Auto from HSN'
							className='h-8 text-xs bg-muted/30 cursor-not-allowed'
						/>
						<FieldError msg={errors.gstRate} />
					</div>
				</div>
			</div>

			{/* Packaging */}
			<div className='pt-3 border-t border-border/60'>
				<SectionHead label='Packaging & Weight' />
				<div className={formGrid}>
					<div className='space-y-1'>
						<Label className='text-xs font-medium'>
							Pack Size <span className='text-red-500'>*</span>
						</Label>
						<Input
							value={form.packSize}
							onChange={(e) => decimalInput("packSize", e.target.value)}
							placeholder='e.g. 250, 500, 1'
							className={inputCls("packSize")}
							inputMode='decimal'
							disabled={readOnly}
						/>
						<FieldError msg={errors.packSize} />
					</div>

					<SelectField
						label='Unit'
						required
						value={form.baseUnit}
						onChange={(v) => set("baseUnit", v)}
						options={unitOptions}
						placeholder='Select unit…'
						disabled={readOnly}
						error={errors.baseUnit}
					/>

					<SelectField
						label='Packaging Unit'
						required
						value={form.packagingUnit}
						onChange={(v) => set("packagingUnit", v)}
						options={packagingUnitOptions}
						placeholder='Select packaging unit…'
						disabled={readOnly}
						error={errors.packagingUnit}
					/>

					<div className='space-y-1'>
						<Label className='text-xs font-medium'>
							Unit per Case <span className='text-red-500'>*</span>
						</Label>
						<Input
							value={form.unitPerCase}
							onChange={(e) => decimalInput("unitPerCase", e.target.value)}
							placeholder='e.g. 12'
							className={inputCls("unitPerCase")}
							inputMode='decimal'
							disabled={readOnly}
						/>
						<FieldError msg={errors.unitPerCase} />
					</div>

					<div className='space-y-1'>
						<Label className='text-xs font-medium'>Net Weight</Label>
						<Input
							value={netWeightDisplay}
							readOnly
							disabled
							placeholder='Pack Size × Unit per Case'
							className='h-8 text-xs bg-muted/30 cursor-not-allowed'
						/>
						<p className='text-[10px] text-muted-foreground'>
							Auto-calculated value in MoU
						</p>
					</div>

					<div className='space-y-1'>
						<Label className='text-xs font-medium'>MoU</Label>
						<Input
							value={form.mou}
							readOnly
							disabled
							placeholder='Auto from Unit'
							className='h-8 text-xs bg-muted/30 cursor-not-allowed'
						/>
						<p className='text-[10px] text-muted-foreground'>
							Auto-populated from selected Unit
						</p>
					</div>

					<div className='space-y-1'>
						<Label className='text-xs font-medium'>
							Gross Weight <span className='text-red-500'>*</span>
						</Label>
						<div className='relative'>
							<Input
								value={form.grossWeight}
								onChange={(e) => decimalInput("grossWeight", e.target.value)}
								placeholder='Manual entry'
								className={cn(inputCls("grossWeight"), form.mou && "pr-14")}
								inputMode='decimal'
								disabled={readOnly}
							/>
							{form.mou ? (
								<span className='absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none'>
									{form.mou}
								</span>
							) : null}
						</div>
						<p className='text-[10px] text-muted-foreground'>
							{form.mou
								? `Enter weight in ${form.mou}`
								: "Select Unit to set the weight unit"}
						</p>
						<FieldError msg={errors.grossWeight} />
					</div>

					<div className='space-y-1'>
						<Label className='text-xs font-medium'>
							MRP <span className='text-red-500'>*</span>
						</Label>
						<IndianRupeeInput
							value={
								form.mrp && !isNaN(Number(form.mrp)) ? Number(form.mrp) : 0
							}
							onChange={(v) => moneyInput("mrp", v)}
							max={MRP_MAX}
							disabled={readOnly}
							className={cn(
								inputCls("mrp"),
								"h-8 text-xs font-normal rounded-input",
							)}
							placeholder='₹ 0'
						/>
						<p className='text-[10px] text-muted-foreground'>
							Other pricing is maintained in Pricing Master.
						</p>
						<FieldError msg={errors.mrp} />
					</div>
					<div className='space-y-1'>
						<Label className='text-xs font-medium'>
							Cost Price <span className='text-red-500'>*</span>
						</Label>
						<IndianRupeeInput
							value={
								form.costPrice && !isNaN(Number(form.costPrice))
									? Number(form.costPrice)
									: 0
							}
							onChange={(v) => moneyInput("costPrice", v)}
							max={COST_PRICE_MAX}
							disabled={readOnly}
							className={cn(
								inputCls("costPrice"),
								"h-8 text-xs font-normal rounded-input",
							)}
							placeholder='₹ 0'
						/>
						<p className='text-[10px] text-muted-foreground'>
							This value is used as source in Pricing Master.
						</p>
						<FieldError msg={errors.costPrice} />
					</div>
				</div>
			</div>

			{/* Status */}
			<div className='pt-3 border-t border-border/60'>
				<SectionHead label='Status' />
				<div className='flex items-center gap-3'>
					<Label className='text-xs font-medium'>Product Status</Label>
					<ListingStatusToggle
						active={form.status === "active"}
						onChange={handleStatusChange}
						disabled={readOnly}
					/>
					<span
						className={cn(
							"text-xs font-semibold uppercase tracking-wide",
							form.status === "active" ? "text-emerald-700" : "text-slate-600",
						)}
					>
						{form.status === "active" ? "ON" : "OFF"}
					</span>
					<span className='text-xs text-muted-foreground'>
						{form.status === "active" ? "Active" : "Inactive"}
					</span>
				</div>
			</div>

			{/* Images */}
			<div className='pt-3 border-t border-border/60 space-y-3'>
				<SectionHead label='Product Images' />
				<div className='flex items-center justify-between gap-2'>
					<p className='text-[11px] text-muted-foreground'>
						JPG, PNG, WEBP supported
					</p>
					{!readOnly && (
						<>
							<input
								ref={imageInputRef}
								type='file'
								accept='image/jpeg,image/jpg,image/png,image/webp'
								multiple
								className='hidden'
								onChange={(e) => {
									void handleImageFiles(Array.from(e.target.files ?? []));
									e.currentTarget.value = "";
								}}
							/>
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-7 px-2.5 text-[11px]'
								onClick={() => imageInputRef.current?.click()}
								disabled={uploadingImages}
							>
								<Upload className='w-3 h-3 mr-1.5' />
								{uploadingImages ? "Uploading…" : "Upload Images"}
							</Button>
						</>
					)}
				</div>

				{productImages.length === 0 ? (
					<p className='text-xs text-muted-foreground py-3 text-center border border-dashed border-border/60 rounded-lg bg-muted/10'>
						No product images uploaded
					</p>
				) : (
					<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5'>
						{productImages.map((image) => {
							const preview = getImagePreviewUrl(image);
							return (
								<div
									key={image.id}
									className='flex flex-col overflow-hidden border rounded-lg border-border/60 bg-white'
								>
									<button
										type='button'
										className='relative h-[88px] w-full bg-muted/20'
										onClick={() => setPreviewImage(image)}
									>
										{preview ? (
											<img
												src={preview}
												alt={image.name}
												className='object-cover w-full h-full'
												crossOrigin='anonymous'
											/>
										) : (
											<ImageIcon className='w-5 h-5 m-auto text-muted-foreground' />
										)}
									</button>
									<div className='px-2 py-1.5 border-t border-border/40 flex gap-1'>
										<Button
											type='button'
											variant='outline'
											size='sm'
											className='h-6 flex-1 text-[9px]'
											onClick={() => setPreviewImage(image)}
										>
											<Eye className='w-3 h-3 mr-1' /> View
										</Button>
										{!readOnly && (
											<Button
												type='button'
												variant='outline'
												size='sm'
												className='h-6 w-7 px-0 text-red-600'
												onClick={() => onImageRemove?.(image.id)}
											>
												<X className='w-3 h-3' />
											</Button>
										)}
									</div>
								</div>
							);
						})}
						{!readOnly && (
							<button
								type='button'
								onClick={() => imageInputRef.current?.click()}
								className='flex flex-col items-center justify-center h-[118px] border border-dashed rounded-lg border-border/70 bg-muted/10 text-muted-foreground hover:border-brand-300'
							>
								<Plus className='w-4 h-4 mb-1' />
								<span className='text-[10px]'>Upload</span>
							</button>
						)}
					</div>
				)}
			</div>

			{/* Document URLs */}
			<div className='pt-3 border-t border-border/60 space-y-2'>
				<div className='flex items-center justify-between'>
					<SectionHead label='Document URL' />
					{!readOnly && (
						<Button
							type='button'
							variant='outline'
							size='sm'
							className='h-7 px-2.5 text-[11px]'
							onClick={() => {
								setLinkUrl("");
								setLinkUrlError("");
								setUrlDialogOpen(true);
							}}
						>
							<Plus className='w-3 h-3 mr-1.5' /> Add URL
						</Button>
					)}
				</div>

				{productUrls.length === 0 ? (
					<p className='text-xs text-muted-foreground py-3 text-center border border-dashed border-border/60 rounded-lg bg-muted/10'>
						No document URLs added
					</p>
				) : (
					<div className='overflow-hidden border rounded-lg border-border/60'>
						<table className='w-full text-xs'>
							<thead>
								<tr className='border-b bg-muted/30'>
									<th className='px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground'>
										URL
									</th>
									<th className='w-20 px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground'>
										Open
									</th>
									{!readOnly && (
										<th className='w-16 px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground'>
											Remove
										</th>
									)}
								</tr>
							</thead>
							<tbody>
								{productUrls.map((item) => (
									<tr key={item.id} className='border-b border-border/40 last:border-0'>
										<td className='px-2 py-2 truncate max-w-md' title={item.url}>
											{item.url}
										</td>
										<td className='px-2 py-2 text-center'>
											<Button
												type='button'
												variant='ghost'
												size='icon'
												className='w-7 h-7'
												onClick={() =>
													window.open(item.url, "_blank", "noopener,noreferrer")
												}
											>
												<ExternalLink className='w-3.5 h-3.5' />
											</Button>
										</td>
										{!readOnly && (
											<td className='px-2 py-2 text-center'>
												<Button
													type='button'
													variant='ghost'
													size='icon'
													className='w-7 h-7 text-red-600'
													onClick={() => onUrlRemove?.(item.id)}
												>
													<X className='w-3.5 h-3.5' />
												</Button>
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<Dialog open={!!previewImage} onOpenChange={(o) => !o && setPreviewImage(null)}>
				<DialogContent className='max-w-3xl p-4'>
					<DialogHeader>
						<DialogTitle className='text-sm truncate'>
							{previewImage?.name}
						</DialogTitle>
					</DialogHeader>
					{previewImage && (
						<img
							src={getImagePreviewUrl(previewImage)}
							alt={previewImage.name}
							className='max-h-[70vh] w-full object-contain'
							crossOrigin='anonymous'
						/>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
				<DialogContent className='max-w-md p-4'>
					<DialogHeader>
						<DialogTitle className='text-sm'>Add Document URL</DialogTitle>
					</DialogHeader>
					<div className='space-y-2'>
						<Input
							value={linkUrl}
							onChange={(e) => {
								setLinkUrl(e.target.value);
								if (linkUrlError) setLinkUrlError("");
							}}
							placeholder='https://…'
							className={cn("h-8 text-xs placeholder:text-slate-500", linkUrlError && "border-red-400")}
						/>
						{linkUrlError && <FieldError msg={linkUrlError} />}
						<div className='flex justify-end gap-2'>
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={() => setUrlDialogOpen(false)}
							>
								Cancel
							</Button>
							<Button type='button' size='sm' onClick={handleAddUrl}>
								Add
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={statusConfirmOpen}
				onOpenChange={(open) => {
					setStatusConfirmOpen(open);
					if (!open) setPendingStatusActive(null);
				}}
			>
				<DialogContent className='max-w-md p-4'>
					<DialogHeader>
						<DialogTitle className='text-sm'>
							{pendingStatusActive ? "Activate product?" : "Deactivate product?"}
						</DialogTitle>
					</DialogHeader>
					<p className='text-xs text-muted-foreground leading-relaxed'>
						{pendingStatusActive
							? "This product will be marked active and available in selections again."
							: "This product will be marked inactive and hidden from active selections. You can reactivate it later from Edit Product."}
					</p>
					<div className='flex justify-end gap-2 pt-2'>
						<Button
							type='button'
							variant='outline'
							size='sm'
							onClick={() => {
								setStatusConfirmOpen(false);
								setPendingStatusActive(null);
							}}
						>
							Cancel
						</Button>
						<Button
							type='button'
							size='sm'
							className={
								pendingStatusActive
									? "bg-brand-600 hover:bg-brand-700 text-white"
									: "bg-red-600 hover:bg-red-700 text-white"
							}
							onClick={confirmStatusChange}
						>
							{pendingStatusActive ? "Activate" : "Deactivate"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export function validateProductForm(
	form: ProductFormValues,
): Record<string, string> {
	const errors: Record<string, string> = {};
	const productCode = resolveProductCodeForSave(form.category, form.productCode);

	const requirePositiveNumber = (
		value: string,
		field: string,
		label: string,
		required = false,
		max?: number,
	) => {
		const trimmed = value.trim();
		if (!trimmed) {
			if (required) errors[field] = `${label} is required.`;
			return;
		}
		const num = Number(trimmed);
		if (!Number.isFinite(num)) {
			errors[field] = `${label} must be a valid number.`;
			return;
		}
		if (num <= 0) {
			errors[field] = `${label} must be greater than 0.`;
			return;
		}
		if (max !== undefined && num > max) {
			errors[field] = `${label} cannot exceed ${max.toLocaleString("en-IN")}.`;
		}
	};

	const requireNonNegativeNumber = (
		value: string,
		field: string,
		label: string,
		max?: number,
	) => {
		const trimmed = value.trim();
		if (!trimmed) return;
		const num = Number(trimmed);
		if (!Number.isFinite(num)) {
			errors[field] = `${label} must be a valid number.`;
			return;
		}
		if (num < 0) {
			errors[field] = `${label} cannot be negative.`;
			return;
		}
		if (max !== undefined && num > max) {
			errors[field] = `${label} cannot exceed ${max.toLocaleString("en-IN")}.`;
		}
	};

	if (!form.productName.trim()) errors.productName = "Product name is required.";
	if (!form.segmentId) errors.segment = "Segment is required.";
	if (!form.categoryId) errors.category = "Category is required.";
	if (!form.formId) errors.form = "Form is required.";
	if (!productCode) {
		errors.productCode = "Product code is required.";
	}
	if (!form.sku.trim()) errors.sku = "SKU is required.";
	if (!form.hsnCode.trim() && !form.hsnId.trim()) {
		errors.hsnCode = "HSN code is required.";
	} else if (!form.gstRate?.trim()) {
		errors.gstRate =
			"Selected HSN does not have a GST rate mapped. Choose another HSN code.";
	}
	if (!form.baseUnit) errors.baseUnit = "Unit is required.";
	if (!form.packagingUnit) errors.packagingUnit = "Packaging unit is required.";

	requirePositiveNumber(form.packSize, "packSize", "Pack size", true, PACK_SIZE_MAX);
	requirePositiveNumber(
		form.unitPerCase,
		"unitPerCase",
		"Unit per case",
		true,
		UNIT_PER_CASE_MAX,
	);
	requirePositiveNumber(form.grossWeight, "grossWeight", "Gross weight", true, DECIMAL_18_4_MAX);
	requirePositiveNumber(form.mrp, "mrp", "MRP", true, MRP_MAX);
	requirePositiveNumber(form.costPrice, "costPrice", "Cost price", true, COST_PRICE_MAX);
	requireNonNegativeNumber(
		form.netWeightPerPackagingUnit,
		"netWeightPerPackagingUnit",
		"Net weight",
		DECIMAL_18_4_MAX,
	);

	return errors;
}

export function formValuesToProduct(
	form: ProductFormValues,
	base: Partial<Product> & {
		id: number;
		productImages?: ProductImage[];
		productUrls?: ProductUrl[];
	},
): Product {
	const productCode = resolveProductCodeForSave(form.category, form.productCode);
	const parseOptionalNum = (val: string) =>
		val && !isNaN(Number(val)) ? Number(val) : undefined;

	const packSize = parseOptionalNum(form.packSize);
	const unitPerCase = parseOptionalNum(form.unitPerCase);
	const baseUnit = normalizeProductUnit(form.baseUnit);
	const mou =
		getMouFromUnit(baseUnit) ?? (form.mou.trim() || undefined);
	const netWeightPerPackagingUnit =
		calculateNetWeightPerPackagingUnit(packSize, unitPerCase, baseUnit) ??
		parseOptionalNum(form.netWeightPerPackagingUnit);
	const grossWeight = parseOptionalNum(form.grossWeight);
	const mrp = parseOptionalNum(form.mrp);
	const costPrice = parseOptionalNum(form.costPrice);
	const acctDefaults = resolveProductAccountingDefaults();

	return {
		id: base.id,
		productCode,
		supplier: form.supplier.trim() || undefined,
		supplierCode: form.supplierCode.trim().toUpperCase() || undefined,
		productId: base.productId ?? "",
		productName: form.productName.trim(),
		scientificName: form.scientificName.trim() || undefined,
		category: form.category,
		subCategory: "",
		segment: form.segment,
		form: form.form,
		cfu: form.cfu.trim() || undefined,
		authority: form.authority.trim() || undefined,
		sku: form.sku.trim().toUpperCase(),
		hsnCode: form.hsnCode.trim(),
		hsnId: form.hsnId ? Number(form.hsnId) : undefined,
		gstRate: form.gstRate,
		gstId: form.gstId ? Number(form.gstId) : undefined,
		packSize,
		baseUnit,
		mou,
		unitPerCase,
		packagingUnit: form.packagingUnit,
		netWeightPerPackagingUnit,
		grossWeight,
		mrp,
		costPrice,
		status: form.status,
		createdBy: base.createdBy ?? "Admin",
		createdDate: base.createdDate ?? todayStr(),
		updatedBy: "Admin",
		updatedDate: todayStr(),
		productImages: base.productImages ?? [],
		productUrls: base.productUrls ?? [],
		unitSize: packSize,
		conversionQuantity: unitPerCase,
		unitsPerCase: unitPerCase,
		netWeight: netWeightPerPackagingUnit,
		vendorProductCode: form.supplierCode.trim() || undefined,
		inventoryAccount:
			form.inventoryAccount.trim() || acctDefaults.inventoryAccount,
		salesAccount: form.salesAccount.trim() || acctDefaults.salesAccount,
		purchaseAccount: form.purchaseAccount.trim() || acctDefaults.purchaseAccount,
		cogsAccount: form.cogsAccount.trim() || acctDefaults.cogsAccount,
	};
}
