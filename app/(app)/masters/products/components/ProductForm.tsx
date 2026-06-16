"use client";

import React, { useRef, useState } from "react";
import {
	AlertCircle,
	CheckCircle2,
	Image as ImageIcon,
	Package,
	Upload,
	X,
	ChevronsUpDown,
	Check,
	FileText,
	Link2,
	ExternalLink,
	Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { loadUOMMasters } from "../../uom/uom-data";
import { loadHSNMasters } from "../../hsn/hsn-data";
import {
	type Product,
	type ProductAsset,
	type ProductStatus,
	createMediaItem,
	createLinkMediaItem,
	PRODUCT_CATEGORY_OPTIONS,
	PRODUCT_FORMULATION_OPTIONS,
	PRODUCT_GST_OPTIONS,
	PRODUCT_SEGMENT_OPTIONS,
	PRODUCT_STATUS_OPTIONS,
	PRODUCT_SUBCATEGORY_OPTIONS,
	todayStr,
} from "../product-data";

export interface ProductFormValues {
	productName: string;
	category: string;
	subCategory: string;
	segment: string;
	formulation: string;
	hsnCode: string;
	gstRate: string;
	sku: string;
	cropApplicable: string;
	mrp: string;
	costPrice: string;
	distributorPrice: string;
	status: ProductStatus;
	baseUnit: string;
	packagingUnit: string;
	conversionQuantity: string;
}

export const DEFAULT_PRODUCT_FORM: ProductFormValues = {
	productName: "",
	category: "",
	subCategory: "",
	segment: "",
	formulation: "",
	hsnCode: "",
	gstRate: "",
	sku: "",
	cropApplicable: "",
	mrp: "",
	costPrice: "",
	distributorPrice: "",
	status: "active",
	baseUnit: "",
	packagingUnit: "",
	conversionQuantity: "",
};

export function productToFormValues(product: Product): ProductFormValues {
	return {
		productName: product.productName,
		category:
			PRODUCT_CATEGORY_OPTIONS.find(
				(option) => option.label === product.category,
			)?.value ?? "",
		subCategory:
			PRODUCT_SUBCATEGORY_OPTIONS.find(
				(option) => option.label === product.subCategory,
			)?.value ?? "",
		segment:
			PRODUCT_SEGMENT_OPTIONS.find((option) => option.label === product.segment)
				?.value ?? "",
		formulation:
			PRODUCT_FORMULATION_OPTIONS.find(
				(option) => option.label === product.formulation,
			)?.value ?? "",
		hsnCode: product.hsnCode,
		gstRate: product.gstRate,
		sku: product.sku,
		cropApplicable: product.cropApplicable,
		mrp: String(product.mrp),
		costPrice: String(product.costPrice),
		distributorPrice: String(product.distributorPrice),
		status: product.status,
		baseUnit: product.baseUnit ?? "",
		packagingUnit: product.packagingUnit ?? "",
		conversionQuantity:
			product.conversionQuantity !== undefined
				? String(product.conversionQuantity)
				: "",
	};
}

// ── Autocomplete (matches EmployeeForm AC) ────────────────────────────────────
interface ACOption {
	label: string;
	value: string;
	sublabel?: string;
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
	searchable = true,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: ACOption[];
	placeholder?: string;
	required?: boolean;
	error?: string;
	disabled?: boolean;
	searchable?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState("");
	const filtered = q
		? options.filter(
				(o) =>
					o.label.toLowerCase().includes(q.toLowerCase()) ||
					(o.sublabel && o.sublabel.toLowerCase().includes(q.toLowerCase())),
			)
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
								"truncate flex-1",
								selected ? "text-foreground" : "text-muted-foreground",
							)}
						>
							{selected?.label || placeholder || "Select…"}
						</span>
						<div className='flex items-center gap-1.5 flex-shrink-0'>
							{selected && !disabled && (
								<span
									onClick={(e) => {
										e.stopPropagation();
										onChange("");
									}}
									className='p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center'
								>
									<X className='w-3 h-3' />
								</span>
							)}
							<ChevronsUpDown className='w-3.5 h-3.5 text-muted-foreground' />
						</div>
					</button>
				</PopoverTrigger>
				<PopoverContent
					className='w-[--radix-popover-trigger-width] p-0'
					align='start'
				>
					{searchable && (
						<div className='p-1.5 border-b border-border'>
							<Input
								placeholder='Search…'
								value={q}
								onChange={(e) => setQ(e.target.value)}
								className='text-xs h-7 focus-visible:ring-0'
								autoFocus
							/>
						</div>
					)}
					<div className='py-1 overflow-y-auto max-h-48'>
						{filtered.length === 0 ? (
							<p className='px-3 py-4 text-xs text-center text-muted-foreground'>
								No options
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
										{opt.sublabel && (
											<span className='block text-[10px] text-muted-foreground truncate mt-0.5'>
												{opt.sublabel}
											</span>
										)}
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
		<p className='flex items-center gap-1 mt-1 text-[11px] text-red-500'>
			<AlertCircle className='w-3.5 h-3.5 flex-shrink-0' />
			{msg}
		</p>
	);
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
	onAssetUpload,
	onMediaUpload,
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

	const hsnMasters = typeof window !== "undefined" ? loadHSNMasters() : [];
	const hsnOptions = hsnMasters
		.filter((h) => h.status === "active")
		.map((h) => ({
			value: h.hsnCode,
			label: h.hsnCode,
			sublabel: h.hsnDescription,
		}));

	const handleHSNChange = (hsnCode: string) => {
		if (!hsnCode) {
			onChange({ ...form, hsnCode: "", gstRate: "" });
			onClearError("hsnCode");
			onClearError("gstRate");
		} else {
			const selectedHSN = hsnMasters.find((h) => h.hsnCode === hsnCode);
			const gstRate = selectedHSN ? selectedHSN.gstRate : "";
			onChange({ ...form, hsnCode, gstRate });
			onClearError("hsnCode");
			onClearError("gstRate");
		}
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
					{ value: "Ton", label: "Ton" },
					{ value: "Piece", label: "Piece" },
				];

	const decimalInput = (key: keyof ProductFormValues, value: string) =>
		set(
			key,
			value
				.replace(/[^0-9.]/g, "")
				.replace(
					/(\..*)\./g,
					"$1",
				) as ProductFormValues[keyof ProductFormValues],
		);

	const mediaInputRef = useRef<HTMLInputElement | null>(null);
	const docInputRef = useRef<HTMLInputElement | null>(null);
	const openMediaPicker = () => mediaInputRef.current?.click();
	const openDocPicker = () => docInputRef.current?.click();
	const [assetType, setAssetType] = useState<"media" | "link">("media");
	const [linkTitle, setLinkTitle] = useState("");
	const [linkUrl, setLinkUrl] = useState("");
	const [previewImage, setPreviewImage] = useState<{
		src: string;
		name: string;
	} | null>(null);
	const allAssets = assets ?? mediaItems ?? [];
	const emitAdd = onAssetAdd ?? onMediaAdd ?? (() => {});
	const emitRemove = onAssetRemove ?? onMediaRemove ?? (() => {});
	const emitUpload = onAssetUpload ?? onMediaUpload ?? (() => {});
	const imageItems = allAssets.filter(
		(item) => item.kind === "image" || item.mediaKind === "image",
	);
	const documentItems = allAssets.filter(
		(item) =>
			item.kind === "document" ||
			item.mediaKind === "pdf" ||
			item.mediaKind === "document" ||
			item.mediaKind === "spreadsheet",
	);
	const linkItems = allAssets.filter(
		(item) => item.kind === "link" || item.type === "link",
	);
	const readyCount = allAssets.filter((item) => !item.uploaded).length;

	const uploadSelected = () => emitUpload();
	const removeMedia = (id: string) => emitRemove(id);
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
	const getAssetUrl = (item: ProductAsset) =>
		item.url ?? item.fileUrl ?? item.previewUrl ?? item.src ?? "";
	const getAssetTypeLabel = (item: ProductAsset) => {
		if (item.type === "link") return "Link";
		switch (item.mediaKind ?? item.fileType?.toLowerCase()) {
			case "video":
				return "Video";
			case "pdf":
				return "PDF";
			case "document":
				return "Document";
			case "spreadsheet":
				return "Spreadsheet";
			default:
				return "Image";
		}
	};
	const getAssetIcon = (item: ProductAsset) => {
		if (item.type === "link") return <Link2 className='w-4 h-4' />;
		switch (item.mediaKind ?? item.fileType?.toLowerCase()) {
			case "video":
				return <FileText className='w-4 h-4' />;
			case "pdf":
			case "document":
			case "spreadsheet":
				return <FileText className='w-4 h-4' />;
			default:
				return <ImageIcon className='w-4 h-4' />;
		}
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
	const openDocument = (item: ProductAsset) => {
		openExternal(getAssetUrl(item));
	};

	return (
		<div className='w-full space-y-4'>
			{/* <div className="flex items-start gap-2.5 pb-3 border-b border-border">
        <div className="flex items-center justify-center flex-shrink-0 border rounded-lg w-7 h-7 bg-brand-50 border-brand-100">
          <Package className="w-3.5 h-3.5 text-brand-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Product Master</p>
          <p className="text-[11px] text-muted-foreground">Catalogue, pricing, compliance, and media</p>
        </div>
      </div> */}

			<div className='pt-1 space-y-5 ' >
				<div>
					<SectionHead label='Basic Details & Classification' />
					<div className='grid grid-cols-12 gap-5 md:gap-x-10'>
						{/* Product Name */}
						<div className='col-span-12 space-y-1 md:col-span-2'>
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

						{/* Status */}
						{/* <div className="col-span-12 md:col-span-2">
                <AC
                  label="Status"
                  value={form.status}
                  onChange={(value) => set("status", value as ProductStatus)}
                  options={PRODUCT_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                  placeholder="Select status..."
                  disabled={readOnly}
                />
              </div> */}

						{/* Category */}
						<div className='col-span-12 md:col-span-2 md:gap-x-10'>
							<AC
								label='Category'
								required
								value={form.category}
								onChange={(value) => set("category", value)}
								options={PRODUCT_CATEGORY_OPTIONS}
								placeholder='Select category...'
								disabled={readOnly}
							/>
							<FieldError msg={errors.category} />
						</div>

						{/* Sub Category
              <div className="col-span-12 md:col-span-3">
                <AC
                  label="Sub Category"
                  required
                  value={form.subCategory}
                  onChange={(value) => set("subCategory", value)}
                  options={PRODUCT_SUBCATEGORY_OPTIONS}
                  placeholder="Select sub category..."
                  disabled={readOnly}
                />
                <FieldError msg={errors.subCategory} />
              </div> */}

						{/* Segment */}
						<div className='col-span-12 md:col-span-2 md:gap-x-10'>
							<AC
								label='Segment'
								value={form.segment}
								onChange={(value) => set("segment", value)}
								options={PRODUCT_SEGMENT_OPTIONS}
								placeholder='Select segment...'
								disabled={readOnly}
							/>
						</div>

						{/* Formulation */}
						<div className='col-span-12 md:col-span-2'>
							<AC
								label='Formulation'
								value={form.formulation}
								onChange={(value) => set("formulation", value)}
								options={PRODUCT_FORMULATION_OPTIONS}
								placeholder='Select formulation...'
								disabled={readOnly}
							/>
						</div>
					</div>
				</div>

				<div className='pt-4 border-t border-border/60'>
					<SectionHead label='Pricing & Compliance' />
					<div className='grid grid-cols-12 gap-5'>
						{/* SKU */}
						<div className='col-span-12 space-y-1 md:col-span-2'>
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

						{/* HSN Code */}
						<div className='col-span-12 md:col-span-2'>
							<AC
								label='HSN Code'
								required
								value={form.hsnCode}
								onChange={handleHSNChange}
								options={hsnOptions}
								placeholder='Select HSN code...'
								disabled={readOnly}
								error={errors.hsnCode}
							/>
						</div>

						{/* GST Rate */}
						<div className='col-span-12 md:col-span-2'>
							<AC
								label='GST Rate'
								value={form.gstRate}
								onChange={(value) => set("gstRate", value)}
								options={PRODUCT_GST_OPTIONS}
								placeholder='Select GST rate...'
								disabled={readOnly || !!form.hsnCode}
							/>
						</div>

						{/* Crop Applicable */}
						<div className='col-span-12 space-y-1 md:col-span-2'>
							<Label className='text-xs font-medium'>Crop Applicable</Label>
							<Input
								value={form.cropApplicable}
								onChange={(e) => set("cropApplicable", e.target.value)}
								placeholder='e.g. Cotton, Paddy'
								className={inputCls("cropApplicable")}
								disabled={readOnly}
							/>
						</div>

						{/* MRP */}
						<div className='col-span-12 space-y-1 md:col-span-1'>
							<Label className='text-xs font-medium'>MRP</Label>
							<div className='relative'>
								<span className='absolute text-xs font-medium -translate-y-1/2 select-none left-2 top-1/2 text-muted-foreground'>
									₹
								</span>
								<Input
									value={form.mrp}
									onChange={(e) => decimalInput("mrp", e.target.value)}
									className={cn("pl-5", inputCls("mrp"))}
									inputMode='decimal'
									disabled={readOnly}
									placeholder='e.g. 500'
								/>
							</div>
						</div>

						{/* Cost Price */}
						{/* <div className='col-span-12 space-y-1 md:col-span-1'>
							<Label className='text-xs font-medium'>Cost Price</Label>
							<div className='relative'>
								<span className='absolute text-xs font-medium -translate-y-1/2 select-none left-2 top-1/2 text-muted-foreground'>
									₹
								</span>
								<Input
									value={form.costPrice}
									onChange={(e) => decimalInput("costPrice", e.target.value)}
									className={cn("pl-5", inputCls("costPrice"))}
									inputMode='decimal'
									disabled={readOnly}
									placeholder='0'
								/>
							</div>
						</div> */}

						{/* Distributor Price */}
						{/* <div className='col-span-12 space-y-1 md:col-span-1'>
							<Label className='text-xs font-medium'>Dist. Price</Label>
							<div className='relative'>
								<span className='absolute text-xs font-medium -translate-y-1/2 select-none left-2 top-1/2 text-muted-foreground'>
									₹
								</span>
								<Input
									value={form.distributorPrice}
									onChange={(e) => decimalInput("distributorPrice", e.target.value)}
									className={cn("pl-5", inputCls("distributorPrice"))}
									inputMode='decimal'
									disabled={readOnly}
									placeholder='0'
								/>
							</div>
						</div> */}

						{/* Divider / Line Break */}
						<div className='col-span-12' />

						{/* Base Unit */}
						<div className='col-span-12 space-y-1 md:col-span-1'>
							<Label className='text-xs font-medium'>
								Base Unit <span className='text-red-500'>*</span>
							</Label>
							<Select
								value={form.baseUnit}
								onValueChange={(value) => set("baseUnit", value)}
								disabled={readOnly}
							>
								<SelectTrigger className={cn(inputCls("baseUnit"), "pl-1.5 pr-0 text-[11px]")}>
									<SelectValue placeholder='Select...' />
								</SelectTrigger>
								<SelectContent className='bg-white border shadow-lg border-border'>
									{uomOptions.map((opt) => (
										<SelectItem
											key={opt.value}
											value={opt.value}
											className='text-xs'
										>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError msg={errors.baseUnit} />
						</div>

						{/* Packaging Unit */}
						<div className='col-span-12 space-y-1 md:col-span-1'>
							<Label className='text-xs font-medium'>
								Pack Unit <span className='text-red-500'>*</span>
							</Label>
							<Select
								value={form.packagingUnit}
								onValueChange={(value) => set("packagingUnit", value)}
								disabled={readOnly}
							>
								<SelectTrigger className={cn(inputCls("packagingUnit"), "pl-1.5 pr-0 text-[11px]")}>
									<SelectValue placeholder='Select...' />
								</SelectTrigger>
								<SelectContent className='bg-white border shadow-lg border-border'>
									{uomOptions.map((opt) => (
										<SelectItem
											key={opt.value}
											value={opt.value}
											className='text-xs'
										>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError msg={errors.packagingUnit} />
						</div>

						{/* Conversion Quantity */}
						<div className='col-span-12 space-y-1 md:col-span-1'>
							<Label className='text-xs font-medium'>
								Conv. Qty <span className='text-red-500'>*</span>
							</Label>
							<Input
								value={form.conversionQuantity}
								onChange={(e) =>
									decimalInput("conversionQuantity", e.target.value)
								}
								placeholder='25'
								className={inputCls("conversionQuantity")}
								inputMode='decimal'
								disabled={readOnly}
							/>
							<FieldError msg={errors.conversionQuantity} />
						</div>
					</div>
				</div>

				<div className='space-y-3 pt-3 border-t border-border/60'>
					<SectionHead
						label='Product Media & Links'
						sub='Upload product images, brochures, or add external web links.'
					/>
					
					{/* Compact Upload Toolbar below header section */}
					{!readOnly && (
						<div className='flex items-center gap-2'>
							<input
								ref={mediaInputRef}
								type='file'
								accept='image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/quicktime,video/x-msvideo,.pdf,.doc,.docx,.xls,.xlsx'
								multiple
								className='hidden'
								onChange={(e) => {
									const files = Array.from(e.target.files ?? []);
									const items = files.map((file) => createMediaItem(file));
									if (items.length) emitAdd(items);
									e.currentTarget.value = "";
								}}
							/>
							
							{/* Upload Media Button */}
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-7 px-2.5 text-[11px] border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors'
								onClick={openMediaPicker}
							>
								<Upload className='w-3 h-3 mr-1.5 text-brand-600' /> Upload File
							</Button>

							{/* Add Link Popover */}
							<Popover>
								<PopoverTrigger asChild>
									<Button
										type='button'
										variant='outline'
										size='sm'
										className='h-7 px-2.5 text-[11px] border-border hover:bg-muted/30 transition-colors'
									>
										<Plus className='w-3 h-3 mr-1.5 text-muted-foreground' /> Add Link
									</Button>
								</PopoverTrigger>
								<PopoverContent className='w-72 p-3 bg-white border border-border shadow-lg rounded-xl space-y-2.5' align='start'>
									<p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
										Add External Link
									</p>
									<div className='space-y-2'>
										<div className='space-y-0.5'>
											<Label className='text-[10px] font-medium text-muted-foreground'>Link Title</Label>
											<Input
												value={linkTitle}
												onChange={(e) => setLinkTitle(e.target.value)}
												placeholder='e.g. Technical Datasheet'
												className='h-7 text-xs'
											/>
										</div>
										<div className='space-y-0.5'>
											<Label className='text-[10px] font-medium text-muted-foreground'>URL</Label>
											<Input
												value={linkUrl}
												onChange={(e) => setLinkUrl(e.target.value)}
												placeholder='https://example.com/...'
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

					{/* High Density Asset List */}
					<div className='border border-border/60 rounded-xl overflow-hidden bg-white shadow-xs'>
						{allAssets.length === 0 ? (
							<p className='px-4 py-6 text-xs text-center text-muted-foreground select-none'>
								No media files or links attached.
							</p>
						) : (
							<div className='divide-y divide-border/40'>
								{allAssets.map((item) => {
									const url = getAssetUrl(item);
									const typeLabel = getAssetTypeLabel(item);
									const isImage =
										item.type === "media" &&
										(item.mediaKind === "image" || item.kind === "image");
									return (
										<div
											key={item.id}
											className='flex items-center justify-between gap-3 px-3.5 py-2 hover:bg-muted/15 transition-colors group'
										>
											<div className='flex items-center min-w-0 gap-3'>
												{/* Small Icon / Image Thumbnail */}
												<div className='flex items-center justify-center flex-shrink-0 overflow-hidden border rounded-lg h-7 w-7 border-border/50 bg-muted/20 text-brand-600'>
													{isImage && url ? (
														<img
															src={url}
															alt={item.name}
															className='object-cover w-full h-full'
														/>
													) : (
														getAssetIcon(item)
													)}
												</div>
												<div className='min-w-0'>
													<p 
														onClick={() => openAsset(item)}
														className='text-xs font-semibold truncate text-foreground hover:text-brand-700 cursor-pointer transition-colors leading-tight'
													>
														{item.title || item.name}
													</p>
													<p className='text-[10px] text-muted-foreground leading-none mt-0.5'>
														{item.size || item.fileType || item.mediaKind || "Asset"}
													</p>
												</div>
											</div>
											
											<div className='flex items-center gap-2.5'>
												{/* Compact Status Indicator */}
												<span
													className={cn(
														"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold leading-none",
														item.uploaded
															? "bg-emerald-50 text-emerald-700"
															: "bg-amber-50 text-amber-700",
													)}
												>
													{typeLabel}
												</span>
												
												{/* Action Buttons */}
												<div className='flex items-center gap-1'>
													<Button
														type='button'
														variant='ghost'
														size='icon'
														className='w-6 h-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground'
														onClick={() => openAsset(item)}
														disabled={!url}
														title='Open'
													>
														<ExternalLink className='w-3 h-3' />
													</Button>
													{!readOnly && (
														<Button
															type='button'
															variant='ghost'
															size='icon'
															className='w-6 h-6 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600'
															onClick={() => removeMedia(item.id)}
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
	if (!form.category) errors.category = "Category is required";
	if (!form.hsnCode.trim()) errors.hsnCode = "HSN code is required";
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
	const category =
		PRODUCT_CATEGORY_OPTIONS.find((option) => option.value === form.category)
			?.label ?? "";
	const subCategory =
		PRODUCT_SUBCATEGORY_OPTIONS.find(
			(option) => option.value === form.subCategory,
		)?.label ?? "";
	const segment =
		PRODUCT_SEGMENT_OPTIONS.find((option) => option.value === form.segment)
			?.label ?? "";
	const formulation =
		PRODUCT_FORMULATION_OPTIONS.find(
			(option) => option.value === form.formulation,
		)?.label ?? "";

	return {
		id: base.id,
		productId: base.productId,
		productName: form.productName.trim(),
		category,
		subCategory,
		segment,
		formulation,
		hsnCode: form.hsnCode.trim(),
		gstRate: form.gstRate,
		sku: form.sku.trim().toUpperCase(),
		cropApplicable: form.cropApplicable.trim(),
		mrp: Number(form.mrp || 0),
		costPrice: Number(form.costPrice || 0),
		distributorPrice: Number(form.distributorPrice || 0),
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
