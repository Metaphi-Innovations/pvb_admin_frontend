"use client";

import React, { useMemo, useRef, useState } from "react";
import {
	AlertCircle,
	Download,
	Image as ImageIcon,
	Upload,
	X,
	FileText,
	Link2,
	ExternalLink,
	Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
	type ProductAsset,
	type ProductStatus,
	createMediaItem,
	createLinkMediaItem,
	getAssetDisplayType,
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
	assets,
	mediaItems,
	onAssetAdd,
	onMediaAdd,
	onAssetRemove,
	onMediaRemove,
	readOnly,
}: {
	form: ProductFormValues;
	onChange: (form: ProductFormValues) => void;
	errors: Record<string, string>;
	onClearError: (key: string) => void;
	assets?: ProductAsset[];
	mediaItems?: ProductAsset[];
	onAssetAdd?: (items: ProductAsset[]) => void;
	onMediaAdd?: (items: ProductAsset[]) => void;
	onAssetRemove?: (id: string) => void;
	onMediaRemove?: (id: string) => void;
	onAssetUpload?: () => void;
	onMediaUpload?: () => void;
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

	const mediaInputRef = useRef<HTMLInputElement | null>(null);
	const openMediaPicker = () => mediaInputRef.current?.click();
	const [linkTitle, setLinkTitle] = useState("");
	const [linkUrl, setLinkUrl] = useState("");
	const [previewImage, setPreviewImage] = useState<{
		src: string;
		name: string;
	} | null>(null);
	const allAssets = assets ?? mediaItems ?? [];
	const emitAdd = onAssetAdd ?? onMediaAdd ?? (() => {});
	const emitRemove = onAssetRemove ?? onMediaRemove ?? (() => {});

	const getAssetUrl = (item: ProductAsset) =>
		item.url ?? item.fileUrl ?? item.previewUrl ?? item.src ?? "";

	const getAssetIcon = (item: ProductAsset) => {
		if (item.type === "link") return <Link2 className='w-4 h-4' />;
		if (item.mediaKind === "pdf" || item.kind === "document")
			return <FileText className='w-4 h-4' />;
		return <ImageIcon className='w-4 h-4' />;
	};

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

	const downloadAsset = (item: ProductAsset) => {
		const url = getAssetUrl(item);
		if (!url) return;
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = item.name || "download";
		anchor.target = "_blank";
		anchor.rel = "noopener noreferrer";
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
	};

	const openAsset = (item: ProductAsset) => {
		const url = getAssetUrl(item);
		if (!url) return;
		if (
			item.type === "media" &&
			(item.mediaKind === "image" || item.kind === "image")
		) {
			setPreviewImage({ src: url, name: item.name });
			return;
		}
		openExternal(url);
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
				<div className='pt-3 border-t border-border/60 space-y-2.5'>
					<SectionHead
						label='Media & Documents'
						sub='Product images, brochures, label artwork, and external links.'
					/>

					{!readOnly && (
						<div className='flex items-center gap-2'>
							<input
								ref={mediaInputRef}
								type='file'
								accept='image/png,image/jpeg,image/jpg,image/webp,.pdf'
								multiple
								className='hidden'
								onChange={(e) => {
									const files = Array.from(e.target.files ?? []);
									const items = files.map((file) => createMediaItem(file));
									if (items.length) emitAdd(items);
									e.currentTarget.value = "";
								}}
							/>

							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-7 px-2.5 text-[11px] border-brand-300 hover:bg-brand-50 hover:text-brand-700'
								onClick={openMediaPicker}
							>
								<Upload className='w-3 h-3 mr-1.5 text-brand-600' /> Upload Media
							</Button>

							<Popover>
								<PopoverTrigger asChild>
									<Button
										type='button'
										variant='outline'
										size='sm'
										className='h-7 px-2.5 text-[11px] border-border hover:bg-muted/30'
									>
										<Plus className='w-3 h-3 mr-1.5 text-muted-foreground' /> Add URL
									</Button>
								</PopoverTrigger>
								<PopoverContent
									className='w-72 p-3 bg-white border border-border shadow-lg rounded-xl space-y-2.5'
									align='start'
								>
									<p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
										Add External URL
									</p>
									<div className='space-y-2'>
										<div className='space-y-0.5'>
											<Label className='text-[10px] font-medium text-muted-foreground'>
												Link Title
											</Label>
											<Input
												value={linkTitle}
												onChange={(e) => setLinkTitle(e.target.value)}
												placeholder='e.g. Product website'
												className='h-7 text-xs'
											/>
										</div>
										<div className='space-y-0.5'>
											<Label className='text-[10px] font-medium text-muted-foreground'>
												URL
											</Label>
											<Input
												value={linkUrl}
												onChange={(e) => setLinkUrl(e.target.value)}
												placeholder='https://…'
												className='h-7 text-xs'
											/>
										</div>
									</div>
									<Button
										type='button'
										className='w-full h-7 text-xs text-white bg-brand-600 hover:bg-brand-700'
										disabled={!linkTitle.trim() || !linkUrl.trim()}
										onClick={() => {
											emitAdd([
												createLinkMediaItem(linkTitle.trim(), linkUrl.trim()),
											]);
											setLinkTitle("");
											setLinkUrl("");
										}}
									>
										<Link2 className='mr-1.5 h-3 w-3' /> Save Link
									</Button>
								</PopoverContent>
							</Popover>
						</div>
					)}

					<div className='border border-border/60 rounded-xl overflow-hidden bg-white'>
						{allAssets.length === 0 ? (
							<p className='px-4 py-5 text-xs text-center text-muted-foreground'>
								No media or documents attached.
							</p>
						) : (
							<div className='divide-y divide-border/40'>
								{allAssets.map((item) => {
									const url = getAssetUrl(item);
									const typeLabel = getAssetDisplayType(item);
									const isImage =
										item.type === "media" &&
										(item.mediaKind === "image" || item.kind === "image");
									return (
										<div
											key={item.id}
											className='grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1fr)_100px_120px_auto] items-center gap-2 px-3 py-2 hover:bg-muted/15 transition-colors'
										>
											<div className='flex items-center min-w-0 gap-2.5'>
												<div className='flex items-center justify-center flex-shrink-0 overflow-hidden border rounded-md h-8 w-8 border-border/50 bg-muted/20 text-brand-600'>
													{isImage && url ? (
														<img
															src={url}
															alt={item.name}
															className='object-cover w-full h-full cursor-pointer'
															onClick={() => openAsset(item)}
														/>
													) : (
														getAssetIcon(item)
													)}
												</div>
												<div className='min-w-0'>
													<p className='text-xs font-medium truncate text-foreground'>
														{item.title || item.name}
													</p>
													<p className='text-[10px] text-muted-foreground truncate'>
														{item.size || item.sizeLabel || "—"}
													</p>
												</div>
											</div>

											<span className='hidden md:block text-[10px] text-muted-foreground'>
												{typeLabel}
											</span>

											<div className='hidden md:flex items-center'>
												{isImage && url ? (
													<button
														type='button'
														onClick={() => openAsset(item)}
														className='text-[10px] text-brand-600 hover:underline'
													>
														Preview
													</button>
												) : url ? (
													<button
														type='button'
														onClick={() => openExternal(url)}
														className='text-[10px] text-brand-600 hover:underline'
													>
														Open
													</button>
												) : (
													<span className='text-[10px] text-muted-foreground'>—</span>
												)}
											</div>

											<div className='flex items-center gap-1 justify-end'>
												<span className='md:hidden text-[9px] text-muted-foreground mr-1'>
													{typeLabel}
												</span>
												{url && (
													<>
														<Button
															type='button'
															variant='ghost'
															size='icon'
															className='w-7 h-7 text-muted-foreground hover:text-foreground'
															onClick={() => downloadAsset(item)}
															title='Download'
														>
															<Download className='w-3.5 h-3.5' />
														</Button>
														<Button
															type='button'
															variant='ghost'
															size='icon'
															className='w-7 h-7 md:hidden text-muted-foreground hover:text-foreground'
															onClick={() => openAsset(item)}
															title='Preview'
														>
															<ExternalLink className='w-3.5 h-3.5' />
														</Button>
													</>
												)}
												{!readOnly && (
													<Button
														type='button'
														variant='ghost'
														size='icon'
														className='w-7 h-7 hover:bg-red-50 text-muted-foreground hover:text-red-600'
														onClick={() => emitRemove(item.id)}
														title='Delete'
													>
														<X className='w-3.5 h-3.5' />
													</Button>
												)}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</div>

			<Dialog
				open={!!previewImage}
				onOpenChange={(open) => !open && setPreviewImage(null)}
			>
				<DialogContent className='max-w-3xl p-4 bg-white border shadow-lg border-border rounded-xl'>
					<DialogHeader className='pb-2 border-b border-border/50'>
						<DialogTitle className='text-sm font-semibold truncate text-foreground'>
							{previewImage?.name}
						</DialogTitle>
					</DialogHeader>
					<div className='flex items-center justify-center py-4 rounded-lg bg-muted/5'>
						<img
							src={previewImage?.src}
							alt={previewImage?.name}
							className='max-h-[70vh] max-w-full object-contain'
						/>
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
		productId: string;
		assets?: ProductAsset[];
		mediaItems?: ProductAsset[];
	},
): Product {
	return {
		id: base.id,
		productId: base.productId,
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
		assets: base.assets ?? base.mediaItems ?? [],
		mediaItems: base.assets ?? base.mediaItems ?? [],
		baseUnit: form.baseUnit,
		packagingUnit: form.packagingUnit,
		conversionQuantity: form.conversionQuantity
			? Number(form.conversionQuantity)
			: undefined,
	};
}
