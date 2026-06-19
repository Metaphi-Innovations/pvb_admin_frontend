"use client";

import React, { useMemo, useRef, useState } from "react";
import {
	AlertCircle,
	Eye,
	Download,
	Image as ImageIcon,
	Upload,
	X,
	ExternalLink,
	Plus,
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
import { loadUOMMasters } from "../../uom/uom-data";
import { loadHSNMasters } from "../../hsn/hsn-data";
import {
	type Product,
	type ProductImage,
	type ProductUrl,
	type ProductStatus,
	createProductImageFromFile,
	createProductUrl,
	getImagePreviewUrl,
	isAllowedProductImageFile,
	isValidProductUrl,
	loadActiveCategoryOptions,
	loadActiveCfuOptions,
	loadActiveFormOptions,
	loadActiveSegmentOptions,
	resolveProductTaxFromHsn,
	todayStr,
} from "../product-data";

export interface ProductFormValues {
	productName: string;
	scientificName: string;
	category: string;
	segment: string;
	form: string;
	cfu: string;
	hsnCode: string;
	hsnId: string;
	gstRate: string;
	gstId: string;
	sku: string;
	status: ProductStatus;
	baseUnit: string;
	packagingUnit: string;
	conversionQuantity: string;
}

export const DEFAULT_PRODUCT_FORM: ProductFormValues = {
	productName: "",
	scientificName: "",
	category: "",
	segment: "",
	form: "",
	cfu: "",
	hsnCode: "",
	hsnId: "",
	gstRate: "",
	gstId: "",
	sku: "",
	status: "active",
	baseUnit: "",
	packagingUnit: "",
	conversionQuantity: "",
};

export function productToFormValues(product: Product): ProductFormValues {
	const tax =
		typeof window !== "undefined" && product.hsnCode
			? resolveProductTaxFromHsn(product.hsnCode)
			: null;

	return {
		productName: product.productName,
		scientificName: product.scientificName ?? "",
		category: product.category,
		segment: product.segment,
		form: product.form ?? product.formulation ?? "",
		cfu: product.cfu ?? "",
		hsnCode: product.hsnCode,
		hsnId: tax ? String(tax.hsnId) : product.hsnId ? String(product.hsnId) : "",
		gstRate: tax?.gstRate ?? product.gstRate,
		gstId: tax?.gstId
			? String(tax.gstId)
			: product.gstId
				? String(product.gstId)
				: "",
		sku: product.sku,
		status: product.status,
		baseUnit: product.baseUnit ?? "",
		packagingUnit: product.packagingUnit ?? "",
		conversionQuantity:
			product.conversionQuantity !== undefined
				? String(product.conversionQuantity)
				: "",
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
}: {
	label: string;
	required?: boolean;
	value: string;
	onChange: (v: string) => void;
	options: { value: string; label: string }[];
	placeholder?: string;
	disabled?: boolean;
	error?: string;
}) {
	return (
		<div className='space-y-1'>
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
}) {
	const set = <K extends keyof ProductFormValues>(
		key: K,
		value: ProductFormValues[K],
	) => {
		onChange({ ...form, [key]: value });
		onClearError(key);
	};

	const segmentOptions = useMemo(() => loadActiveSegmentOptions(), []);
	const categoryOptions = useMemo(() => loadActiveCategoryOptions(), []);
	const formOptions = useMemo(() => loadActiveFormOptions(), []);
	const cfuOptions = useMemo(() => loadActiveCfuOptions(), []);

	const hsnMasters = typeof window !== "undefined" ? loadHSNMasters() : [];
	const hsnOptions = hsnMasters
		.filter((h) => h.status === "active")
		.map((h) => ({
			value: h.hsnCode,
			label: h.hsnCode,
		}));

	const handleHSNChange = (hsnCode: string) => {
		if (!hsnCode) {
			onChange({ ...form, hsnCode: "", hsnId: "", gstRate: "", gstId: "" });
			onClearError("hsnCode");
			onClearError("gstRate");
			return;
		}
		const tax = resolveProductTaxFromHsn(hsnCode);
		onChange({
			...form,
			hsnCode,
			hsnId: tax ? String(tax.hsnId) : "",
			gstRate: tax?.gstRate ?? "",
			gstId: tax?.gstId ? String(tax.gstId) : "",
		});
		onClearError("hsnCode");
		onClearError("gstRate");
	};

	const inputCls = (key: string) =>
		cn(
			"h-8 text-xs",
			errors[key] && "border-red-400 focus-visible:ring-red-300",
		);

	const uomData = typeof window !== "undefined" ? loadUOMMasters() : [];
	const uomOptions =
		uomData.length > 0
			? uomData
					.filter((u) => u.status === "active")
					.map((u) => ({ value: u.shortName, label: u.shortName }))
			: [
					{ value: "KG", label: "KG" },
					{ value: "Gram", label: "Gram" },
					{ value: "Liter", label: "Liter" },
					{ value: "ML", label: "ML" },
					{ value: "Packet", label: "Packet" },
					{ value: "Bottle", label: "Bottle" },
					{ value: "Box", label: "Box" },
					{ value: "Drum", label: "Drum" },
				];

	const decimalInput = (key: keyof ProductFormValues, value: string) =>
		set(
			key,
			value
				.replace(/[^0-9.]/g, "")
				.replace(/(\..*)\./g, "$1") as ProductFormValues[keyof ProductFormValues],
		);

	const imageInputRef = useRef<HTMLInputElement | null>(null);
	const openImagePicker = () => imageInputRef.current?.click();
	const [linkUrl, setLinkUrl] = useState("");
	const [linkUrlError, setLinkUrlError] = useState("");
	const [urlDialogOpen, setUrlDialogOpen] = useState(false);
	const [previewImage, setPreviewImage] = useState<ProductImage | null>(null);
	const [uploadingImages, setUploadingImages] = useState(false);

	const openExternal = (url?: string) => {
		if (!url) return;
		const trimmedUrl = url.trim();
		const isAbsoluteUrl =
			/^https?:\/\//i.test(trimmedUrl) ||
			/^blob:/i.test(trimmedUrl) ||
			/^data:/i.test(trimmedUrl);
		const safeUrl = isAbsoluteUrl ? trimmedUrl : `https://${trimmedUrl}`;
		window.open(safeUrl, "_blank", "noopener,noreferrer");
	};

	const downloadImage = (image: ProductImage) => {
		const url = getImagePreviewUrl(image);
		if (!url) return;
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = image.name || "product-image";
		anchor.target = "_blank";
		anchor.rel = "noopener noreferrer";
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
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
			<div className='pt-1 space-y-4'>
				{/* Basic Product Information */}
				<div>
					<SectionHead label='Basic Product Information' />
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
						<div className='space-y-1'>
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

						<SelectField
							label='Segment'
							required
							value={form.segment}
							onChange={(value) => set("segment", value)}
							options={segmentOptions}
							placeholder='Select segment…'
							disabled={readOnly}
							error={errors.segment}
						/>

						<SelectField
							label='Category'
							required
							value={form.category}
							onChange={(value) => set("category", value)}
							options={categoryOptions}
							placeholder='Select category…'
							disabled={readOnly}
							error={errors.category}
						/>

						<SelectField
							label='Form'
							required
							value={form.form}
							onChange={(value) => set("form", value)}
							options={formOptions}
							placeholder='Select form…'
							disabled={readOnly}
							error={errors.form}
						/>

						<SelectField
							label='CFU'
							value={form.cfu}
							onChange={(value) => set("cfu", value)}
							options={cfuOptions}
							placeholder='Select CFU…'
							disabled={readOnly}
							error={errors.cfu}
						/>
					</div>
				</div>

				{/* Tax & Compliance */}
				<div className='pt-3 border-t border-border/60'>
					<SectionHead
						label='Tax & Compliance'
						sub='Pricing (CP, DP, RP, MRP) is maintained in Pricing Master.'
					/>
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
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
								GST <span className='text-red-500'>*</span>
							</Label>
							<Input
								value={form.gstRate}
								readOnly
								disabled
								placeholder='Select HSN code first'
								className={cn(
									"h-8 text-xs bg-muted/30 cursor-not-allowed",
									errors.gstRate && "border-red-400",
								)}
							/>
							<p className='text-[10px] text-muted-foreground leading-snug'>
								GST is auto-filled from selected HSN code.
							</p>
							<FieldError msg={errors.gstRate} />
						</div>
					</div>
				</div>

				{/* Packaging Information */}
				<div className='pt-3 border-t border-border/60'>
					<SectionHead label='Packaging Information' />
					<div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
						<SelectField
							label='Base Unit'
							required
							value={form.baseUnit}
							onChange={(value) => set("baseUnit", value)}
							options={uomOptions}
							placeholder='Select base unit…'
							disabled={readOnly}
							error={errors.baseUnit}
						/>

						<SelectField
							label='Packaging Unit'
							required
							value={form.packagingUnit}
							onChange={(value) => set("packagingUnit", value)}
							options={uomOptions}
							placeholder='Select packaging unit…'
							disabled={readOnly}
							error={errors.packagingUnit}
						/>

						<div className='space-y-1'>
							<Label className='text-xs font-medium'>
								Conversion Quantity <span className='text-red-500'>*</span>
							</Label>
							<Input
								value={form.conversionQuantity}
								onChange={(e) =>
									decimalInput("conversionQuantity", e.target.value)
								}
								placeholder='e.g. 25'
								className={inputCls("conversionQuantity")}
								inputMode='decimal'
								disabled={readOnly}
							/>
							<FieldError msg={errors.conversionQuantity} />
						</div>
					</div>
				</div>

				{/* Media & Documents */}
				<div className='pt-3 border-t border-border/60 space-y-3'>
					<SectionHead
						label='Media & Documents'
						sub='Product images and external document links.'
					/>

					<div className='space-y-2'>
						<div className='flex items-center justify-between gap-2'>
							<p className='text-[11px] font-semibold text-foreground'>Product Images</p>
							{!readOnly && (
								<div className='flex items-center gap-2'>
									<input
										ref={imageInputRef}
										type='file'
										accept='image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
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
										className='h-7 px-2.5 text-[11px] border-brand-300 hover:bg-brand-50 hover:text-brand-700'
										onClick={openImagePicker}
										disabled={uploadingImages}
									>
										<Upload className='w-3 h-3 mr-1.5 text-brand-600' />
										{uploadingImages ? "Uploading…" : "Upload Images"}
									</Button>
								</div>
							)}
						</div>

						{productImages.length === 0 && readOnly ? (
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
											className='flex flex-col overflow-hidden border rounded-lg border-border/60 bg-white shadow-sm'
										>
											<button
												type='button'
												className='relative h-[88px] w-full bg-muted/20 group/thumb'
												onClick={() => setPreviewImage(image)}
												title='Click to preview'
											>
												{preview ? (
													<img
														src={preview}
														alt={image.name}
														className='object-cover w-full h-full'
													/>
												) : (
													<div className='flex items-center justify-center w-full h-full text-muted-foreground'>
														<ImageIcon className='w-5 h-5' />
													</div>
												)}
												<span className='absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[9px] font-medium bg-black/55 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity'>
													Click to preview
												</span>
											</button>
											<div className='px-2 py-1.5 space-y-1 border-t border-border/40'>
												<p
													className='text-[10px] font-medium truncate text-foreground'
													title={image.name}
												>
													{image.name}
												</p>
												<p className='text-[9px] text-muted-foreground'>
													{image.size || "—"}
												</p>
												<div className='flex items-center gap-1 pt-0.5'>
													<Button
														type='button'
														variant='outline'
														size='sm'
														className='h-6 flex-1 px-1 text-[9px] gap-1'
														onClick={() => setPreviewImage(image)}
													>
														<Eye className='w-3 h-3 shrink-0' />
														Preview
													</Button>
													<Button
														type='button'
														variant='outline'
														size='sm'
														className='h-6 w-7 px-0 shrink-0'
														onClick={() => downloadImage(image)}
														title='Download'
													>
														<Download className='w-3 h-3' />
													</Button>
													{!readOnly && (
														<Button
															type='button'
															variant='outline'
															size='sm'
															className='h-6 w-7 px-0 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50'
															onClick={() => onImageRemove?.(image.id)}
															title='Delete'
														>
															<X className='w-3 h-3' />
														</Button>
													)}
												</div>
											</div>
										</div>
									);
								})}

								{!readOnly && (
									<button
										type='button'
										onClick={openImagePicker}
										disabled={uploadingImages}
										className='flex flex-col items-center justify-center h-[118px] border border-dashed rounded-lg border-border/70 bg-muted/10 text-muted-foreground hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700 transition-colors'
									>
										<Plus className='w-4 h-4 mb-1' />
										<span className='text-[10px] font-medium'>Upload</span>
									</button>
								)}
							</div>
						)}

						{productImages.length === 0 && !readOnly && (
							<p className='text-[10px] text-muted-foreground'>
								No product images uploaded. JPG, JPEG, PNG, WEBP supported.
							</p>
						)}
					</div>

					<div className='pt-2 space-y-2 border-t border-border/40'>
						<div className='flex items-center justify-between gap-2'>
							<p className='text-[11px] font-semibold text-foreground'>Document URLs</p>
							{!readOnly && (
								<Button
									type='button'
									variant='outline'
									size='sm'
									className='h-7 px-2.5 text-[11px] border-border hover:bg-muted/30'
									onClick={() => {
										setLinkUrl("");
										setLinkUrlError("");
										setUrlDialogOpen(true);
									}}
								>
									<Plus className='w-3 h-3 mr-1.5 text-muted-foreground' /> Add URL
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
										<tr className='border-b bg-muted/30 border-border/50'>
											<th className='w-12 px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground'>
												Sr No
											</th>
											<th className='px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground'>
												URL
											</th>
											<th className='w-24 px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground'>
												Open Link
											</th>
											{!readOnly && (
												<th className='w-16 px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground'>
													Delete
												</th>
											)}
										</tr>
									</thead>
									<tbody>
										{productUrls.map((item, index) => (
											<tr key={item.id} className='border-b border-border/40 last:border-0'>
												<td className='px-2 py-2 text-[11px] text-muted-foreground tabular-nums'>
													{index + 1}
												</td>
												<td className='px-2 py-2'>
													<p className='text-[11px] text-foreground truncate max-w-[280px] md:max-w-md' title={item.url}>
														{item.url}
													</p>
												</td>
												<td className='px-2 py-2 text-center'>
													<Button
														type='button'
														variant='ghost'
														size='icon'
														className='w-7 h-7 text-brand-600 hover:text-brand-700 hover:bg-brand-50'
														onClick={() => openExternal(item.url)}
														title='Open link'
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
															className='w-7 h-7 hover:bg-red-50 text-muted-foreground hover:text-red-600'
															onClick={() => onUrlRemove?.(item.id)}
															title='Delete'
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
				</div>
			</div>

			<Dialog
				open={!!previewImage}
				onOpenChange={(open) => {
					if (!open) setPreviewImage(null);
				}}
			>
				<DialogContent className='z-[500] max-w-3xl p-4 bg-white border shadow-lg border-border rounded-xl'>
					<DialogHeader className='pb-2 border-b border-border/50'>
						<DialogTitle className='text-sm font-semibold truncate text-foreground'>
							{previewImage?.name ?? "Image preview"}
						</DialogTitle>
					</DialogHeader>
					<div className='flex items-center justify-center min-h-[200px] py-4 rounded-lg bg-muted/5'>
						{previewImage && getImagePreviewUrl(previewImage) ? (
							<img
								src={getImagePreviewUrl(previewImage)}
								alt={previewImage.name}
								className='max-h-[70vh] max-w-full object-contain'
							/>
						) : (
							<p className='text-sm text-muted-foreground'>Preview unavailable</p>
						)}
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
				<DialogContent className='max-w-md p-4 bg-white border border-border rounded-xl shadow-lg'>
					<DialogHeader className='pb-2'>
						<DialogTitle className='text-sm font-semibold'>Add URL</DialogTitle>
					</DialogHeader>
					<div className='space-y-2'>
						<div className='space-y-1'>
							<Label className='text-xs font-medium'>
								URL <span className='text-red-500'>*</span>
							</Label>
							<Input
								value={linkUrl}
								onChange={(e) => {
									setLinkUrl(e.target.value);
									if (linkUrlError) setLinkUrlError("");
								}}
								placeholder='Enter URL'
								className={cn("h-8 text-xs", linkUrlError && "border-red-400")}
							/>
							{linkUrlError && <FieldError msg={linkUrlError} />}
						</div>
						<div className='flex justify-end gap-2 pt-1'>
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-8 text-xs'
								onClick={() => setUrlDialogOpen(false)}
							>
								Cancel
							</Button>
							<Button
								type='button'
								size='sm'
								className='h-8 text-xs text-white bg-brand-600 hover:bg-brand-700'
								onClick={handleAddUrl}
							>
								Add URL
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
	if (!form.productName.trim()) errors.productName = "Product name is required";
	if (!form.segment) errors.segment = "Segment is required";
	if (!form.category) errors.category = "Category is required";
	if (!form.form) errors.form = "Form is required";
	if (!form.hsnCode.trim()) errors.hsnCode = "HSN code is required";
	else if (!form.gstRate?.trim()) {
		errors.gstRate =
			"Selected HSN does not have a GST rate mapped. Choose another HSN code.";
	}
	if (!form.sku.trim()) errors.sku = "SKU is required";
	if (!form.baseUnit) errors.baseUnit = "Base unit is required";
	if (!form.packagingUnit) errors.packagingUnit = "Packaging unit is required";
	if (!form.conversionQuantity) {
		errors.conversionQuantity = "Conversion quantity is required";
	} else if (
		isNaN(Number(form.conversionQuantity)) ||
		Number(form.conversionQuantity) <= 0
	) {
		errors.conversionQuantity = "Must be a positive number";
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
	return {
		id: base.id,
		productId: base.productId ?? "",
		productName: form.productName.trim(),
		scientificName: form.scientificName.trim() || undefined,
		category: form.category,
		subCategory: "",
		segment: form.segment,
		form: form.form,
		cfu: form.cfu.trim() || undefined,
		hsnCode: form.hsnCode.trim(),
		hsnId: form.hsnId ? Number(form.hsnId) : undefined,
		gstRate: form.gstRate,
		gstId: form.gstId ? Number(form.gstId) : undefined,
		sku: form.sku.trim().toUpperCase(),
		status: form.status,
		createdBy: base.createdBy ?? "Admin",
		createdDate: base.createdDate ?? todayStr(),
		updatedBy: "Admin",
		updatedDate: todayStr(),
		productImages: base.productImages ?? [],
		productUrls: base.productUrls ?? [],
		baseUnit: form.baseUnit,
		packagingUnit: form.packagingUnit,
		conversionQuantity: form.conversionQuantity
			? Number(form.conversionQuantity)
			: undefined,
	};
}
