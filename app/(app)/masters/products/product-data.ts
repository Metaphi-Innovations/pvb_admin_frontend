"use client";

export type ProductStatus = "active" | "inactive" | "draft";

export type ProductAssetMediaKind = "image" | "video" | "pdf" | "document" | "spreadsheet";

export interface ProductAsset {
  id: string;
  type: "media" | "link";
  mediaKind?: ProductAssetMediaKind;
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

export interface Product {
  id: number;
  productId: string;
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
  mrp: number;
  costPrice: number;
  distributorPrice: number;
  reorderLevel: string;
  status: ProductStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  assets?: ProductAsset[];
  mediaItems?: ProductAsset[];
  baseUnit?: string;
  packagingUnit?: string;
  conversionQuantity?: number;
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

export function createMediaItem(file: File, kind?: ProductAssetMediaKind): ProductAsset {
  const mediaKind = kind ?? detectAssetKind(file);
  const objectUrl = URL.createObjectURL(file);
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    type: "media",
    mediaKind,
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
    name: title || url,
    title,
    url,
    uploaded: false,
    createdAt: todayStr(),
    kind: "link",
  };
}

export const PRODUCT_CATEGORY_OPTIONS = [
  { value: "seeds", label: "Seeds" },
  { value: "fertilizers", label: "Fertilizers" },
  { value: "pesticides", label: "Pesticides" },
  { value: "bio-products", label: "Bio Products" },
  { value: "equipment", label: "Equipment" },
];

export const PRODUCT_SUBCATEGORY_OPTIONS = [
  { value: "hybrid-seeds", label: "Hybrid Seeds" },
  { value: "water-soluble-fertilizers", label: "Water Soluble Fertilizers" },
  { value: "fungicides", label: "Fungicides" },
  { value: "herbicides", label: "Herbicides" },
  { value: "insecticides", label: "Insecticides" },
];

export const PRODUCT_SEGMENT_OPTIONS = [
  { value: "premium", label: "Premium" },
  { value: "economy", label: "Economy" },
  { value: "commercial", label: "Commercial" },
  { value: "retail", label: "Retail" },
  { value: "institutional", label: "Institutional" },
];

export const PRODUCT_FORMULATION_OPTIONS = [
  { value: "liquid", label: "Liquid" },
  { value: "powder", label: "Powder" },
  { value: "granules", label: "Granules" },
  { value: "tablets", label: "Tablets" },
  { value: "suspension", label: "Suspension" },
  { value: "ec", label: "Emulsifiable Concentrate (EC)" },
  { value: "wp", label: "Wettable Powder (WP)" },
];

export const PRODUCT_UNIT_OPTIONS = [
  { value: "kg", label: "KG" },
  { value: "gram", label: "Gram" },
  { value: "liter", label: "Liter" },
  { value: "ml", label: "ML" },
  { value: "packet", label: "Packet" },
  { value: "bottle", label: "Bottle" },
  { value: "box", label: "Box" },
  { value: "drum", label: "Drum" },
];

export const PRODUCT_GST_OPTIONS = [
  { value: "0%", label: "0%" },
  { value: "5%", label: "5%" },
  { value: "12%", label: "12%" },
  { value: "18%", label: "18%" },
  { value: "28%", label: "28%" },
];

export const PRODUCT_REORDER_LEVEL_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const PRODUCT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
] as const;

const STORAGE_KEY = "ds_products";

const SEED_PRODUCTS: Product[] = [
  {
    id: 1,
    productId: "PRD-0001",
    productName: "Dharitri Hybrid Corn Gold",
    category: "Seeds",
    subCategory: "",
    segment: "Premium",
    formulation: "Powder",
    unit: "Packet",
    hsnCode: "1209",
    gstRate: "0%",
    sku: "SEED-CORN-001",
    cropApplicable: "Corn",
    packSize: "1 KG",
    mrp: 1450,
    costPrice: 0,
    distributorPrice: 0,
    reorderLevel: "Medium",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-10",
    updatedBy: "Admin",
    updatedDate: "2026-03-12",
    baseUnit: "KG",
    packagingUnit: "Bag",
    conversionQuantity: 25,
    assets: [
      {
        id: "prd-1-media-1",
        type: "media",
        mediaKind: "image",
        name: "dharitri-hybrid-corn-gold.jpg",
        url: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80",
        uploaded: true,
        createdAt: "2026-06-03",
      },
      {
        id: "prd-1-media-2",
        type: "media",
        mediaKind: "image",
        name: "dharitri-pack-shot.jpg",
        url: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80",
        uploaded: true,
        createdAt: "2026-06-03",
      },
      {
        id: "prd-1-doc-1",
        type: "media",
        mediaKind: "pdf",
        name: "product-brochure.pdf",
        url: "https://example.com/documents/product-brochure.pdf",
        size: "1.2 MB",
        uploaded: true,
        createdAt: "2026-06-03",
      },
      {
        id: "prd-1-link-1",
        type: "link",
        name: "Official Product Page",
        title: "Official Product Page",
        url: "https://example.com/products/dharitri-hybrid-corn-gold",
        uploaded: true,
        createdAt: "2026-06-03",
      },
    ],
  },
  {
    id: 2,
    productId: "PRD-0002",
    productName: "NutriGrow WS 19:19:19",
    category: "Fertilizers",
    subCategory: "",
    segment: "Commercial",
    formulation: "Powder",
    unit: "KG",
    hsnCode: "3105",
    gstRate: "5%",
    sku: "FERT-WSF-019",
    cropApplicable: "Vegetables",
    packSize: "25 KG",
    mrp: 1325,
    costPrice: 0,
    distributorPrice: 0,
    reorderLevel: "High",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-01-18",
    updatedBy: "Admin",
    updatedDate: "2026-03-18",
    baseUnit: "KG",
    packagingUnit: "Box",
    conversionQuantity: 10,
    assets: [
      {
        id: "prd-2-media-1",
        type: "media",
        mediaKind: "image",
        name: "nutrigrow-wsf-191919.jpg",
        url: "https://images.unsplash.com/photo-1465433360938-e1e1f5a7f7d6?auto=format&fit=crop&w=1200&q=80",
        uploaded: true,
        createdAt: "2026-06-03",
      },
    ],
  },
  {
    id: 3,
    productId: "PRD-0003",
    productName: "Shield EC Crop Guard",
    category: "Pesticides",
    subCategory: "",
    segment: "Retail",
    formulation: "Emulsifiable Concentrate (EC)",
    unit: "Bottle",
    hsnCode: "3808",
    gstRate: "18%",
    sku: "PEST-EC-221",
    cropApplicable: "Cotton",
    packSize: "500 ML",
    mrp: 680,
    costPrice: 0,
    distributorPrice: 0,
    reorderLevel: "Medium",
    status: "inactive",
    createdBy: "Admin",
    createdDate: "2026-02-03",
    updatedBy: "Admin",
    updatedDate: "2026-04-05",
    baseUnit: "Liter",
    packagingUnit: "Drum",
    conversionQuantity: 200,
    assets: [],
  },
  {
    id: 4,
    productId: "PRD-0004",
    productName: "BioRoot Vital Suspension",
    category: "Bio Products",
    subCategory: "",
    segment: "Institutional",
    formulation: "Suspension",
    unit: "Liter",
    hsnCode: "3002",
    gstRate: "12%",
    sku: "BIO-SUS-104",
    cropApplicable: "Paddy",
    packSize: "1 Liter",
    mrp: 890,
    costPrice: 0,
    distributorPrice: 0,
    reorderLevel: "Low",
    status: "draft",
    createdBy: "Admin",
    createdDate: "2026-02-16",
    updatedBy: "Admin",
    updatedDate: "2026-04-22",
    baseUnit: "Gram",
    packagingUnit: "Packet",
    conversionQuantity: 50,
    assets: [],
  },
];

function migrateProduct(raw: Record<string, unknown>): Product {
  const p = raw as Partial<Product> & { mediaItems?: ProductAsset[] };
  const assets = Array.isArray(p.assets) ? (p.assets as ProductAsset[]) : Array.isArray(p.mediaItems) ? (p.mediaItems as ProductAsset[]) : [];
  return {
    id: p.id ?? 0,
    productId: p.productId ?? "",
    productName: p.productName ?? "",
    category: p.category ?? "",
    subCategory: p.subCategory ?? "",
    segment: p.segment ?? "",
    formulation: p.formulation ?? "",
    unit: p.unit ?? "",
    hsnCode: p.hsnCode ?? "",
    gstRate: p.gstRate ?? "18%",
    sku: p.sku ?? "",
    cropApplicable: p.cropApplicable ?? "",
    packSize: p.packSize ?? "",
    mrp: Number(p.mrp ?? 0),
    costPrice: Number(p.costPrice ?? 0),
    distributorPrice: Number(p.distributorPrice ?? 0),
    reorderLevel: p.reorderLevel ?? "Medium",
    status: (p.status as ProductStatus) ?? "active",
    createdBy: p.createdBy ?? "Admin",
    createdDate: p.createdDate ?? todayStr(),
    updatedBy: p.updatedBy ?? "Admin",
    updatedDate: p.updatedDate ?? todayStr(),
    assets,
    mediaItems: assets,
    baseUnit: p.baseUnit ?? "",
    packagingUnit: p.packagingUnit ?? "",
    conversionQuantity: p.conversionQuantity !== undefined ? Number(p.conversionQuantity) : undefined,
  };
}

export function loadProducts(): Product[] {
  if (typeof window === "undefined") return SEED_PRODUCTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_PRODUCTS;
    return (JSON.parse(raw) as Record<string, unknown>[]).map(migrateProduct);
  } catch {
    return SEED_PRODUCTS;
  }
}

export function saveProducts(list: Product[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function nextProductId(list: Product[]): number {
  return Math.max(0, ...list.map((item) => item.id)) + 1;
}

export function generateProductCode(list: Product[]): string {
  const maxNum = list.reduce((max, item) => {
    const match = item.productId.match(/PRD-(\d+)/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `PRD-${String(maxNum + 1).padStart(4, "0")}`;
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}
