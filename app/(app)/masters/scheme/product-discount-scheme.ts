import {
  MASTER_CURRENT_USER,
  masterToday,
  nextMasterCode,
  loadMasterRecords,
  type MasterStatus,
} from "@/lib/masters/common";
import { loadProducts } from "../products/product-data";
import {
  buildProductPricingSnapshot,
  dateRangesOverlap,
  getSellingPriceFromRecord,
  loadPricingRecords,
  PRICING_STATES,
} from "../pricing/pricing-data";
import { migrateSchemeRecord, mergeSchemeSeedRecords, normalizeSchemeApprovalStatus, resolveDisplayApprovalStatus, resolveSchemeOperationalStatus, SCHEME_SEED, SCHEME_STORAGE_KEY, isSchemeEditable, type CustomerType, type ProductDiscountSchemeLine, type SchemeRecord } from "./scheme-data";

export type ProductDiscountDiscountType = "Percentage" | "Rupees";
export type DiscountApplicationMode = "Common" | "Product-wise";

export interface ProductWiseDiscountEntry {
  discountType: ProductDiscountDiscountType;
  discountValue: string;
}

export interface ProductDiscountForm {
  schemeName: string;
  customerType: CustomerType;
  productIds: string[];
  stateNames: string[];
  discountApplication: DiscountApplicationMode;
  discountType: ProductDiscountDiscountType;
  discountValue: string;
  productDiscounts: Record<string, ProductWiseDiscountEntry>;
  startDate: string;
  endDate: string;
}

export interface ProductDiscountUIPreviewRow {
  key: string;
  productId: string;
  productCode: string;
  productName: string;
  dealerPrice: number;
  discountType: ProductDiscountDiscountType;
  discountValue: number;
  discountAmount: number;
  finalSchemePrice: number;
  mrp: number;
}

export interface ProductDiscountPreviewRow extends ProductDiscountUIPreviewRow {
  stateName: string;
  customerType: CustomerType;
}

export interface EligibleProductDiscountScheme {
  schemeCode: string;
  schemeName: string;
  dealerPrice: number;
  discountType: ProductDiscountDiscountType;
  discountValue: number;
  discountAmount: number;
  finalSchemePrice: number;
}

export interface EligibleProductDiscountSchemeOffer extends EligibleProductDiscountScheme {
  schemeId: number;
  productName: string;
  customerType: CustomerType;
  stateName: string;
  startDate?: string;
  endDate?: string;
}

export function formatSchemeOfferLabel(
  offer: Pick<EligibleProductDiscountSchemeOffer, "schemeCode" | "discountType" | "discountValue">,
): string {
  const offLabel =
    offer.discountType === "Percentage"
      ? `${offer.discountValue}% Off`
      : `${formatSchemeRupee(offer.discountValue)} Off`;
  return `${offer.schemeCode} · ${offLabel}`;
}

export interface ProductDiscountCalculationResult {
  isEligible: boolean;
  discountAmount: number;
  finalSchemePrice: number;
  schemeCode?: string;
  schemeName?: string;
  discountType?: ProductDiscountDiscountType;
  discountValue?: number;
  dealerPrice?: number;
}

export interface SalesOrderProductPricing {
  dealerPrice: number;
  schemeDiscountPercent: number;
  schemeDiscountAmount: number;
  schemeDiscountType?: ProductDiscountDiscountType;
  schemeDiscountValue?: number;
  finalRate: number;
  schemeCode?: string;
  schemeName?: string;
  /** "Yes" when an eligible Product Discount Scheme applies; otherwise "No" */
  schemeApplied: "Yes" | "No";
  unitPrice: number;
  discountPercent: number;
}

export function formatSchemeDiscountValue(
  discountType: ProductDiscountDiscountType,
  discountValue: number,
): string {
  return discountType === "Percentage"
    ? `${discountValue}%`
    : formatSchemeRupee(discountValue);
}

export function buildSchemeLineTooltip(line: {
  schemeCode?: string;
  schemeName?: string;
  schemeDiscountType?: ProductDiscountDiscountType;
  schemeDiscountValue?: number;
  schemeDiscountAmount?: number;
}): string {
  if (!line.schemeCode) return "";
  const parts = [
    line.schemeName,
    line.schemeDiscountType && line.schemeDiscountValue !== undefined
      ? `Discount: ${formatSchemeDiscountValue(line.schemeDiscountType, line.schemeDiscountValue)}`
      : undefined,
    line.schemeDiscountAmount !== undefined
      ? `Amount: ${formatSchemeRupee(line.schemeDiscountAmount)}`
      : undefined,
  ].filter(Boolean);
  return parts.join(" · ");
}

export const DUPLICATE_SCHEME_MESSAGE =
  "Product Discount Scheme already exists for this Product, State and Customer Type during selected validity period.";

export const DEFAULT_PRODUCT_DISCOUNT_FORM: ProductDiscountForm = {
  schemeName: "",
  customerType: "All",
  productIds: [],
  stateNames: [],
  discountApplication: "Common",
  discountType: "Percentage",
  discountValue: "",
  productDiscounts: {},
  startDate: "",
  endDate: "",
};

function normalizeLineDiscountType(type?: string): ProductDiscountSchemeLine["discountType"] {
  return type === "Fixed Amount" ? "Fixed Amount" : "Percentage";
}

export function getProductDiscountSchemeLines(record: SchemeRecord): ProductDiscountSchemeLine[] {
  if (record.schemeLines?.length) return record.schemeLines;
  if (!record.productId || !record.stateName) return [];
  const dealerPrice = record.dealerPrice ?? 0;
  const discountValue = record.discountValue ?? 0;
  const isPct = record.discountType === "Percentage";
  const discountAmount =
    record.discountAmount ?? (isPct ? (dealerPrice * discountValue) / 100 : discountValue);
  return [
    {
      productId: record.productId,
      productCode: record.productCode ?? "",
      productName: record.productName ?? "",
      stateNames: [record.stateName],
      dealerPrice,
      discountType: normalizeLineDiscountType(record.discountType),
      discountValue,
      discountAmount,
      finalSchemePrice: record.finalSchemePrice ?? Math.max(0, dealerPrice - discountAmount),
      mrp: record.mrp ?? 0,
    },
  ];
}

export function countProductDiscountProducts(record: SchemeRecord): number {
  return getProductDiscountSchemeLines(record).length;
}

export function countProductDiscountStates(record: SchemeRecord): number {
  const states = new Set<string>();
  for (const line of getProductDiscountSchemeLines(record)) {
    for (const state of line.stateNames) states.add(state);
  }
  return states.size;
}

export function consolidateProductDiscountRecords(records: SchemeRecord[]): SchemeRecord[] {
  const result: SchemeRecord[] = [];
  const legacy: SchemeRecord[] = [];

  for (const record of records) {
    if (record.schemeType !== "Product Discount Scheme") {
      result.push(record);
      continue;
    }
    if (record.schemeLines?.length) {
      result.push(migrateProductDiscountRecord(record));
      continue;
    }
    legacy.push(record);
  }

  const batchGroups = new Map<string, SchemeRecord[]>();
  const solos: SchemeRecord[] = [];

  for (const record of legacy) {
    if (record.batchId) {
      const group = batchGroups.get(record.batchId) ?? [];
      group.push(record);
      batchGroups.set(record.batchId, group);
    } else {
      solos.push(record);
    }
  }

  for (const group of batchGroups.values()) {
    result.push(mergeLegacyProductDiscountGroup(group));
  }
  for (const record of solos) {
    result.push(migrateProductDiscountRecord(record));
  }

  return result;
}

function migrateProductDiscountRecord(record: SchemeRecord): SchemeRecord {
  if (record.schemeType !== "Product Discount Scheme") {
    return record;
  }
  if (record.schemeLines?.length) {
    const stateNames = [...new Set(record.schemeLines.flatMap((line) => line.stateNames))];
    return {
      ...record,
      stateId: stateNames[0] ?? record.stateId,
      stateName: stateNames.join(", "),
      productId: undefined,
      productCode: undefined,
      productName: undefined,
      dealerPrice: undefined,
      discountType: undefined,
      discountValue: undefined,
      discountAmount: undefined,
      finalSchemePrice: undefined,
      mrp: undefined,
    };
  }
  const lines = getProductDiscountSchemeLines(record);
  const stateNames = [...new Set(lines.flatMap((line) => line.stateNames))];
  return {
    ...record,
    schemeLines: lines,
    stateId: stateNames[0] ?? record.stateId,
    stateName: stateNames.join(", "),
    productId: undefined,
    productCode: undefined,
    productName: undefined,
    dealerPrice: undefined,
    discountType: undefined,
    discountValue: undefined,
    discountAmount: undefined,
    finalSchemePrice: undefined,
    mrp: undefined,
  };
}

function mergeLegacyProductDiscountGroup(group: SchemeRecord[]): SchemeRecord {
  const base = group[0];
  const lineMap = new Map<string, ProductDiscountSchemeLine>();

  for (const record of group) {
    const lines = getProductDiscountSchemeLines(record);
    for (const line of lines) {
      const key = `${line.productId}|${line.discountType}|${line.discountValue}`;
      const existing = lineMap.get(key);
      if (existing) {
        for (const state of line.stateNames) {
          if (!existing.stateNames.includes(state)) existing.stateNames.push(state);
        }
      } else {
        lineMap.set(key, { ...line, stateNames: [...line.stateNames] });
      }
    }
  }

  const schemeLines = [...lineMap.values()];
  const stateNames = [...new Set(schemeLines.flatMap((line) => line.stateNames))];
  const schemeName = deriveMergedSchemeName(group, base);

  return {
    ...base,
    id: Math.min(...group.map((r) => r.id)),
    schemeCode: base.schemeCode,
    schemeName,
    schemeLines,
    stateId: stateNames[0] ?? base.stateId,
    stateName: stateNames.join(", "),
    productId: undefined,
    productCode: undefined,
    productName: undefined,
    dealerPrice: undefined,
    discountType: undefined,
    discountValue: undefined,
    discountAmount: undefined,
    finalSchemePrice: undefined,
    mrp: undefined,
    batchId: undefined,
  };
}

function deriveMergedSchemeName(group: SchemeRecord[], base: SchemeRecord): string {
  const names = group.map((r) => r.schemeName.trim()).filter(Boolean);
  if (names.length === 1) return names[0];
  const stripped = names.map((name) =>
    name.replace(/\s*-\s*[^-]+$/, "").replace(/\s*-\s*[^-]+$/, "").trim(),
  );
  const common = stripped.find((name) => stripped.every((n) => n === name || !n));
  if (common) return common;
  return base.schemeName.replace(/\s*-\s*[^-]+$/, "").replace(/\s*-\s*[^-]+$/, "").trim() || base.schemeName;
}

export function loadConsolidatedSchemeRecords(): SchemeRecord[] {
  const loaded = mergeSchemeSeedRecords(
    loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, SCHEME_SEED),
    SCHEME_SEED,
  );
  const migrated = loaded.map((record) => normalizeSchemeApprovalStatus(migrateSchemeRecord(record)));
  return consolidateProductDiscountRecords(migrated);
}

const BLOCKING_APPROVAL_STATUSES = new Set(["approved", "active"]);

export interface SchemeProductSelectOption {
  value: string;
  label: string;
  productCode?: string;
  sku?: string;
  category?: string;
  segment?: string;
  hsnCode?: string;
  supplier?: string;
  sublabel?: string;
  searchText?: string;
  disabled?: boolean;
}

function resolveProductSupplierName(product: ReturnType<typeof loadProducts>[number]): string {
  return (product.supplier ?? "").trim();
}

export function loadSchemeProductSelectOptions(): SchemeProductSelectOption[] {
  return loadProducts()
    .filter((p) => p.status === "active" && p.sku.trim())
    .map((p) => {
      const sku = p.sku.trim();
      const productCode = (p.productCode || "").trim();
      const supplierName = resolveProductSupplierName(p);
      const sublabel = [
        productCode ? `Code: ${productCode}` : "",
        sku ? `SKU: ${sku}` : "",
        p.category ? `Category: ${p.category}` : "",
        p.segment ? `Segment: ${p.segment}` : "",
        p.hsnCode ? `HSN: ${p.hsnCode}` : "",
        supplierName ? `Supplier: ${supplierName}` : "",
      ]
        .filter(Boolean)
        .join(" · ");

      return {
        value: String(p.id),
        label: p.productName,
        productCode: productCode || undefined,
        sku: sku || undefined,
        category: p.category || undefined,
        segment: p.segment || undefined,
        hsnCode: p.hsnCode || undefined,
        supplier: supplierName || undefined,
        sublabel: sublabel || undefined,
        searchText: [
          productCode,
          p.productName,
          sku,
          supplierName,
          p.hsnCode,
          p.category,
          p.segment,
          p.subCategory,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      };
    });
}

/** @deprecated Use loadSchemeProductSelectOptions */
export function loadActiveSchemeProductOptions(): {
  id: string;
  name: string;
  helper?: string;
}[] {
  return loadSchemeProductSelectOptions().map((o) => ({
    id: o.value,
    name: o.label,
    helper: o.sublabel,
  }));
}

export function loadSchemeStateOptions(): { id: string; name: string }[] {
  return PRICING_STATES.map((name) => ({ id: name, name }));
}

export function formatSchemeRupee(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatStoredDiscountType(
  type?: string,
): ProductDiscountDiscountType | "—" {
  if (type === "Percentage") return "Percentage";
  if (type === "Fixed Amount" || type === "Rupees") return "Rupees";
  return "—";
}

function pricingCustomerMatches(schemeCustomer: CustomerType, pricingCustomer: string): boolean {
  if (schemeCustomer === "All") return true;
  if (schemeCustomer === "Distributor") return pricingCustomer === "Distributor";
  if (schemeCustomer === "Retailer") return pricingCustomer === "Retailer";
  if (schemeCustomer === "Wholesaler")
    return pricingCustomer === "Wholesaler" || pricingCustomer === "Distributor";
  if (schemeCustomer === "Institutional")
    return pricingCustomer === "Institutional" || pricingCustomer === "FPO";
  return false;
}

export function resolveDealerPriceForScheme(
  productId: number,
  stateName: string,
  customerType: CustomerType,
): number {
  const pricingRows = loadPricingRecords().filter(
    (r) => r.productId === productId && r.status === "active" && r.state === stateName,
  );

  const typedMatch = pricingRows.find((r) => pricingCustomerMatches(customerType, r.customerType));
  const match = typedMatch ?? pricingRows[0];
  if (match) {
    const fromRecord = getSellingPriceFromRecord(match);
    if (fromRecord > 0) return fromRecord;
    if (match.dealerPrice > 0) return match.dealerPrice;
    if (match.distributorPrice > 0) return match.distributorPrice;
  }

  const product = loadProducts().find((p) => p.id === productId);
  if (!product) return 0;
  const snapshot = buildProductPricingSnapshot(product);
  if (snapshot.productDealerPrice > 0) return snapshot.productDealerPrice;
  return snapshot.mrp > 0 ? snapshot.mrp : 0;
}

export function computeProductDiscountAmount(
  dealerPrice: number,
  discountType: ProductDiscountDiscountType,
  discountValue: number,
): number {
  if (dealerPrice <= 0 || discountValue <= 0) return 0;
  if (discountType === "Percentage") return (dealerPrice * discountValue) / 100;
  return discountValue;
}

export function computeFinalSchemePrice(
  dealerPrice: number,
  discountType: ProductDiscountDiscountType,
  discountValue: number,
): number {
  const discountAmount = computeProductDiscountAmount(dealerPrice, discountType, discountValue);
  return Math.max(0, dealerPrice - discountAmount);
}

const ELIGIBLE_SCHEME_APPROVAL_STATUSES = new Set<SchemeRecord["approvalStatus"]>(["approved", "active"]);

export function isProductDiscountSchemeExpired(record: SchemeRecord): boolean {
  return resolveDisplayApprovalStatus(record) === "expired";
}

export function formatProductDiscountOperationalStatus(record: SchemeRecord): string {
  return resolveSchemeOperationalStatus(record);
}

export function canEditProductDiscountScheme(record: SchemeRecord): boolean {
  return isProductDiscountRecord(record) && isSchemeEditable(record);
}

export function canSubmitProductDiscountScheme(record: SchemeRecord): boolean {
  return isProductDiscountRecord(record) && record.approvalStatus === "rejected";
}

export function canApproveProductDiscountScheme(record: SchemeRecord): boolean {
  return (
    isProductDiscountRecord(record) &&
    ["submitted", "manager_approval", "finance_approval", "final_approval"].includes(
      record.approvalStatus,
    )
  );
}

export function canRejectProductDiscountScheme(record: SchemeRecord): boolean {
  return canApproveProductDiscountScheme(record);
}

export function canSendBackProductDiscountScheme(record: SchemeRecord): boolean {
  return canApproveProductDiscountScheme(record);
}

export function canActivateProductDiscountScheme(record: SchemeRecord): boolean {
  return isProductDiscountRecord(record) && record.approvalStatus === "approved";
}

export function canDeactivateProductDiscountScheme(record: SchemeRecord): boolean {
  return (
    isProductDiscountRecord(record) &&
    record.approvalStatus === "active" &&
    record.status === "active"
  );
}

export function canCopyProductDiscountScheme(record: SchemeRecord): boolean {
  return isProductDiscountRecord(record) && record.approvalStatus === "rejected";
}

export function isProductDiscountViewOnly(record: SchemeRecord): boolean {
  return isProductDiscountRecord(record) && isProductDiscountSchemeExpired(record);
}

export function mapCustomerMasterTypeToSchemeType(customerType: string): CustomerType {
  const normalized = customerType.trim().toLowerCase();
  if (normalized === "retailer" || normalized === "farmer") return "Retailer";
  if (normalized === "fpo") return "Institutional";
  if (normalized === "dealer") return "Wholesaler";
  return "Distributor";
}

export function calculateProductDiscountScheme(input: {
  productId: string;
  state: string;
  customerType: CustomerType;
  dp: number;
  discountType: ProductDiscountDiscountType;
  discountValue: number;
  schemeCode?: string;
  schemeName?: string;
  approvalStatus?: string;
  status?: MasterStatus;
  startDate?: string;
  endDate?: string;
  orderDate?: string;
}): ProductDiscountCalculationResult {
  const referenceDate = input.orderDate ?? masterToday();
  const withinDates =
    (!input.startDate || input.startDate <= referenceDate) &&
    (!input.endDate || input.endDate >= referenceDate);
  const approvalStatus = (input.approvalStatus ?? "submitted") as SchemeRecord["approvalStatus"];
  const isEligibleStatus =
    withinDates &&
    input.status === "active" &&
    ELIGIBLE_SCHEME_APPROVAL_STATUSES.has(approvalStatus);

  const discountAmount = computeProductDiscountAmount(
    input.dp,
    input.discountType,
    input.discountValue,
  );
  const finalSchemePrice = computeFinalSchemePrice(
    input.dp,
    input.discountType,
    input.discountValue,
  );

  const validDiscount =
    input.dp > 0 &&
    input.discountValue > 0 &&
    (input.discountType === "Percentage"
      ? input.discountValue <= 100
      : input.discountValue <= input.dp) &&
    finalSchemePrice >= 0;

  return {
    isEligible: Boolean(isEligibleStatus && validDiscount),
    discountAmount,
    finalSchemePrice,
    schemeCode: input.schemeCode,
    schemeName: input.schemeName,
    discountType: input.discountType,
    discountValue: input.discountValue,
    dealerPrice: input.dp,
  };
}

function parseDiscountValue(raw: string): number {
  const cleaned = raw.replace(/[₹,\s]/g, "");
  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? 0 : value;
}

function getProductDiscountConfig(
  form: ProductDiscountForm,
  productId: string,
): { discountType: ProductDiscountDiscountType; discountValue: number } {
  if (form.discountApplication === "Product-wise") {
    const entry = form.productDiscounts[productId];
    const discountType = entry?.discountType ?? "Percentage";
    const discountValue = parseDiscountValue(entry?.discountValue ?? "");
    return { discountType, discountValue };
  }
  return {
    discountType: form.discountType,
    discountValue: parseDiscountValue(form.discountValue),
  };
}

function getPreviewStateName(form: ProductDiscountForm): string | null {
  return form.stateNames[0] ?? null;
}

export function syncProductDiscountsForProducts(form: ProductDiscountForm): ProductDiscountForm {
  const productDiscounts = { ...form.productDiscounts };
  for (const productId of form.productIds) {
    if (!productDiscounts[productId]) {
      productDiscounts[productId] = {
        discountType: form.discountType,
        discountValue: form.discountValue,
      };
    }
  }
  for (const productId of Object.keys(productDiscounts)) {
    if (!form.productIds.includes(productId)) {
      delete productDiscounts[productId];
    }
  }
  return { ...form, productDiscounts };
}

export function applyDiscountApplicationMode(
  form: ProductDiscountForm,
  mode: DiscountApplicationMode,
): ProductDiscountForm {
  if (form.discountApplication === mode) return form;
  if (mode === "Product-wise") {
    const productDiscounts: Record<string, ProductWiseDiscountEntry> = {};
    for (const productId of form.productIds) {
      productDiscounts[productId] = {
        discountType: form.discountType,
        discountValue: form.discountValue,
      };
    }
    return syncProductDiscountsForProducts({
      ...form,
      discountApplication: mode,
      productDiscounts,
    });
  }
  return { ...form, discountApplication: mode };
}

function buildProductRowContext(productId: string, stateName: string, customerType: CustomerType) {
  const id = Number(productId);
  const product = loadProducts().find((p) => p.id === id);
  if (!product) return null;
  const snapshot = buildProductPricingSnapshot(product);
  const dealerPrice = resolveDealerPriceForScheme(id, stateName, customerType);
  return {
    productId,
    productCode: snapshot.productCode,
    productName: snapshot.productName,
    dealerPrice,
    mrp: snapshot.mrp,
  };
}

export function buildProductDiscountUIPreviewRows(
  form: ProductDiscountForm,
): ProductDiscountUIPreviewRow[] {
  if (!form.productIds.length || !form.stateNames.length) return [];

  const previewState = getPreviewStateName(form);
  if (!previewState) return [];

  const rows: ProductDiscountUIPreviewRow[] = [];

  for (const productId of form.productIds) {
    const ctx = buildProductRowContext(productId, previewState, form.customerType);
    if (!ctx) continue;
    const { discountType, discountValue } = getProductDiscountConfig(form, productId);
    const discountAmount = computeProductDiscountAmount(ctx.dealerPrice, discountType, discountValue);
    rows.push({
      key: productId,
      productId,
      productCode: ctx.productCode,
      productName: ctx.productName,
      dealerPrice: ctx.dealerPrice,
      discountType,
      discountValue,
      discountAmount,
      finalSchemePrice: Math.max(0, ctx.dealerPrice - discountAmount),
      mrp: ctx.mrp,
    });
  }

  return rows;
}

export function buildProductDiscountSaveRows(
  form: ProductDiscountForm,
): ProductDiscountPreviewRow[] {
  if (!form.productIds.length || !form.stateNames.length) return [];

  const rows: ProductDiscountPreviewRow[] = [];

  for (const productId of form.productIds) {
    const { discountType, discountValue } = getProductDiscountConfig(form, productId);
    for (const stateName of form.stateNames) {
      const ctx = buildProductRowContext(productId, stateName, form.customerType);
      if (!ctx) continue;
      const discountAmount = computeProductDiscountAmount(
        ctx.dealerPrice,
        discountType,
        discountValue,
      );
      rows.push({
        key: `${productId}-${stateName}`,
        productId,
        productCode: ctx.productCode,
        productName: ctx.productName,
        stateName,
        customerType: form.customerType,
        dealerPrice: ctx.dealerPrice,
        discountType,
        discountValue,
        discountAmount,
        finalSchemePrice: Math.max(0, ctx.dealerPrice - discountAmount),
        mrp: ctx.mrp,
      });
    }
  }

  return rows;
}

/** @deprecated Use buildProductDiscountSaveRows for save/validation or buildProductDiscountUIPreviewRows for UI */
export function buildProductDiscountPreviewRows(
  form: ProductDiscountForm,
): ProductDiscountPreviewRow[] {
  return buildProductDiscountSaveRows(form);
}

export function countProductDiscountCombinations(form: ProductDiscountForm): number {
  return form.productIds.length * form.stateNames.length;
}

function isBlockingProductDiscountRecord(record: SchemeRecord): boolean {
  return (
    record.schemeType === "Product Discount Scheme" &&
    BLOCKING_APPROVAL_STATUSES.has(record.approvalStatus)
  );
}

export function findDuplicateProductDiscount(
  form: ProductDiscountForm,
  existingRecords: SchemeRecord[],
  excludeId?: number,
): SchemeRecord | null {
  const candidateRows = buildProductDiscountSaveRows(form);
  if (!candidateRows.length || !form.startDate || !form.endDate) return null;

  for (const row of candidateRows) {
    const duplicate = existingRecords.find((record) => {
      if (record.id === excludeId) return false;
      if (!isBlockingProductDiscountRecord(record)) return false;
      if (record.customerType !== form.customerType) return false;
      if (!record.startDate || !record.endDate) return false;
      if (!dateRangesOverlap(form.startDate, form.endDate, record.startDate, record.endDate)) {
        return false;
      }
      return getProductDiscountSchemeLines(record).some(
        (line) => line.productId === row.productId && line.stateNames.includes(row.stateName),
      );
    });
    if (duplicate) return duplicate;
  }

  return null;
}

function validatePreviewRow(row: ProductDiscountPreviewRow): string | null {
  if (row.dealerPrice <= 0) {
    return `Dealer Price not found for ${row.productName} in ${row.stateName}.`;
  }
  if (!row.discountValue || row.discountValue <= 0) {
    return "Discount value is required.";
  }
  if (row.discountType === "Percentage" && row.discountValue > 100) {
    return "Percentage discount cannot be more than 100%.";
  }
  if (row.discountType === "Rupees" && row.discountValue > row.dealerPrice) {
    return `Rupees discount cannot be greater than Dealer Price for ${row.productName} - ${row.stateName}.`;
  }
  if (row.finalSchemePrice < 0) {
    return "Final Scheme Price cannot be negative.";
  }
  return null;
}

export function validateProductDiscountForm(
  form: ProductDiscountForm,
  mode: "add" | "edit",
  existingRecords: SchemeRecord[],
  excludeId?: number,
): string | null {
  if (!form.productIds.length) return "Product is required.";
  if (!form.stateNames.length) return "State is required.";
  if (!form.customerType) return "Customer Type is required.";
  if (!form.startDate) return "Start Date is required.";
  if (!form.endDate) return "End Date is required.";
  if (form.startDate > form.endDate) return "End Date cannot be before Start Date.";
  if (!form.schemeName.trim()) return "Scheme name is required.";

  if (form.discountApplication === "Common") {
    const value = parseDiscountValue(form.discountValue);
    if (!form.discountValue.trim() || value <= 0) {
      return "Discount value is required.";
    }
    if (form.discountType === "Percentage" && value > 100) {
      return "Percentage discount cannot be more than 100%.";
    }
  } else {
    for (const productId of form.productIds) {
      const entry = form.productDiscounts[productId];
      const value = parseDiscountValue(entry?.discountValue ?? "");
      if (!entry?.discountValue?.trim() || value <= 0) {
        return "Discount value is required for all selected products.";
      }
      const type = entry.discountType ?? "Percentage";
      if (type === "Percentage" && value > 100) {
        return "Percentage discount cannot be more than 100%.";
      }
    }
  }

  const previewRows = buildProductDiscountSaveRows(form);
  if (!previewRows.length) {
    return "Unable to build preview — check product and state selection.";
  }

  for (const row of previewRows) {
    const err = validatePreviewRow(row);
    if (err) return err;
  }

  if (findDuplicateProductDiscount(form, existingRecords, excludeId)) {
    return DUPLICATE_SCHEME_MESSAGE;
  }

  return null;
}

function toStoredDiscountType(type: ProductDiscountDiscountType): "Percentage" | "Fixed Amount" {
  return type === "Rupees" ? "Fixed Amount" : "Percentage";
}

function fromStoredDiscountType(type?: string): ProductDiscountDiscountType {
  if (type === "Fixed Amount" || type === "Rupees") return "Rupees";
  return "Percentage";
}

export function buildProductDiscountSchemeLines(
  form: ProductDiscountForm,
): ProductDiscountSchemeLine[] {
  return buildProductDiscountUIPreviewRows(form).map((row) => ({
    productId: row.productId,
    productCode: row.productCode,
    productName: row.productName,
    stateNames: [...form.stateNames],
    dealerPrice: row.dealerPrice,
    discountType: toStoredDiscountType(row.discountType),
    discountValue: row.discountValue,
    discountAmount: row.discountAmount,
    finalSchemePrice: row.finalSchemePrice,
    mrp: row.mrp,
  }));
}

function summarizeSchemeStates(lines: ProductDiscountSchemeLine[]): string {
  const states = [...new Set(lines.flatMap((line) => line.stateNames))];
  return states.join(", ");
}

export function productDiscountFormToRecord(
  form: ProductDiscountForm,
  existingRecords: SchemeRecord[],
  id: number,
  existing?: SchemeRecord,
): SchemeRecord {
  const schemeLines = buildProductDiscountSchemeLines(form);
  const existingCodes = existingRecords.map((r) => r.schemeCode);
  const schemeCode =
    existing?.schemeCode ?? nextMasterCode("SCH-", existingCodes);
  const now = masterToday();
  const stateNames = summarizeSchemeStates(schemeLines).split(", ").filter(Boolean);

  return {
    id,
    schemeCode,
    schemeName: form.schemeName.trim(),
    schemeType: "Product Discount Scheme",
    schemeLines,
    stateId: stateNames[0] ?? "",
    stateName: summarizeSchemeStates(schemeLines),
    customerType: form.customerType,
    approvalStatus: existing?.approvalStatus ?? "submitted",
    startDate: form.startDate,
    endDate: form.endDate,
    status: existing?.status ?? "inactive",
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/** @deprecated Use productDiscountFormToRecord */
export function productDiscountFormToRecords(
  form: ProductDiscountForm,
  existingRecords: SchemeRecord[],
  startId: number,
): SchemeRecord[] {
  return [productDiscountFormToRecord(form, existingRecords, startId)];
}

export function productDiscountRecordToForm(record: SchemeRecord): ProductDiscountForm {
  const lines = getProductDiscountSchemeLines(record);
  const productIds = lines.map((line) => line.productId);
  const stateNames = [...new Set(lines.flatMap((line) => line.stateNames))];

  const discountTypes = new Set(lines.map((line) => fromStoredDiscountType(line.discountType)));
  const discountValues = new Set(lines.map((line) => line.discountValue));
  const isCommon = lines.length <= 1 || (discountTypes.size === 1 && discountValues.size === 1);

  const firstLine = lines[0];
  const commonType = firstLine ? fromStoredDiscountType(firstLine.discountType) : "Percentage";
  const commonValue = firstLine ? String(firstLine.discountValue) : "";

  const productDiscounts: Record<string, ProductWiseDiscountEntry> = {};
  for (const line of lines) {
    productDiscounts[line.productId] = {
      discountType: fromStoredDiscountType(line.discountType),
      discountValue: String(line.discountValue),
    };
  }

  return {
    schemeName: record.schemeName,
    customerType: record.customerType,
    productIds,
    stateNames,
    discountApplication: isCommon ? "Common" : "Product-wise",
    discountType: commonType,
    discountValue: commonValue,
    productDiscounts,
    startDate: record.startDate ?? "",
    endDate: record.endDate ?? "",
  };
}

export function productDiscountFormToSingleRecord(
  form: ProductDiscountForm,
  existing: SchemeRecord,
): SchemeRecord {
  return productDiscountFormToRecord(form, [], existing.id, existing);
}

export function formatProductDiscountListingStatus(record: SchemeRecord): string {
  return formatProductDiscountOperationalStatus(record);
}

export function isProductDiscountRecord(record: SchemeRecord): boolean {
  return record.schemeType === "Product Discount Scheme";
}

export function getProductDiscountCodePreview(): string {
  const list = loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, SCHEME_SEED);
  return nextMasterCode(
    "SCH-",
    list.map((r) => r.schemeCode),
  );
}

export function matchProductDiscountSchemeLine(input: {
  productId: string;
  state: string;
  customerType: CustomerType;
  dp?: number;
  scheme: SchemeRecord;
  orderDate?: string;
}): ProductDiscountCalculationResult | null {
  if (input.scheme.schemeType !== "Product Discount Scheme") return null;

  const line = getProductDiscountSchemeLines(input.scheme).find(
    (entry) =>
      entry.productId === input.productId && entry.stateNames.includes(input.state),
  );
  if (!line) return null;

  const discountType = fromStoredDiscountType(line.discountType);
  const dp =
    input.dp && input.dp > 0
      ? input.dp
      : resolveDealerPriceForScheme(
          Number(input.productId),
          input.state,
          input.scheme.customerType,
        );

  return calculateProductDiscountScheme({
    productId: input.productId,
    state: input.state,
    customerType: input.scheme.customerType,
    dp,
    discountType,
    discountValue: line.discountValue,
    schemeCode: input.scheme.schemeCode,
    schemeName: input.scheme.schemeName,
    approvalStatus: input.scheme.approvalStatus,
    status: input.scheme.status,
    startDate: input.scheme.startDate,
    endDate: input.scheme.endDate,
    orderDate: input.orderDate,
  });
}

function schemeCustomerMatches(schemeCustomer: CustomerType, orderCustomer: CustomerType): boolean {
  if (schemeCustomer === "All") return true;
  return schemeCustomer === orderCustomer;
}

function compareSchemeRecency(a: SchemeRecord, b: SchemeRecord): number {
  const dateCmp = (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
  if (dateCmp !== 0) return dateCmp;
  return b.id - a.id;
}

export function findProductDiscountSchemeForOrder(input: {
  productId: string;
  state: string;
  customerType: CustomerType;
  orderDate: string;
  dp?: number;
  records?: SchemeRecord[];
}): ProductDiscountCalculationResult | null {
  const schemes = (input.records ?? loadConsolidatedSchemeRecords()).filter(
    (record) => record.schemeType === "Product Discount Scheme",
  );

  const matches: { scheme: SchemeRecord; result: ProductDiscountCalculationResult }[] = [];

  for (const scheme of schemes) {
    if (!schemeCustomerMatches(scheme.customerType, input.customerType)) continue;
    const match = matchProductDiscountSchemeLine({
      productId: input.productId,
      state: input.state,
      customerType: input.customerType,
      dp: input.dp,
      scheme,
      orderDate: input.orderDate,
    });
    if (match?.isEligible) {
      matches.push({ scheme, result: match });
    }
  }

  if (matches.length === 0) return null;

  if (matches.length > 1) {
    console.warn(
      `[Product Discount Scheme] Multiple eligible schemes found for product ${input.productId}, state ${input.state}, customer type ${input.customerType}, order date ${input.orderDate}. Applying the latest approved/active scheme.`,
      matches.map((entry) => entry.scheme.schemeCode),
    );
  }

  matches.sort((a, b) => compareSchemeRecency(a.scheme, b.scheme));
  return matches[0].result;
}

export function findEligibleProductDiscountSchemesForOrder(input: {
  productId: string;
  state: string;
  customerType: CustomerType;
  orderDate: string;
  dp?: number;
  records?: SchemeRecord[];
}): EligibleProductDiscountSchemeOffer[] {
  const schemeCustomerType = input.customerType;
  const dealerPriceFallback =
    input.dp && input.dp > 0
      ? input.dp
      : resolveDealerPriceForScheme(
          Number(input.productId),
          input.state,
          schemeCustomerType,
        );

  const schemes = (input.records ?? loadConsolidatedSchemeRecords()).filter(
    (record) => record.schemeType === "Product Discount Scheme",
  );

  const matches: { scheme: SchemeRecord; result: ProductDiscountCalculationResult; productName: string }[] =
    [];

  for (const scheme of schemes) {
    if (!schemeCustomerMatches(scheme.customerType, input.customerType)) continue;
    const schemeLine = getProductDiscountSchemeLines(scheme).find(
      (entry) =>
        entry.productId === input.productId && entry.stateNames.includes(input.state),
    );
    if (!schemeLine) continue;

    const match = matchProductDiscountSchemeLine({
      productId: input.productId,
      state: input.state,
      customerType: input.customerType,
      dp: dealerPriceFallback,
      scheme,
      orderDate: input.orderDate,
    });
    if (match?.isEligible) {
      matches.push({
        scheme,
        result: match,
        productName: schemeLine.productName,
      });
    }
  }

  matches.sort((a, b) => compareSchemeRecency(a.scheme, b.scheme));

  return matches.map(({ scheme, result, productName }) => ({
    schemeId: scheme.id,
    schemeCode: result.schemeCode ?? scheme.schemeCode,
    schemeName: result.schemeName ?? scheme.schemeName,
    productName,
    customerType: scheme.customerType,
    stateName: input.state,
    dealerPrice: result.dealerPrice ?? dealerPriceFallback,
    discountType: result.discountType ?? "Percentage",
    discountValue: result.discountValue ?? 0,
    discountAmount: result.discountAmount,
    finalSchemePrice: result.finalSchemePrice,
    startDate: scheme.startDate,
    endDate: scheme.endDate,
  }));
}

export function resolveSalesOrderDealerPrice(input: {
  productId: number;
  stateName: string;
  customerMasterType: string;
}): number {
  const schemeCustomerType = mapCustomerMasterTypeToSchemeType(input.customerMasterType);
  return resolveDealerPriceForScheme(input.productId, input.stateName, schemeCustomerType);
}

export function lookupEligibleSchemesForSalesOrder(input: {
  productId: number;
  stateName: string;
  customerMasterType: string;
  orderDate: string;
}): EligibleProductDiscountSchemeOffer[] {
  const schemeCustomerType = mapCustomerMasterTypeToSchemeType(input.customerMasterType);
  const dealerPrice = resolveSalesOrderDealerPrice(input);
  return findEligibleProductDiscountSchemesForOrder({
    productId: String(input.productId),
    state: input.stateName,
    customerType: schemeCustomerType,
    orderDate: input.orderDate,
    dp: dealerPrice,
  });
}

export function getEligibleProductDiscountScheme(input: {
  productId: string;
  state: string;
  customerType: CustomerType;
  orderDate: string;
  records?: SchemeRecord[];
}): EligibleProductDiscountScheme | null {
  const result = findProductDiscountSchemeForOrder(input);
  if (!result?.isEligible) return null;
  if (!result.schemeCode || result.dealerPrice === undefined) return null;

  return {
    schemeCode: result.schemeCode,
    schemeName: result.schemeName ?? "",
    dealerPrice: result.dealerPrice,
    discountType: result.discountType ?? "Percentage",
    discountValue: result.discountValue ?? 0,
    discountAmount: result.discountAmount,
    finalSchemePrice: result.finalSchemePrice,
  };
}

function schemeDiscountPercentFromResult(
  dealerPrice: number,
  result: Pick<ProductDiscountCalculationResult, "isEligible" | "discountType" | "discountValue" | "discountAmount">,
): number {
  if (!result.isEligible || dealerPrice <= 0) return 0;
  if (result.discountType === "Percentage" && result.discountValue) {
    return result.discountValue;
  }
  if (result.discountAmount > 0) {
    return Math.round((result.discountAmount / dealerPrice) * 10000) / 100;
  }
  return 0;
}

export function buildManualSchemePricingFromOffer(
  offer: EligibleProductDiscountSchemeOffer,
): Pick<
  SalesOrderProductPricing,
  | "schemeDiscountPercent"
  | "schemeDiscountAmount"
  | "schemeDiscountType"
  | "schemeDiscountValue"
  | "finalRate"
  | "schemeCode"
  | "schemeName"
  | "schemeApplied"
  | "discountPercent"
> {
  const schemeDiscountPercent = schemeDiscountPercentFromResult(offer.dealerPrice, {
    isEligible: true,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    discountAmount: offer.discountAmount,
  });

  return {
    schemeDiscountPercent,
    schemeDiscountAmount: offer.discountAmount,
    schemeDiscountType: offer.discountType,
    schemeDiscountValue: offer.discountValue,
    finalRate: offer.finalSchemePrice,
    schemeCode: offer.schemeCode,
    schemeName: offer.schemeName,
    schemeApplied: "Yes",
    discountPercent: schemeDiscountPercent,
  };
}

export function resolveSalesOrderProductPricing(input: {
  productId: number;
  stateName: string;
  customerMasterType: string;
  orderDate: string;
}): SalesOrderProductPricing {
  const schemeCustomerType = mapCustomerMasterTypeToSchemeType(input.customerMasterType);
  const dealerPrice = resolveDealerPriceForScheme(
    input.productId,
    input.stateName,
    schemeCustomerType,
  );

  const schemeResult = findProductDiscountSchemeForOrder({
    productId: String(input.productId),
    state: input.stateName,
    customerType: schemeCustomerType,
    orderDate: input.orderDate,
    dp: dealerPrice,
  });

  if (schemeResult?.isEligible) {
    const schemeDiscountAmount = schemeResult.discountAmount;
    const finalRate = schemeResult.finalSchemePrice;
    const schemeDiscountPercent = schemeDiscountPercentFromResult(dealerPrice, schemeResult);
    const schemeDiscountType = schemeResult.discountType ?? "Percentage";
    const schemeDiscountValue = schemeResult.discountValue ?? 0;

    return {
      dealerPrice,
      schemeDiscountPercent,
      schemeDiscountAmount,
      schemeDiscountType,
      schemeDiscountValue,
      finalRate,
      schemeCode: schemeResult.schemeCode,
      schemeName: schemeResult.schemeName,
      schemeApplied: "Yes",
      unitPrice: dealerPrice,
      discountPercent: schemeDiscountPercent,
    };
  }

  return {
    dealerPrice,
    schemeDiscountPercent: 0,
    schemeDiscountAmount: 0,
    schemeDiscountType: undefined,
    schemeDiscountValue: undefined,
    finalRate: dealerPrice,
    schemeApplied: "No",
    unitPrice: dealerPrice,
    discountPercent: 0,
  };
}
