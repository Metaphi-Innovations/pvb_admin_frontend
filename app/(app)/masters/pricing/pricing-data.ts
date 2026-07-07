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
export const PRICING_DEMO_SEED_VERSION = "2026-jun-pricing-customer-types-v1";
const PRICING_SEED_VERSION_KEY = "ds_pricing_seed_version";

export const PRICING_CUSTOMER_TYPES = [
  "Distributor",
  "C&F",
  "CBBO",
  "FPO",
] as const;

export type PricingCustomerType = (typeof PRICING_CUSTOMER_TYPES)[number];

/** Wildcard when pricing applies across every state or customer type. */
export const PRICING_ALL_STATES = "All States";
export const PRICING_ALL_CUSTOMER_TYPES = "All Customer Types";

export type PricingScopeCustomerType =
  | PricingCustomerType
  | typeof PRICING_ALL_CUSTOMER_TYPES;

export type DiscountType = "" | "percentage" | "flat";

export interface ProductPricingSnapshot {
  id: number;
  productCode: string;
  sku: string;
  productName: string;
  supplierName: string;
  supplierCode: string;
  segment: string;
  category: string;
  baseUnit: string;
  mou: string;
  unit: string;
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

/** Reference MRP by product — read-only from Product Master (mock / seed fallback). */
const PRODUCT_REFERENCE_MRP: Record<number, number> = {
  1: 1250,
  2: 980,
  3: 1250,
  4: 720,
  5: 620,
  6: 890,
  7: 1150,
  8: 580,
  9: 1050,
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
  supplierName: string;
  supplierCode: string;
  segment: string;
  category: string;
  baseUnit: string;
  mou: string;
  unit: string;
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
  productId: string;
  productCode: string;
  productName: string;
  sku: string;
  supplierName: string;
  supplierCode: string;
  segment: string;
  category: string;
  baseUnit: string;
  mou: string;
  unit: string;
  uom: string;
  packSize: string;
  unitsPerCase: number;
  hsnCode: string;
  gstPct: string;
  productDealerPrice: number;
  customerType: PricingScopeCustomerType | "";
  state: string;
  states: string[];
  customerTypes: PricingCustomerType[];
  applyToAllStates: boolean;
  applyToAllCustomerTypes: boolean;
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
  productLines: BulkPricingLine[];
}

export const DEFAULT_PRICING_FORM: PricingForm = {
  productId: "",
  productCode: "",
  productName: "",
  sku: "",
  supplierName: "",
  supplierCode: "",
  segment: "",
  category: "",
  baseUnit: "",
  mou: "",
  unit: "",
  uom: "",
  packSize: "",
  unitsPerCase: 1,
  hsnCode: "",
  gstPct: "",
  productDealerPrice: 0,
  customerType: "",
  state: "",
  states: [],
  customerTypes: [],
  applyToAllStates: false,
  applyToAllCustomerTypes: false,
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
  productLines: [],
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

export function resolveFormStates(form: Pick<PricingForm, "states" | "applyToAllStates">): string[] {
  if (form.applyToAllStates) return [...PRICING_STATES];
  return form.states;
}

export function resolveFormCustomerTypes(
  form: Pick<PricingForm, "customerTypes" | "applyToAllCustomerTypes">,
): PricingCustomerType[] {
  if (form.applyToAllCustomerTypes) return [...PRICING_CUSTOMER_TYPES];
  return form.customerTypes;
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
  customerType: PricingScopeCustomerType | "",
): keyof Pick<
  PricingForm,
  "distributorPrice" | "dealerPrice" | "retailPrice" | "farmerPrice" | "specialPrice"
> | null {
  switch (customerType) {
    case "Distributor":
    case "C&F":
    case "CBBO":
    case "FPO":
      return "dealerPrice";
    default:
      return null;
  }
}

export function getSellingPriceLabel(customerType: PricingCustomerType | ""): string {
  switch (customerType) {
    case "Distributor":
      return "Distributor Price";
    case "C&F":
      return "C&F Price";
    case "CBBO":
      return "CBBO Price";
    case "FPO":
      return "FPO Price";
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
    supplierName: raw.supplierName ?? resolveSupplierName(product),
    supplierCode: raw.supplierCode ?? resolveSupplierCode(product),
    segment: raw.segment ?? product?.segment ?? "",
    category: raw.category ?? product?.category ?? "",
    baseUnit: raw.baseUnit ?? product?.baseUnit ?? raw.uom ?? "",
    mou: raw.mou ?? (parseStoredPackSize(raw.packSize ?? "", product).mou || resolveMou(product)),
    unit: raw.unit ?? resolveProductUnit(product),
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

function resolveProductUnit(product?: Product): string {
  if (!product) return "";
  return (product.mou ?? product.baseUnit ?? "").trim();
}

function resolveSupplierName(product?: Product): string {
  return (product?.supplier ?? "").trim();
}

function resolveSupplierCode(product?: Product): string {
  return (product?.supplierCode ?? product?.vendorProductCode ?? "").trim();
}

function resolvePackSizeNumber(product?: Product): string {
  if (!product) return "";
  const qty = product.conversionQuantity ?? product.packSize;
  if (qty == null) return "";
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
    customerType: "C&F",
    state: "Maharashtra",
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    priceListName: "Maharashtra C&F Price List",
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
    customerType: "CBBO",
    state: "Gujarat",
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    priceListName: "Gujarat CBBO Price List",
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
    customerType: "FPO",
    state: "Karnataka",
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    priceListName: "Karnataka FPO Price List",
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
    customerType: "CBBO",
    state: "Maharashtra",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-05-31",
    priceListName: "Maharashtra CBBO Price List",
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
    customerType: "FPO",
    state: "Punjab",
    effectiveFrom: "2026-07-01",
    effectiveTo: "",
    priceListName: "Punjab FPO Price List",
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
    customerType: "C&F",
    state: "Maharashtra",
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    priceListName: "Maharashtra C&F Price List",
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
    customerType: "FPO",
    state: "Telangana",
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    priceListName: "Telangana FPO Price List",
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
  {
    id: 11,
    productId: 10,
    sku: "BIO-000001",
    productName: "Bio Fertilizer A",
    segment: "Amritam",
    category: "Bio Products",
    baseUnit: "L",
    uom: "Bottle",
    packSize: "1 L",
    unitsPerCase: 24,
    customerType: "Distributor",
    state: "Maharashtra",
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    priceListName: "Maharashtra Distributor Price List",
    costPrice: 320,
    mrp: 650,
    distributorPrice: 420,
    dealerPrice: 420,
    retailPrice: 520,
    farmerPrice: 0,
    specialPrice: 0,
    discountType: "",
    discountValue: 0,
    netSellingPrice: 420,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
  },
  {
    id: 12,
    productId: 10,
    sku: "BIO-000001",
    productName: "Bio Fertilizer A",
    segment: "Amritam",
    category: "Bio Products",
    baseUnit: "L",
    uom: "Bottle",
    packSize: "1 L",
    unitsPerCase: 24,
    customerType: "Distributor",
    state: "Gujarat",
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    priceListName: "Gujarat Distributor Price List",
    costPrice: 320,
    mrp: 650,
    distributorPrice: 415,
    dealerPrice: 415,
    retailPrice: 515,
    farmerPrice: 0,
    specialPrice: 0,
    discountType: "",
    discountValue: 0,
    netSellingPrice: 415,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
  },
] as PricingRecord[];

export function ensurePricingDemoSeed(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(PRICING_SEED_VERSION_KEY) === PRICING_DEMO_SEED_VERSION) return;
  saveMasterRecords(PRICING_STORAGE_KEY, PRICING_SEED);
  localStorage.setItem(PRICING_SEED_VERSION_KEY, PRICING_DEMO_SEED_VERSION);
}

let dynamicPricingRecords: PricingRecord[] | null = null;

export function setDynamicPricingRecords(records: PricingRecord[] | null) {
  dynamicPricingRecords = records;
}

export function loadPricingRecords(): PricingRecord[] {
  if (dynamicPricingRecords) {
    return dynamicPricingRecords;
  }
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

export function resolveProductMrp(product: Product): number {
  if (product.mrp != null && Number(product.mrp) > 0) {
    return Number(product.mrp);
  }

  const refreshed = loadProducts().find((p) => p.id === product.id);
  if (refreshed?.mrp != null && refreshed.mrp > 0) {
    return refreshed.mrp;
  }

  if (PRODUCT_REFERENCE_MRP[product.id] != null) {
    return PRODUCT_REFERENCE_MRP[product.id];
  }

  return 0;
}

export function buildProductPricingSnapshot(product: Product): ProductPricingSnapshot {
  return {
    id: product.id,
    productCode: product.productCode,
    sku: product.sku,
    productName: product.productName,
    supplierName: resolveSupplierName(product),
    supplierCode: resolveSupplierCode(product),
    segment: product.segment,
    category: product.category,
    baseUnit: product.baseUnit ?? "",
    mou: resolveMou(product),
    unit: resolveProductUnit(product),
    packagingUnit: product.packagingUnit ?? "",
    packSize: resolvePackSizeNumber(product),
    unitsPerCase: resolveUnitsPerCase(product),
    hsnCode: product.hsnCode ?? "",
    gstPct: product.gstRate ?? "",
    costPrice: resolveProductCostPrice(product.id),
    productDealerPrice: resolveProductDealerPrice(product.id),
    mrp: resolveProductMrp(product),
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

function mergePreservedPricingLine(
  existing: BulkPricingLine,
  product: Product,
): BulkPricingLine {
  const snapshot = buildProductPricingSnapshot(product);
  return {
    ...existing,
    ...snapshot,
    costPrice: existing.costPrice,
    dealerPrice: existing.dealerPrice,
    netSellingPrice: existing.dealerPrice,
    status: existing.status,
  };
}

export function getMrpInlineError(mrp: number): string | undefined {
  if (!mrp || mrp <= 0) {
    return "MRP is missing in Product Master for this product.";
  }
  return undefined;
}

export function syncPricingProductLines(
  form: PricingForm,
  selectedIds: string[],
): PricingForm {
  const activeProducts = loadActiveProducts();
  const preserved = new Map(form.productLines.map((line) => [String(line.id), line]));
  const productLines = selectedIds
    .map((id) => {
      const product = activeProducts.find((p) => String(p.id) === id);
      if (!product) return null;
      const existing = preserved.get(id);
      return existing ? mergePreservedPricingLine(existing, product) : buildBulkPricingLine(product);
    })
    .filter((line): line is BulkPricingLine => line !== null);

  return { ...form, productLines };
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
      const supplierName = resolveSupplierName(p);
      const supplierCode = resolveSupplierCode(p);
      const meta = [
        sku ? `SKU: ${sku}` : "",
        productCode ? `Code: ${productCode}` : "",
        p.category ? `Category: ${p.category}` : "",
        supplierName ? `Supplier: ${supplierName}` : "",
      ]
        .filter(Boolean)
        .join(" · ");

      return {
        value: String(p.id),
        label: p.productName,
        sublabel: meta || undefined,
        searchText: [
          productCode,
          p.productName,
          sku,
          supplierName,
          supplierCode,
          p.hsnCode,
          p.category,
          p.segment,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      };
    });
}

export function loadActiveProducts(): Product[] {
  return loadProducts().filter((p) => p.status === "active" && p.sku.trim());
}

export function loadActiveCategoryFilterOptions(): string[] {
  return [...new Set(loadActiveProducts().map((p) => p.category).filter(Boolean))].sort();
}

export function loadActiveSupplierFilterOptions(): string[] {
  return [
    ...new Set(loadPricingRecords().map((r) => r.supplierName).filter(Boolean)),
  ].sort();
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
    productId: String(record.productId),
    productCode: record.productCode,
    productName: record.productName,
    sku: record.sku,
    supplierName: record.supplierName,
    supplierCode: record.supplierCode,
    segment: record.segment,
    category: record.category,
    baseUnit: record.baseUnit,
    mou: record.mou,
    unit: record.unit,
    uom: record.uom,
    packSize: record.packSize,
    unitsPerCase: record.unitsPerCase,
    hsnCode: record.hsnCode,
    gstPct: record.gstPct,
    productDealerPrice: record.productDealerPrice,
    customerType: record.customerType,
    state: record.state,
    states: record.state === PRICING_ALL_STATES ? [] : [record.state],
    customerTypes:
      record.customerType === PRICING_ALL_CUSTOMER_TYPES
        ? []
        : [record.customerType as PricingCustomerType],
    applyToAllStates: false,
    applyToAllCustomerTypes: false,
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
    productLines: [],
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
    supplierName: form.supplierName.trim(),
    supplierCode: form.supplierCode.trim(),
    segment: form.segment.trim(),
    category: form.category.trim(),
    baseUnit: form.baseUnit.trim(),
    mou: form.mou.trim(),
    unit: form.unit.trim(),
    uom: form.uom.trim(),
    packSize: form.packSize.trim(),
    unitsPerCase: form.unitsPerCase || 1,
    hsnCode: form.hsnCode.trim(),
    gstPct: form.gstPct.trim(),
    productDealerPrice: form.productDealerPrice,
    customerType,
    state,
    effectiveFrom: existing?.effectiveFrom ?? masterToday(),
    effectiveTo: existing?.effectiveTo ?? "",
    priceListName:
      existing?.priceListName ??
      generatePriceListName(state, customerType),
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
  id: number,
  scope: { state: string; customerType: PricingScopeCustomerType },
  status: MasterStatus = "active",
): PricingRecord {
  const { state, customerType } = scope;
  const dealerPrice = line.dealerPrice;
  const priceFields = buildPricingPriceFields(dealerPrice);

  return {
    id,
    productId: line.id,
    productCode: line.productCode,
    sku: line.sku,
    productName: line.productName,
    supplierName: line.supplierName,
    supplierCode: line.supplierCode,
    segment: line.segment,
    category: line.category,
    baseUnit: line.baseUnit,
    mou: line.mou,
    unit: line.unit,
    uom: line.packagingUnit,
    packSize: line.packSize,
    unitsPerCase: line.unitsPerCase,
    hsnCode: line.hsnCode,
    gstPct: line.gstPct,
    productDealerPrice: line.productDealerPrice,
    customerType,
    state,
    effectiveFrom: masterToday(),
    effectiveTo: "",
    priceListName: generatePriceListName(state, customerType),
    costPrice: line.costPrice,
    mrp: line.mrp,
    ...priceFields,
    discountType: "",
    discountValue: 0,
    status,
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

  for (const line of form.productLines) {
    for (const state of states) {
      for (const customerType of customerTypes) {
        records.push(
          bulkLineToPricing(line, id, { state, customerType }, form.status),
        );
        id += 1;
      }
    }
  }

  return records;
}

export function countPricingCombinations(form: PricingForm): number {
  const states = resolveFormStates(form).length;
  const types = resolveFormCustomerTypes(form).length;
  if (states === 0 || types === 0) return 0;
  return states * types * form.productLines.length;
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
    "productId" | "customerType" | "state" | "status"
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
    return (
      r.state === form.state &&
      r.customerType === formType
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
): boolean {
  return record.status === "active";
}

export function isPricingExpired(_record: PricingRecord): boolean {
  return false;
}

export function isPricingUpcoming(_record: PricingRecord): boolean {
  return false;
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
): PricingDashboardStats {
  const listCounts = new Map<string, number>();
  for (const record of records) {
    const key = bulkListKey(record);
    listCounts.set(key, (listCounts.get(key) ?? 0) + 1);
  }

  return {
    totalRules: records.length,
    activePrices: records.filter((r) => isPricingCurrentlyEffective(r)).length,
    expiredPrices: records.filter((r) => isPricingExpired(r)).length,
    upcomingPrices: records.filter((r) => isPricingUpcoming(r)).length,
    bulkPriceLists: [...listCounts.values()].filter((count) => count > 1).length,
  };
}

export function getPricingProductLineInlineErrors(
  line: BulkPricingLine,
): { costPrice?: string; dealerPrice?: string; mrp?: string } {
  const fieldErrors: { costPrice?: string; dealerPrice?: string; mrp?: string } = {};

  const mrpError = getMrpInlineError(line.mrp);
  if (mrpError) {
    fieldErrors.mrp = mrpError;
  }

  if (line.costPrice < 0) {
    fieldErrors.costPrice = "Cost Price cannot be negative.";
  }

  const dealerError = getDealerPriceInlineError(line.dealerPrice, line.mrp);
  if (dealerError) {
    fieldErrors.dealerPrice = dealerError;
  }

  return fieldErrors;
}

export function getDealerPriceInlineError(
  dealerPrice: number,
  mrp: number,
): string | undefined {
  if (dealerPrice < 0) {
    return "Dealer Price cannot be negative.";
  }
  if (dealerPrice > 0 && mrp > 0 && dealerPrice > mrp) {
    return "Dealer Price cannot be greater than MRP.";
  }
  return undefined;
}

function getPricingProductLineSaveErrors(
  line: BulkPricingLine,
): { costPrice?: string; dealerPrice?: string; mrp?: string } {
  const fieldErrors = getPricingProductLineInlineErrors(line);

  if (!fieldErrors.costPrice) {
    if (!line.costPrice || line.costPrice <= 0) {
      fieldErrors.costPrice = "Cost Price is required.";
    }
  }

  if (!fieldErrors.dealerPrice) {
    if (!line.dealerPrice || line.dealerPrice <= 0) {
      fieldErrors.dealerPrice = "Dealer Price is required.";
    }
  }

  return fieldErrors;
}

export function validatePricingForm(
  form: PricingForm,
  records: PricingRecord[],
  excludeId?: number,
): Record<string, string> {
  if (excludeId) {
    return validateEditPricingForm(form, records, excludeId);
  }
  return validateAddPricingForm(form, records);
}

function validateAddPricingForm(
  form: PricingForm,
  records: PricingRecord[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  const states = resolveFormStates(form);
  const customerTypes = resolveFormCustomerTypes(form);

  if (states.length === 0) {
    errors.state = "At least one state is required.";
  }
  if (customerTypes.length === 0) {
    errors.customerType = "At least one customer type is required.";
  }

  if (form.productLines.length === 0) {
    errors.productLines = "At least one product is required.";
    return errors;
  }

  form.productLines.forEach((line, idx) => {
    const lineErrors = getPricingProductLineSaveErrors(line);
    if (lineErrors.mrp) {
      errors[`line_${idx}_mrp`] = lineErrors.mrp;
    }
    if (lineErrors.costPrice) {
      errors[`line_${idx}_costPrice`] = lineErrors.costPrice;
    }
    if (lineErrors.dealerPrice) {
      errors[`line_${idx}_dealerPrice`] = lineErrors.dealerPrice;
    }
  });

  const duplicateMessage = findScopeDuplicateMessage(form, records);
  if (duplicateMessage) {
    errors.duplicate = duplicateMessage;
  }

  return errors;
}

function validateEditPricingForm(
  form: PricingForm,
  records: PricingRecord[],
  excludeId: number,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (form.costPrice < 0) {
    errors.costPrice = "Cost Price cannot be negative.";
  } else if (!form.costPrice || form.costPrice <= 0) {
    errors.costPrice = "Cost Price is required.";
  }

  if (form.dealerPrice < 0) {
    errors.dealerPrice = "Dealer Price cannot be negative.";
  } else if (!form.dealerPrice || form.dealerPrice <= 0) {
    errors.dealerPrice = "Dealer Price is required.";
  } else {
    const dealerInlineError = getDealerPriceInlineError(form.dealerPrice, form.mrp);
    if (dealerInlineError) {
      errors.dealerPrice = dealerInlineError;
    }
  }

  const mrpError = getMrpInlineError(form.mrp);
  if (mrpError) {
    errors.mrp = mrpError;
  }

  if (form.status === "active" && form.productId && form.state && form.customerType) {
    const duplicate = findDuplicateActivePricing(
      {
        productId: form.productId,
        customerType: form.customerType,
        state: form.state,
        status: form.status,
      },
      records,
      excludeId,
    );
    if (duplicate) {
      errors.duplicate = `An active pricing rule already exists for this product, ${form.customerType}, and ${form.state}.`;
    }
  }

  return errors;
}

function findScopeDuplicateMessage(
  form: PricingForm,
  records: PricingRecord[],
): string | undefined {
  const states = resolveFormStates(form);
  const customerTypes = resolveFormCustomerTypes(form);

  for (const line of form.productLines) {
    for (const state of states) {
      for (const customerType of customerTypes) {
        const duplicate = findDuplicateActivePricing(
          {
            productId: String(line.id),
            customerType,
            state,
            status: "active",
          },
          records,
        );
        if (duplicate) {
          return `An active pricing rule already exists for ${line.productCode}, ${customerType}, and ${state}.`;
        }
      }
    }
  }

  return undefined;
}
