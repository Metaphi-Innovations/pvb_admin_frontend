"use client";

import { loadMasterRecords } from "@/lib/masters/common";
import { SEGMENT_STORAGE_KEY, SEGMENT_SEED, type SegmentRecord } from "../segment/segment-data";
import { loadCategories } from "../categories/category-data";
import {
  FORMULATION_STORAGE_KEY,
  FORMULATION_SEED,
  type FormulationRecord,
} from "../formulation/formulation-data";
import { CFU_SEED, CFU_STORAGE_KEY, type CfuRecord } from "../cfu/cfu-data";
import { loadGSTMasters, type GSTMaster } from "../gst/gst-data";
import { loadHSNMasters } from "../hsn/hsn-data";

export type ProductStatus = "active" | "inactive" | "archived";

export type ProductAssetMediaKind = "image" | "video" | "pdf" | "document" | "spreadsheet";

export type ProductAssetRole = "image" | "brochure" | "label" | "link";

export interface ProductAsset {
  id: string;
  type: "media" | "link";
  mediaKind?: ProductAssetMediaKind;
  assetRole?: ProductAssetRole;
  name: string;
  title?: string;
  url: string;
  size?: string;
  file?: File;
  uploaded?: boolean;
  createdAt?: string;
  src?: string;
  kind?: "image" | "document" | "link";
  fileType?: string;
  sizeLabel?: string;
  fileUrl?: string;
  previewUrl?: string;
}

export type ProductMediaItem = ProductAsset;

export interface ProductImage {
  id: string;
  name: string;
  url: string;
  previewUrl?: string;
  size?: string;
  sizeBytes?: number;
  mimeType?: string;
  uploaded?: boolean;
  createdAt?: string;
}

export interface ProductUrl {
  id: string;
  url: string;
  createdAt?: string;
}

export type ProductDocumentKind =
  | "technical_datasheet"
  | "product_brochure"
  | "msds"
  | "label_artwork";

export const PRODUCT_DOCUMENT_KINDS: {
  kind: ProductDocumentKind;
  label: string;
}[] = [
  { kind: "technical_datasheet", label: "Technical Datasheet" },
  { kind: "product_brochure", label: "Product Brochure" },
  { kind: "msds", label: "MSDS" },
  { kind: "label_artwork", label: "Label Artwork" },
];

export interface ProductDocument {
  id: string;
  kind: ProductDocumentKind;
  name: string;
  url: string;
  mimeType?: string;
  size?: string;
  sizeBytes?: number;
  uploaded?: boolean;
  createdAt?: string;
}

export interface ProductVendorMapping {
  id: string;
  preferredVendor: string;
  vendorProductCode: string;
  leadTimeDays: string;
  moq: string;
}

export const AUTHORITY_OPTIONS = [
  { value: "CIB&RC", label: "CIB&RC" },
  { value: "FCO", label: "FCO" },
  { value: "CDSCO", label: "CDSCO" },
  { value: "APEDA", label: "APEDA" },
  { value: "State Agriculture Department", label: "State Agriculture Department" },
  { value: "Not Applicable", label: "Not Applicable" },
] as const;

export const PACKING_CONTAINER_OPTIONS = [
  "Bottle",
  "Bag",
  "Box",
  "Drum",
  "Can",
  "Jar",
  "Pouch",
  "Sachet",
  "Packet",
  "Case",
] as const;

/** Allowed product units (hardcoded — no Unit/UOM master dependency). */
export const PRODUCT_UNIT_OPTIONS = [
  { value: "Kg", label: "Kg" },
  { value: "Gms", label: "Gms" },
  { value: "Ltr", label: "Ltr" },
  { value: "Ml", label: "Ml" },
] as const;

/** Allowed packaging units (hardcoded — no master dependency). */
export const PRODUCT_PACKAGING_UNIT_OPTIONS = [
  { value: "Case", label: "Case" },
  { value: "Loose", label: "Loose" },
] as const;

export type ProductUnit = (typeof PRODUCT_UNIT_OPTIONS)[number]["value"];
export type ProductMou = "Kg" | "Ltr";

const LEGACY_UNIT_TO_PRODUCT_UNIT: Record<string, ProductUnit> = {
  kg: "Kg",
  gms: "Gms",
  gram: "Gms",
  grams: "Gms",
  g: "Gms",
  ltr: "Ltr",
  liter: "Ltr",
  litre: "Ltr",
  l: "Ltr",
  ml: "Ml",
};

/** Normalize legacy or variant unit strings to allowed product units. */
export function normalizeProductUnit(unit: string): string {
  const trimmed = unit.trim();
  if (!trimmed) return "";
  const exact = PRODUCT_UNIT_OPTIONS.find((o) => o.value === trimmed);
  if (exact) return exact.value;
  const mapped = LEGACY_UNIT_TO_PRODUCT_UNIT[trimmed.toLowerCase()];
  return mapped ?? trimmed;
}

/** MoU is derived from Unit: Gms/Kg → Kg, Ml/Ltr → Ltr. */
export function getMouFromUnit(baseUnit: string): ProductMou | undefined {
  const unit = normalizeProductUnit(baseUnit);
  if (unit === "Gms" || unit === "Kg") return "Kg";
  if (unit === "Ml" || unit === "Ltr") return "Ltr";
  return undefined;
}

function formatWeightValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return parseFloat(value.toFixed(4)).toString();
}

export const CONTAINER_TYPE_OPTIONS = [
  "Primary",
  "Secondary",
  "Tertiary",
] as const;

export const BOTTLE_SEAL_CATEGORY_OPTIONS = [
  "Screw Cap",
  "Flip Top",
  "Induction Seal",
  "Shrink Wrap",
  "Child Resistant Cap",
  "Pump Dispenser",
  "Not Applicable",
] as const;

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isValidProductUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isAllowedProductImageFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = file.type.toLowerCase();
  return (
    mime.startsWith("image/") &&
    (IMAGE_EXTENSIONS.has(ext) ||
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mime))
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function createProductImageFromFile(file: File): Promise<ProductImage> {
  const dataUrl = await readFileAsDataUrl(file);
  return {
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    url: dataUrl,
    previewUrl: dataUrl,
    size: formatFileSize(file.size),
    sizeBytes: file.size,
    mimeType: file.type,
    uploaded: true,
    createdAt: todayStr(),
  };
}

export function createProductUrl(url: string): ProductUrl {
  const trimmed = url.trim();
  return {
    id: `url-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url: trimmed,
    createdAt: todayStr(),
  };
}

const DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "ai",
  "eps",
]);

export function isAllowedProductDocumentFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = file.type.toLowerCase();
  return (
    DOCUMENT_EXTENSIONS.has(ext) ||
    mime.includes("pdf") ||
    mime.includes("document") ||
    mime.startsWith("image/")
  );
}

export async function createProductDocumentFromFile(
  file: File,
  kind: ProductDocumentKind,
): Promise<ProductDocument> {
  const dataUrl = await readFileAsDataUrl(file);
  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    name: file.name,
    url: dataUrl,
    mimeType: file.type,
    size: formatFileSize(file.size),
    sizeBytes: file.size,
    uploaded: true,
    createdAt: todayStr(),
  };
}

export function createEmptyVendorMapping(): ProductVendorMapping {
  return {
    id: `vm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    preferredVendor: "",
    vendorProductCode: "",
    leadTimeDays: "",
    moq: "",
  };
}

export function getProductDocuments(
  product: Pick<Product, "productDocuments" | "productUrls" | "assets" | "mediaItems">,
): ProductDocument[] {
  if (product.productDocuments?.length) return product.productDocuments;
  return [];
}

function legacyAssetToImage(item: ProductAsset): ProductImage | null {
  const isImage =
    item.type === "media" &&
    (item.mediaKind === "image" || item.kind === "image");
  if (!isImage) return null;
  const url = item.url ?? item.previewUrl ?? item.src ?? "";
  if (!url) return null;
  return {
    id: item.id,
    name: item.name,
    url,
    previewUrl: item.previewUrl ?? item.src ?? url,
    size: item.size ?? item.sizeLabel,
    mimeType: item.fileType,
    uploaded: item.uploaded ?? true,
    createdAt: item.createdAt,
  };
}

function legacyAssetToUrl(item: ProductAsset): ProductUrl | null {
  if (item.type !== "link" && item.assetRole !== "link" && item.kind !== "link") {
    return null;
  }
  const url = item.url?.trim();
  if (!url) return null;
  return {
    id: item.id,
    url,
    createdAt: item.createdAt,
  };
}

export function getProductImages(product: Pick<Product, "productImages" | "assets" | "mediaItems">): ProductImage[] {
  if (product.productImages?.length) return product.productImages;
  const legacy = product.assets ?? product.mediaItems ?? [];
  return legacy
    .map(legacyAssetToImage)
    .filter((item): item is ProductImage => item !== null);
}

export function getProductUrls(product: Pick<Product, "productUrls" | "assets" | "mediaItems">): ProductUrl[] {
  if (product.productUrls?.length) return product.productUrls;
  const legacy = product.assets ?? product.mediaItems ?? [];
  return legacy
    .map(legacyAssetToUrl)
    .filter((item): item is ProductUrl => item !== null);
}

export function getImagePreviewUrl(image: ProductImage): string {
  return image.previewUrl ?? image.url;
}

export interface Product {
  id: number;
  /** Auto-generated product code (e.g. FERT-000001). */
  productCode: string;
  supplier?: string;
  supplierCode?: string;
  productName: string;
  scientificName?: string;
  segment: string;
  category: string;
  subCategory: string;
  form: string;
  cfu?: string;
  authority?: string;
  /** User-entered SKU (separate from product code). */
  sku: string;
  hsnCode: string;
  hsnId?: number;
  gstRate: string;
  gstId?: number;
  packSize?: number;
  baseUnit?: string;
  /** Measure of Unit (MoU) */
  mou?: string;
  unitPerCase?: number;
  packagingUnit?: string;
  unitPerPackagingUnit?: number;
  /** Auto-calculated: packSize × unitPerCase */
  netWeightPerPackagingUnit?: number;
  grossWeight?: number;
  /** Product-level MRP (not linked to Pricing Master). */
  mrp?: number;
  status: ProductStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  productImages?: ProductImage[];
  productUrls?: ProductUrl[];
  /** @deprecated Legacy fields kept for migration / downstream compatibility */
  productId?: string;
  formulation?: string;
  manufacturerProductCode?: string;
  vendorProductCode?: string;
  barcode?: string;
  productDocuments?: ProductDocument[];
  vendorMappings?: ProductVendorMapping[];
  assets?: ProductAsset[];
  mediaItems?: ProductAsset[];
  conversionQuantity?: number;
  unitSize?: number;
  qtyInKgL?: number;
  unitsPerCase?: number;
  packingContainer?: string;
  containerType?: string;
  bottleSealCategory?: string;
  netWeight?: number;
  grossWeightPerCase?: number;
  netWeightSingleUnit?: number;
  grossWeightSingleUnit?: number;
  netWeightPerCase?: number;
  boxLength?: number;
  boxWidth?: number;
  boxHeight?: number;
  cft?: number;
  inventoryAccount?: string;
  salesAccount?: string;
  purchaseAccount?: string;
  cogsAccount?: string;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function detectAssetKind(file: File): ProductAssetMediaKind {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = file.type.toLowerCase();
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext)) return "image";
  if (mime.startsWith("video/") || ["mp4", "mov", "avi"].includes(ext)) return "video";
  if (mime.includes("pdf") || ext === "pdf") return "pdf";
  if (mime.includes("sheet") || ["xls", "xlsx"].includes(ext)) return "spreadsheet";
  return "document";
}

export function createMediaItem(file: File, role?: ProductAssetRole): ProductAsset {
  const mediaKind = detectAssetKind(file);
  const objectUrl = URL.createObjectURL(file);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  let assetRole: ProductAssetRole = role ?? "image";
  if (!role) {
    if (mediaKind === "pdf") assetRole = "brochure";
    else if (mediaKind === "image") assetRole = "image";
    else assetRole = "brochure";
  }
  if (ext.includes("label") || file.name.toLowerCase().includes("label")) {
    assetRole = "label";
  }
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    type: "media",
    mediaKind,
    assetRole,
    name: file.name,
    url: objectUrl,
    file,
    size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
    uploaded: false,
    createdAt: todayStr(),
    kind: mediaKind === "image" ? "image" : "document",
    src: mediaKind === "image" ? objectUrl : undefined,
    fileType: file.type || file.name.split(".").pop()?.toUpperCase(),
    sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
    fileUrl: undefined,
    previewUrl: undefined,
  };
}

export function createLinkMediaItem(title: string, url: string): ProductAsset {
  return {
    id: `${title}-${url}`,
    type: "link",
    assetRole: "link",
    name: title || url,
    title,
    url,
    uploaded: false,
    createdAt: todayStr(),
    kind: "link",
  };
}

export interface MasterSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export function getAssetDisplayType(item: ProductAsset): string {
  if (item.type === "link" || item.assetRole === "link") return "External URL";
  if (item.assetRole === "brochure") return "Product Brochure";
  if (item.assetRole === "label") return "Product Label Artwork";
  if (item.mediaKind === "image" || item.kind === "image") return "Product Image";
  if (item.mediaKind === "pdf") return "Product Brochure";
  return "Document";
}

export function loadActiveSegmentOptions(): MasterSelectOption[] {
  if (typeof window === "undefined") {
    return SEGMENT_SEED.filter((s) => s.status === "active").map((s) => ({
      value: s.segmentName,
      label: s.segmentName,
    }));
  }
  return loadMasterRecords<SegmentRecord>(SEGMENT_STORAGE_KEY, SEGMENT_SEED)
    .filter((s) => s.status === "active")
    .map((s) => ({ value: s.segmentName, label: s.segmentName }));
}

export function loadActiveCategoryOptions(): MasterSelectOption[] {
  return loadCategories()
    .filter((c) => c.status === "active")
    .map((c) => ({ value: c.categoryName, label: c.categoryName }));
}

export function loadActiveFormOptions(): MasterSelectOption[] {
  if (typeof window === "undefined") {
    return FORMULATION_SEED.filter((f) => f.status === "active").map((f) => ({
      value: f.formulationName,
      label: f.formulationName,
    }));
  }
  return loadMasterRecords<FormulationRecord>(FORMULATION_STORAGE_KEY, FORMULATION_SEED)
    .filter((f) => f.status === "active")
    .map((f) => ({ value: f.formulationName, label: f.formulationName }));
}

export function loadActiveCfuOptions(): MasterSelectOption[] {
  if (typeof window === "undefined") {
    return CFU_SEED.filter((c) => c.status === "active").map((c) => ({
      value: c.cfuName,
      label: c.cfuName,
      sublabel: c.description || undefined,
    }));
  }
  return loadMasterRecords<CfuRecord>(CFU_STORAGE_KEY, CFU_SEED)
    .filter((c) => c.status === "active")
    .map((c) => ({
      value: c.cfuName,
      label: c.cfuName,
      sublabel: c.description || undefined,
    }));
}

export function loadActiveGstOptions(): MasterSelectOption[] {
  return loadGSTMasters()
    .filter((g) => g.status === "active")
    .map((g) => ({
      value: `${g.gstPercentage}%`,
      label: `${g.gstPercentage}%`,
      sublabel: g.gstId,
    }));
}

export function formatGstPercentage(value: number): string {
  return `${value}%`;
}

export interface ResolvedProductTax {
  hsnId: number;
  hsnCode: string;
  gstRate: string;
  gstId?: number;
}

export function findGstMasterByRate(gstRate: string): GSTMaster | undefined {
  const trimmed = gstRate.trim().replace(/%$/, "");
  if (!trimmed) return undefined;
  const pct = parseFloat(trimmed);
  if (isNaN(pct)) return undefined;
  return loadGSTMasters().find(
    (g) =>
      g.status === "active" && Math.abs(g.gstPercentage - pct) < 0.001,
  );
}

/** Resolve HSN + GST from HSN Master for Product auto-mapping */
export function resolveProductTaxFromHsn(
  hsnCode: string,
): ResolvedProductTax | null {
  const code = hsnCode.trim();
  if (!code) return null;
  const hsn = loadHSNMasters().find(
    (h) => h.hsnCode === code && h.status === "active",
  );
  if (!hsn || !hsn.gstRate?.trim()) return null;
  const gst = findGstMasterByRate(hsn.gstRate);
  return {
    hsnId: hsn.id,
    hsnCode: hsn.hsnCode,
    gstRate: hsn.gstRate,
    gstId: gst?.id,
  };
}

export const PRODUCT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const STORAGE_KEY = "ds_products";

const SEED_PRODUCTS: Product[] = [
  {
    id: 1,
    productId: "PRD-0001",
    supplier: "Agro Chem Distributors",
    supplierCode: "CG-001",
    productName: "Dharitri Hybrid Corn Gold",
    scientificName: "Zea mays",
    category: "Seeds",
    subCategory: "",
    segment: "Rakshak",
    form: "Granules",
    hsnCode: "1209",
    gstRate: "0%",
    sku: "SEED-CORN-001",
    productCode: "SEED-000001",
    packSize: 1,
    mou: "KG",
    unitPerCase: 25,
    unitPerPackagingUnit: 25,
    netWeightPerPackagingUnit: 25,
    mrp: 1250,
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-10",
    updatedBy: "Admin",
    updatedDate: "2026-03-12",
    baseUnit: "KG",
    packagingUnit: "Bag",
    conversionQuantity: 25,
    unitSize: 1,
    netWeight: 25,
    grossWeight: 25,
    productImages: [
      {
        id: "prd-1-media-1",
        name: "dharitri-hybrid-corn-gold.jpg",
        url: "https://images.unsplash.com/photo-1464226184884-fa280b77c399?auto=format&fit=crop&w=1200&q=80",
        previewUrl: "https://images.unsplash.com/photo-1464226184884-fa280b77c399?auto=format&fit=crop&w=1200&q=80",
        size: "245 KB",
        uploaded: true,
        createdAt: "2026-06-03",
      },
      {
        id: "prd-1-media-2",
        name: "dharitri-pack-shot.jpg",
        url: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80",
        previewUrl: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80",
        size: "198 KB",
        uploaded: true,
        createdAt: "2026-06-03",
      },
    ],
    productUrls: [
      {
        id: "prd-1-link-1",
        url: "https://example.com/products/dharitri-hybrid-corn-gold",
        createdAt: "2026-06-03",
      },
    ],
  },
  {
    id: 2,
    productId: "PRD-0002",
    productName: "NutriGrow WS 19:19:19",
    scientificName: "NPK 19:19:19",
    category: "Fertilizers",
    subCategory: "",
    segment: "Poshak",
    form: "Wettable Powder",
    hsnCode: "3105",
    gstRate: "5%",
    sku: "FERT-000001",
    productCode: "FERT-000001",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-18",
    updatedBy: "Admin",
    updatedDate: "2026-03-18",
    baseUnit: "KG",
    packagingUnit: "Box",
    conversionQuantity: 10,
    unitSize: 1,
    netWeight: 10,
    grossWeight: 10,
    mrp: 980,
    productImages: [
      {
        id: "prd-2-media-1",
        name: "nutrigrow-wsf-191919.jpg",
        url: "https://images.unsplash.com/photo-1465433360938-e1e1f5a7f7d6?auto=format&fit=crop&w=1200&q=80",
        previewUrl: "https://images.unsplash.com/photo-1465433360938-e1e1f5a7f7d6?auto=format&fit=crop&w=1200&q=80",
        size: "210 KB",
        uploaded: true,
        createdAt: "2026-06-03",
      },
    ],
    productUrls: [],
  },
  {
    id: 3,
    productId: "PRD-0003",
    productName: "Shield EC Crop Guard",
    scientificName: "Cypermethrin 10% EC",
    category: "Pesticides",
    subCategory: "",
    segment: "Rakshak",
    form: "Liquid",
    hsnCode: "3808",
    gstRate: "18%",
    sku: "PEST-000001",
    productCode: "PEST-000001",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-02-03",
    updatedBy: "Admin",
    updatedDate: "2026-04-05",
    baseUnit: "Liter",
    packagingUnit: "Drum",
    conversionQuantity: 200,
    unitSize: 1,
    netWeight: 200,
    grossWeight: 200,
    mrp: 1250,
    productImages: [],
    productUrls: [],
  },
  {
    id: 4,
    productId: "PRD-0004",
    productName: "BioRoot Vital Suspension",
    scientificName: "Trichoderma viride",
    category: "Bio Products",
    subCategory: "",
    segment: "Amritam",
    form: "Suspension",
    cfu: "1×10⁸ cells/ml",
    hsnCode: "3002",
    gstRate: "12%",
    sku: "BIO-000001",
    productCode: "BIO-000001",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-02-16",
    updatedBy: "Admin",
    updatedDate: "2026-04-22",
    baseUnit: "Gram",
    packagingUnit: "Packet",
    conversionQuantity: 50,
    mrp: 720,
    productImages: [],
    productUrls: [],
  },
  {
    id: 5,
    productId: "PRD-0005",
    productName: "Urea 50kg",
    scientificName: "Urea",
    category: "Fertilizers",
    subCategory: "",
    segment: "Poshak",
    form: "Granules",
    hsnCode: "3102",
    gstRate: "5%",
    sku: "FERT-000002",
    productCode: "FERT-000002",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-03-01",
    updatedBy: "Admin",
    updatedDate: "2026-03-01",
    baseUnit: "KG",
    packagingUnit: "Bag",
    conversionQuantity: 50,
    mrp: 620,
    productImages: [],
    productUrls: [],
  },
  {
    id: 6,
    productId: "PRD-0006",
    productName: "NPK 10:26:26",
    scientificName: "NPK 10:26:26",
    category: "Fertilizers",
    subCategory: "",
    segment: "Poshak",
    form: "Granules",
    hsnCode: "3105",
    gstRate: "5%",
    sku: "FERT-000003",
    productCode: "FERT-000003",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-03-01",
    updatedBy: "Admin",
    updatedDate: "2026-03-01",
    baseUnit: "KG",
    packagingUnit: "Bag",
    conversionQuantity: 50,
    mrp: 890,
    productImages: [],
    productUrls: [],
  },
  {
    id: 7,
    productId: "PRD-0007",
    productName: "DAP 50kg",
    scientificName: "Diammonium Phosphate",
    category: "Fertilizers",
    subCategory: "",
    segment: "Poshak",
    form: "Granules",
    hsnCode: "3105",
    gstRate: "5%",
    sku: "FERT-000004",
    productCode: "FERT-000004",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-03-01",
    updatedBy: "Admin",
    updatedDate: "2026-03-01",
    baseUnit: "KG",
    packagingUnit: "Bag",
    conversionQuantity: 50,
    mrp: 1150,
    productImages: [],
    productUrls: [],
  },
  {
    id: 8,
    productId: "PRD-0008",
    productName: "Zinc Sulphate 21%",
    scientificName: "Zinc Sulphate",
    category: "Fertilizers",
    subCategory: "",
    segment: "Poshak",
    form: "Powder",
    hsnCode: "2833",
    gstRate: "5%",
    sku: "FERT-000005",
    productCode: "FERT-000005",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-03-01",
    updatedBy: "Admin",
    updatedDate: "2026-03-01",
    baseUnit: "KG",
    packagingUnit: "Bag",
    conversionQuantity: 25,
    mrp: 580,
    productImages: [],
    productUrls: [],
  },
  {
    id: 9,
    productId: "PRD-0009",
    productName: "Hybrid Maize Seed",
    scientificName: "Zea mays",
    category: "Seeds",
    subCategory: "",
    segment: "Rakshak",
    form: "Seeds",
    hsnCode: "1209",
    gstRate: "0%",
    sku: "SEED-000002",
    productCode: "SEED-000002",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-03-01",
    updatedBy: "Admin",
    updatedDate: "2026-03-01",
    baseUnit: "KG",
    packagingUnit: "Bag",
    conversionQuantity: 25,
    mrp: 1050,
    productImages: [],
    productUrls: [],
  },
  {
    id: 10,
    productId: "PRD-0010",
    productName: "Bio Fertilizer A",
    scientificName: "Bio Fertilizer A",
    category: "Bio Products",
    subCategory: "",
    segment: "Amritam",
    form: "Liquid",
    hsnCode: "3101",
    gstRate: "5%",
    sku: "BIO-000001",
    productCode: "BIO-000001",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-03-01",
    updatedBy: "Admin",
    updatedDate: "2026-03-01",
    baseUnit: "L",
    packagingUnit: "Bottle",
    conversionQuantity: 1,
    mrp: 650,
    productImages: [],
    productUrls: [],
  },
];

function migrateProduct(raw: Record<string, unknown>): Product {
  const p = raw as Partial<Product> & {
    mediaItems?: ProductAsset[];
    formulation?: string;
    cropApplicable?: string;
  };
  const legacyAssets = Array.isArray(p.assets)
    ? (p.assets as ProductAsset[])
    : Array.isArray(p.mediaItems)
      ? (p.mediaItems as ProductAsset[])
      : [];
  const productImages =
    Array.isArray(p.productImages) && p.productImages.length > 0
      ? p.productImages
      : legacyAssets
        .map(legacyAssetToImage)
        .filter((item): item is ProductImage => item !== null);
  const productUrls =
    Array.isArray(p.productUrls) && p.productUrls.length > 0
      ? p.productUrls
      : legacyAssets
        .map(legacyAssetToUrl)
        .filter((item): item is ProductUrl => item !== null);
  const productCode = (p.productCode || "").trim().toUpperCase();
  const sku = (p.sku || productCode).trim().toUpperCase();
  const packSize =
    p.packSize !== undefined
      ? Number(p.packSize)
      : p.unitSize !== undefined
        ? Number(p.unitSize)
        : undefined;
  const unitPerCase =
    p.unitPerCase !== undefined
      ? Number(p.unitPerCase)
      : p.unitsPerCase !== undefined
        ? Number(p.unitsPerCase)
        : undefined;
  const unitPerPackagingUnit =
    p.unitPerPackagingUnit !== undefined
      ? Number(p.unitPerPackagingUnit)
      : p.conversionQuantity !== undefined
        ? Number(p.conversionQuantity)
        : undefined;
  const baseUnit = normalizeProductUnit(p.baseUnit ?? "");
  const mou = getMouFromUnit(baseUnit) ?? normalizeProductUnit(p.mou ?? "");
  const netWeightPerPackagingUnit =
    calculateNetWeightPerPackagingUnit(packSize, unitPerCase, baseUnit) ??
    (p.netWeightPerPackagingUnit !== undefined
      ? Number(p.netWeightPerPackagingUnit)
      : p.netWeightPerCase !== undefined
        ? Number(p.netWeightPerCase)
        : p.netWeight !== undefined
          ? Number(p.netWeight)
          : undefined);
  const grossWeight =
    p.grossWeight !== undefined
      ? Number(p.grossWeight)
      : p.grossWeightPerCase !== undefined
        ? Number(p.grossWeightPerCase)
        : undefined;
  return {
    id: p.id ?? 0,
    productCode,
    supplier: p.supplier ?? "",
    supplierCode: p.supplierCode ?? p.vendorProductCode ?? "",
    productId: p.productId ?? "",
    productName: p.productName ?? "",
    scientificName: p.scientificName ?? "",
    category: p.category ?? "",
    subCategory: p.subCategory ?? "",
    segment: p.segment ?? "",
    form: p.form ?? p.formulation ?? "",
    cfu: p.cfu ?? "",
    authority: p.authority ?? "",
    hsnCode: p.hsnCode ?? "",
    hsnId: p.hsnId !== undefined ? Number(p.hsnId) : undefined,
    gstRate: p.gstRate ?? "",
    gstId: p.gstId !== undefined ? Number(p.gstId) : undefined,
    sku,
    packSize,
    baseUnit,
    mou,
    unitPerCase,
    packagingUnit: p.packagingUnit ?? "",
    unitPerPackagingUnit,
    netWeightPerPackagingUnit,
    grossWeight,
    mrp: p.mrp !== undefined ? Number(p.mrp) : undefined,
    manufacturerProductCode: p.manufacturerProductCode ?? "",
    vendorProductCode: p.vendorProductCode ?? "",
    barcode: p.barcode ?? "",
    status: (p.status as ProductStatus) ?? "active",
    createdBy: p.createdBy ?? "Admin",
    createdDate: p.createdDate ?? todayStr(),
    updatedBy: p.updatedBy ?? "Admin",
    updatedDate: p.updatedDate ?? todayStr(),
    productImages,
    productUrls,
    productDocuments: Array.isArray(p.productDocuments) ? p.productDocuments : [],
    vendorMappings: Array.isArray(p.vendorMappings) ? p.vendorMappings : [],
    assets: legacyAssets,
    mediaItems: legacyAssets,
    conversionQuantity: unitPerPackagingUnit,
    unitSize: packSize,
    qtyInKgL: p.qtyInKgL !== undefined ? Number(p.qtyInKgL) : undefined,
    unitsPerCase: unitPerCase,
    packingContainer: p.packingContainer ?? "",
    containerType: p.containerType ?? "",
    bottleSealCategory: p.bottleSealCategory ?? "",
    netWeight: netWeightPerPackagingUnit,
    grossWeightPerCase: grossWeight,
    netWeightSingleUnit: p.netWeightSingleUnit !== undefined ? Number(p.netWeightSingleUnit) : undefined,
    grossWeightSingleUnit: p.grossWeightSingleUnit !== undefined ? Number(p.grossWeightSingleUnit) : undefined,
    netWeightPerCase: netWeightPerPackagingUnit,
    boxLength: p.boxLength !== undefined ? Number(p.boxLength) : undefined,
    boxWidth: p.boxWidth !== undefined ? Number(p.boxWidth) : undefined,
    boxHeight: p.boxHeight !== undefined ? Number(p.boxHeight) : undefined,
    cft: p.cft !== undefined ? Number(p.cft) : undefined,
    inventoryAccount: p.inventoryAccount,
    salesAccount: p.salesAccount,
    purchaseAccount: p.purchaseAccount,
    cogsAccount: p.cogsAccount,
  };
}

export function loadProducts(): Product[] {
  if (typeof window === "undefined") return SEED_PRODUCTS;
  ensureProductDemoSeed();
  return loadProductsRaw();
}

function loadProductsRaw(): Product[] {
  if (typeof window === "undefined") return SEED_PRODUCTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_PRODUCTS;
    return (JSON.parse(raw) as Record<string, unknown>[]).map(migrateProduct);
  } catch {
    return SEED_PRODUCTS;
  }
}

const PRODUCT_DEMO_SEED_VERSION = "2026-jun-product-master-v4";
const PRODUCT_SEED_VERSION_KEY = "ds_product_seed_version";

function mergeSeedMasterFields(existing: Product[]): Product[] {
  const seedById = new Map(SEED_PRODUCTS.map((p) => [p.id, p]));
  const seedBySku = new Map(SEED_PRODUCTS.map((p) => [p.sku.toUpperCase(), p]));

  const merged = existing.map((product) => {
    const seed =
      seedById.get(product.id) ?? seedBySku.get(product.sku.toUpperCase());
    if (!seed) return product;

    const mrp =
      product.mrp != null && Number(product.mrp) > 0
        ? Number(product.mrp)
        : seed.mrp;

    return {
      ...product,
      ...(mrp != null && mrp > 0 ? { mrp } : {}),
      productCode: product.productCode || seed.productCode,
      supplier: product.supplier || seed.supplier,
      supplierCode: product.supplierCode || seed.supplierCode,
    };
  });

  const existingSkus = new Set(merged.map((p) => p.sku.toUpperCase()));
  const toAdd = SEED_PRODUCTS.filter((p) => !existingSkus.has(p.sku.toUpperCase()));
  return [...merged, ...toAdd];
}

function ensureProductDemoSeed(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(PRODUCT_SEED_VERSION_KEY) === PRODUCT_DEMO_SEED_VERSION) return;

  const existing = loadProductsRaw();
  saveProducts(mergeSeedMasterFields(existing));
  localStorage.setItem(PRODUCT_SEED_VERSION_KEY, PRODUCT_DEMO_SEED_VERSION);
}

export function saveProducts(list: Product[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function nextProductId(list: Product[]): number {
  return Math.max(0, ...list.map((item) => item.id)) + 1;
}

export function getCategoryCodePrefix(category: string): string {
  const c = category.trim().toLowerCase();
  if (c.includes("fertil")) return "FERT";
  if (c.includes("seed")) return "SEED";
  if (c.includes("pestic")) return "PEST";
  if (c.includes("bio")) return "BIO";
  return "PROD";
}

/** Generate next product code for a category (e.g. FERT-000001). */
export function generateProductCode(category: string, list: Product[]): string {
  const prefix = getCategoryCodePrefix(category);
  let max = 0;
  for (const product of list) {
    const code = (product.productCode || product.sku || "").trim().toUpperCase();
    const match = code.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(6, "0")}`;
}

/** Ensure a product code exists when category is selected (add flow). */
export function resolveProductCodeForSave(
  category: string,
  productCode: string,
  list?: Product[],
): string {
  const trimmed = productCode.trim().toUpperCase();
  if (trimmed) return trimmed;
  const cat = category.trim();
  if (!cat) return "";
  return generateProductCode(cat, list ?? loadProducts());
}

/** Resolve display product code (backward compatible). */
export function getProductCode(product: Pick<Product, "productCode" | "sku">): string {
  return product.productCode?.trim() || product.sku?.trim() || "";
}

export function formatPackSize(product: Pick<Product, "packSize" | "unitSize" | "baseUnit">): string {
  const size = product.packSize ?? product.unitSize;
  if (size === undefined || size === null) return "—";
  const unit = product.baseUnit?.trim();
  return unit ? `${size} ${unit}` : String(size);
}

export function formatGrossWeight(
  product: Pick<Product, "grossWeight" | "mou" | "baseUnit">,
): string | undefined {
  if (product.grossWeight === undefined || product.grossWeight === null) return undefined;
  const unit =
    product.mou?.trim() || getMouFromUnit(product.baseUnit ?? "") || "";
  const value = formatWeightValue(product.grossWeight);
  return unit ? `${value} ${unit}` : value;
}

/** Numeric net weight in MoU (unit shown separately in MoU field). */
export function formatNetWeightDisplay(
  packSize: number | undefined,
  unitPerCase: number | undefined,
  baseUnit: string,
): string {
  const value = calculateNetWeightPerPackagingUnit(
    packSize,
    unitPerCase,
    baseUnit,
  );
  if (value === undefined) return "";
  return formatWeightValue(value);
}

export function formatNetWeight(
  product: Pick<
    Product,
    | "packSize"
    | "unitSize"
    | "unitPerCase"
    | "unitsPerCase"
    | "baseUnit"
    | "netWeightPerPackagingUnit"
  >,
): string | undefined {
  const packSize = product.packSize ?? product.unitSize;
  const unitPerCase = product.unitPerCase ?? product.unitsPerCase;
  const baseUnit = normalizeProductUnit(product.baseUnit ?? "");
  if (packSize !== undefined && unitPerCase !== undefined && baseUnit) {
    const display = formatNetWeightDisplay(packSize, unitPerCase, baseUnit);
    if (display) return display;
  }
  if (product.netWeightPerPackagingUnit !== undefined) {
    return formatWeightValue(product.netWeightPerPackagingUnit);
  }
  return undefined;
}

/** User-friendly packaging label e.g. Bottle (12/Case), Bag (50). */
export function formatPackagingDisplay(
  product: Pick<Product, "packagingUnit" | "conversionQuantity" | "unitsPerCase">,
): string {
  const unit = product.packagingUnit?.trim();
  if (!unit) return "—";
  const perCase = product.unitsPerCase;
  if (perCase !== undefined && perCase > 0) {
    return `${unit} (${perCase}/Case)`;
  }
  const qty = product.conversionQuantity;
  if (qty !== undefined && qty > 0) {
    return `${unit} (${qty})`;
  }
  return unit;
}

export function loadActiveVendorOptions(): MasterSelectOption[] {
  if (typeof window === "undefined") return [];
  // Lazy require avoids pulling vendor master into every product/pricing chunk at init
  const { loadVendors } = require("../vendors/vendor-data") as typeof import("../vendors/vendor-data");
  return loadVendors()
    .filter((v) => v.status === "active")
    .map((v) => ({ value: v.vendorName, label: v.vendorName }));
}

export function loadActiveSupplierOptions(): MasterSelectOption[] {
  return loadActiveVendorOptions();
}

export function resolveSupplierCode(supplierName: string): string {
  const name = supplierName.trim();
  if (!name || typeof window === "undefined") return "";
  const { loadVendors } = require("../vendors/vendor-data") as typeof import("../vendors/vendor-data");
  const vendor = loadVendors().find(
    (v) =>
      v.status === "active" &&
      (v.vendorName === name || v.companyName === name),
  );
  return vendor?.vendorCode?.trim() ?? "";
}

/** Products linked to a supplier via Product Master (supplier / supplierCode fields). */
export function loadProductsForSupplier(
  supplierName: string,
  supplierCode?: string,
): Product[] {
  const name = supplierName.trim().toLowerCase();
  const code = supplierCode?.trim().toUpperCase() ?? "";
  return loadProducts().filter((p) => {
    if (p.status === "archived") return false;
    const productSupplier = p.supplier?.trim().toLowerCase() ?? "";
    const productCode = p.supplierCode?.trim().toUpperCase() ?? "";
    if (name && productSupplier === name) return true;
    if (code && productCode === code) return true;
    return false;
  });
}

/**
 * Net weight in MoU = (pack size × unit per packaging unit), converted per Unit.
 * Gms/Ml are divided by 1000 to Kg/Ltr; Kg/Ltr stay as-is.
 */
export function calculateNetWeightPerPackagingUnit(
  packSize: number | undefined,
  unitPerCase: number | undefined,
  baseUnit?: string,
): number | undefined {
  if (
    packSize === undefined ||
    unitPerCase === undefined ||
    isNaN(packSize) ||
    isNaN(unitPerCase) ||
    packSize <= 0 ||
    unitPerCase <= 0
  ) {
    return undefined;
  }
  const unit = normalizeProductUnit(baseUnit ?? "");
  if (!unit) return undefined;
  const raw = packSize * unitPerCase;
  if (unit === "Gms" || unit === "Ml") return raw / 1000;
  if (unit === "Kg" || unit === "Ltr") return raw;
  return undefined;
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}
