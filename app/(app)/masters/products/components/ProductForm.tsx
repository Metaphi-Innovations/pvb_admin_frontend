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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadUOMMasters } from "../../uom/uom-data";
import {
  type Product,
  type ProductAsset,
  type ProductStatus,
  createMediaItem,
  createLinkMediaItem,
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_FORMULATION_OPTIONS,
  PRODUCT_GST_OPTIONS,
  PRODUCT_REORDER_LEVEL_OPTIONS,
  PRODUCT_SEGMENT_OPTIONS,
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_SUBCATEGORY_OPTIONS,
  PRODUCT_UNIT_OPTIONS,
  todayStr,
} from "../product-data";

export interface ProductFormValues {
  productName: string;
  category: string;
  subCategory: string;
  segment: string;
  formulation: string;
  unit: string;
  hsnCode: string;
  gstRate: string;
  sku: string;
  cropApplicable: string;
  packSize: string;
  mrp: string;
  costPrice: string;
  distributorPrice: string;
  reorderLevel: string;
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
  unit: "",
  hsnCode: "",
  gstRate: "18%",
  sku: "",
  cropApplicable: "",
  packSize: "",
  mrp: "",
  costPrice: "",
  distributorPrice: "",
  reorderLevel: "medium",
  status: "active",
  baseUnit: "",
  packagingUnit: "",
  conversionQuantity: "",
};

export function productToFormValues(product: Product): ProductFormValues {
  return {
    productName: product.productName,
    category: PRODUCT_CATEGORY_OPTIONS.find((option) => option.label === product.category)?.value ?? "",
    subCategory: PRODUCT_SUBCATEGORY_OPTIONS.find((option) => option.label === product.subCategory)?.value ?? "",
    segment: PRODUCT_SEGMENT_OPTIONS.find((option) => option.label === product.segment)?.value ?? "",
    formulation: PRODUCT_FORMULATION_OPTIONS.find((option) => option.label === product.formulation)?.value ?? "",
    unit: PRODUCT_UNIT_OPTIONS.find((option) => option.label === product.unit)?.value ?? "",
    hsnCode: product.hsnCode,
    gstRate: product.gstRate,
    sku: product.sku,
    cropApplicable: product.cropApplicable,
    packSize: product.packSize,
    mrp: String(product.mrp),
    costPrice: String(product.costPrice),
    distributorPrice: String(product.distributorPrice),
    reorderLevel: PRODUCT_REORDER_LEVEL_OPTIONS.find((option) => option.label === product.reorderLevel)?.value ?? "medium",
    status: product.status,
    baseUnit: product.baseUnit ?? "",
    packagingUnit: product.packagingUnit ?? "",
    conversionQuantity: product.conversionQuantity !== undefined ? String(product.conversionQuantity) : "",
  };
}

// ── Autocomplete (matches EmployeeForm AC) ────────────────────────────────────
interface ACOption { label: string; value: string }
function AC({ label, value, onChange, options, placeholder, required, error, disabled, searchable = true }: {
  label: string; value: string; onChange: (v: string) => void;
  options: ACOption[]; placeholder?: string; required?: boolean; error?: string;
  disabled?: boolean; searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  const selected = options.find(o => o.value === value);
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <Popover open={open && !disabled} onOpenChange={v => { if (!disabled) { setOpen(v); if (!v) setQ(""); } }}>
        <PopoverTrigger asChild>
          <button type="button" disabled={disabled} className={cn(
            "w-full h-8 px-2.5 text-xs text-left border border-border rounded-lg bg-background flex items-center justify-between transition-colors",
            disabled ? "opacity-50 cursor-not-allowed bg-muted/30" : "hover:bg-muted/30",
            error && "border-red-400",
          )}>
            <span className={selected ? "text-foreground" : "text-muted-foreground"}>
              {selected?.label || placeholder || "Select…"}
            </span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          {searchable && (
            <div className="p-1.5 border-b border-border">
              <Input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)}
                className="text-xs h-7 focus-visible:ring-0" autoFocus />
            </div>
          )}
          <div className="py-1 overflow-y-auto max-h-48">
            {filtered.length === 0
              ? <p className="px-3 py-4 text-xs text-center text-muted-foreground">No options</p>
              : filtered.map(opt => (
                <button type="button" key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); setQ(""); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors",
                    selected?.value === opt.value && "bg-brand-50"
                  )}>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{opt.label}</span>
                  </div>
                  {selected?.value === opt.value && <Check className="flex-shrink-0 w-3 h-3 text-brand-600" />}
                </button>
              ))}
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="flex items-center gap-1 text-[11px] text-red-500"><AlertCircle className="flex-shrink-0 w-3 h-3" />{error}</p>}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1 text-[11px] text-red-500">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {msg}
    </p>
  );
}

function SectionHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-2.5 mt-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
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
  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    onChange({ ...form, [key]: value });
    onClearError(key);
  };

  const inputCls = (key: string) =>
    cn("h-8 text-xs", errors[key] && "border-red-400 focus-visible:ring-red-300");

  const uomData = typeof window !== "undefined" ? loadUOMMasters() : [];
  const uomOptions = uomData.length > 0 
    ? uomData.filter(u => u.status === "active").map(u => ({ value: u.shortName, label: u.shortName }))
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
    set(key, value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1") as ProductFormValues[keyof ProductFormValues]);

  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const openMediaPicker = () => mediaInputRef.current?.click();
  const openDocPicker = () => docInputRef.current?.click();
  const [assetType, setAssetType] = useState<"media" | "link">("media");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null);
  const allAssets = assets ?? mediaItems ?? [];
  const emitAdd = onAssetAdd ?? onMediaAdd ?? (() => {});
  const emitRemove = onAssetRemove ?? onMediaRemove ?? (() => {});
  const emitUpload = onAssetUpload ?? onMediaUpload ?? (() => {});
  const imageItems = allAssets.filter((item) => item.kind === "image" || item.mediaKind === "image");
  const documentItems = allAssets.filter((item) => item.kind === "document" || item.mediaKind === "pdf" || item.mediaKind === "document" || item.mediaKind === "spreadsheet");
  const linkItems = allAssets.filter((item) => item.kind === "link" || item.type === "link");
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
  const getAssetUrl = (item: ProductAsset) => item.url ?? item.fileUrl ?? item.previewUrl ?? item.src ?? "";
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
    if (item.type === "link") return <Link2 className="w-4 h-4" />;
    switch (item.mediaKind ?? item.fileType?.toLowerCase()) {
      case "video":
        return <FileText className="w-4 h-4" />;
      case "pdf":
      case "document":
      case "spreadsheet":
        return <FileText className="w-4 h-4" />;
      default:
        return <ImageIcon className="w-4 h-4" />;
    }
  };
  const openAsset = (item: ProductAsset) => {
    const url = getAssetUrl(item);
    if (!url) return;
    if (item.type === "media" && (item.mediaKind === "image" || item.kind === "image")) {
      setPreviewImage({ src: url, name: item.name });
      return;
    }
    openExternal(url);
  };
  const openDocument = (item: ProductAsset) => {
    openExternal(getAssetUrl(item));
  };

  return (
    <div className="w-full space-y-4">
      {/* <div className="flex items-start gap-2.5 pb-3 border-b border-border">
        <div className="flex items-center justify-center flex-shrink-0 border rounded-lg w-7 h-7 bg-brand-50 border-brand-100">
          <Package className="w-3.5 h-3.5 text-brand-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Product Master</p>
          <p className="text-[11px] text-muted-foreground">Catalogue, pricing, compliance, and media</p>
        </div>
      </div> */}

      <div className="pt-1 space-y-5">
        <div>
          <SectionHead label="Basic Details & Classification" />
          <div className="grid grid-cols-12 gap-3">
              {/* Product Name */}
              <div className="col-span-12 md:col-span-5 space-y-1">
                <Label className="text-xs font-medium">
                  Product Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.productName}
                  onChange={(e) => set("productName", e.target.value)}
                  placeholder="e.g. NutriGrow WS 19:19:19"
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
              <div className="col-span-12 md:col-span-3">
                <AC
                  label="Category"
                  required
                  value={form.category}
                  onChange={(value) => set("category", value)}
                  options={PRODUCT_CATEGORY_OPTIONS}
                  placeholder="Select category..."
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
              <div className="col-span-12 md:col-span-2">
                <AC
                  label="Segment"
                  value={form.segment}
                  onChange={(value) => set("segment", value)}
                  options={PRODUCT_SEGMENT_OPTIONS}
                  placeholder="Select segment..."
                  disabled={readOnly}
                />
              </div>

              {/* Formulation */}
              <div className="col-span-12 md:col-span-2">
                <AC
                  label="Formulation"
                  value={form.formulation}
                  onChange={(value) => set("formulation", value)}
                  options={PRODUCT_FORMULATION_OPTIONS}
                  placeholder="Select formulation..."
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/60">
            <SectionHead label="Pricing & Compliance" />
            <div className="grid grid-cols-12 gap-3">
              {/* Row 1 (6 fields, col-span-2 each = 12 columns) */}
              {/* SKU */}
              <div className="col-span-12 md:col-span-2 space-y-1">
                <Label className="text-xs font-medium">
                  SKU <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.sku}
                  onChange={(e) => set("sku", e.target.value.toUpperCase())}
                  placeholder="e.g. FERT-WSF-019"
                  className={cn("font-mono", inputCls("sku"))}
                  disabled={readOnly}
                />
                <FieldError msg={errors.sku} />
              </div>

              {/* HSN Code */}
              <div className="col-span-12 md:col-span-2 space-y-1">
                <Label className="text-xs font-medium">
                  HSN Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.hsnCode}
                  onChange={(e) => set("hsnCode", e.target.value)}
                  className={cn("font-mono", inputCls("hsnCode"))}
                  disabled={readOnly}
                />
                <FieldError msg={errors.hsnCode} />
              </div>

              {/* GST Rate */}
              <div className="col-span-12 md:col-span-2">
                <AC
                  label="GST Rate"
                  value={form.gstRate}
                  onChange={(value) => set("gstRate", value)}
                  options={PRODUCT_GST_OPTIONS}
                  placeholder="Select GST rate..."
                  disabled={readOnly}
                />
              </div>

              {/* Crop Applicable */}
              <div className="col-span-12 md:col-span-2 space-y-1">
                <Label className="text-xs font-medium">Crop Applicable</Label>
                <Input
                  value={form.cropApplicable}
                  onChange={(e) => set("cropApplicable", e.target.value)}
                  placeholder="e.g. Cotton, Paddy"
                  className={inputCls("cropApplicable")}
                  disabled={readOnly}
                />
              </div>

              {/* Pack Size */}
              <div className="col-span-12 md:col-span-2 space-y-1">
                <Label className="text-xs font-medium">Pack Size</Label>
                <Input
                  value={form.packSize}
                  onChange={(e) => set("packSize", e.target.value)}
                  placeholder="e.g. 500 ML"
                  className={inputCls("packSize")}
                  disabled={readOnly}
                />
              </div>

              {/* MRP */}
              <div className="col-span-12 md:col-span-2 space-y-1">
                <Label className="text-xs font-medium">MRP</Label>
                <Input
                  value={form.mrp}
                  onChange={(e) => decimalInput("mrp", e.target.value)}
                  className={inputCls("mrp")}
                  inputMode="decimal"
                  disabled={readOnly}
                />
              </div>

              {/* Row 2 (5 fields: 2 + 3 + 3 + 2 + 2 = 12 columns) */}
              {/* Unit */}
              <div className="col-span-12 md:col-span-2">
                <AC
                  label="Unit"
                  value={form.unit}
                  onChange={(value) => set("unit", value)}
                  options={PRODUCT_UNIT_OPTIONS}
                  placeholder="Select unit..."
                  disabled={readOnly}
                />
              </div>

              {/* Base Unit */}
              <div className="col-span-12 md:col-span-3 space-y-1">
                <Label className="text-xs font-medium">
                  Base Unit <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.baseUnit}
                  onValueChange={(value) => set("baseUnit", value)}
                  disabled={readOnly}
                >
                  <SelectTrigger className={inputCls("baseUnit")}>
                    <SelectValue placeholder="Select base unit..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg border-border">
                    {uomOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.baseUnit} />
              </div>

              {/* Packaging Unit */}
              <div className="col-span-12 md:col-span-3 space-y-1">
                <Label className="text-xs font-medium">
                  Packaging Unit <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.packagingUnit}
                  onValueChange={(value) => set("packagingUnit", value)}
                  disabled={readOnly}
                >
                  <SelectTrigger className={inputCls("packagingUnit")}>
                    <SelectValue placeholder="Select packaging unit..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg border-border">
                    {uomOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.packagingUnit} />
              </div>

              {/* Conversion Quantity */}
              <div className="col-span-12 md:col-span-2 space-y-1">
                <Label className="text-xs font-medium">
                  Conversion Qty <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.conversionQuantity}
                  onChange={(e) => decimalInput("conversionQuantity", e.target.value)}
                  placeholder="e.g. 25"
                  className={inputCls("conversionQuantity")}
                  inputMode="decimal"
                  disabled={readOnly}
                />
                <FieldError msg={errors.conversionQuantity} />
              </div>

              {/* Reorder Level */}
              <div className="col-span-12 md:col-span-2">
                <AC
                  label="Reorder Level"
                  value={form.reorderLevel}
                  onChange={(value) => set("reorderLevel", value)}
                  options={PRODUCT_REORDER_LEVEL_OPTIONS}
                  placeholder="Select reorder level..."
                  disabled={readOnly}
                />
              </div>

              {/* Cost Price */}
              {/* <div className="col-span-12 md:col-span-2 space-y-1">
                <Label className="text-xs font-medium">Cost Price</Label>
                <Input
                  value={form.costPrice}
                  onChange={(e) => decimalInput("costPrice", e.target.value)}
                  className={inputCls("costPrice")}
                  inputMode="decimal"
                  disabled={readOnly}
                />
              </div> */}

              {/* Distributor Price */}
              {/* <div className="col-span-12 md:col-span-2 space-y-1">
                <Label className="text-xs font-medium">Distributor Price</Label>
                <Input
                  value={form.distributorPrice}
                  onChange={(e) => decimalInput("distributorPrice", e.target.value)}
                  className={inputCls("distributorPrice")}
                  inputMode="decimal"
                  disabled={readOnly}
                />
              </div> */}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Media Upload</p>
              <p className="text-[11px] text-muted-foreground">Manage all product assets in one place.</p>
            </div>

            {!readOnly && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Type</Label>
                  <AC
                    label=""
                    value={assetType}
                    onChange={(value) => setAssetType(value as "media" | "link")}
                    options={[
                      { value: "media", label: "Media" },
                      { value: "link", label: "Link" },
                    ]}
                    placeholder="Select type..."
                    disabled={readOnly}
                    searchable={false}
                  />
                </div>

                {assetType === "media" ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/10 px-1 py-1 md:flex-row md:items-center md:justify-between">
                    <input
                      ref={mediaInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/quicktime,video/x-msvideo,.pdf,.doc,.docx,.xls,.xlsx"
                      multiple
                      className="hidden"
                      disabled={readOnly}
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        const items = files.map((file) => createMediaItem(file));
                        if (items.length) emitAdd(items);
                        e.currentTarget.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      className="h-8 px-4 text-xs text-white bg-brand-600 hover:bg-brand-700 md:shrink-0"
                      onClick={openMediaPicker}
                      disabled={readOnly}
                    >
                      Choose Files
                    </Button>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-medium text-foreground">Upload Files</p>
                      <p className="text-[11px] text-muted-foreground">
                        Supported: PNG, JPG, JPEG, WEBP, PDF, DOC, DOCX, XLS, XLSX, MP4, MOV, AVI
                      </p>
                      <p className="text-[11px] text-muted-foreground">Max size: 50MB per file</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/10 px-3 py-3 md:flex-row md:items-end">
                    <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Link Title</Label>
                        <Input
                          value={linkTitle}
                          onChange={(e) => setLinkTitle(e.target.value)}
                          placeholder="e.g. Product brochure"
                          className="h-8 text-xs"
                          disabled={readOnly}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">URL</Label>
                        <Input
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          placeholder="https://..."
                          className="h-8 text-xs"
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="h-8 px-4 text-xs text-white bg-brand-600 hover:bg-brand-700 md:shrink-0"
                      disabled={readOnly || !linkTitle.trim() || !linkUrl.trim()}
                      onClick={() => {
                        emitAdd([createLinkMediaItem(linkTitle.trim(), linkUrl.trim())]);
                        setLinkTitle("");
                        setLinkUrl("");
                      }}
                    >
                      <Link2 className="mr-1.5 h-3.5 w-3.5" /> Add Link
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Uploaded Assets ({allAssets.length})</p>
                  <p className="text-[11px] text-muted-foreground">Open or remove individual media and links from the same list.</p>
                </div>
              </div>

              {allAssets.length === 0 ? (
                <p className="px-1 py-4 text-sm text-muted-foreground">No assets added yet.</p>
              ) : (
                <div className="space-y-3">
                  {allAssets.map((item) => {
                    const url = getAssetUrl(item);
                    const typeLabel = getAssetTypeLabel(item);
                    const isImage = item.type === "media" && (item.mediaKind === "image" || item.kind === "image");
                    return (
                      <div key={item.id} className="p-3 bg-white border shadow-sm rounded-xl border-border">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start min-w-0 gap-3">
                            <div className="flex items-center justify-center flex-shrink-0 overflow-hidden border rounded-lg h-9 w-9 border-border bg-muted/20 text-brand-600">
                              {isImage && url ? <img src={url} alt={item.name} className="object-cover w-full h-full" /> : getAssetIcon(item)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate text-foreground">{item.title || item.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{item.size || item.fileType || item.mediaKind || "Asset"}</p>
                            </div>
                          </div>
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", item.uploaded ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                            <CheckCircle2 className="w-3 h-3" />
                            {typeLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-3">
                          <Button type="button" variant="outline" className="h-8 px-3 text-[11px]" onClick={() => openAsset(item)} disabled={!url}>
                            Open
                          </Button>
                          {!readOnly && (
                            <Button type="button" variant="outline" className="h-8 px-3 text-[11px] text-red-600 hover:text-red-700" onClick={() => removeMedia(item.id)}>
                              Delete
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

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-4 bg-white border shadow-lg border-border rounded-xl">
          <DialogHeader className="pb-2 border-b border-border/50">
            <DialogTitle className="text-sm font-semibold truncate text-foreground">{previewImage?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-4 rounded-lg bg-muted/5">
            <img
              src={previewImage?.src}
              alt={previewImage?.name}
              className="max-h-[70vh] max-w-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function validateProductForm(form: ProductFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.productName.trim()) errors.productName = "Product name is required";
  if (!form.category) errors.category = "Category is required";
  if (!form.hsnCode.trim()) errors.hsnCode = "HSN code is required";
  if (!form.sku.trim()) errors.sku = "SKU is required";
  if (!form.baseUnit) errors.baseUnit = "Base unit is required";
  if (!form.packagingUnit) errors.packagingUnit = "Packaging unit is required";
  if (!form.conversionQuantity) {
    errors.conversionQuantity = "Conversion quantity is required";
  } else if (isNaN(Number(form.conversionQuantity)) || Number(form.conversionQuantity) <= 0) {
    errors.conversionQuantity = "Must be a positive number";
  }
  return errors;
}

export function formValuesToProduct(
  form: ProductFormValues,
  base: Partial<Product> & { id: number; productId: string; assets?: ProductAsset[]; mediaItems?: ProductAsset[] },
): Product {
  const category = PRODUCT_CATEGORY_OPTIONS.find((option) => option.value === form.category)?.label ?? "";
  const subCategory = PRODUCT_SUBCATEGORY_OPTIONS.find((option) => option.value === form.subCategory)?.label ?? "";
  const segment = PRODUCT_SEGMENT_OPTIONS.find((option) => option.value === form.segment)?.label ?? "";
  const formulation = PRODUCT_FORMULATION_OPTIONS.find((option) => option.value === form.formulation)?.label ?? "";
  const unit = PRODUCT_UNIT_OPTIONS.find((option) => option.value === form.unit)?.label ?? "";
  const reorderLevel = PRODUCT_REORDER_LEVEL_OPTIONS.find((option) => option.value === form.reorderLevel)?.label ?? "";

  return {
    id: base.id,
    productId: base.productId,
    productName: form.productName.trim(),
    category,
    subCategory,
    segment,
    formulation,
    unit,
    hsnCode: form.hsnCode.trim(),
    gstRate: form.gstRate,
    sku: form.sku.trim().toUpperCase(),
    cropApplicable: form.cropApplicable.trim(),
    packSize: form.packSize.trim(),
    mrp: Number(form.mrp || 0),
    costPrice: Number(form.costPrice || 0),
    distributorPrice: Number(form.distributorPrice || 0),
    reorderLevel,
    status: form.status,
    createdBy: base.createdBy ?? "Admin",
    createdDate: base.createdDate ?? todayStr(),
    updatedBy: "Admin",
    updatedDate: todayStr(),
    assets: base.assets ?? base.mediaItems ?? [],
    mediaItems: base.assets ?? base.mediaItems ?? [],
    baseUnit: form.baseUnit,
    packagingUnit: form.packagingUnit,
    conversionQuantity: form.conversionQuantity ? Number(form.conversionQuantity) : undefined,
  };
}
