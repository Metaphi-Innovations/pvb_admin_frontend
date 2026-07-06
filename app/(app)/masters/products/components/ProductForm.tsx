"use client";

import React, { useMemo, useRef, useState } from "react";
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
import { loadHSNMasters } from "../../hsn/hsn-data";
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
	loadActiveCategoryOptions,
	loadActiveCfuOptions,
	loadActiveFormOptions,
	loadActiveSegmentOptions,
	loadActiveSupplierOptions,
	loadProducts,
	generateProductCode,
	normalizeProductUnit,
	resolveProductCodeForSave,
	resolveProductTaxFromHsn,
	resolveSupplierCode,
	todayStr,
} from "../product-data";
import { resolveProductAccountingDefaults } from "@/lib/accounts/erp-accounting-mapping";
import { IndianRupeeInput } from "@/components/ui/IndianRupeeInput";
import { ListingStatusToggle } from "@/components/listing";
import { useCategoriesDropdown, useSegmentsDropdown, useHsnDropdown, useSuppliersDropdown } from "@/hooks/masters";

export interface ProductFormValues {
	productCode: string;
	supplier: string;
	supplierCode: string;
	productName: string;
	scientificName: string;
	segment: string;
	category: string;
	form: string;
	cfu: string;
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
		category: product.category,
		form: product.form ?? product.formulation ?? "",
		cfu: product.cfu ?? "",
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
		mrp: product.mrp !== undefined ? String(product.mrp) : "",
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
	onUrlAdd?: (item: ProductUrl) => void;
	onUrlRemove?: (id: string) => void;
	readOnly?: boolean;
	isNew?: boolean;
}) {
	const set = <K extends keyof ProductFormValues>(
		key: K,
		value: ProductFormValues[K],
	) => {
		let next = { ...form, [key]: value } as ProductFormValues;
		if (key === "packSize" || key === "unitPerCase" || key === "baseUnit") {
			next = applyPackagingCalculations(next);
		}
		onChange(next);
		onClearError(key);
	};

	const handleCategoryChange = (category: string) => {
		const next = { ...form, category };
		if (isNew && category) {
			next.productCode = generateProductCode(category, loadProducts());
			onClearError("productCode");
		}
		onChange(next);
		onClearError("category");
	};

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

	const segmentOptions = useMemo(() => {
		if (!segmentsData) return [];
		return segmentsData.map((s) => ({ value: s.segmentName, label: s.segmentName }));
	}, [segmentsData]);

	const categoryOptions = useMemo(() => {
		if (!categoriesData) return [];
		return categoriesData.map((c) => ({ value: c.categoryName, label: c.categoryName }));
	}, [categoriesData]);

	const formOptions = useMemo(() => loadActiveFormOptions(), []);
	const cfuOptions = useMemo(() => loadActiveCfuOptions(), []);

	const supplierOptions = useMemo(() => {
		if (!suppliersData) return [];
		return suppliersData.map((s) => ({
			value: s.supplier_id,
			label: s.supplierName,
		}));
	}, [suppliersData]);

	const hsnOptions = useMemo(() => {
		if (!hsnData) return [];
		return hsnData.map((h) => ({ value: h.id, label: h.hsnDescription }));
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
			"h-8 text-xs",
			errors[key] && "border-red-400 focus-visible:ring-red-300",
		);

	const formGrid = "grid grid-cols-2 md:grid-cols-4 gap-3";

	const decimalInput = (key: keyof ProductFormValues, value: string) =>
		set(
			key,
			value
				.replace(/[^0-9.]/g, "")
				.replace(/(\..*)\./g, "$1") as ProductFormValues[keyof ProductFormValues],
		);

	const imageInputRef = useRef<HTMLInputElement | null>(null);
	const [linkUrl, setLinkUrl] = useState("");
	const [linkUrlError, setLinkUrlError] = useState("");
	const [urlDialogOpen, setUrlDialogOpen] = useState(false);
	const [previewImage, setPreviewImage] = useState<ProductImage | null>(null);
	const [uploadingImages, setUploadingImages] = useState(false);

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
				<SectionHead label='Product Inform2323232ation' />
				<div className={formGrid}>
					<div className='space-y-1 md:col-span-1'>
						<Label className='text-xs font-medium'>
							Product Code <span className='text-red-500'>*</span>
						</Label>
						<Input
							value={form.productCode}
							onChange={(e) =>
								set("productCode", e.target.value.toUpperCase())
							}
							placeholder='Auto-generated from category — editable'
							className={cn("font-mono", inputCls("productCode"))}
							disabled={readOnly}
						/>
						<p className='text-[10px] text-muted-foreground leading-snug'>
							Auto-filled when category is selected. You can edit if needed.
						</p>
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
						className='md:col-span-2'
					/>

					<div className='space-y-1 md:col-span-1'>
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

					<div className='space-y-1 md:col-span-2'>
						<Label className='text-xs font-medium'>
							Product Name <span className='text-red-500'>*</span>
						</Label>
						<Input
							value={form.productName}
							onChange={(e) => set("productName", e.target.value)}
							placeholder='e.g. NutriGrow WS 19:19:19'
							className={inputCls("productName")}
							disabled={readOnly}
						/>
						<FieldError msg={errors.productName} />
					</div>

					<div className='space-y-1 md:col-span-1'>
						<Label className='text-xs font-medium'>Scientific Name</Label>
						<Input
							value={form.scientificName}
							onChange={(e) => set("scientificName", e.target.value)}
							placeholder='e.g. Trichoderma viride'
							className={inputCls("scientificName")}
							disabled={readOnly}
						/>
					</div>

					<div className='space-y-1 md:col-span-1'>
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
						value={form.segment}
						onChange={(v) => set("segment", v)}
						options={segmentOptions}
						placeholder='Select segment…'
						disabled={readOnly}
						error={errors.segment}
					/>

					<SelectField
						label='Category'
						required
						value={form.category}
						onChange={handleCategoryChange}
						options={categoryOptions}
						placeholder='Select category…'
						disabled={readOnly}
						error={errors.category}
					/>

					<SelectField
						label='Form'
						required
						value={form.form}
						onChange={(v) => set("form", v)}
						options={formOptions}
						placeholder='Select form…'
						disabled={readOnly}
						error={errors.form}
					/>

					<SelectField
						label='CFU'
						value={form.cfu}
						onChange={(v) => set("cfu", v)}
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
						<Label className='text-xs font-medium'>Gross Weight</Label>
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
						<Label className='text-xs font-medium'>MRP</Label>
						<IndianRupeeInput
							value={
								form.mrp && !isNaN(Number(form.mrp)) ? Number(form.mrp) : 0
							}
							onChange={(v) => set("mrp", v > 0 ? String(v) : "")}
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
				</div>
			</div>

			{/* Status */}
			<div className='pt-3 border-t border-border/60'>
				<SectionHead label='Status' />
				<div className='flex items-center gap-3'>
					<ListingStatusToggle
						active={form.status === "active"}
						onChange={(val) =>
							!readOnly &&
							set("status", val ? "active" : "inactive")
						}
					/>
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
							className={cn("h-8 text-xs", linkUrlError && "border-red-400")}
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
		</div>
	);
}

export function validateProductForm(
	form: ProductFormValues,
): Record<string, string> {
	const errors: Record<string, string> = {};
	const productCode = resolveProductCodeForSave(form.category, form.productCode);

	if (!form.productName.trim()) errors.productName = "Product name is required";
	if (!form.segment) errors.segment = "Segment is required";
	if (!form.category) errors.category = "Category is required";
	if (!form.form) errors.form = "Form is required";
	if (!productCode) {
		errors.productCode = "Product code is required";
	}
	if (!form.sku.trim()) errors.sku = "SKU is required";
	if (!form.hsnCode.trim()) errors.hsnCode = "HSN code is required";
	else if (!form.gstRate?.trim()) {
		errors.gstRate =
			"Selected HSN does not have a GST rate mapped. Choose another HSN code.";
	}
	if (!form.packSize) {
		errors.packSize = "Pack size is required";
	} else if (isNaN(Number(form.packSize)) || Number(form.packSize) <= 0) {
		errors.packSize = "Must be a positive number";
	}
	if (!form.baseUnit) errors.baseUnit = "Unit is required";
	if (!form.packagingUnit) errors.packagingUnit = "Packaging unit is required";
	if (!form.unitPerCase) {
		errors.unitPerCase = "Unit per case is required";
	} else if (isNaN(Number(form.unitPerCase)) || Number(form.unitPerCase) <= 0) {
		errors.unitPerCase = "Must be a positive number";
	}
	if (
		form.grossWeight &&
		(isNaN(Number(form.grossWeight)) || Number(form.grossWeight) <= 0)
	) {
		errors.grossWeight = "Must be a positive number";
	}
	if (form.mrp && (isNaN(Number(form.mrp)) || Number(form.mrp) < 0)) {
		errors.mrp = "MRP must be a valid amount";
	}
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
