import {
  MASTER_CURRENT_USER,
  masterToday,
  nextMasterCode,
  loadMasterRecords,
} from "@/lib/masters/common";
import { loadProducts } from "../products/product-data";
import {
  buildProductPricingSnapshot,
  dateRangesOverlap,
} from "../pricing/pricing-data";
import {
  isSchemeEditable,
  mergeSchemeSeedRecords,
  resolveDisplayApprovalStatus,
  resolveSchemeOperationalStatus,
  SCHEME_SEED,
  SCHEME_STORAGE_KEY,
  type CustomerType,
  type DiscountType,
  type NearExpirySchemeLine,
  type ProductDiscountSchemeLine,
  type SchemeRecord,
} from "./scheme-data";
import { STANDARD_SCHEME_SEED } from "./standard-schemes";
import {
  formatSchemeRupee,
  getProductDiscountSchemeLines,
  loadConsolidatedSchemeRecords as loadProductDiscountConsolidated,
  loadSchemeProductSelectOptions,
  loadSchemeStateOptions,
  resolveDealerPriceForScheme,
  type SchemeProductSelectOption,
} from "./product-discount-scheme";
import { loadWarehouses } from "../warehouse/warehouse-data";
import { getQcPassedStockRecords } from "../../warehouse/stockoverview/mock-data";
import type { QcPassedStockRecord } from "../../warehouse/stockoverview/types";

const STOCK_WAREHOUSE_MASTER_ALIASES: Record<string, string> = {
  "Central Warehouse": "Central Distribution Hub",
  "North Zone Hub": "North Zone Regional Store",
  "West Zone Hub": "Gujarat Distribution Center",
};

const STOCK_WAREHOUSE_STATE_FALLBACK: Record<string, string> = {
  "Central Warehouse": "Maharashtra",
  "North Zone Hub": "Maharashtra",
  "South Zone Depot": "Telangana",
  "West Zone Hub": "Gujarat",
};

export interface NearExpiryStockBatch {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  sku: string;
  batchNumber: string;
  warehouse: string;
  warehouseState: string;
  warehouseLabel: string;
  availableQty: number;
  expiryDate: string;
  daysToExpiry: number;
}

export interface NearExpiryProductSelectOption extends SchemeProductSelectOption {
  nearestExpiryDate: string;
  nearestDaysToExpiry: number;
  batchCount: number;
  totalAvailableQty: number;
  batchSummary: string;
}

/** Demo batches for catalog products not yet linked in QC-passed warehouse stock. */
const NEAR_EXPIRY_BATCH_SUPPLEMENT: {
  productId: number;
  batchNumber: string;
  warehouse: string;
  availableQty: number;
  expiryOffsetDays: number;
}[] = [
  { productId: 1, batchNumber: "B-CORN-26A", warehouse: "Central Warehouse", availableQty: 85, expiryOffsetDays: 22 },
  { productId: 2, batchNumber: "B-NPK-WS-26B", warehouse: "North Zone Hub", availableQty: 140, expiryOffsetDays: 38 },
  { productId: 3, batchNumber: "B-SHLD-26C", warehouse: "South Zone Depot", availableQty: 60, expiryOffsetDays: 14 },
  { productId: 4, batchNumber: "B-BIO-26D", warehouse: "West Zone Hub", availableQty: 95, expiryOffsetDays: 52 },
];

export type NearExpiryBenefitApplication = "Common" | "Product-wise";
export type NearExpiryBenefitTypeUI = "Percentage" | "Rupees";

export interface ProductWiseNearExpiryBenefit {
  benefitType: NearExpiryBenefitTypeUI;
  benefitValue: string;
}

export type NearExpiryBenefitType = DiscountType;

export interface ProductNearExpiryForm {
  schemeName: string;
  customerType: CustomerType;
  productIds: string[];
  stateNames: string[];
  expiryWithinDays: string;
  benefitApplication: NearExpiryBenefitApplication;
  benefitType: NearExpiryBenefitTypeUI;
  benefitValue: string;
  productBenefits: Record<string, ProductWiseNearExpiryBenefit>;
  startDate: string;
  endDate: string;
}

export interface NearExpiryUIPreviewRow {
  key: string;
  productId: string;
  productCode: string;
  productName: string;
  sku: string;
  batchNumber: string;
  expiryDate: string;
  warehouseName: string;
  warehouseState: string;
  dealerPrice: number;
  mrp: number;
  benefitType: NearExpiryBenefitTypeUI;
  benefitValue: number;
  benefitAmount: number;
  finalPrice: number;
}

export const DEFAULT_PRODUCT_NEAR_EXPIRY_FORM: ProductNearExpiryForm = {
  schemeName: "",
  customerType: "All",
  productIds: [],
  stateNames: [],
  expiryWithinDays: "",
  benefitApplication: "Common",
  benefitType: "Percentage",
  benefitValue: "",
  productBenefits: {},
  startDate: "",
  endDate: "",
};

export const DUPLICATE_NEAR_EXPIRY_SCHEME_MESSAGE =
  "Product Near Expiry Scheme already exists for this Product, State and Customer Type during selected validity period.";

const BLOCKING_APPROVAL_STATUSES = new Set(["approved", "active"]);

function parseNumeric(raw: string): number {
  const cleaned = raw.replace(/[₹,\s]/g, "");
  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? 0 : value;
}

function parseExpiryDays(raw: string): number {
  const value = parseInt(raw, 10);
  return Number.isNaN(value) ? 0 : value;
}

export function isNearExpiryRecord(record: SchemeRecord): boolean {
  return record.schemeType === "Product Near Expiry Scheme";
}

export function computePotentialBenefit(
  dealerPrice: number,
  benefitType: NearExpiryBenefitTypeUI | DiscountType,
  benefitValue: number,
): number {
  if (dealerPrice <= 0 || benefitValue <= 0) return 0;
  const isPct = benefitType === "Percentage";
  if (isPct) return (dealerPrice * benefitValue) / 100;
  return benefitValue;
}

export function computeNearExpiryFinalPrice(dealerPrice: number, benefitAmount: number): number {
  return Math.max(0, dealerPrice - benefitAmount);
}

export function resolveWarehouseState(warehouseName: string): string {
  const warehouses = loadWarehouses();
  const exact = warehouses.find((w) => w.warehouseName === warehouseName);
  if (exact?.state) return exact.state;

  const alias = STOCK_WAREHOUSE_MASTER_ALIASES[warehouseName];
  if (alias) {
    const matched = warehouses.find((w) => w.warehouseName === alias);
    if (matched?.state) return matched.state;
  }

  return STOCK_WAREHOUSE_STATE_FALLBACK[warehouseName] ?? "—";
}

export function formatWarehouseWithState(warehouseName: string): string {
  const state = resolveWarehouseState(warehouseName);
  return state === "—" ? warehouseName : `${warehouseName} · ${state}`;
}

export function formatExpiryCriteria(days: number): string {
  return `${days} Days`;
}

export function formatNearExpiryBenefit(record: SchemeRecord): string {
  if (!isNearExpiryRecord(record)) return "—";
  const benefitType = record.discountType ?? "Percentage";
  const benefitValue = record.discountValue ?? 0;
  const days = record.expiryWithinDays ?? 0;
  const benefitLabel =
    benefitType === "Fixed Amount" ? formatSchemeRupee(benefitValue) : `${benefitValue}%`;
  return `${benefitLabel} · ≤${days}d`;
}

export function daysUntilExpiry(expiryDate: string, asOn = masterToday()): number {
  const from = new Date(asOn);
  const to = new Date(expiryDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 9999;
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatBatchExpiryDate(expiryDate: string): string {
  const date = new Date(expiryDate);
  if (Number.isNaN(date.getTime())) return expiryDate;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeProductName(value: string): string {
  return value.trim().toLowerCase();
}

function resolveProductIdForStockName(
  stockProductName: string,
  products: ReturnType<typeof loadProducts>,
): string | null {
  const normalizedStock = normalizeProductName(stockProductName);
  const exact = products.find((p) => normalizeProductName(p.productName) === normalizedStock);
  if (exact) return String(exact.id);

  const partial = products.find((p) => {
    const name = normalizeProductName(p.productName);
    return name.includes(normalizedStock) || normalizedStock.includes(name);
  });
  return partial ? String(partial.id) : null;
}

function mapWarehouseBatch(
  record: QcPassedStockRecord,
  productId: string,
  productName: string,
  productCode: string,
  sku: string,
  asOn: string,
): NearExpiryStockBatch | null {
  if (record.availableQuantity <= 0) return null;
  const daysToExpiry = daysUntilExpiry(record.expiryDate, asOn);
  if (daysToExpiry < 0) return null;

  const warehouseState = resolveWarehouseState(record.warehouse);
  return {
    id: record.id,
    productId,
    productName,
    productCode,
    sku,
    batchNumber: record.batchNumber,
    warehouse: record.warehouse,
    warehouseState,
    warehouseLabel: formatWarehouseWithState(record.warehouse),
    availableQty: record.availableQuantity,
    expiryDate: record.expiryDate,
    daysToExpiry,
  };
}

function addOffsetDays(baseDate: string, offsetDays: number): string {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function loadNearExpiryStockBatches(asOn = masterToday()): NearExpiryStockBatch[] {
  const products = loadProducts().filter((p) => p.status === "active");
  const productById = new Map(products.map((p) => [String(p.id), p]));
  const batches: NearExpiryStockBatch[] = [];
  const coveredProductIds = new Set<string>();

  for (const record of getQcPassedStockRecords()) {
    const productId = resolveProductIdForStockName(record.product, products);
    if (!productId) continue;
    const product = productById.get(productId);
    if (!product) continue;

    const mapped = mapWarehouseBatch(
      record,
      productId,
      product.productName,
      product.productCode ?? "",
      product.sku ?? "",
      asOn,
    );
    if (mapped) {
      batches.push(mapped);
      coveredProductIds.add(productId);
    }
  }

  for (const supplement of NEAR_EXPIRY_BATCH_SUPPLEMENT) {
    const productId = String(supplement.productId);
    if (coveredProductIds.has(productId)) continue;
    const product = productById.get(productId);
    if (!product) continue;

    const expiryDate = addOffsetDays(asOn, supplement.expiryOffsetDays);
    const warehouseState = resolveWarehouseState(supplement.warehouse);
    batches.push({
      id: `supplement-${productId}-${supplement.batchNumber}`,
      productId,
      productName: product.productName,
      productCode: product.productCode ?? "",
      sku: product.sku ?? "",
      batchNumber: supplement.batchNumber,
      warehouse: supplement.warehouse,
      warehouseState,
      warehouseLabel: formatWarehouseWithState(supplement.warehouse),
      availableQty: supplement.availableQty,
      expiryDate,
      daysToExpiry: supplement.expiryOffsetDays,
    });
  }

  return batches.sort((a, b) => {
    const dayCmp = a.daysToExpiry - b.daysToExpiry;
    if (dayCmp !== 0) return dayCmp;
    return a.productName.localeCompare(b.productName);
  });
}

export function filterNearExpiryStockBatches(
  withinDays: number,
  asOn = masterToday(),
): NearExpiryStockBatch[] {
  if (withinDays <= 0) return [];
  return loadNearExpiryStockBatches(asOn).filter(
    (batch) => batch.daysToExpiry >= 0 && batch.daysToExpiry <= withinDays,
  );
}

function summarizeProductBatches(batches: NearExpiryStockBatch[]): {
  nearestExpiryDate: string;
  nearestDaysToExpiry: number;
  batchCount: number;
  totalAvailableQty: number;
  batchSummary: string;
} {
  const nearest = batches[0];
  const batchSummary = batches
    .slice(0, 2)
    .map(
      (batch) =>
        `${batch.batchNumber} · ${batch.warehouseLabel} · ${formatBatchExpiryDate(batch.expiryDate)} · ${batch.daysToExpiry}d`,
    )
    .join(" · ");

  return {
    nearestExpiryDate: nearest.expiryDate,
    nearestDaysToExpiry: nearest.daysToExpiry,
    batchCount: batches.length,
    totalAvailableQty: batches.reduce((sum, batch) => sum + batch.availableQty, 0),
    batchSummary:
      batches.length > 2 ? `${batchSummary} · +${batches.length - 2} more` : batchSummary,
  };
}

export function loadNearExpiryProductSelectOptions(
  withinDays: number,
  asOn = masterToday(),
): NearExpiryProductSelectOption[] {
  const baseOptions = loadSchemeProductSelectOptions();
  const eligibleBatches = filterNearExpiryStockBatches(withinDays, asOn);
  const batchesByProduct = new Map<string, NearExpiryStockBatch[]>();

  for (const batch of eligibleBatches) {
    const group = batchesByProduct.get(batch.productId) ?? [];
    group.push(batch);
    batchesByProduct.set(batch.productId, group);
  }

  const options: NearExpiryProductSelectOption[] = [];

  for (const [productId, batches] of batchesByProduct.entries()) {
    batches.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
    const base = baseOptions.find((opt) => opt.value === productId);
    if (!base) continue;

    const summary = summarizeProductBatches(batches);
    options.push({
      ...base,
      nearestExpiryDate: summary.nearestExpiryDate,
      nearestDaysToExpiry: summary.nearestDaysToExpiry,
      batchCount: summary.batchCount,
      totalAvailableQty: summary.totalAvailableQty,
      batchSummary: summary.batchSummary,
      sublabel: summary.batchSummary,
      searchText: [
        base.searchText,
        summary.batchSummary,
        batches.map((batch) => batch.batchNumber).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    });
  }

  return options.sort((a, b) => a.nearestDaysToExpiry - b.nearestDaysToExpiry);
}

export function syncNearExpiryProductSelection(
  form: ProductNearExpiryForm,
): ProductNearExpiryForm {
  const withinDays = parseExpiryDays(form.expiryWithinDays);
  let next = form;

  if (withinDays > 0 && form.productIds.length) {
    const eligibleIds = new Set(
      loadNearExpiryProductSelectOptions(withinDays).map((option) => option.value),
    );
    const productIds = form.productIds.filter((id) => eligibleIds.has(id));
    if (productIds.length !== form.productIds.length) {
      next = { ...next, productIds };
    }
  }

  return syncNearExpiryFormFromProducts(next);
}

export function getPrimaryNearExpiryBatch(
  productId: string,
  withinDays: number,
  asOn = masterToday(),
): NearExpiryStockBatch | null {
  const batches = filterNearExpiryStockBatches(withinDays, asOn)
    .filter((batch) => batch.productId === productId)
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  return batches[0] ?? null;
}

export function deriveStatesFromSelectedProducts(
  productIds: string[],
  withinDays: number,
  asOn = masterToday(),
): string[] {
  const states = new Set<string>();
  for (const productId of productIds) {
    const batches = filterNearExpiryStockBatches(withinDays, asOn).filter(
      (batch) => batch.productId === productId,
    );
    for (const batch of batches) {
      if (batch.warehouseState && batch.warehouseState !== "—") {
        states.add(batch.warehouseState);
      }
    }
  }
  return [...states].sort((a, b) => a.localeCompare(b));
}

export function syncProductBenefitsForProducts(form: ProductNearExpiryForm): ProductNearExpiryForm {
  const productBenefits = { ...form.productBenefits };
  for (const productId of form.productIds) {
    if (!productBenefits[productId]) {
      productBenefits[productId] = {
        benefitType: form.benefitType,
        benefitValue: form.benefitValue,
      };
    }
  }
  for (const productId of Object.keys(productBenefits)) {
    if (!form.productIds.includes(productId)) {
      delete productBenefits[productId];
    }
  }
  return { ...form, productBenefits };
}

export function applyNearExpiryBenefitApplicationMode(
  form: ProductNearExpiryForm,
  mode: NearExpiryBenefitApplication,
): ProductNearExpiryForm {
  if (form.benefitApplication === mode) return form;
  if (mode === "Product-wise") {
    const productBenefits: Record<string, ProductWiseNearExpiryBenefit> = {};
    for (const productId of form.productIds) {
      productBenefits[productId] = {
        benefitType: form.benefitType,
        benefitValue: form.benefitValue,
      };
    }
    return syncProductBenefitsForProducts({
      ...form,
      benefitApplication: mode,
      productBenefits,
    });
  }
  return { ...form, benefitApplication: mode };
}

export function syncNearExpiryFormFromProducts(form: ProductNearExpiryForm): ProductNearExpiryForm {
  const withinDays = parseExpiryDays(form.expiryWithinDays);
  const stateNames =
    withinDays > 0 && form.productIds.length
      ? deriveStatesFromSelectedProducts(form.productIds, withinDays)
      : [];
  return syncProductBenefitsForProducts({ ...form, stateNames });
}

function toStoredBenefitType(type: NearExpiryBenefitTypeUI): DiscountType {
  return type === "Rupees" ? "Fixed Amount" : "Percentage";
}

function fromStoredBenefitType(type?: string): NearExpiryBenefitTypeUI {
  if (type === "Fixed Amount" || type === "Rupees") return "Rupees";
  return "Percentage";
}

function getProductBenefitConfig(
  form: ProductNearExpiryForm,
  productId: string,
): { benefitType: NearExpiryBenefitTypeUI; benefitValue: number } {
  if (form.benefitApplication === "Product-wise") {
    const entry = form.productBenefits[productId];
    const benefitType = entry?.benefitType ?? "Percentage";
    const benefitValue = parseNumeric(entry?.benefitValue ?? "");
    return { benefitType, benefitValue };
  }
  return {
    benefitType: form.benefitType,
    benefitValue: parseNumeric(form.benefitValue),
  };
}

function buildProductRowContext(
  productId: string,
  stateName: string,
  customerType: CustomerType,
) {
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

function getPreviewStateName(form: ProductNearExpiryForm): string | null {
  return form.stateNames[0] ?? null;
}

export function buildNearExpiryUIPreviewRows(
  form: ProductNearExpiryForm,
): NearExpiryUIPreviewRow[] {
  if (!form.productIds.length) return [];

  const withinDays = parseExpiryDays(form.expiryWithinDays);
  if (withinDays <= 0) return [];

  const rows: NearExpiryUIPreviewRow[] = [];

  for (const productId of form.productIds) {
    const batch = getPrimaryNearExpiryBatch(productId, withinDays);
    if (!batch) continue;

    const product = loadProducts().find((p) => String(p.id) === productId);
    const pricingState = batch.warehouseState !== "—" ? batch.warehouseState : getPreviewStateName(form);
    if (!pricingState) continue;

    const ctx = buildProductRowContext(productId, pricingState, form.customerType);
    if (!ctx) continue;

    const { benefitType, benefitValue } = getProductBenefitConfig(form, productId);
    const benefitAmount = computePotentialBenefit(ctx.dealerPrice, benefitType, benefitValue);

    rows.push({
      key: productId,
      productId,
      productCode: ctx.productCode,
      productName: ctx.productName,
      sku: product?.sku ?? batch.sku,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      warehouseName: batch.warehouse,
      warehouseState: batch.warehouseState,
      dealerPrice: ctx.dealerPrice,
      mrp: ctx.mrp,
      benefitType,
      benefitValue,
      benefitAmount,
      finalPrice: computeNearExpiryFinalPrice(ctx.dealerPrice, benefitAmount),
    });
  }

  return rows;
}

export function buildNearExpirySchemeLines(form: ProductNearExpiryForm): NearExpirySchemeLine[] {
  const expiryDays = parseExpiryDays(form.expiryWithinDays);

  return buildNearExpiryUIPreviewRows(form).map((row) => ({
    productId: row.productId,
    productCode: row.productCode,
    productName: row.productName,
    sku: row.sku,
    batchNumber: row.batchNumber,
    expiryDate: row.expiryDate,
    warehouseName: row.warehouseName,
    warehouseState: row.warehouseState,
    dealerPrice: row.dealerPrice,
    expiryWithinDays: expiryDays,
    benefitType: toStoredBenefitType(row.benefitType),
    benefitValue: row.benefitValue,
    benefitAmount: row.benefitAmount,
    finalPrice: row.finalPrice,
    mrp: row.mrp,
  }));
}

export function getNearExpirySchemeLines(record: SchemeRecord): NearExpirySchemeLine[] {
  if (record.nearExpiryLines?.length) {
    return record.nearExpiryLines.map((line) => ({
      ...line,
      benefitAmount: line.benefitAmount ?? line.potentialBenefit ?? 0,
      finalPrice:
        line.finalPrice ??
        computeNearExpiryFinalPrice(
          line.dealerPrice,
          line.benefitAmount ?? line.potentialBenefit ?? 0,
        ),
      sku: line.sku ?? "",
      batchNumber: line.batchNumber ?? "",
      expiryDate: line.expiryDate ?? "",
      warehouseName: line.warehouseName ?? "",
      warehouseState: line.warehouseState ?? "",
    }));
  }
  if (!record.productId) return [];

  const benefitType: DiscountType =
    record.discountType === "Fixed Amount" ? "Fixed Amount" : "Percentage";
  const benefitValue = record.discountValue ?? 0;
  const expiryDays = record.expiryWithinDays ?? 0;

  const productId = record.productId;
  const stateName = record.stateName.split(",")[0]?.trim() ?? "";
  const ctx = stateName
    ? buildProductRowContext(productId, stateName, record.customerType)
    : null;
  const dealerPrice = record.dealerPrice ?? ctx?.dealerPrice ?? 0;
  const benefitAmount = computePotentialBenefit(
    dealerPrice,
    fromStoredBenefitType(benefitType),
    benefitValue,
  );

  return [
    {
      productId,
      productCode: record.productCode ?? ctx?.productCode ?? "",
      productName: record.productName ?? ctx?.productName ?? "",
      sku: "",
      batchNumber: "",
      expiryDate: "",
      warehouseName: "",
      warehouseState: stateName,
      dealerPrice,
      expiryWithinDays: expiryDays,
      benefitType,
      benefitValue,
      benefitAmount,
      finalPrice: computeNearExpiryFinalPrice(dealerPrice, benefitAmount),
      mrp: record.mrp ?? ctx?.mrp ?? 0,
    },
  ];
}

export function countNearExpiryProducts(record: SchemeRecord): number {
  return getNearExpirySchemeLines(record).length;
}

export function countNearExpiryStates(record: SchemeRecord): number {
  if (!record.stateName) return 0;
  return record.stateName.split(",").map((s) => s.trim()).filter(Boolean).length;
}

function summarizeSchemeStates(stateNames: string[]): string {
  return stateNames.join(", ");
}

function migrateNearExpiryRecord(record: SchemeRecord): SchemeRecord {
  if (record.schemeType !== "Product Near Expiry Scheme") return record;
  if (record.nearExpiryLines?.length) {
    const stateNames = record.stateName.split(",").map((s) => s.trim()).filter(Boolean);
    return {
      ...record,
      stateId: stateNames[0] ?? record.stateId,
      stateName: summarizeSchemeStates(stateNames),
      productId: undefined,
      productCode: undefined,
      productName: undefined,
      dealerPrice: undefined,
      mrp: undefined,
      batchId: undefined,
      effectType: undefined,
      appliedIn: undefined,
      settlementMethod: undefined,
      priority: undefined,
      description: record.description,
    };
  }

  const lines = getNearExpirySchemeLines(record);
  const stateNames = record.stateName.split(",").map((s) => s.trim()).filter(Boolean);

  return {
    ...record,
    nearExpiryLines: lines,
    stateId: stateNames[0] ?? record.stateId,
    stateName: summarizeSchemeStates(stateNames),
    productId: undefined,
    productCode: undefined,
    productName: undefined,
    dealerPrice: undefined,
    mrp: undefined,
    batchId: undefined,
    effectType: undefined,
    appliedIn: undefined,
    settlementMethod: undefined,
    priority: undefined,
  };
}

export function consolidateNearExpiryRecords(records: SchemeRecord[]): SchemeRecord[] {
  return records.map((record) =>
    record.schemeType === "Product Near Expiry Scheme"
      ? migrateNearExpiryRecord(record)
      : record,
  );
}

function uniqueNearExpiryLines(lines: NearExpirySchemeLine[]): NearExpirySchemeLine[] {
  const map = new Map<string, NearExpirySchemeLine>();
  for (const line of lines) {
    const key = `${line.productId}|${line.batchNumber}|${line.warehouseName ?? ""}`;
    if (!map.has(key)) map.set(key, line);
  }
  return [...map.values()];
}

function mergeSchemeGroupByCode(group: SchemeRecord[]): SchemeRecord {
  if (group.length === 1) return group[0];

  const canonical = group.reduce((best, record) => (record.id < best.id ? record : best), group[0]);
  const schemeLines = uniqueProductDiscountLines(
    group.flatMap((record) =>
      record.schemeLines?.length ? record.schemeLines : getProductDiscountSchemeLines(record),
    ),
  );
  const nearExpiryLines = uniqueNearExpiryLines(
    group.flatMap((record) =>
      record.nearExpiryLines?.length ? record.nearExpiryLines : getNearExpirySchemeLines(record),
    ),
  );
  const stateNames = [
    ...new Set(
      group.flatMap((record) =>
        record.stateName
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ),
  ];

  return {
    ...canonical,
    id: Math.min(...group.map((record) => record.id)),
    schemeName: canonical.schemeName,
    stateId: stateNames[0] ?? canonical.stateId,
    stateName: stateNames.join(", "),
    schemeLines: schemeLines.length ? schemeLines : undefined,
    nearExpiryLines: nearExpiryLines.length ? nearExpiryLines : undefined,
    productId: undefined,
    productCode: undefined,
    productName: undefined,
    dealerPrice: undefined,
    mrp: undefined,
    batchId: undefined,
  };
}

function uniqueProductDiscountLines(lines: ProductDiscountSchemeLine[]): ProductDiscountSchemeLine[] {
  const map = new Map<string, ProductDiscountSchemeLine>();
  for (const line of lines) {
    const key = `${line.productId}|${line.discountType}|${line.discountValue}`;
    const existing = map.get(key);
    if (existing) {
      for (const state of line.stateNames) {
        if (!existing.stateNames.includes(state)) existing.stateNames.push(state);
      }
    } else {
      map.set(key, { ...line, stateNames: [...line.stateNames] });
    }
  }
  return [...map.values()];
}

/** One listing row per scheme code — merges duplicate legacy rows. */
export function deduplicateSchemesByCode(records: SchemeRecord[]): SchemeRecord[] {
  const groups = new Map<string, SchemeRecord[]>();
  for (const record of records) {
    const key = record.schemeCode.trim();
    const list = groups.get(key) ?? [];
    list.push(record);
    groups.set(key, list);
  }
  return [...groups.values()]
    .map(mergeSchemeGroupByCode)
    .sort((a, b) => a.schemeCode.localeCompare(b.schemeCode));
}

export function loadConsolidatedSchemeRecords(): SchemeRecord[] {
  const records = loadProductDiscountConsolidated();
  const withStandard = mergeSchemeSeedRecords(records, STANDARD_SCHEME_SEED);
  return deduplicateSchemesByCode(consolidateNearExpiryRecords(withStandard));
}

function isBlockingNearExpiryRecord(record: SchemeRecord): boolean {
  return (
    isNearExpiryRecord(record) && BLOCKING_APPROVAL_STATUSES.has(record.approvalStatus)
  );
}

export function findDuplicateNearExpiryScheme(
  form: ProductNearExpiryForm,
  existingRecords: SchemeRecord[],
  excludeId?: number,
): SchemeRecord | null {
  if (!form.startDate || !form.endDate) return null;

  for (const productId of form.productIds) {
    for (const stateName of form.stateNames) {
      const duplicate = existingRecords.find((record) => {
        if (record.id === excludeId) return false;
        if (!isNearExpiryRecord(record)) return false;
        if (!isBlockingNearExpiryRecord(record)) return false;
        if (record.customerType !== form.customerType) return false;
        if (!record.startDate || !record.endDate) return false;
        if (!dateRangesOverlap(form.startDate, form.endDate, record.startDate, record.endDate)) {
          return false;
        }
        const recordStates = record.stateName.split(",").map((s) => s.trim());
        if (!recordStates.includes(stateName)) return false;
        return getNearExpirySchemeLines(record).some((line) => line.productId === productId);
      });
      if (duplicate) return duplicate;
    }
  }

  return null;
}

function validatePreviewRow(
  row: NearExpiryUIPreviewRow,
  form: ProductNearExpiryForm,
): string | null {
  if (row.dealerPrice <= 0) {
    return `Dealer Price not found for ${row.productName} in ${row.warehouseState}. Check Pricing Master.`;
  }
  if (!row.benefitValue || row.benefitValue <= 0) {
    return "Benefit value is required for all selected products.";
  }
  if (row.benefitType === "Percentage" && row.benefitValue > 100) {
    return "Benefit % cannot be more than 100%.";
  }
  if (row.benefitType === "Rupees" && row.benefitValue > row.dealerPrice) {
    return `Benefit amount cannot be greater than Dealer Price for ${row.productName}.`;
  }
  return null;
}

export function validateProductNearExpiryForm(
  form: ProductNearExpiryForm,
  mode: "add" | "edit",
  existingRecords: SchemeRecord[],
  excludeId?: number,
): string | null {
  if (!form.schemeName.trim()) return "Scheme name is required.";
  if (!form.productIds.length) return "Select at least one product.";
  if (!form.customerType) return "Customer Type is required.";
  if (!form.startDate) return "Start Date is required.";
  if (!form.endDate) return "End Date is required.";
  if (form.startDate > form.endDate) return "End Date cannot be before Start Date.";

  const expiryDays = parseExpiryDays(form.expiryWithinDays);
  if (!form.expiryWithinDays.trim() || expiryDays <= 0) {
    return "Expiry Within days is required.";
  }

  const eligibleProducts = loadNearExpiryProductSelectOptions(expiryDays);
  if (!eligibleProducts.length) {
    return `No QC-passed stock batches are expiring within ${expiryDays} days. Adjust Expiry Within or check Stock Overview.`;
  }

  for (const productId of form.productIds) {
    if (!eligibleProducts.some((option) => option.value === productId)) {
      return "One or more selected products have no stock batch expiring within configured days.";
    }
  }

  if (!form.stateNames.length) {
    return "States could not be derived from selected product warehouses.";
  }

  if (form.benefitApplication === "Common") {
    const benefitValue = parseNumeric(form.benefitValue);
    if (!form.benefitValue.trim() || benefitValue <= 0) {
      return form.benefitType === "Percentage"
        ? "Benefit % is required."
        : "Benefit Amount is required.";
    }
    if (form.benefitType === "Percentage" && benefitValue > 100) {
      return "Benefit % cannot be more than 100%.";
    }
  } else {
    for (const productId of form.productIds) {
      const entry = form.productBenefits[productId];
      const value = parseNumeric(entry?.benefitValue ?? "");
      if (!entry?.benefitValue?.trim() || value <= 0) {
        return "Benefit value is required for all selected products.";
      }
      const type = entry.benefitType ?? "Percentage";
      if (type === "Percentage" && value > 100) {
        return "Benefit % cannot be more than 100%.";
      }
    }
  }

  const previewRows = buildNearExpiryUIPreviewRows(form);
  if (!previewRows.length) {
    return "Unable to build preview — check product selection and warehouse pricing.";
  }

  for (const row of previewRows) {
    const err = validatePreviewRow(row, form);
    if (err) return err;
  }

  if (findDuplicateNearExpiryScheme(form, existingRecords, excludeId)) {
    return DUPLICATE_NEAR_EXPIRY_SCHEME_MESSAGE;
  }

  return null;
}

export function productNearExpiryFormToRecord(
  form: ProductNearExpiryForm,
  existingRecords: SchemeRecord[],
  id: number,
  existing?: SchemeRecord,
): SchemeRecord {
  const nearExpiryLines = buildNearExpirySchemeLines(form);
  const existingCodes = existingRecords.map((r) => r.schemeCode);
  const schemeCode = existing?.schemeCode ?? nextMasterCode("SCH-", existingCodes);
  const now = masterToday();
  const expiryDays = parseExpiryDays(form.expiryWithinDays);
  const isCommon = form.benefitApplication === "Common";
  const headerBenefitType = isCommon ? toStoredBenefitType(form.benefitType) : undefined;
  const headerBenefitValue = isCommon ? parseNumeric(form.benefitValue) : undefined;

  return {
    id,
    schemeCode,
    schemeName: form.schemeName.trim(),
    schemeType: "Product Near Expiry Scheme",
    nearExpiryLines,
    stateId: form.stateNames[0] ?? "",
    stateName: summarizeSchemeStates(form.stateNames),
    customerType: form.customerType,
    discountApplication: form.benefitApplication === "Common" ? "same" : "per_product",
    discountType: headerBenefitType,
    discountValue: headerBenefitValue,
    expiryWithinDays: expiryDays,
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

export function productNearExpiryRecordToForm(record: SchemeRecord): ProductNearExpiryForm {
  const lines = getNearExpirySchemeLines(record);
  const productIds = lines.map((line) => line.productId);
  const stateNames = record.stateName.split(",").map((s) => s.trim()).filter(Boolean);
  const firstLine = lines[0];

  const benefitTypes = new Set(lines.map((line) => fromStoredBenefitType(line.benefitType)));
  const benefitValues = new Set(lines.map((line) => line.benefitValue));
  const isCommon =
    record.discountApplication !== "per_product" &&
    (lines.length <= 1 || (benefitTypes.size === 1 && benefitValues.size === 1));

  const commonType = firstLine ? fromStoredBenefitType(firstLine.benefitType) : "Percentage";
  const commonValue = firstLine ? String(firstLine.benefitValue) : "";

  const productBenefits: Record<string, ProductWiseNearExpiryBenefit> = {};
  for (const line of lines) {
    productBenefits[line.productId] = {
      benefitType: fromStoredBenefitType(line.benefitType),
      benefitValue: String(line.benefitValue),
    };
  }

  return {
    schemeName: record.schemeName,
    customerType: record.customerType,
    productIds,
    stateNames,
    expiryWithinDays: String(record.expiryWithinDays ?? firstLine?.expiryWithinDays ?? ""),
    benefitApplication: isCommon ? "Common" : "Product-wise",
    benefitType: commonType,
    benefitValue: commonValue,
    productBenefits,
    startDate: record.startDate ?? "",
    endDate: record.endDate ?? "",
  };
}

export function getNearExpiryCodePreview(): string {
  const list = loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, SCHEME_SEED);
  return nextMasterCode(
    "SCH-",
    list.map((r) => r.schemeCode),
  );
}

export function isNearExpirySchemeExpired(record: SchemeRecord): boolean {
  return resolveDisplayApprovalStatus(record) === "expired";
}

export function formatNearExpiryOperationalStatus(record: SchemeRecord): string {
  return resolveSchemeOperationalStatus(record);
}

export function canEditNearExpiryScheme(record: SchemeRecord): boolean {
  return isNearExpiryRecord(record) && isSchemeEditable(record);
}

export function canSubmitNearExpiryScheme(record: SchemeRecord): boolean {
  return isNearExpiryRecord(record) && record.approvalStatus === "rejected";
}

export function canApproveNearExpiryScheme(record: SchemeRecord): boolean {
  return (
    isNearExpiryRecord(record) &&
    ["submitted", "manager_approval", "finance_approval", "final_approval"].includes(
      record.approvalStatus,
    )
  );
}

export function canRejectNearExpiryScheme(record: SchemeRecord): boolean {
  return canApproveNearExpiryScheme(record);
}

export function canSendBackNearExpiryScheme(record: SchemeRecord): boolean {
  return canApproveNearExpiryScheme(record);
}

export function canActivateNearExpiryScheme(record: SchemeRecord): boolean {
  return isNearExpiryRecord(record) && record.approvalStatus === "approved";
}

export function canDeactivateNearExpiryScheme(record: SchemeRecord): boolean {
  return (
    isNearExpiryRecord(record) &&
    record.approvalStatus === "active" &&
    record.status === "active"
  );
}

export function canCopyNearExpiryScheme(record: SchemeRecord): boolean {
  return isNearExpiryRecord(record) && record.approvalStatus === "rejected";
}

export function copyNearExpiryRecord(
  record: SchemeRecord,
  newId: number,
  newCode: string,
): SchemeRecord {
  const now = masterToday();
  return {
    ...record,
    id: newId,
    schemeCode: newCode,
    approvalStatus: "submitted",
    status: "inactive",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: now,
    updatedAt: now,
  };
}

export { loadSchemeProductSelectOptions, loadSchemeStateOptions, formatSchemeRupee };
