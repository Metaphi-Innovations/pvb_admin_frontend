import { loadProducts, type Product } from "@/app/(app)/masters/products/product-data";
import { findProductRef, getStandardMrp, resolvePurchaseCostPrice } from "@/lib/pricing/resolve-pricing";
import { applyTaxSupplyToRates, round2, type TaxSupplyType } from "@/lib/procurement/utils";
import {
  applyGstMasterToTaxRates,
  findGstMasterIdByTotalPct,
  getDefaultGstMasterId,
} from "@/lib/procurement/gst-master-utils";

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
  /** Backend GST master UUID (dropdown selection). */
  gstId?: string;
  gstMasterId?: number;
  cgstPct?: number;
  sgstPct?: number;
  igstPct?: number;
}

export interface AdditionalChargeTaxResult {
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  netAmount: number;
}

const DEFAULT_CHARGE_GST_PCT = 18;

export function migrateAdditionalCharge(charge: ProcurementAdditionalCharge): Required<
  Pick<ProcurementAdditionalCharge, "cgstPct" | "sgstPct" | "igstPct" | "gstMasterId">
> &
  ProcurementAdditionalCharge {
  const totalGst =
    (charge.cgstPct ?? 0) + (charge.sgstPct ?? 0) + (charge.igstPct ?? 0);
  const gstMasterId =
    charge.gstMasterId ??
    findGstMasterIdByTotalPct(totalGst || DEFAULT_CHARGE_GST_PCT) ??
    getDefaultGstMasterId();
  const hasRates =
    totalGst > 0 &&
    (charge.cgstPct != null || charge.sgstPct != null || charge.igstPct != null);
  if (hasRates) {
    return {
      ...charge,
      gstMasterId,
      cgstPct: charge.cgstPct ?? 0,
      sgstPct: charge.sgstPct ?? 0,
      igstPct: charge.igstPct ?? 0,
    };
  }
  const rates = applyGstMasterToTaxRates(gstMasterId, "intra");
  return {
    ...charge,
    gstMasterId,
    cgstPct: rates.cgstPct,
    sgstPct: rates.sgstPct,
    igstPct: rates.igstPct,
  };
}

export function calcAdditionalChargeTax(
  charge: Pick<ProcurementAdditionalCharge, "amount" | "cgstPct" | "sgstPct" | "igstPct">,
): AdditionalChargeTaxResult {
  const migrated = migrateAdditionalCharge({
    uid: "",
    chargeName: "",
    amount: charge.amount,
    cgstPct: charge.cgstPct,
    sgstPct: charge.sgstPct,
    igstPct: charge.igstPct,
  });
  const taxableValue = round2(Number(migrated.amount) || 0);
  const cgstAmount = round2(taxableValue * (migrated.cgstPct / 100));
  const sgstAmount = round2(taxableValue * (migrated.sgstPct / 100));
  const igstAmount = round2(taxableValue * (migrated.igstPct / 100));
  const taxAmount = round2(cgstAmount + sgstAmount + igstAmount);
  const netAmount = round2(taxableValue + taxAmount);
  return { taxableValue, cgstAmount, sgstAmount, igstAmount, taxAmount, netAmount };
}

export function sumAdditionalCharges(charges: ProcurementAdditionalCharge[]): number {
  return round2(charges.reduce((s, c) => s + calcAdditionalChargeTax(c).taxableValue, 0));
}

export function sumAdditionalChargeTaxes(charges: ProcurementAdditionalCharge[]): {
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
} {
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  charges.forEach((c) => {
    const t = calcAdditionalChargeTax(c);
    totalCgst += t.cgstAmount;
    totalSgst += t.sgstAmount;
    totalIgst += t.igstAmount;
  });
  return {
    totalCgst: round2(totalCgst),
    totalSgst: round2(totalSgst),
    totalIgst: round2(totalIgst),
  };
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

export function newAdditionalCharge(
  partial?: Partial<ProcurementAdditionalCharge>,
  taxSupplyType: TaxSupplyType = "intra",
): ProcurementAdditionalCharge {
  const gstMasterId = partial?.gstMasterId ?? getDefaultGstMasterId();
  const rates = applyGstMasterToTaxRates(gstMasterId, taxSupplyType);
  return {
    uid: `chg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    chargeName: "",
    amount: 0,
    remarks: "",
    ...rates,
    ...partial,
    gstMasterId: partial?.gstMasterId ?? gstMasterId,
  };
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
  productId: number | string;
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

import type { ProductDropdownItem } from "@/services/product-dropdown.service";

export function enrichProductFromDropdown(
  productId: string | number,
  dbProducts?: ProductDropdownItem[],
): EnrichedProductLine | null {
  if (!productId) return null;

  // 1. Try to find in dbProducts (API list)
  const dbProd = (dbProducts || []).find((p) => String(p.product_id) === String(productId));
  if (dbProd) {
    const numId = Number(dbProd.product_id);
    return {
      productId: isNaN(numId) ? dbProd.product_id : numId,
      productCode: dbProd.product_code || dbProd.sku || "",
      productName: dbProd.product_name,
      sku: dbProd.sku || "",
      baseUnit: dbProd.unit || "Unit",
      packagingUnit: dbProd.packing_unit || "Box",
      conversionQty: Number(dbProd.unit_per_packing) || 1,
      segment: dbProd.segment?.segment_name || "",
      category: dbProd.category?.categoryName || "",
      hsnCode: dbProd.hsn?.hsnDescription || "",
      mrp: 0,
      ratePerSku: 0,
      description: dbProd.scientific_name || "",
    };
  }

  // 2. Fall back to static mock data
  const staticWh = loadProducts().find((w) => String(w.id) === String(productId));
  if (staticWh) {
    return productLineFromMaster(staticWh);
  }

  return null;
}

export function enrichProductForProcurement(productId: number | string): EnrichedProductLine | null {
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
