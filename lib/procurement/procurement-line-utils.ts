import type { Product } from "@/app/(app)/masters/products/product-data";
import { findProductRef, getStandardMrp, resolvePurchaseCostPrice } from "@/lib/pricing/resolve-pricing";

export type PackagingUom = "Unit" | "Case" | "Box" | "Carton";

export const PACKAGING_UOM_OPTIONS: { value: PackagingUom; label: string }[] = [
  { value: "Unit", label: "Unit" },
  { value: "Case", label: "Case" },
  { value: "Box", label: "Box" },
  { value: "Carton", label: "Carton" },
];

export type PRPriority = "low" | "medium" | "high" | "urgent";

export const PR_PRIORITY_OPTIONS: { value: PRPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export interface ProcurementAdditionalCharge {
  uid: string;
  chargeName: string;
  amount: number;
  remarks?: string;
}

export const ADDITIONAL_CHARGE_PRESETS = [
  "Freight Charges",
  "Transportation Charges",
  "Loading Charges",
  "Unloading Charges",
  "Insurance Charges",
  "Packing Charges",
  "Labour Charges",
  "Courier Charges",
  "Other Charges",
] as const;

export function newAdditionalCharge(partial?: Partial<ProcurementAdditionalCharge>): ProcurementAdditionalCharge {
  return {
    uid: `chg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    chargeName: "",
    amount: 0,
    remarks: "",
    ...partial,
  };
}

export function sumAdditionalCharges(charges: ProcurementAdditionalCharge[]): number {
  return Math.round(charges.reduce((s, c) => s + (Number(c.amount) || 0), 0) * 100) / 100;
}

/** Total qty in base unit from packaging quantity (PR / packing orders) */
export function calcPackingToBaseQty(packingQty: number, conversionQty: number): number {
  const q = Number(packingQty) || 0;
  const conv = Number(conversionQty) || 1;
  return Math.round(q * conv * 1000) / 1000;
}

/** Line amount = rate per base/SKU unit × total SKU qty */
export function calcPrLineAmount(ratePerSku: number, totalSkuQty: number): number {
  return Math.round((Number(ratePerSku) || 0) * (Number(totalSkuQty) || 0) * 100) / 100;
}

/** Total qty in base unit from packaging UOM */
export function calcTotalQtyBase(
  uom: PackagingUom,
  qty: number,
  conversionQty: number,
): number {
  const q = Number(qty) || 0;
  if (uom === "Unit") return q;
  return calcPackingToBaseQty(q, conversionQty);
}

export interface EnrichedProductLine {
  productId: number;
  productCode: string;
  productName: string;
  sku: string;
  baseUnit: string;
  packagingUnit: string;
  conversionQty: number;
  segment: string;
  category: string;
  hsnCode: string;
  mrp: number;
  ratePerSku: number;
  description: string;
}

export function enrichProductForProcurement(productId: number): EnrichedProductLine | null {
  const p = findProductRef(productId);
  if (!p) return null;
  return productLineFromMaster(p);
}

export function productLineFromMaster(p: Product): EnrichedProductLine {
  const ratePerSku = resolvePurchaseCostPrice(p.id).amount;
  return {
    productId: p.id,
    productCode: p.sku,
    productName: p.productName,
    sku: p.sku ?? "",
    baseUnit: p.baseUnit || "Unit",
    packagingUnit: p.packagingUnit || "Box",
    conversionQty: p.conversionQuantity ?? 1,
    segment: p.segment ?? "",
    category: p.category ?? "",
    hsnCode: p.hsnCode ?? "",
    mrp: getStandardMrp(p.id),
    ratePerSku,
    description: p.scientificName || "",
  };
}

export function packagingUomMatchesBase(uom: PackagingUom, baseUnit: string, packagingUnit: string): boolean {
  if (uom === "Unit") return true;
  const norm = (s: string) => s.toLowerCase().replace(/\s/g, "");
  if (uom === "Box" && norm(packagingUnit).includes("box")) return true;
  if (uom === "Case" && norm(packagingUnit).includes("case")) return true;
  if (uom === "Carton" && norm(packagingUnit).includes("carton")) return true;
  return norm(uom) === norm(baseUnit);
}
