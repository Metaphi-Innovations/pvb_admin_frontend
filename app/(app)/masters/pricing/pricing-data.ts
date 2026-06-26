import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";
import { loadMasterRecords, saveMasterRecords } from "@/lib/masters/common";
import { formatIndianRupeeDisplay } from "@/lib/currency/indian-rupee";
import { loadProducts, type Product } from "../products/product-data";

export { formatIndianRupeeDisplay };

export const PRICING_STORAGE_KEY = "ds_master_pricing_v2";
export const PRICING_DEMO_SEED_VERSION = "2026-jun-pricing-bulk-v2";
const PRICING_SEED_VERSION_KEY = "ds_pricing_seed_version";

export const PRICING_CUSTOMER_TYPES = [
  "Distributor",
  "Dealer",
  "Retailer",
  "Farmer",
  "Institutional",
  "Government",
  "Others",
] as const;

export type PricingCustomerType = (typeof PRICING_CUSTOMER_TYPES)[number];

/** Wildcard when pricing applies across every state or customer type. */
export const PRICING_ALL_STATES = "All States";
export const PRICING_ALL_CUSTOMER_TYPES = "All Customer Types";

export type PricingScopeCustomerType =
  | PricingCustomerType
  | typeof PRICING_ALL_CUSTOMER_TYPES;

export type DiscountType = "" | "percentage" | "flat";

export type PricingMode = "single" | "bulk";

export interface ProductPricingSnapshot {
  id: number;
  productCode: string;
  sku: string;
  productName: string;
  segment: string;
  category: string;
  baseUnit: string;
  mou: string;
  packagingUnit: string;
  packSize: string;
  unitsPerCase: number;
  hsnCode: string;
  gstPct: string;
  costPrice: number;
  productDealerPrice: number;
  mrp: number;
}

export interface BulkPricingLine extends ProductPricingSnapshot {
  dealerPrice: number;
  discountType: DiscountType;
  discountValue: number;
  netSellingPrice: number;
  status: MasterStatus;
}

export const PRICING_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
] as const;

/** Reference COGS by product — simulates read-only cost from Product Master (mock). */
const PRODUCT_REFERENCE_COST: Record<number, number> = {
  1: 450,
  2: 380,
  3: 320,
  4: 290,
  5: 280,
  6: 380,
  7: 520,
  8: 240,
  9: 450,
};

/** Reference dealer price by product — simulates read-only dealer price from Product Master (mock). */
const PRODUCT_REFERENCE_DEALER_PRICE: Record<number, number> = {
  1: 620,
  2: 540,
  3: 460,
  4: 420,
  5: 400,
  6: 540,
  7: 720,
  8: 340,
  9: 620,
};

export interface PricingRecord extends BaseMasterRecord {
  productId: number;
  productCode: string;
  sku: string;
  productName: string;
  segment: string;
  category: string;
  baseUnit: string;
  mou: string;
  uom: string;
  packSize: string;
  unitsPerCase: number;
  hsnCode: string;
  gstPct: string;
  productDealerPrice: number;
  customerType: PricingScopeCustomerType;
  state: string;
  effectiveFrom: string;
  effectiveTo: string;
  priceListName: string;
  costPrice: number;
  mrp: number;
  distributorPrice: number;
  dealerPrice: number;
  retailPrice: number;
  farmerPrice: number;
  specialPrice: number;
  discountType: DiscountType;
  discountValue: number;
  netSellingPrice: number;
}

export interface PricingForm {
  pricingMode: PricingMode;
  productId: string;
  productCode: string;
  productName: string;
  sku: string;
  segment: string;
  category: string;
  baseUnit: string;
  mou: string;
  uom: string;
  packSize: string;
  unitsPerCase: number;
  hsnCode: string;
  gstPct: string;
  productDealerPrice: number;
  mrpOverride: boolean;
  customerType: PricingScopeCustomerType | "";
  state: string;
  states: string[];
  customerTypes: PricingCustomerType[];
  applyToAllStates: boolean;
  applyToAllCustomerTypes: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  priceListName: string;
  costPrice: number;
  mrp: number;
  distributorPrice: number;
  dealerPrice: number;
  retailPrice: number;
  farmerPrice: number;
  specialPrice: number;
  discountType: DiscountType;
  discountValue: number;
  netSellingPrice: number;
  status: MasterStatus;
  bulkLines: BulkPricingLine[];
  bulkProductIds: string[];
  bulkCategory: string;
  bulkSegment: string;
}

export const DEFAULT_PRICING_FORM: PricingForm = {
  pricingMode: "single",
  productId: "",
  productCode: "",
  productName: "",
  sku: "",
  segment: "",
  category: "",
  baseUnit: "",
  mou: "",
  uom: "",
  packSize: "",
  unitsPerCase: 1,
  hsnCode: "",
  gstPct: "",
  productDealerPrice: 0,
  mrpOverride: false,
  customerType: "",
  state: "",
  states: [],
  customerTypes: [],
  applyToAllStates: false,
  applyToAllCustomerTypes: false,
  effectiveFrom: masterToday(),
  effectiveTo: "",
  priceListName: "",
  costPrice: 0,
  mrp: 0,
  distributorPrice: 0,
  dealerPrice: 0,
  retailPrice: 0,
  farmerPrice: 0,
  specialPrice: 0,
  discountType: "",
  discountValue: 0,
  netSellingPrice: 0,
  status: "active",
  bulkLines: [],
  bulkProductIds: [],
  bulkCategory: "",
  bulkSegment: "",
};

export function generatePriceListName(
  state: string,
  customerType: PricingScopeCustomerType | "",
): string {
  const s = state.trim();
  const ct = customerType;
  if (!s && !ct) return "";
  if (s === PRICING_ALL_STATES && ct === PRICING_ALL_CUSTOMER_TYPES) {
    return "Universal Price List";
  }
  if (s === PRICING_ALL_STATES && ct) {
    return `${ct} — All States`;
  }
  if (ct === PRICING_ALL_CUSTOMER_TYPES && s) {
    return `${s} — All Customer Types`;
  }
  if (!s || !ct) return "";
  return `${s} ${ct} Price List`;
}

export function hasStateScope(form: Pick<
  PricingForm,
  "states" | "applyToAllStates"
>): boolean {
  return form.applyToAllStates || form.states.length > 0;
}

export function hasCustomerTypeScope(form: Pick<
  PricingForm,
  "customerTypes" | "applyToAllCustomerTypes"
>): boolean {
  return form.applyToAllCustomerTypes || form.customerTypes.length > 0;
}

export function resolveFormStates(form: PricingForm): string[] {
  if (form.applyToAllStates) return [...PRICING_STATES];
  if (form.states.length > 0) return form.states;
  if (hasCustomerTypeScope(form)) return [PRICING_ALL_STATES];
  return [];
}

export function resolveFormCustomerTypes(
  form: PricingForm,
): PricingScopeCustomerType[] {
  if (form.applyToAllCustomerTypes) return [...PRICING_CUSTOMER_TYPES];
  if (form.customerTypes.length > 0) return form.customerTypes;
  if (hasStateScope(form)) return [PRICING_ALL_CUSTOMER_TYPES];
  return [];
}

export function usesMultiScope(form: PricingForm): boolean {
  const states = resolveFormStates(form);
  const types = resolveFormCustomerTypes(form);
  return states.length > 1 || types.length > 1;
}

export function pricingScopesOverlap(
  aState: string,
  aType: PricingScopeCustomerType,
  bState: string,
  bType: PricingScopeCustomerType,
): boolean {
  const stateMatch =
    aState === bState ||
    aState === PRICING_ALL_STATES ||
    bState === PRICING_ALL_STATES;
  const typeMatch =
    aType === bType ||
    aType === PRICING_ALL_CUSTOMER_TYPES ||
    bType === PRICING_ALL_CUSTOMER_TYPES;
  return stateMatch && typeMatch;
}

export function getFormSellingPrice(form: PricingForm): number {
  return form.dealerPrice;
}

/** Persist dealer price and mirror to legacy type-specific fields for downstream readers. */
export function buildPricingPriceFields(
  dealerPrice: number,
): Pick<
  PricingRecord,
  | "dealerPrice"
  | "distributorPrice"
  | "retailPrice"
  | "farmerPrice"
  | "specialPrice"
  | "netSellingPrice"
> {
  return {
    dealerPrice,
    distributorPrice: dealerPrice,
    retailPrice: dealerPrice,
    farmerPrice: dealerPrice,
    specialPrice: dealerPrice,
    netSellingPrice: dealerPrice,
  };
}

export function getSellingPriceFieldKey(
  customerType: PricingCustomerType | "",
): keyof Pick<
  PricingForm,
  "distributorPrice" | "dealerPrice" | "retailPrice" | "farmerPrice" | "specialPrice"
> | null {
  switch (customerType) {
    case "Distributor":
      return "distributorPrice";
    case "Dealer":
      return "dealerPrice";
    case "Retailer":
      return "retailPrice";
    case "Farmer":
      return "farmerPrice";
    case "Institutional":
    case "Government":
    case "Others":
      return "specialPrice";
    default:
      return null;
  }
}

export function getSellingPriceLabel(customerType: PricingCustomerType | ""): string {
  switch (customerType) {
    case "Distributor":
      return "Distributor Price (DP)";
    case "Dealer":
      return "Dealer Price";
    case "Retailer":
      return "Retailer Price (RP)";
    case "Farmer":
      return "Farmer Price";
    case "Institutional":
    case "Government":
    case "Others":
      return "Special Price";
    default:
      return "Selling Price";
  }
}

export function getSellingPriceFromRecord(record: PricingRecord): number {
  if (record.dealerPrice > 0) return record.dealerPrice;
  const key = getSellingPriceFieldKey(record.customerType);
  if (key) return record[key];
  return record.netSellingPrice;
}

export function getSellingPriceFromForm(form: PricingForm): number {
  return form.dealerPrice;
}

export function calculateNetSellingPrice(
  sellingPrice: number,
  discountType: DiscountType,
  discountValue: number,
): number {
  if (!sellingPrice || sellingPrice <= 0) return 0;
  if (!discountType || !discountValue) return sellingPrice;
  if (discountType === "percentage") {
    return sellingPrice - (sellingPrice * discountValue) / 100;
  }
  return sellingPrice - discountValue;
}

export function formatDiscountDisplay(
  discountType: DiscountType,
  discountValue: number,
): string {
  if (!discountType || !discountValue) return "—";
  if (discountType === "percentage") return `${discountValue}%`;
  return formatIndianRupeeDisplay(discountValue);
}

function openEndedDateEnd(date: string): string {
  return date.trim() || "9999-12-31";
}

export function dateRangesOverlap(
  fromA: string,
  toA: string,
  fromB: string,
  toB: string,
): boolean {
  if (!fromA || !fromB) return false;
  const endA = openEndedDateEnd(toA);
  const endB = openEndedDateEnd(toB);
  return fromA <= endB && fromB <= endA;
}

function migratePricingRecord(raw: Partial<PricingRecord>): PricingRecord {
  const customerType = (raw.customerType as PricingCustomerType) || "Distributor";
  const state = raw.state ?? "Maharashtra";
  const effectiveFrom = raw.effectiveFrom ?? raw.createdAt ?? masterToday();
  const effectiveTo = raw.effectiveTo ?? "";
  const sellingPrice =
    raw.distributorPrice ?? raw.retailPrice ?? raw.dealerPrice ?? raw.farmerPrice ?? 0;

  const product = raw.productId
    ? loadProducts().find((p) => p.id === raw.productId)
    : undefined;

  const record: PricingRecord = {
    id: raw.id ?? 0,
    productId: raw.productId ?? 0,
    productCode: raw.productCode ?? product?.productCode ?? raw.sku ?? "",
    sku: raw.sku ?? product?.sku ?? "",
    productName: raw.productName ?? product?.productName ?? "",
    segment: raw.segment ?? product?.segment ?? "",
    category: raw.category ?? product?.category ?? "",
    baseUnit: raw.baseUnit ?? product?.baseUnit ?? raw.uom ?? "",
    mou: raw.mou ?? (parseStoredPackSize(raw.packSize ?? "", product).mou || resolveMou(product)),
    uom: raw.uom ?? product?.packagingUnit ?? "",
    packSize: parseStoredPackSize(raw.packSize ?? "", product).packSize,
    unitsPerCase: raw.unitsPerCase ?? resolveUnitsPerCase(product),
    hsnCode: raw.hsnCode ?? product?.hsnCode ?? "",
    gstPct: raw.gstPct ?? product?.gstRate ?? "",
    productDealerPrice:
      raw.productDealerPrice ?? resolveProductDealerPrice(raw.productId ?? 0),
    customerType,
    state,
    effectiveFrom,
    effectiveTo,
    priceListName:
      raw.priceListName ?? generatePriceListName(state, customerType),
    costPrice: raw.costPrice ?? resolveProductCostPrice(raw.productId ?? 0),
    mrp: raw.mrp ?? product?.mrp ?? 0,
    distributorPrice: raw.distributorPrice ?? sellingPrice,
    dealerPrice: raw.dealerPrice ?? 0,
    retailPrice: raw.retailPrice ?? sellingPrice,
    farmerPrice: raw.farmerPrice ?? 0,
    specialPrice: raw.specialPrice ?? 0,
    discountType: "",
    discountValue: 0,
    netSellingPrice:
      getSellingPriceFromRecord({
        ...raw,
        customerType,
        distributorPrice: raw.distributorPrice ?? sellingPrice,
        dealerPrice: raw.dealerPrice ?? 0,
        retailPrice: raw.retailPrice ?? sellingPrice,
        farmerPrice: raw.farmerPrice ?? 0,
        specialPrice: raw.specialPrice ?? 0,
      } as PricingRecord) || sellingPrice,
    status: raw.status ?? "active",
    createdBy: raw.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: raw.updatedBy ?? MASTER_CURRENT_USER,
    createdAt: raw.createdAt ?? masterToday(),
    updatedAt: raw.updatedAt ?? masterToday(),
  };

  return record;
}

function resolvePackSizeNumber(product?: Product): string {
  if (!product) return "";
  const qty = product.conversionQuantity ?? product.packSize;
  if (qty == null || qty === "") return "";
  return String(qty);
}

function resolveMou(product?: Product): string {
  if (!product) return "";
  return (product.mou ?? product.baseUnit ?? "").trim();
}

function resolveUnitsPerCase(product?: Product): number {
  if (!product) return 1;
  return product.unitPerCase ?? product.unitsPerCase ?? 1;
}

function parseStoredPackSize(
  packSize: string,
  product?: Product,
): { packSize: string; mou: string } {
  const fromProduct = resolvePackSizeNumber(product);
  if (fromProduct) {
    return { packSize: fromProduct, mou: resolveMou(product) };
  }
  const trimmed = packSize.trim();
  if (!trimmed) return { packSize: "", mou: resolveMou(product) };
  const match = trimmed.match(/^([\d.]+)(?:\s+(.+))?$/);
  if (match) {
    return { packSize: match[1], mou: (match[2] ?? resolveMou(product)).trim() };
  }
  return { packSize: trimmed, mou: resolveMou(product) };
}

export const PRICING_SEED = [
  {
    id: 1,
    productId: 1,
    sku: "SEED-CORN-001",
    productName: "Dharitri Hybrid Corn Gold",
    segment: "Rakshak",
    category: "Seeds",
    baseUnit: "KG",
    uom: "Bag",
    packSize: "25 KG",
    unitsPerCase: 20,
    customerType: "Distributor",
    state: "Maharashtra",
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    priceListName: "Maharashtra Distributor Price List",
    costPrice: 450,
    mrp: 850,
    distributorPrice: 550,
    dealerPrice: 0,
    retailPrice: 700,
    farmerPrice: 0,
    specialPrice: 0,
    discountType: "percentage",
    discountValue: 5,
    netSellingPrice: 522.5,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2026-01-12",
    updatedAt: "2026-01-12",
  },
  {
    id: 2,
    productId: 1,
    sku: "SEED-CORN-001",
    productName: "Dharitri Hybrid Corn Gold",
    segment: "Rakshak",
    category: "Seeds",
    baseUnit: "KG",
    uom: "Bag",
    packSize: "25 KG",
    unitsPerCase: 20,
    customerType: "Retailer",
    state: "Maharashtra",
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    priceListName: "Maharashtra Retailer Price List",
    costPrice: 450,
    mrp: 850,
    distributorPrice: 550,
    dealerPrice: 0,
    retailPrice: 700,
    farmerPrice: 0,
    specialPrice: 0,
    discountType: "",
    discountValue: 0,
    netSellingPrice: 700,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2026-01-12",
    updatedAt: "2026-01-12",
  },
  {
    id: 3,
    productId: 2,
    sku: "FERT-WSF-019",
    productName: "NutriGrow WS 19:19:19",
    segment: "Poshak",
    category: "Fertilizers",
    baseUnit: "KG",
    uom: "Box",
    packSize: "10 KG",
    unitsPerCase: 10,
    customerType: "Distributor",
    state: "Gujarat",
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    priceListName: "Gujarat Distributor Price List",
    costPrice: 380,
    mrp: 750,
    distributorPrice: 480,
    dealerPrice: 0,
    retailPrice: 620,
    farmerPrice: 0,
    specialPrice: 0,
    discountType: "",
    discountValue: 0,
    netSellingPrice: 480,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2026-01-18",
    updatedAt: "2026-02-05",
  },
  {
    id: 4,
    productId: 2,
    sku: "FERT-WSF-019",
    productName: "NutriGrow WS 19:19:19",
    segment: "Poshak",
    category: "Fertilizers",
    baseUnit: "KG",
    uom: "Box",
    packSize: "10 KG",
    unitsPerCase: 10,
    customerType: "Dealer",
    state: "Gujarat",
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    priceListName: "Gujarat Dealer Price List",
    costPrice: 380,
    mrp: 750,
    distributorPrice: 480,
    dealerPrice: 520,
    retailPrice: 620,
    farmerPrice: 0,
    specialPrice: 0,
    discountType: "flat",
    discountValue: 20,
    netSellingPrice: 500,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2026-02-03",
    updatedAt: "2026-03-10",
  },
  {
    id: 5,
    productId: 3,
    sku: "PEST-EC-221",
    productName: "Shield EC Crop Guard",
    segment: "Rakshak",
    category: "Pesticides",
    baseUnit: "L",
    uom: "Drum",
    packSize: "1 L",
    unitsPerCase: 12,
    customerType: "Farmer",
    state: "Karnataka",
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    priceListName: "Karnataka Farmer Price List",
    costPrice: 320,
    mrp: 650,
    distributorPrice: 400,
    dealerPrice: 0,
    retailPrice: 520,
    farmerPrice: 480,
    specialPrice: 0,
    discountType: "",
    discountValue: 0,
    netSellingPrice: 480,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2026-02-16",
    updatedAt: "2026-02-16",
  },
  {
    id: 6,
    productId: 4,
    sku: "BIO-SUS-104",
    productName: "BioRoot Vital Suspension",
    segment: "Amritam",
    category: "Bio Products",
    baseUnit: "L",
    uom: "Packet",
    packSize: "1 L",
    unitsPerCase: 24,
    customerType: "Institutional",
    state: "Maharashtra",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-05-31",
    priceListName: "Maharashtra Institutional Price List",
    costPrice: 290,
    mrp: 620,
    distributorPrice: 380,
    dealerPrice: 0,
    retailPrice: 490,
    farmerPrice: 0,
    specialPrice: 450,
    discountType: "",
    discountValue: 0,
    netSellingPrice: 450,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01",
  },
  {
    id: 7,
    productId: 5,
    sku: "FERT-UREA-50",
    productName: "Urea 50kg",
    segment: "Poshak",
    category: "Fertilizers",
    baseUnit: "KG",
    uom: "BAG",
    packSize: "50 KG",
    unitsPerCase: 40,
    customerType: "Government",
    state: "Punjab",
    effectiveFrom: "2026-07-01",
    effectiveTo: "",
    priceListName: "Punjab Government Price List",
    costPrice: 280,
    mrp: 520,
    distributorPrice: 340,
    dealerPrice: 0,
    retailPrice: 420,
    farmerPrice: 0,
    specialPrice: 400,
    discountType: "",
    discountValue: 0,
    netSellingPrice: 400,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01",
  },
  {
    id: 8,
    productId: 6,
    sku: "FERT-NPK-1026",
    productName: "NPK 10:26:26",
    segment: "Poshak",
    category: "Fertilizers",
    baseUnit: "KG",
    uom: "BAG",
    packSize: "50 KG",
    unitsPerCase: 40,
    customerType: "Distributor",
    state: "Rajasthan",
    effectiveFrom: "2025-01-01",
    effectiveTo: "2025-12-31",
    priceListName: "Rajasthan Distributor Price List",
    costPrice: 380,
    mrp: 720,
    distributorPrice: 460,
    dealerPrice: 0,
    retailPrice: 580,
    farmerPrice: 0,
    specialPrice: 0,
    discountType: "",
    discountValue: 0,
    netSellingPrice: 460,
    status: "inactive",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01",
  },
  {
    id: 9,
    productId: 7,
    sku: "FERT-DAP-50",
    productName: "DAP 50kg",
    segment: "Poshak",
    category: "Fertilizers",
    baseUnit: "KG",
    uom: "BAG",
    packSize: "50 KG",
    unitsPerCase: 40,
    customerType: "Dealer",
    state: "Maharashtra",
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    priceListName: "Maharashtra Dealer Price List",
    costPrice: 520,
    mrp: 950,
    distributorPrice: 620,
    dealerPrice: 680,
    retailPrice: 780,
    farmerPrice: 0,
    specialPrice: 0,
    discountType: "",
    discountValue: 0,
    netSellingPrice: 680,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01",
  },
  {
    id: 10,
    productId: 8,
    sku: "FERT-ZNS-21",
    productName: "Zinc Sulphate 21%",
    segment: "Poshak",
    category: "Fertilizers",
    baseUnit: "KG",
    uom: "BAG",
    packSize: "25 KG",
    unitsPerCase: 48,
    customerType: "Others",
    state: "Telangana",
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    priceListName: "Telangana Others Price List",
    costPrice: 240,
    mrp: 480,
    distributorPrice: 300,
    dealerPrice: 0,
    retailPrice: 380,
    farmerPrice: 0,
    specialPrice: 350,
    discountType: "percentage",
    discountValue: 3,
    netSellingPrice: 339.5,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01",
  },
] as PricingRecord[];

export function ensurePricingDemoSeed(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(PRICING_SEED_VERSION_KEY) === PRICING_DEMO_SEED_VERSION) return;
  saveMasterRecords(PRICING_STORAGE_KEY, PRICING_SEED);
  localStorage.setItem(PRICING_SEED_VERSION_KEY, PRICING_DEMO_SEED_VERSION);
}

export function loadPricingRecords(): PricingRecord[] {
  ensurePricingDemoSeed();
  const records = loadMasterRecords<PricingRecord>(PRICING_STORAGE_KEY, PRICING_SEED);
  return records.map((r) => migratePricingRecord(r));
}

export function savePricingRecords(records: PricingRecord[]): void {
  saveMasterRecords(PRICING_STORAGE_KEY, records);
}

export function getPricingById(id: number): PricingRecord | undefined {
  return loadPricingRecords().find((r) => r.id === id);
}

export function resolveProductDealerPrice(productId: number): number {
  if (PRODUCT_REFERENCE_DEALER_PRICE[productId] != null) {
    return PRODUCT_REFERENCE_DEALER_PRICE[productId];
  }
  return 0;
}

export function buildProductPricingSnapshot(product: Product): ProductPricingSnapshot {
  return {
    id: product.id,
    productCode: product.productCode,
    sku: product.sku,
    productName: product.productName,
    segment: product.segment,
    category: product.category,
    baseUnit: product.baseUnit ?? "",
    mou: resolveMou(product),
    packagingUnit: product.packagingUnit ?? "",
    packSize: resolvePackSizeNumber(product),
    unitsPerCase: resolveUnitsPerCase(product),
    hsnCode: product.hsnCode ?? "",
    gstPct: product.gstRate ?? "",
    costPrice: resolveProductCostPrice(product.id),
    productDealerPrice: resolveProductDealerPrice(product.id),
    mrp: product.mrp ?? 0,
  };
}

export function buildBulkPricingLine(product: Product): BulkPricingLine {
  const snapshot = buildProductPricingSnapshot(product);
  return {
    ...snapshot,
    costPrice: 0,
    dealerPrice: 0,
    discountType: "",
    discountValue: 0,
    netSellingPrice: 0,
    status: "active",
  };
}

export function loadActiveProductOptions(): {
  value: string;
  label: string;
  sublabel?: string;
  searchText?: string;
}[] {
  return loadProducts()
    .filter((p) => p.status === "active" && p.sku.trim())
    .map((p) => {
      const sku = p.sku.trim();
      const productCode = (p.productCode || "").trim();
      const codeDiffers =
        productCode && productCode.toUpperCase() !== sku.toUpperCase();
      const meta = [
        codeDiffers ? `Code: ${productCode}` : "",
        p.category,
        p.segment,
      ]
        .filter(Boolean)
        .join(" · ");

      return {
        value: String(p.id),
        label: `SKU: ${sku} — ${p.productName}`,
        sublabel: meta || undefined,
        searchText: `sku ${sku} ${productCode} ${p.productName} ${p.category} ${p.segment}`,
      };
    });
}

export function loadActiveProducts(): Product[] {
  return loadProducts().filter((p) => p.status === "active" && p.sku.trim());
}

export function loadActiveCategoryFilterOptions(): string[] {
  return [...new Set(loadActiveProducts().map((p) => p.category).filter(Boolean))].sort();
}

export function loadActiveSegmentFilterOptions(): string[] {
  return [...new Set(loadActiveProducts().map((p) => p.segment).filter(Boolean))].sort();
}

export function resolveProductForPricing(productId: string): ProductPricingSnapshot | null {
  const id = Number(productId);
  if (!id) return null;
  const product = loadProducts().find((p) => p.id === id);
  if (!product) return null;
  return buildProductPricingSnapshot(product);
}

export function resolveProductCostPrice(productId: number): number {
  if (PRODUCT_REFERENCE_COST[productId] != null) {
    return PRODUCT_REFERENCE_COST[productId];
  }
  const existing = loadPricingRecords().find((r) => r.productId === productId);
  return existing?.costPrice ?? 0;
}

export function pricingToForm(record: PricingRecord): PricingForm {
  return {
    pricingMode: "single",
    productId: String(record.productId),
    productCode: record.productCode,
    productName: record.productName,
    sku: record.sku,
    segment: record.segment,
    category: record.category,
    baseUnit: record.baseUnit,
    mou: record.mou,
    uom: record.uom,
    packSize: record.packSize,
    unitsPerCase: record.unitsPerCase,
    hsnCode: record.hsnCode,
    gstPct: record.gstPct,
    productDealerPrice: record.productDealerPrice,
    mrpOverride: false,
    customerType: record.customerType,
    state: record.state,
    states:
      record.state === PRICING_ALL_STATES ? [] : [record.state],
    customerTypes:
      record.customerType === PRICING_ALL_CUSTOMER_TYPES
        ? []
        : [record.customerType as PricingCustomerType],
    applyToAllStates: false,
    applyToAllCustomerTypes: false,
    effectiveFrom: record.effectiveFrom,
    effectiveTo: record.effectiveTo,
    priceListName: record.priceListName,
    costPrice: record.costPrice,
    mrp: record.mrp,
    distributorPrice: record.distributorPrice,
    dealerPrice: record.dealerPrice,
    retailPrice: record.retailPrice,
    farmerPrice: record.farmerPrice,
    specialPrice: record.specialPrice,
    discountType: record.discountType,
    discountValue: record.discountValue,
    netSellingPrice: record.netSellingPrice,
    status: record.status,
    bulkLines: [],
    bulkProductIds: [],
    bulkCategory: "",
    bulkSegment: "",
  };
}

export function formToPricing(
  form: PricingForm,
  id: number,
  existing?: PricingRecord,
  scope?: { state: string; customerType: PricingScopeCustomerType },
): PricingRecord {
  const state = scope?.state ?? form.state.trim();
  const customerType =
    scope?.customerType ?? (form.customerType as PricingScopeCustomerType);
  const now = masterToday();
  const dealerPrice = getFormSellingPrice(form);
  const priceFields = buildPricingPriceFields(dealerPrice);

  return {
    id,
    productId: Number(form.productId),
    productCode: form.productCode.trim(),
    sku: form.sku.trim(),
    productName: form.productName.trim(),
    segment: form.segment.trim(),
    category: form.category.trim(),
    baseUnit: form.baseUnit.trim(),
    mou: form.mou.trim(),
    uom: form.uom.trim(),
    packSize: form.packSize.trim(),
    unitsPerCase: form.unitsPerCase || 1,
    hsnCode: form.hsnCode.trim(),
    gstPct: form.gstPct.trim(),
    productDealerPrice: form.productDealerPrice,
    customerType,
    state,
    effectiveFrom: form.effectiveFrom,
    effectiveTo: form.effectiveTo.trim(),
    priceListName: form.priceListName.trim(),
    costPrice: form.costPrice,
    mrp: form.mrp,
    ...priceFields,
    discountType: "",
    discountValue: 0,
    status: form.status,
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function bulkLineToPricing(
  line: BulkPricingLine,
  form: Pick<
    PricingForm,
    | "customerType"
    | "state"
    | "effectiveFrom"
    | "effectiveTo"
    | "priceListName"
    | "applyToAllStates"
    | "applyToAllCustomerTypes"
    | "states"
    | "customerTypes"
  >,
  id: number,
  scope?: { state: string; customerType: PricingScopeCustomerType },
): PricingRecord {
  const customerType =
    scope?.customerType ?? (form.customerType as PricingScopeCustomerType);
  const state = scope?.state ?? form.state.trim();
  const dealerPrice = line.dealerPrice;
  const priceFields = buildPricingPriceFields(dealerPrice);

  return {
    id,
    productId: line.id,
    productCode: line.productCode,
    sku: line.sku,
    productName: line.productName,
    segment: line.segment,
    category: line.category,
    baseUnit: line.baseUnit,
    mou: line.mou,
    uom: line.packagingUnit,
    packSize: line.packSize,
    unitsPerCase: line.unitsPerCase,
    hsnCode: line.hsnCode,
    gstPct: line.gstPct,
    productDealerPrice: line.productDealerPrice,
    customerType,
    state,
    effectiveFrom: form.effectiveFrom,
    effectiveTo: form.effectiveTo.trim(),
    priceListName: form.priceListName.trim(),
    costPrice: line.costPrice,
    mrp: line.mrp,
    ...priceFields,
    discountType: "",
    discountValue: 0,
    status: line.status,
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: masterToday(),
    updatedAt: masterToday(),
  };
}

export function expandPricingFormToRecords(
  form: PricingForm,
  startId: number,
): PricingRecord[] {
  const states = resolveFormStates(form);
  const customerTypes = resolveFormCustomerTypes(form);
  const records: PricingRecord[] = [];
  let id = startId;

  if (form.pricingMode === "bulk") {
    for (const line of form.bulkLines) {
      for (const state of states) {
        for (const customerType of customerTypes) {
          records.push(
            bulkLineToPricing(line, form, id, { state, customerType }),
          );
          id += 1;
        }
      }
    }
    return records;
  }

  for (const state of states) {
    for (const customerType of customerTypes) {
      records.push(
        formToPricing(form, id, undefined, { state, customerType }),
      );
      id += 1;
    }
  }

  return records;
}

export function countPricingCombinations(form: PricingForm): number {
  const states = resolveFormStates(form).length;
  const types = resolveFormCustomerTypes(form).length;
  if (states === 0 || types === 0) return 0;
  const products =
    form.pricingMode === "bulk"
      ? form.bulkLines.length
      : form.productId
        ? 1
        : 0;
  return states * types * products;
}

/** @deprecated Legacy helper — returns first active rule for a product. */
export function findActivePricingForProduct(
  productId: number,
  records: PricingRecord[],
  excludeId?: number,
): PricingRecord | undefined {
  return records.find(
    (r) => r.productId === productId && r.status === "active" && r.id !== excludeId,
  );
}

export function findDuplicateActivePricing(
  form: Pick<
    PricingForm,
    "productId" | "customerType" | "state" | "effectiveFrom" | "effectiveTo" | "status"
  >,
  records: PricingRecord[],
  excludeId?: number,
): PricingRecord | undefined {
  if (!form.productId || !form.state || !form.customerType || form.status !== "active") {
    return undefined;
  }

  const formType = form.customerType as PricingScopeCustomerType;

  return records.find((r) => {
    if (r.id === excludeId) return false;
    if (r.status !== "active") return false;
    if (r.productId !== Number(form.productId)) return false;
    if (!pricingScopesOverlap(form.state, formType, r.state, r.customerType)) {
      return false;
    }
    return dateRangesOverlap(
      form.effectiveFrom,
      form.effectiveTo,
      r.effectiveFrom,
      r.effectiveTo,
    );
  });
}

export function findActivePricingForStock(
  sku: string,
  productName: string,
): PricingRecord | undefined {
  const records = loadPricingRecords().filter((r) => r.status === "active");
  const norm = (s: string) => s.trim().toLowerCase();

  const bySku = records.find((r) => r.sku === sku);
  if (bySku) return bySku;

  const byName = records.find((r) => norm(r.productName) === norm(productName));
  if (byName) return byName;

  const product = loadProducts().find(
    (p) => p.sku === sku || norm(p.productName) === norm(productName),
  );
  if (product) {
    return records.find((r) => r.productId === product.id);
  }

  return undefined;
}

export function isPricingCurrentlyEffective(
  record: PricingRecord,
  today: string = masterToday(),
): boolean {
  if (record.status !== "active") return false;
  if (record.effectiveFrom > today) return false;
  if (record.effectiveTo && record.effectiveTo < today) return false;
  return true;
}

export function isPricingExpired(record: PricingRecord, today: string = masterToday()): boolean {
  return !!record.effectiveTo && record.effectiveTo < today;
}

export function isPricingUpcoming(record: PricingRecord, today: string = masterToday()): boolean {
  return record.effectiveFrom > today;
}

export interface PricingDashboardStats {
  totalRules: number;
  activePrices: number;
  expiredPrices: number;
  upcomingPrices: number;
  bulkPriceLists: number;
}

function bulkListKey(record: PricingRecord): string {
  return [
    record.priceListName,
    record.state,
    record.customerType,
    record.effectiveFrom,
    record.effectiveTo || "",
  ].join("|");
}

export function computePricingDashboardStats(
  records: PricingRecord[],
  today: string = masterToday(),
): PricingDashboardStats {
  const listCounts = new Map<string, number>();
  for (const record of records) {
    const key = bulkListKey(record);
    listCounts.set(key, (listCounts.get(key) ?? 0) + 1);
  }

  return {
    totalRules: records.length,
    activePrices: records.filter((r) => isPricingCurrentlyEffective(r, today)).length,
    expiredPrices: records.filter((r) => isPricingExpired(r, today)).length,
    upcomingPrices: records.filter((r) => isPricingUpcoming(r, today)).length,
    bulkPriceLists: [...listCounts.values()].filter((count) => count > 1).length,
  };
}

export function validatePricingForm(
  form: PricingForm,
  records: PricingRecord[],
  excludeId?: number,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const states = resolveFormStates(form);
  const customerTypes = resolveFormCustomerTypes(form);

  if (!hasStateScope(form) && !hasCustomerTypeScope(form)) {
    errors.scope =
      "Select at least one state or customer type, or use Apply to All.";
  } else if (states.length === 0 || customerTypes.length === 0) {
    errors.scope = "Pricing scope could not be resolved. Check state and customer type.";
  }
  if (!form.effectiveFrom) {
    errors.effectiveFrom = "Effective From is required.";
  }
  if (!form.priceListName.trim()) {
    errors.priceListName = "Price List Name is required.";
  }
  if (form.effectiveTo && form.effectiveFrom && form.effectiveTo < form.effectiveFrom) {
    errors.effectiveTo = "Effective To cannot be earlier than Effective From.";
  }

  if (form.pricingMode === "bulk") {
    return { ...errors, ...validateBulkPricingForm(form, records) };
  }

  if (!form.productId) {
    errors.productId = "Product / Product Code is required.";
  }
  if (!form.mrp || form.mrp <= 0) {
    errors.mrp = "MRP must be available from Product Master.";
  }
  if (!form.costPrice || form.costPrice <= 0) {
    errors.costPrice = "Cost Price is required.";
  }

  const dealerPrice = form.dealerPrice;
  if (!dealerPrice || dealerPrice <= 0) {
    errors.dealerPrice = "Dealer Price is required.";
  } else if (form.mrp > 0 && dealerPrice > form.mrp) {
    errors.dealerPrice = "Dealer Price cannot be greater than MRP.";
  }

  const duplicateMessage = findScopeDuplicateMessage(form, records, excludeId);
  if (duplicateMessage) {
    errors.duplicate = duplicateMessage;
  }

  return errors;
}

function findScopeDuplicateMessage(
  form: PricingForm,
  records: PricingRecord[],
  excludeId?: number,
): string | undefined {
  const states = resolveFormStates(form);
  const customerTypes = resolveFormCustomerTypes(form);

  if (form.pricingMode === "bulk") {
    for (const line of form.bulkLines) {
      if (line.status !== "active") continue;
      for (const state of states) {
        for (const customerType of customerTypes) {
          const duplicate = findDuplicateActivePricing(
            {
              productId: String(line.id),
              customerType,
              state,
              effectiveFrom: form.effectiveFrom,
              effectiveTo: form.effectiveTo,
              status: "active",
            },
            records,
            excludeId,
          );
          if (duplicate) {
            return `An active pricing rule already exists for ${line.productCode}, ${customerType}, ${state}, and overlapping dates (${duplicate.priceListName}).`;
          }
        }
      }
    }
    return undefined;
  }

  if (!form.productId || form.status !== "active") return undefined;

  for (const state of states) {
    for (const customerType of customerTypes) {
      const duplicate = findDuplicateActivePricing(
        {
          productId: form.productId,
          customerType,
          state,
          effectiveFrom: form.effectiveFrom,
          effectiveTo: form.effectiveTo,
          status: form.status,
        },
        records,
        excludeId,
      );
      if (duplicate) {
        return `An active pricing rule already exists for this product, ${customerType}, ${state}, and overlapping dates (${duplicate.priceListName}).`;
      }
    }
  }

  return undefined;
}

export function validateBulkPricingForm(
  form: PricingForm,
  records: PricingRecord[],
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (form.bulkLines.length === 0) {
    errors.bulkLines = "At least one product is required in Bulk Product mode.";
    return errors;
  }

  form.bulkLines.forEach((line, idx) => {
    if (!line.costPrice || line.costPrice <= 0) {
      errors[`bulk_${idx}_costPrice`] = "Cost Price is required.";
    }
    if (!line.dealerPrice || line.dealerPrice <= 0) {
      errors[`bulk_${idx}_dealerPrice`] = "Dealer Price is required.";
    } else if (line.mrp > 0 && line.dealerPrice > line.mrp) {
      errors[`bulk_${idx}_dealerPrice`] = "Dealer Price cannot be greater than MRP.";
    }

    if (line.dealerPrice < 0) {
      errors[`bulk_${idx}_dealerPrice`] = "Price cannot be negative.";
    }
  });

  const duplicateMessage = findScopeDuplicateMessage(form, records);
  if (duplicateMessage) {
    errors.duplicate = duplicateMessage;
  }

  return errors;
}
