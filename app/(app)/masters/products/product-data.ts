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

export type ProductStatus = "active" | "inactive";

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
  /** @deprecated Legacy product code — not shown in UI. Use `sku` instead. */
  productId?: string;
  productName: string;
  scientificName?: string;
  category: string;
  subCategory: string;
  segment: string;
  /** Product form (e.g. Wettable Powder, Liquid) — was `formulation` */
  form: string;
  /** CFU count from CFU Master (e.g. 1×10⁸ cells/ml) */
  cfu?: string;
  /** @deprecated use `form` */
  formulation?: string;
  hsnCode: string;
  hsnId?: number;
  gstRate: string;
  gstId?: number;
  sku: string;
  status: ProductStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  productImages?: ProductImage[];
  productUrls?: ProductUrl[];
  /** @deprecated Merged media store — use productImages + productUrls */
  assets?: ProductAsset[];
  /** @deprecated Use productImages + productUrls */
  mediaItems?: ProductAsset[];
  baseUnit?: string;
  packagingUnit?: string;
  conversionQuantity?: number;
  unitSize?: number;
  netWeight?: number;
  grossWeight?: number;
  /** Accounting auto-mapping (ERP → COA) */
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
    productName: "Dharitri Hybrid Corn Gold",
    scientificName: "Zea mays",
    category: "Seeds",
    subCategory: "",
    segment: "Rakshak",
    form: "Granules",
    hsnCode: "1209",
    gstRate: "0%",
    sku: "SEED-CORN-001",
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
    sku: "FERT-WSF-019",
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
    sku: "PEST-EC-221",
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
    sku: "BIO-SUS-104",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-02-16",
    updatedBy: "Admin",
    updatedDate: "2026-04-22",
    baseUnit: "Gram",
    packagingUnit: "Packet",
    conversionQuantity: 50,
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
    sku: "FERT-UREA-50",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-03-01",
    updatedBy: "Admin",
    updatedDate: "2026-03-01",
    baseUnit: "KG",
    packagingUnit: "Bag",
    conversionQuantity: 50,
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
    sku: "FERT-NPK-1026",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-03-01",
    updatedBy: "Admin",
    updatedDate: "2026-03-01",
    baseUnit: "KG",
    packagingUnit: "Bag",
    conversionQuantity: 50,
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
    sku: "FERT-DAP-50",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-03-01",
    updatedBy: "Admin",
    updatedDate: "2026-03-01",
    baseUnit: "KG",
    packagingUnit: "Bag",
    conversionQuantity: 50,
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
    sku: "FERT-ZNS-21",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-03-01",
    updatedBy: "Admin",
    updatedDate: "2026-03-01",
    baseUnit: "KG",
    packagingUnit: "Bag",
    conversionQuantity: 25,
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
    sku: "SEED-MAIZE-001",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-03-01",
    updatedBy: "Admin",
    updatedDate: "2026-03-01",
    baseUnit: "KG",
    packagingUnit: "Bag",
    conversionQuantity: 25,
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
  return {
    id: p.id ?? 0,
    productId: p.productId ?? "",
    productName: p.productName ?? "",
    scientificName: p.scientificName ?? "",
    category: p.category ?? "",
    subCategory: p.subCategory ?? "",
    segment: p.segment ?? "",
    form: p.form ?? p.formulation ?? "",
    cfu: p.cfu ?? "",
    hsnCode: p.hsnCode ?? "",
    hsnId: p.hsnId !== undefined ? Number(p.hsnId) : undefined,
    gstRate: p.gstRate ?? "",
    gstId: p.gstId !== undefined ? Number(p.gstId) : undefined,
    sku: p.sku ?? "",
    status: (p.status as ProductStatus) ?? "active",
    createdBy: p.createdBy ?? "Admin",
    createdDate: p.createdDate ?? todayStr(),
    updatedBy: p.updatedBy ?? "Admin",
    updatedDate: p.updatedDate ?? todayStr(),
    productImages,
    productUrls,
    assets: legacyAssets,
    mediaItems: legacyAssets,
    baseUnit: p.baseUnit ?? "",
    packagingUnit: p.packagingUnit ?? "",
    conversionQuantity: p.conversionQuantity !== undefined ? Number(p.conversionQuantity) : undefined,
    unitSize: p.unitSize !== undefined ? Number(p.unitSize) : undefined,
    netWeight: p.netWeight !== undefined ? Number(p.netWeight) : undefined,
    grossWeight: p.grossWeight !== undefined ? Number(p.grossWeight) : undefined,
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

const PRODUCT_DEMO_SEED_VERSION = "2026-jun-warehouse-v1";
const PRODUCT_SEED_VERSION_KEY = "ds_product_seed_version";

function ensureProductDemoSeed(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(PRODUCT_SEED_VERSION_KEY) === PRODUCT_DEMO_SEED_VERSION) return;
  const existing = loadProductsRaw();
  const existingSkus = new Set(existing.map((p) => p.sku));
  const toAdd = SEED_PRODUCTS.filter((p) => p.id >= 5 && !existingSkus.has(p.sku));
  if (toAdd.length > 0) {
    saveProducts([...existing, ...toAdd]);
  }
  localStorage.setItem(PRODUCT_SEED_VERSION_KEY, PRODUCT_DEMO_SEED_VERSION);
}

export function saveProducts(list: Product[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function nextProductId(list: Product[]): number {
  return Math.max(0, ...list.map((item) => item.id)) + 1;
}

/** @deprecated Product code is no longer generated. Use SKU as the product identifier. */
export function generateProductCode(_list: Product[]): string {
  return "";
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}
