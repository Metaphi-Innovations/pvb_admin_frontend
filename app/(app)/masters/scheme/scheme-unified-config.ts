/**
 * Unified Scheme Master — one generic configuration model for all scheme types.
 * UI uses business language; technical enums stay internal.
 */

import {
  MASTER_CURRENT_USER,
  masterToday,
  nextMasterCode,
  loadMasterRecords,
  type MasterStatus,
} from "@/lib/masters/common";
import {
  SCHEME_CATEGORY_BEHAVIOUR,
  SCHEME_CONDITION_TYPE_BY_CATEGORY,
  SCHEME_CUSTOMER_OPTIONS,
  SCHEME_EFFECT_MAP,
  SCHEME_SEED,
  SCHEME_STORAGE_KEY,
  SCHEME_TYPE_DISPLAY_LABELS,
  categoryToSchemeType,
  schemeTypeToCategory,
  type CustomerType,
  type DiscountType,
  type SchemeApplyDiscountOn,
  type SchemeBenefitConfig,
  type SchemeBenefitThrough,
  type SchemeBenefitWhen,
  type SchemeCashCalculationOn,
  type SchemeCategory,
  type SchemeConditionConfig,
  type SchemeConfigSlab,
  type SchemePaymentCalculationOn,
  type SchemePaymentCondition,
  type SchemePaymentDaySlab,
  type SchemeProductDiscountRule,
  type SchemeRecord,
  type SchemeSpecialDiscountAmountSlab,
  type SchemeSpecialDiscountBasedOn,
  type SchemeSpecialDiscountQuantitySlab,
  type SchemeTurnoverCalculationOn,
  type SchemeTurnoverConfigSlab,
  type SchemeTurnoverPeriodUI,
  type SchemeType,
  type TurnoverPeriod,
  type TurnoverSlab,
  type ProductDiscountSchemeLine,
} from "./scheme-data";
import { loadSchemeProductSelectOptions } from "./product-discount-scheme";
import { loadProducts, normalizeProductUnit } from "../products/product-data";

// ─── Public option lists (business language) ─────────────────────────────────

export const DISCOUNT_TYPE_OPTIONS: DiscountType[] = ["Percentage", "Fixed Amount"];

export const PRODUCT_SCOPE_OPTIONS = ["All Products", "Selected Products"] as const;
export type ProductScopeUI = (typeof PRODUCT_SCOPE_OPTIONS)[number];

export const APPLY_DISCOUNT_ON_PRODUCT: SchemeApplyDiscountOn[] = [
  "Product Rate",
  "Product Line Amount",
];

export const APPLY_DISCOUNT_ON_SPECIAL: SchemeApplyDiscountOn[] = [
  "Product Rate",
  "Product Line Amount",
  "Invoice Taxable Value",
];

export const CASH_CALCULATION_ON_OPTIONS: SchemeCashCalculationOn[] = [
  "Invoice Taxable Value",
  "Invoice Total Value",
  "Outstanding Amount",
];

export const TURNOVER_PERIOD_OPTIONS: SchemeTurnoverPeriodUI[] = [
  "Monthly",
  "Quarterly",
  "Half-Yearly",
  "Yearly",
  "Scheme Validity Period",
];

export const TURNOVER_CALCULATION_ON_OPTIONS: SchemeTurnoverCalculationOn[] = [
  "Taxable Sales",
  "Net Sales After Returns",
];

export const PAYMENT_CONDITION_OPTIONS: SchemePaymentCondition[] = [
  "Full Payment",
  "Minimum Payment Percentage",
  "Payment Within Due Date",
];

export const PAYMENT_CALCULATION_ON_OPTIONS: SchemePaymentCalculationOn[] = [
  "Amount Received",
  "Invoice Value",
  "Outstanding Amount",
];

export const CUSTOMER_TYPE_OPTIONS: CustomerType[] = [
  "All",
  "Distributor",
  "Retailer",
  "Wholesaler",
  "Institutional",
];

/** Concrete types for multi-select (All = all of these selected). */
export const CUSTOMER_TYPE_MULTI_OPTIONS: Exclude<CustomerType, "All">[] = [
  "Distributor",
  "Retailer",
  "Wholesaler",
  "Institutional",
];

export type PaymentDaySlabForm = {
  id: string;
  fromDay: string;
  toDay: string;
  discountPercentage: string;
};

export type TurnoverSlabForm = {
  id: string;
  turnoverFrom: string;
  turnoverTo: string;
  discountPercentage: string;
};

/** Special Discount — Sales Amount vs Sales Quantity achievement. */
export type SpecialDiscountBasedOnUI = "Sales Amount" | "Sales Quantity";

export const SPECIAL_DISCOUNT_BASED_ON_OPTIONS: SpecialDiscountBasedOnUI[] = [
  "Sales Amount",
  "Sales Quantity",
];

export function specialDiscountBasedOnToStorage(
  ui: SpecialDiscountBasedOnUI,
): SchemeSpecialDiscountBasedOn {
  return ui === "Sales Quantity" ? "SALES_QUANTITY" : "SALES_AMOUNT";
}

export function specialDiscountBasedOnToUI(
  value?: SchemeSpecialDiscountBasedOn | string,
): SpecialDiscountBasedOnUI {
  return value === "SALES_QUANTITY" || value === "Sales Quantity"
    ? "Sales Quantity"
    : "Sales Amount";
}

export type SpecialDiscountAmountSlabForm = {
  id: string;
  eligibleSalesFrom: string;
  eligibleSalesTo: string;
  discountType: DiscountType;
  discountValue: string;
};

export type SpecialDiscountQuantitySlabForm = {
  id: string;
  quantityFrom: string;
  quantityTo: string;
  uom: string;
  discountType: DiscountType;
  discountValue: string;
};

/** Product Discount only — UI values for Discount Setup. */
export type ProductDiscountSetupMode = "COMMON" | "PRODUCT_WISE";

export type ProductDiscountRuleForm = {
  productId: string;
  discountType: DiscountType;
  discountValue: string;
  applyDiscountOn: SchemeApplyDiscountOn;
};

export type SchemeUnifiedForm = {
  schemeCategory: SchemeCategory;
  schemeName: string;
  description: string;
  startDate: string;
  endDate: string;
  status: MasterStatus;
  /** @deprecated Prefer customerTypes multi-select; kept in sync for legacy. */
  customerType: CustomerType;
  customerTypes: string[];
  customerIds: string[];
  stateNames: string[];
  productScope: ProductScopeUI;
  productIds: string[];
  /** Product Discount only — common vs product-wise. Ignored for other types. */
  discountMode: ProductDiscountSetupMode;
  /** Product Discount only — session-preserved product-wise rules (may outlive visible table). */
  productDiscountRules: ProductDiscountRuleForm[];
  discountType: DiscountType;
  discountValue: string;
  applyDiscountOn: SchemeApplyDiscountOn;
  expiryWithinDays: string;
  paymentDaySlabs: PaymentDaySlabForm[];
  cashCalculationOn: SchemeCashCalculationOn;
  turnoverPeriod: SchemeTurnoverPeriodUI;
  turnoverCalculationOn: SchemeTurnoverCalculationOn;
  turnoverSlabs: TurnoverSlabForm[];
  paymentCondition: SchemePaymentCondition;
  requiredPaymentPercentage: string;
  paymentCalculationOn: SchemePaymentCalculationOn;
  /** Special Discount only — achievement basis. */
  specialDiscountBasedOn: SpecialDiscountBasedOnUI;
  /** Special Discount only — amount achievement slabs (session-kept when switching). */
  specialDiscountAmountSlabs: SpecialDiscountAmountSlabForm[];
  /** Special Discount only — quantity achievement slabs (session-kept when switching). */
  specialDiscountQuantitySlabs: SpecialDiscountQuantitySlabForm[];
  /** Special Discount only — derived UOM (quantity mode). */
  specialDiscountUom: string;
  benefitThrough: SchemeBenefitThrough;
  benefitWhen: SchemeBenefitWhen;
  excludeFromTurnoverDiscount: boolean;
  excludeFromCashDiscount: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyProductDiscountRule(
  productId: string,
  defaults?: Partial<Pick<ProductDiscountRuleForm, "discountType" | "applyDiscountOn">>,
): ProductDiscountRuleForm {
  return {
    productId,
    discountType: defaults?.discountType ?? "Percentage",
    discountValue: "",
    applyDiscountOn: defaults?.applyDiscountOn ?? "Product Rate",
  };
}

/** Keep product-wise rows in sync with selected product IDs (order preserved). Blank new rows. */
export function syncProductDiscountRules(
  rules: ProductDiscountRuleForm[],
  productIds: string[],
): ProductDiscountRuleForm[] {
  const byId = new Map(rules.map((r) => [r.productId, r]));
  return productIds.map(
    (id) => byId.get(id) ?? emptyProductDiscountRule(id),
  );
}

export function productDiscountRuleHasEnteredData(rule: ProductDiscountRuleForm): boolean {
  return Boolean(rule.discountValue.trim());
}

/** Products that would lose entered discount data if removed from selection. */
export function productIdsWithDiscountData(
  rules: ProductDiscountRuleForm[],
  removingIds: string[],
): string[] {
  const byId = new Map(rules.map((r) => [r.productId, r]));
  return removingIds.filter((id) => {
    const rule = byId.get(id);
    return rule ? Boolean(rule.discountValue.trim()) : false;
  });
}

export function applyProductScopeForUnifiedForm(
  form: SchemeUnifiedForm,
  nextScope: ProductScopeUI,
): SchemeUnifiedForm {
  const productIds = nextScope === "All Products" ? [] : form.productIds;
  const isProductDiscount = form.schemeCategory === "Product Discount";
  if (!isProductDiscount) {
    return { ...form, productScope: nextScope, productIds };
  }
  // All Products forces common discount; product-wise rules stay in session but inactive.
  if (nextScope === "All Products") {
    return {
      ...form,
      productScope: nextScope,
      productIds: [],
      discountMode: "COMMON",
    };
  }
  return {
    ...form,
    productScope: nextScope,
    productIds,
    productDiscountRules: syncProductDiscountRules(
      form.productDiscountRules,
      productIds,
    ),
  };
}

export function applyDiscountSetupMode(
  form: SchemeUnifiedForm,
  mode: ProductDiscountSetupMode,
): SchemeUnifiedForm {
  if (form.schemeCategory !== "Product Discount") return form;
  if (form.productScope === "All Products" && mode === "PRODUCT_WISE") {
    return { ...form, discountMode: "COMMON" };
  }
  if (mode === "PRODUCT_WISE") {
    return {
      ...form,
      discountMode: mode,
      // Prefer blank product-wise values (do not copy common %). Keep existing row data.
      productDiscountRules: syncProductDiscountRules(
        form.productDiscountRules.map((r) =>
          r.discountValue.trim()
            ? r
            : emptyProductDiscountRule(r.productId, {
                discountType: "Percentage",
                applyDiscountOn: "Product Rate",
              }),
        ),
        form.productIds,
      ),
    };
  }
  return { ...form, discountMode: mode };
}

export function applySelectedProductIds(
  form: SchemeUnifiedForm,
  productIds: string[],
): SchemeUnifiedForm {
  if (form.schemeCategory !== "Product Discount") {
    return { ...form, productIds };
  }
  // Multi-select is only shown for Selected Products — keep that scope.
  return {
    ...form,
    productIds,
    productScope: "Selected Products",
    productDiscountRules: syncProductDiscountRules(
      form.productDiscountRules,
      productIds,
    ),
  };
}

function inferProductDiscountMode(record: SchemeRecord, condition: SchemeConditionConfig): ProductDiscountSetupMode {
  if (condition.discountMode === "PRODUCT_WISE" || condition.discountMode === "COMMON") {
    return condition.discountMode;
  }
  if (record.discountApplication === "per_product") return "PRODUCT_WISE";
  if (record.discountApplication === "same") return "COMMON";
  const rules = condition.productDiscountRules;
  if (rules && rules.length > 1) {
    const types = new Set(rules.map((r) => r.discountType));
    const values = new Set(rules.map((r) => r.discountValue));
    const applyOns = new Set(rules.map((r) => r.applyDiscountOn));
    if (types.size > 1 || values.size > 1 || applyOns.size > 1) return "PRODUCT_WISE";
  }
  const lines = record.schemeLines ?? [];
  if (lines.length > 1) {
    const types = new Set(lines.map((l) => l.discountType));
    const values = new Set(lines.map((l) => l.discountValue));
    if (types.size > 1 || values.size > 1) return "PRODUCT_WISE";
  }
  return "COMMON";
}

function productDiscountRulesFromRecord(
  record: SchemeRecord,
  condition: SchemeConditionConfig,
  productIds: string[],
): ProductDiscountRuleForm[] {
  if (condition.productDiscountRules?.length) {
    const byId = new Map(
      condition.productDiscountRules.map((r) => [
        r.productId,
        {
          productId: r.productId,
          discountType: r.discountType,
          discountValue: r.discountValue > 0 ? String(r.discountValue) : "",
          applyDiscountOn: r.applyDiscountOn,
        } satisfies ProductDiscountRuleForm,
      ]),
    );
    return syncProductDiscountRules([...byId.values()], productIds);
  }
  const lines = record.schemeLines ?? [];
  if (lines.length) {
    const byId = new Map(
      lines.map((l) => [
        l.productId,
        {
          productId: l.productId,
          discountType: l.discountType === "Fixed Amount" ? "Fixed Amount" : "Percentage",
          discountValue: l.discountValue > 0 ? String(l.discountValue) : "",
          applyDiscountOn: condition.applyDiscountOn ?? "Product Rate",
        } satisfies ProductDiscountRuleForm,
      ]),
    );
    return syncProductDiscountRules([...byId.values()], productIds);
  }
  return syncProductDiscountRules([], productIds);
}

export function emptyPaymentDaySlab(): PaymentDaySlabForm {
  return { id: newId("pay"), fromDay: "", toDay: "", discountPercentage: "" };
}

export function emptyTurnoverSlab(): TurnoverSlabForm {
  return { id: newId("to"), turnoverFrom: "", turnoverTo: "", discountPercentage: "" };
}

export function emptySpecialDiscountAmountSlab(): SpecialDiscountAmountSlabForm {
  return {
    id: newId("sda"),
    eligibleSalesFrom: "",
    eligibleSalesTo: "",
    discountType: "Percentage",
    discountValue: "",
  };
}

export function emptySpecialDiscountQuantitySlab(
  uom = "",
): SpecialDiscountQuantitySlabForm {
  return {
    id: newId("sdq"),
    quantityFrom: "",
    quantityTo: "",
    uom,
    discountType: "Percentage",
    discountValue: "",
  };
}

/** Derive shared UOM from selected products. Incompatible units → incompatible: true. */
export function resolveSpecialDiscountUom(productIds: string[]): {
  uom: string;
  incompatible: boolean;
} {
  if (!productIds.length) return { uom: "", incompatible: false };
  const byId = new Map(loadProducts().map((p) => [String(p.id), p]));
  const units: string[] = [];
  for (const id of productIds) {
    const product = byId.get(id);
    const raw = product?.baseUnit?.trim() ?? "";
    const unit = normalizeProductUnit(raw) || raw;
    if (!unit) return { uom: "", incompatible: true };
    units.push(unit);
  }
  const unique = [...new Set(units)];
  if (unique.length !== 1) return { uom: "", incompatible: true };
  return { uom: unique[0], incompatible: false };
}

/** Special Discount always has product applicability (All or Selected). */
export function specialDiscountUsesProducts(form: SchemeUnifiedForm): boolean {
  return form.schemeCategory === "Special Discount";
}

/** Whether Applicable To should show the products controls for this form. */
export function formShowsProductApplicability(form: SchemeUnifiedForm): boolean {
  return categoryUsesProducts(form.schemeCategory);
}

/** Switch Special Discount achievement basis; keeps inactive slabs in session only. */
export function applySpecialDiscountBasedOn(
  form: SchemeUnifiedForm,
  basedOn: SpecialDiscountBasedOnUI,
): SchemeUnifiedForm {
  if (form.schemeCategory !== "Special Discount") return form;
  if (basedOn === "Sales Quantity") {
    const { uom } = resolveSpecialDiscountUom(form.productIds);
    const quantitySlabs = (
      form.specialDiscountQuantitySlabs.length
        ? form.specialDiscountQuantitySlabs
        : [emptySpecialDiscountQuantitySlab(uom)]
    ).map((s) => ({ ...s, uom: uom || s.uom }));
    return {
      ...form,
      specialDiscountBasedOn: basedOn,
      productScope: "Selected Products",
      // Preserve already selected products where possible.
      productIds: form.productIds,
      specialDiscountUom: uom,
      specialDiscountQuantitySlabs: quantitySlabs,
    };
  }
  // Sales Amount: restore All/Selected dropdown; keep products if any were selected.
  return {
    ...form,
    specialDiscountBasedOn: basedOn,
    productScope: form.productIds.length > 0 ? "Selected Products" : "All Products",
    productIds: form.productIds,
    specialDiscountUom: "",
    specialDiscountAmountSlabs: form.specialDiscountAmountSlabs.length
      ? form.specialDiscountAmountSlabs
      : [emptySpecialDiscountAmountSlab()],
  };
}

/** Keep Special Discount product selection + derived UOM in sync. */
export function applySpecialDiscountProductIds(
  form: SchemeUnifiedForm,
  productIds: string[],
): SchemeUnifiedForm {
  const { uom } = resolveSpecialDiscountUom(productIds);
  const forceSelected =
    form.specialDiscountBasedOn === "Sales Quantity" ||
    form.productScope === "Selected Products";
  return {
    ...form,
    productIds,
    productScope: forceSelected ? "Selected Products" : form.productScope,
    specialDiscountUom:
      form.specialDiscountBasedOn === "Sales Quantity" ? uom : form.specialDiscountUom,
    specialDiscountQuantitySlabs: form.specialDiscountQuantitySlabs.map((s) => ({
      ...s,
      uom:
        form.specialDiscountBasedOn === "Sales Quantity" ? uom : s.uom,
    })),
  };
}

function parseNum(raw: string): number {
  const cleaned = raw.replace(/[₹,\s]/g, "");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

function parseOptionalNum(raw: string): number | null {
  if (!raw.trim()) return null;
  return parseNum(raw);
}

function parseWholeNumber(raw: string): number | null {
  if (!raw.trim()) return null;
  if (!/^-?\d+$/.test(raw.trim())) return null;
  return parseInt(raw.trim(), 10);
}

function parseStateNames(record: SchemeRecord): string[] {
  if (!record.stateName?.trim()) return [];
  return record.stateName
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function customerTypesFromRecord(record: SchemeRecord): string[] {
  if (record.customerTypes?.length) {
    return record.customerTypes.filter((t) => t !== "All");
  }
  if (!record.customerType || record.customerType === "All") {
    return [...CUSTOMER_TYPE_MULTI_OPTIONS];
  }
  return [record.customerType];
}

export function resolveCustomerTypeFromMulti(types: string[]): CustomerType {
  const selected = types.filter((t): t is Exclude<CustomerType, "All"> =>
    (CUSTOMER_TYPE_MULTI_OPTIONS as string[]).includes(t),
  );
  if (
    selected.length === 0 ||
    selected.length === CUSTOMER_TYPE_MULTI_OPTIONS.length
  ) {
    return "All";
  }
  if (selected.length === 1) return selected[0];
  // Legacy single field cannot express a subset — keep "All" and rely on customerTypes[].
  return "All";
}

/** Display label for record applicability (prefers multi-select). */
export function formatSchemeCustomerTypes(record: {
  customerType: CustomerType;
  customerTypes?: CustomerType[];
}): string {
  const multi = record.customerTypes?.filter((t) => t !== "All") ?? [];
  if (multi.length > 0) return multi.join(", ");
  return record.customerType || "All";
}

export function schemeTypeDisplayLabel(category: SchemeCategory): string {
  return SCHEME_TYPE_DISPLAY_LABELS[category];
}

export function categoryUsesProducts(category: SchemeCategory): boolean {
  return (
    category === "Product Discount" ||
    category === "Near Expiry Discount" ||
    category === "Turnover Discount" ||
    category === "Special Discount"
  );
}

/**
 * Persist / validate product scope for a category.
 * Special Discount always persists All/Selected scope (quantity forces SELECTED).
 */
export function categoryPersistsProducts(
  category: SchemeCategory,
  _form?: Pick<SchemeUnifiedForm, "specialDiscountBasedOn">,
): boolean {
  if (category === "Special Discount") return true;
  return categoryUsesProducts(category);
}

export function categoryShowsImpactFlags(category: SchemeCategory): boolean {
  return (
    category === "Product Discount" ||
    category === "Near Expiry Discount" ||
    category === "Special Discount" ||
    category === "Payment Discount"
  );
}

export type BenefitFieldMode = "fixed";

/** Automatic benefit settlement — never user-selectable. */
export function resolveAutomaticBenefit(
  category: SchemeCategory,
  opts?: {
    turnoverPeriod?: SchemeTurnoverPeriodUI;
    /** Near Expiry: keep Invoice Discount when already stored (e.g. approved legacy). */
    existingThrough?: SchemeBenefitThrough;
    existingWhen?: SchemeBenefitWhen;
    preserveNearExpiryInvoiceDiscount?: boolean;
  },
): { benefitThrough: SchemeBenefitThrough; benefitWhen: SchemeBenefitWhen } {
  switch (category) {
    case "Product Discount":
      return { benefitThrough: "Invoice Discount", benefitWhen: "During Invoice" };
    case "Cash Discount":
    case "Payment Discount":
      return { benefitThrough: "Credit Note", benefitWhen: "After Payment" };
    case "Turnover Discount": {
      const period = opts?.turnoverPeriod ?? "Quarterly";
      let benefitWhen: SchemeBenefitWhen = "End of Scheme Period";
      if (period === "Monthly") benefitWhen = "End of Month";
      else if (period === "Quarterly") benefitWhen = "End of Quarter";
      return { benefitThrough: "Credit Note", benefitWhen };
    }
    case "Special Discount":
      return { benefitThrough: "Credit Note", benefitWhen: "Manual Settlement" };
    case "Near Expiry Discount": {
      if (
        opts?.preserveNearExpiryInvoiceDiscount &&
        opts.existingThrough === "Invoice Discount"
      ) {
        return {
          benefitThrough: "Invoice Discount",
          benefitWhen: "During Invoice",
        };
      }
      return { benefitThrough: "Credit Note", benefitWhen: "End of Scheme Period" };
    }
  }
}

/** @deprecated Prefer resolveAutomaticBenefit — kept for call sites expecting options shape. */
export function benefitThroughOptions(category: SchemeCategory): {
  options: SchemeBenefitThrough[];
  mode: BenefitFieldMode;
  value: SchemeBenefitThrough;
} {
  const value = resolveAutomaticBenefit(category).benefitThrough;
  return { options: [value], mode: "fixed", value };
}

/** @deprecated Prefer resolveAutomaticBenefit — kept for call sites expecting options shape. */
export function benefitWhenOptions(
  category: SchemeCategory,
  turnoverPeriod?: SchemeTurnoverPeriodUI,
): {
  options: SchemeBenefitWhen[];
  mode: BenefitFieldMode;
  value: SchemeBenefitWhen;
} {
  const value = resolveAutomaticBenefit(category, { turnoverPeriod }).benefitWhen;
  return { options: [value], mode: "fixed", value };
}

function defaultBenefitForCategory(
  category: SchemeCategory,
  turnoverPeriod?: SchemeTurnoverPeriodUI,
): {
  benefitThrough: SchemeBenefitThrough;
  benefitWhen: SchemeBenefitWhen;
} {
  return resolveAutomaticBenefit(category, { turnoverPeriod });
}

function turnoverPeriodToLegacy(period: SchemeTurnoverPeriodUI): TurnoverPeriod {
  if (period === "Yearly") return "Annual";
  if (period === "Scheme Validity Period") return "Custom";
  return period;
}

function legacyToTurnoverPeriod(period?: TurnoverPeriod | string): SchemeTurnoverPeriodUI {
  if (period === "Annual") return "Yearly";
  if (period === "Custom") return "Scheme Validity Period";
  if (
    period === "Monthly" ||
    period === "Quarterly" ||
    period === "Half-Yearly" ||
    period === "Yearly" ||
    period === "Scheme Validity Period"
  ) {
    return period;
  }
  return "Quarterly";
}

export function createDefaultUnifiedForm(
  category: SchemeCategory = "Product Discount",
): SchemeUnifiedForm {
  const turnoverPeriod: SchemeTurnoverPeriodUI = "Yearly";
  const benefit = defaultBenefitForCategory(category, turnoverPeriod);
  return {
    schemeCategory: category,
    schemeName: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "inactive",
    customerType: "All",
    customerTypes: [],
    customerIds: [],
    stateNames: [],
    productScope: "All Products",
    productIds: [],
    discountMode: "COMMON",
    productDiscountRules: [],
    discountType: "Percentage",
    discountValue: "",
    applyDiscountOn: "Product Rate",
    expiryWithinDays: "",
    paymentDaySlabs: [emptyPaymentDaySlab()],
    cashCalculationOn: "Invoice Taxable Value",
    turnoverPeriod,
    turnoverCalculationOn: "Net Sales After Returns",
    turnoverSlabs: [emptyTurnoverSlab()],
    paymentCondition: "Full Payment",
    requiredPaymentPercentage: "",
    paymentCalculationOn: "Amount Received",
    specialDiscountBasedOn: "Sales Amount",
    specialDiscountAmountSlabs: [emptySpecialDiscountAmountSlab()],
    specialDiscountQuantitySlabs: [emptySpecialDiscountQuantitySlab()],
    specialDiscountUom: "",
    benefitThrough: benefit.benefitThrough,
    benefitWhen: benefit.benefitWhen,
    excludeFromTurnoverDiscount: false,
    excludeFromCashDiscount: false,
  };
}

/** Reset type-specific defaults when Scheme Type changes; keep shared basics. */
export function applySchemeTypeChange(
  form: SchemeUnifiedForm,
  category: SchemeCategory,
): SchemeUnifiedForm {
  const next = createDefaultUnifiedForm(category);
  return {
    ...next,
    schemeName: form.schemeName,
    description: form.description,
    startDate: form.startDate,
    endDate: form.endDate,
    status: form.status,
    customerType: form.customerType,
    customerTypes: form.customerTypes,
    customerIds: form.customerIds,
    stateNames: form.stateNames,
    productScope:
      category === "Special Discount" ? "All Products" : form.productScope,
    productIds:
      category === "Special Discount"
        ? []
        : categoryUsesProducts(category)
          ? form.productIds
          : [],
    discountMode: "COMMON",
    productDiscountRules: [],
    excludeFromTurnoverDiscount: categoryShowsImpactFlags(category)
      ? form.excludeFromTurnoverDiscount
      : false,
    excludeFromCashDiscount: categoryShowsImpactFlags(category)
      ? form.excludeFromCashDiscount
      : false,
  };
}

// ─── Record ↔ form mapping ───────────────────────────────────────────────────

function paymentSlabsToForm(slabs?: SchemePaymentDaySlab[]): PaymentDaySlabForm[] {
  if (!slabs?.length) return [emptyPaymentDaySlab()];
  return slabs.map((s) => ({
    id: s.id || newId("pay"),
    fromDay: String(s.fromDay ?? ""),
    toDay: String(s.toDay ?? ""),
    discountPercentage: String(s.discountPercentage ?? ""),
  }));
}

function turnoverSlabsToForm(slabs?: SchemeTurnoverConfigSlab[]): TurnoverSlabForm[] {
  if (!slabs?.length) return [emptyTurnoverSlab()];
  return slabs.map((s) => ({
    id: s.id || newId("to"),
    turnoverFrom: String(s.turnoverFrom ?? ""),
    turnoverTo: s.turnoverTo == null ? "" : String(s.turnoverTo),
    discountPercentage: String(s.discountPercentage ?? ""),
  }));
}

function formPaymentSlabsToConfig(slabs: PaymentDaySlabForm[]): SchemePaymentDaySlab[] {
  return slabs
    .filter(
      (s) =>
        s.fromDay.trim() !== "" ||
        s.toDay.trim() !== "" ||
        s.discountPercentage.trim() !== "",
    )
    .map((s) => ({
      id: s.id || newId("pay"),
      fromDay: parseNum(s.fromDay),
      toDay: parseNum(s.toDay),
      discountPercentage: parseNum(s.discountPercentage),
    }));
}

function formTurnoverSlabsToConfig(slabs: TurnoverSlabForm[]): SchemeTurnoverConfigSlab[] {
  return slabs
    .filter(
      (s) =>
        s.turnoverFrom.trim() !== "" ||
        s.discountPercentage.trim() !== "" ||
        s.turnoverTo.trim() !== "",
    )
    .map((s) => ({
      id: s.id || newId("to"),
      turnoverFrom: parseNum(s.turnoverFrom),
      turnoverTo: parseOptionalNum(s.turnoverTo),
      discountPercentage: parseNum(s.discountPercentage),
    }));
}

function specialAmountSlabsToForm(
  slabs?: SchemeSpecialDiscountAmountSlab[],
): SpecialDiscountAmountSlabForm[] {
  if (!slabs?.length) return [emptySpecialDiscountAmountSlab()];
  return slabs.map((s) => ({
    id: s.id || newId("sda"),
    eligibleSalesFrom: String(s.eligibleSalesFrom ?? ""),
    eligibleSalesTo: s.eligibleSalesTo == null ? "" : String(s.eligibleSalesTo),
    discountType: s.discountType === "Fixed Amount" ? "Fixed Amount" : "Percentage",
    discountValue: String(s.discountValue ?? ""),
  }));
}

function specialQuantitySlabsToForm(
  slabs?: SchemeSpecialDiscountQuantitySlab[],
  fallbackUom = "",
): SpecialDiscountQuantitySlabForm[] {
  if (!slabs?.length) return [emptySpecialDiscountQuantitySlab(fallbackUom)];
  return slabs.map((s) => ({
    id: s.id || newId("sdq"),
    quantityFrom: String(s.quantityFrom ?? ""),
    quantityTo: s.quantityTo == null ? "" : String(s.quantityTo),
    uom: s.uom || fallbackUom,
    discountType: s.discountType === "Fixed Amount" ? "Fixed Amount" : "Percentage",
    discountValue: String(s.discountValue ?? ""),
  }));
}

function formSpecialAmountSlabsToConfig(
  slabs: SpecialDiscountAmountSlabForm[],
): SchemeSpecialDiscountAmountSlab[] {
  return slabs
    .filter(
      (s) =>
        s.eligibleSalesFrom.trim() !== "" ||
        s.eligibleSalesTo.trim() !== "" ||
        s.discountValue.trim() !== "",
    )
    .map((s) => ({
      id: s.id || newId("sda"),
      eligibleSalesFrom: parseNum(s.eligibleSalesFrom),
      eligibleSalesTo: parseOptionalNum(s.eligibleSalesTo),
      discountType: s.discountType,
      discountValue: parseNum(s.discountValue),
    }));
}

function formSpecialQuantitySlabsToConfig(
  slabs: SpecialDiscountQuantitySlabForm[],
  uom: string,
): SchemeSpecialDiscountQuantitySlab[] {
  return slabs
    .filter(
      (s) =>
        s.quantityFrom.trim() !== "" ||
        s.quantityTo.trim() !== "" ||
        s.discountValue.trim() !== "",
    )
    .map((s) => ({
      id: s.id || newId("sdq"),
      quantityFrom: parseNum(s.quantityFrom),
      quantityTo: parseOptionalNum(s.quantityTo),
      uom: uom || s.uom,
      discountType: s.discountType,
      discountValue: parseNum(s.discountValue),
    }));
}

/** Migrate legacy flat Special Discount (discountType/value) into one amount slab. */
function legacySpecialDiscountAmountSlabs(
  existing: SchemeConditionConfig,
  record: SchemeRecord,
): SchemeSpecialDiscountAmountSlab[] | undefined {
  if (existing.specialDiscountAmountSlabs?.length) {
    return existing.specialDiscountAmountSlabs;
  }
  const discountType: DiscountType =
    existing.discountType ??
    (record.discountType === "Fixed Amount" ? "Fixed Amount" : "Percentage");
  const discountValue =
    existing.discountValue ??
    record.discountValue ??
    record.configSlabs?.[0]?.discountValue ??
    0;
  if (discountValue > 0) {
    return [
      {
        id: "legacy-sd-0",
        eligibleSalesFrom: 0,
        eligibleSalesTo: null,
        discountType,
        discountValue,
      },
    ];
  }
  // Prefer configSlabs if they look like achievement ranges
  if (record.configSlabs?.length) {
    return record.configSlabs.map((s, i) => ({
      id: s.id || `legacy-sd-${i}`,
      eligibleSalesFrom: s.fromValue,
      eligibleSalesTo: s.toValue,
      discountType:
        s.discountType === "Fixed Amount" ? "Fixed Amount" : "Percentage",
      discountValue: s.discountValue,
    }));
  }
  return undefined;
}

function configSlabsAsPaymentDays(slabs?: SchemeConfigSlab[]): SchemePaymentDaySlab[] | undefined {
  if (!slabs?.length) return undefined;
  return slabs.map((s, i) => ({
    id: s.id || `legacy-pay-${i}`,
    fromDay: s.fromValue,
    toDay: s.toValue ?? s.fromValue,
    discountPercentage:
      s.discountType === "Percentage" ? s.discountValue : s.discountValue,
  }));
}

function configSlabsAsTurnover(
  slabs?: SchemeConfigSlab[],
): SchemeTurnoverConfigSlab[] | undefined {
  if (!slabs?.length) return undefined;
  return slabs.map((s, i) => ({
    id: s.id || `legacy-to-${i}`,
    turnoverFrom: s.fromValue,
    turnoverTo: s.toValue,
    discountPercentage:
      s.discountType === "Percentage" ? s.discountValue : s.discountValue,
  }));
}

function legacyTurnoverToConfig(
  slabs?: TurnoverSlab[],
): SchemeTurnoverConfigSlab[] | undefined {
  if (!slabs?.length) return undefined;
  return slabs.map((s, i) => ({
    id: `legacy-turnover-${i}`,
    turnoverFrom: s.fromTurnover,
    turnoverTo: s.toTurnover,
    discountPercentage: s.benefitPercent,
  }));
}

function resolveConditionConfig(record: SchemeRecord): SchemeConditionConfig {
  const category =
    record.schemeCategory ??
    schemeTypeToCategory(record.schemeType) ??
    "Special Discount";
  const existing = record.conditionConfig ?? {};

  const productIds =
    existing.productIds ??
    record.selectedProductIds ??
    (record.schemeLines?.length
      ? record.schemeLines.map((l) => l.productId)
      : undefined) ??
    (record.nearExpiryLines?.length
      ? [...new Set(record.nearExpiryLines.map((l) => l.productId))]
      : undefined) ??
    (record.productId ? [record.productId] : []);

  const productScope: "ALL" | "SELECTED" =
    existing.productScope ??
    (record.productScopeMode === "Specific Products" ||
    record.productScope === "Specific" ||
    productIds.length > 0
      ? "SELECTED"
      : "ALL");

  const discountType: DiscountType =
    existing.discountType ??
    (record.discountType === "Fixed Amount"
      ? "Fixed Amount"
      : record.schemeLines?.[0]?.discountType === "Fixed Amount"
        ? "Fixed Amount"
        : record.nearExpiryLines?.[0]?.benefitType === "Fixed Amount"
          ? "Fixed Amount"
          : "Percentage");

  const discountValue =
    existing.discountValue ??
    record.discountValue ??
    record.schemeLines?.[0]?.discountValue ??
    record.nearExpiryLines?.[0]?.benefitValue ??
    record.configSlabs?.[0]?.discountValue ??
    0;

  const base: SchemeConditionConfig = {
    ...existing,
    productScope,
    productIds,
    discountType,
    discountValue,
  };

  switch (category) {
    case "Product Discount":
      return {
        ...base,
        applyDiscountOn: existing.applyDiscountOn ?? "Product Rate",
      };
    case "Near Expiry Discount":
      return {
        ...base,
        expiryWithinDays:
          existing.expiryWithinDays ??
          record.expiryWithinDays ??
          record.nearExpiryLines?.[0]?.expiryWithinDays ??
          0,
      };
    case "Cash Discount": {
      const paymentDaySlabs =
        existing.paymentDaySlabs ??
        configSlabsAsPaymentDays(record.configSlabs) ??
        (record.paymentWithinDays != null && record.paymentWithinDays > 0
          ? [
              {
                id: "legacy-pay-0",
                fromDay: 0,
                toDay: record.paymentWithinDays,
                discountPercentage: record.discountValue ?? 0,
              },
            ]
          : undefined);
      return {
        ...base,
        paymentDaySlabs,
        cashCalculationOn: existing.cashCalculationOn ?? "Invoice Taxable Value",
      };
    }
    case "Turnover Discount": {
      const turnoverSlabs =
        existing.turnoverSlabs ??
        legacyTurnoverToConfig(record.turnoverSlabs) ??
        configSlabsAsTurnover(record.configSlabs);
      return {
        ...base,
        turnoverPeriod:
          existing.turnoverPeriod ?? legacyToTurnoverPeriod(record.turnoverPeriod),
        turnoverCalculationOn:
          existing.turnoverCalculationOn ?? "Net Sales After Returns",
        turnoverSlabs,
      };
    }
    case "Payment Discount":
      return {
        ...base,
        paymentCondition: existing.paymentCondition ?? "Full Payment",
        requiredPaymentPercentage: existing.requiredPaymentPercentage,
        paymentCalculationOn: existing.paymentCalculationOn ?? "Amount Received",
      };
    case "Special Discount": {
      const basedOn =
        existing.specialDiscountBasedOn ??
        (existing.specialDiscountQuantitySlabs?.length
          ? "SALES_QUANTITY"
          : "SALES_AMOUNT");
      if (basedOn === "SALES_QUANTITY") {
        const productIdsForUom = productIds.length
          ? productIds
          : existing.productIds ?? [];
        const { uom } = resolveSpecialDiscountUom(productIdsForUom);
        return {
          ...base,
          productScope: "SELECTED",
          productIds: productIdsForUom,
          specialDiscountBasedOn: "SALES_QUANTITY",
          specialDiscountQuantitySlabs:
            existing.specialDiscountQuantitySlabs ?? undefined,
          specialDiscountUom: existing.specialDiscountUom || uom || undefined,
          specialDiscountAmountSlabs: undefined,
          applyDiscountOn: undefined,
        };
      }
      // Sales Amount — restore All / Selected product applicability.
      const amountScope: "ALL" | "SELECTED" =
        existing.productScope === "SELECTED" ||
        productScope === "SELECTED" ||
        (existing.productIds?.length ?? 0) > 0 ||
        productIds.length > 0
          ? "SELECTED"
          : "ALL";
      const amountProductIds =
        amountScope === "SELECTED"
          ? productIds.length
            ? productIds
            : existing.productIds ?? []
          : [];
      return {
        ...base,
        productScope: amountScope,
        productIds: amountProductIds,
        specialDiscountBasedOn: "SALES_AMOUNT",
        specialDiscountAmountSlabs: legacySpecialDiscountAmountSlabs(
          existing,
          record,
        ),
        specialDiscountQuantitySlabs: undefined,
        specialDiscountUom: undefined,
        applyDiscountOn: undefined,
      };
    }
  }
}

function resolveBenefitConfig(
  record: SchemeRecord,
  category: SchemeCategory,
): SchemeBenefitConfig {
  const existing = record.benefitConfig ?? {};
  const turnoverPeriod =
    record.conditionConfig?.turnoverPeriod ??
    legacyToTurnoverPeriod(record.turnoverPeriod);

  const preserveNearExpiryInvoiceDiscount =
    category === "Near Expiry Discount" &&
    existing.benefitThrough === "Invoice Discount";

  const auto = resolveAutomaticBenefit(category, {
    turnoverPeriod,
    existingThrough: existing.benefitThrough,
    existingWhen: existing.benefitWhen,
    preserveNearExpiryInvoiceDiscount,
  });

  const benefitType: DiscountType =
    existing.benefitType ??
    (record.discountType === "Fixed Amount" ? "Fixed Amount" : "Percentage");

  return {
    benefitType,
    benefitValue: existing.benefitValue ?? record.discountValue,
    benefitThrough: auto.benefitThrough,
    benefitWhen: auto.benefitWhen,
  };
}

export function enrichSchemeUnifiedConfig(record: SchemeRecord): SchemeRecord {
  const category =
    record.schemeCategory ??
    schemeTypeToCategory(record.schemeType) ??
    "Special Discount";
  const behaviour = SCHEME_CATEGORY_BEHAVIOUR[category];
  const effect =
    SCHEME_EFFECT_MAP[categoryToSchemeType(category)] ??
    SCHEME_EFFECT_MAP[record.schemeType];
  const conditionType =
    record.conditionType ?? SCHEME_CONDITION_TYPE_BY_CATEGORY[category];
  const conditionConfig = resolveConditionConfig(record);
  const benefitConfig = resolveBenefitConfig(record, category);

  return {
    ...record,
    schemeCategory: category,
    conditionType,
    conditionConfig,
    benefitConfig,
    calculationBasis: record.calculationBasis ?? behaviour.defaultCalculationBasis,
    settlementBehaviour: behaviour.settlementBehaviour,
    triggerEvent: record.triggerEvent ?? behaviour.triggerEvent,
    productScopeMode:
      record.productScopeMode ??
      (conditionConfig.productScope === "SELECTED" ? "Specific Products" : "All"),
    excludeStockTransferSampleOrder: behaviour.appliesInstantlyOnInvoice,
    deductFromTurnoverBase: record.deductFromTurnoverBase ?? false,
    deductFromCashDiscountBase: record.deductFromCashDiscountBase ?? false,
    effectType: effect.effectType,
    appliedIn: effect.appliedIn,
    settlementMethod: effect.settlementMethod,
    selectionRuleNote:
      record.selectionRuleNote ??
      "Only one eligible scheme may be selected per Sales Order. Ineligible schemes cannot be forced.",
  };
}

export function schemeRecordToUnifiedForm(record: SchemeRecord): SchemeUnifiedForm {
  const enriched = enrichSchemeUnifiedConfig(record);
  const category =
    enriched.schemeCategory ??
    schemeTypeToCategory(enriched.schemeType) ??
    "Product Discount";
  const condition = enriched.conditionConfig ?? {};
  const benefit = enriched.benefitConfig ?? defaultBenefitForCategory(category);
  const defaults = createDefaultUnifiedForm(category);

  const productScope: ProductScopeUI =
    condition.productScope === "SELECTED" ||
    enriched.productScopeMode === "Specific Products" ||
    enriched.productScope === "Specific"
      ? "Selected Products"
      : "All Products";

  const productIds =
    productScope === "Selected Products"
      ? condition.productIds ??
        enriched.selectedProductIds ??
        (enriched.productId ? [enriched.productId] : [])
      : [];

  const discountMode =
    category === "Product Discount"
      ? inferProductDiscountMode(enriched, condition)
      : "COMMON";

  return {
    ...defaults,
    schemeCategory: category,
    schemeName: enriched.schemeName ?? "",
    description: enriched.description ?? "",
    startDate: enriched.startDate ?? "",
    endDate: enriched.endDate ?? "",
    status: enriched.status ?? "inactive",
    customerType: enriched.customerType ?? "All",
    customerTypes: customerTypesFromRecord(enriched),
    customerIds: enriched.customerIds ?? [],
    stateNames: parseStateNames(enriched),
    productScope,
    productIds,
    discountMode: productScope === "All Products" ? "COMMON" : discountMode,
    productDiscountRules:
      category === "Product Discount"
        ? productDiscountRulesFromRecord(enriched, condition, productIds)
        : [],
    discountType: condition.discountType ?? "Percentage",
    discountValue:
      condition.discountValue != null && condition.discountValue > 0
        ? String(condition.discountValue)
        : enriched.discountValue != null && enriched.discountValue > 0
          ? String(enriched.discountValue)
          : "",
    applyDiscountOn: condition.applyDiscountOn ?? defaults.applyDiscountOn,
    expiryWithinDays:
      condition.expiryWithinDays != null && condition.expiryWithinDays > 0
        ? String(condition.expiryWithinDays)
        : enriched.expiryWithinDays != null && enriched.expiryWithinDays > 0
          ? String(enriched.expiryWithinDays)
          : "",
    paymentDaySlabs: paymentSlabsToForm(condition.paymentDaySlabs),
    cashCalculationOn: condition.cashCalculationOn ?? "Invoice Taxable Value",
    turnoverPeriod: condition.turnoverPeriod ?? legacyToTurnoverPeriod(enriched.turnoverPeriod),
    turnoverCalculationOn:
      condition.turnoverCalculationOn ?? "Net Sales After Returns",
    turnoverSlabs: turnoverSlabsToForm(
      condition.turnoverSlabs ?? legacyTurnoverToConfig(enriched.turnoverSlabs),
    ),
    paymentCondition: condition.paymentCondition ?? "Full Payment",
    requiredPaymentPercentage:
      condition.requiredPaymentPercentage != null &&
      condition.requiredPaymentPercentage > 0
        ? String(condition.requiredPaymentPercentage)
        : "",
    paymentCalculationOn: condition.paymentCalculationOn ?? "Amount Received",
    specialDiscountBasedOn: specialDiscountBasedOnToUI(
      condition.specialDiscountBasedOn,
    ),
    specialDiscountAmountSlabs: specialAmountSlabsToForm(
      condition.specialDiscountAmountSlabs,
    ),
    specialDiscountQuantitySlabs: (() => {
      const basedOn = specialDiscountBasedOnToUI(condition.specialDiscountBasedOn);
      const ids =
        basedOn === "Sales Quantity" ? productIds : condition.productIds ?? [];
      const { uom } = resolveSpecialDiscountUom(ids);
      return specialQuantitySlabsToForm(
        condition.specialDiscountQuantitySlabs,
        condition.specialDiscountUom || uom,
      );
    })(),
    specialDiscountUom: (() => {
      if (
        specialDiscountBasedOnToUI(condition.specialDiscountBasedOn) !==
        "Sales Quantity"
      ) {
        return "";
      }
      const { uom } = resolveSpecialDiscountUom(productIds);
      return condition.specialDiscountUom || uom || "";
    })(),
    benefitThrough: benefit.benefitThrough ?? defaults.benefitThrough,
    benefitWhen: benefit.benefitWhen ?? defaults.benefitWhen,
    excludeFromTurnoverDiscount: enriched.deductFromTurnoverBase ?? false,
    excludeFromCashDiscount: enriched.deductFromCashDiscountBase ?? false,
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validatePaymentDaySlabs(slabs: PaymentDaySlabForm[]): string | null {
  const parsed = formPaymentSlabsToConfig(slabs);
  if (!parsed.length) return "Add at least one Payment Day Slab";

  for (let i = 0; i < slabs.length; i++) {
    const raw = slabs[i];
    if (
      !raw.fromDay.trim() &&
      !raw.toDay.trim() &&
      !raw.discountPercentage.trim()
    ) {
      continue;
    }
    const from = parseWholeNumber(raw.fromDay);
    const to = parseWholeNumber(raw.toDay);
    if (from == null || to == null) {
      return `Payment Day Slab ${i + 1}: From Day and To Day must be whole numbers`;
    }
    if (from < 0) return `Payment Day Slab ${i + 1}: From Day cannot be negative`;
    if (to <= from) {
      return `Payment Day Slab ${i + 1}: To Day must be greater than From Day`;
    }
    const pct = parseNum(raw.discountPercentage);
    if (pct <= 0 || pct > 100) {
      return `Payment Day Slab ${i + 1}: Discount Percentage must be greater than 0 and no more than 100`;
    }
  }

  const sorted = [...parsed].sort((a, b) => a.fromDay - b.fromDay);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (a.fromDay <= b.toDay && b.fromDay <= a.toDay) {
        return "Payment Day Slabs must not overlap";
      }
    }
  }
  return null;
}

function validateTurnoverSlabs(slabs: TurnoverSlabForm[]): string | null {
  const filled = slabs.filter(
    (s) =>
      s.turnoverFrom.trim() !== "" ||
      s.discountPercentage.trim() !== "" ||
      s.turnoverTo.trim() !== "",
  );
  if (!filled.length) return "Add at least one Turnover Slab";

  const parsed: { from: number; to: number | null; pct: number; idx: number }[] = [];

  for (let i = 0; i < slabs.length; i++) {
    const raw = slabs[i];
    if (
      !raw.turnoverFrom.trim() &&
      !raw.turnoverTo.trim() &&
      !raw.discountPercentage.trim()
    ) {
      continue;
    }
    const from = parseNum(raw.turnoverFrom);
    const to = parseOptionalNum(raw.turnoverTo);
    const pct = parseNum(raw.discountPercentage);
    if (from < 0) return `Turnover Slab ${i + 1}: From Amount cannot be negative`;
    if (to != null && to < 0) {
      return `Turnover Slab ${i + 1}: To Amount cannot be negative`;
    }
    if (to != null && to <= from) {
      return `Turnover Slab ${i + 1}: To Amount must be greater than From Amount`;
    }
    if (pct <= 0 || pct > 100) {
      return `Turnover Slab ${i + 1}: Discount Percentage must be greater than 0 and no more than 100`;
    }
    parsed.push({ from, to, pct, idx: i });
  }

  const sorted = [...parsed].sort((a, b) => a.from - b.from);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].from < sorted[i - 1].from) {
      return "Turnover Slabs must be in ascending order";
    }
  }
  // Check form order matches ascending
  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i].from < parsed[i - 1].from) {
      return "Turnover Slabs must be in ascending order";
    }
  }

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      const aTo = a.to ?? Number.POSITIVE_INFINITY;
      const bTo = b.to ?? Number.POSITIVE_INFINITY;
      if (a.from < bTo && b.from < aTo) {
        return "Turnover Slabs must not overlap";
      }
    }
  }

    // Only the final slab may have blank To (Above)
  for (let i = 0; i < parsed.length - 1; i++) {
    if (parsed[i].to == null) {
      return 'Only the final Turnover Slab may leave "To" blank (Above)';
    }
  }

  return null;
}

function validateSpecialDiscountAmountSlabs(
  slabs: SpecialDiscountAmountSlabForm[],
): string | null {
  const filled = slabs.filter(
    (s) =>
      s.eligibleSalesFrom.trim() !== "" ||
      s.eligibleSalesTo.trim() !== "" ||
      s.discountValue.trim() !== "",
  );
  if (!filled.length) return "Add at least one Achievement Slab";

  const parsed: {
    from: number;
    to: number | null;
    idx: number;
  }[] = [];

  for (let i = 0; i < slabs.length; i++) {
    const raw = slabs[i];
    if (
      !raw.eligibleSalesFrom.trim() &&
      !raw.eligibleSalesTo.trim() &&
      !raw.discountValue.trim()
    ) {
      continue;
    }
    const from = parseNum(raw.eligibleSalesFrom);
    const to = parseOptionalNum(raw.eligibleSalesTo);
    if (from < 0) {
      return `Achievement Slab ${i + 1}: Eligible Sales From cannot be negative`;
    }
    if (to != null && to < 0) {
      return `Achievement Slab ${i + 1}: Eligible Sales To cannot be negative`;
    }
    if (to != null && to <= from) {
      return `Achievement Slab ${i + 1}: Eligible Sales To must be greater than From`;
    }
    const discErr = validateDiscountValue(
      raw.discountType,
      raw.discountValue,
      "Discount",
    );
    if (discErr) {
      if (raw.discountType === "Percentage" && parseNum(raw.discountValue) > 100) {
        return `Achievement Slab ${i + 1}: Discount percentage cannot exceed 100`;
      }
      return `Achievement Slab ${i + 1}: ${discErr}`;
    }
    parsed.push({ from, to, idx: i });
  }

  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i].from < parsed[i - 1].from) {
      return "Achievement Slabs must be in ascending order";
    }
  }

  const sorted = [...parsed].sort((a, b) => a.from - b.from);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      const aTo = a.to ?? Number.POSITIVE_INFINITY;
      const bTo = b.to ?? Number.POSITIVE_INFINITY;
      if (a.from < bTo && b.from < aTo) {
        return "Achievement Slabs must not overlap";
      }
    }
  }

  for (let i = 0; i < parsed.length - 1; i++) {
    if (parsed[i].to == null) {
      return 'Only the final Achievement Slab may leave "To" blank (Above)';
    }
  }

  return null;
}

function validateSpecialDiscountQuantitySlabs(
  slabs: SpecialDiscountQuantitySlabForm[],
): string | null {
  const filled = slabs.filter(
    (s) =>
      s.quantityFrom.trim() !== "" ||
      s.quantityTo.trim() !== "" ||
      s.discountValue.trim() !== "",
  );
  if (!filled.length) return "Add at least one Achievement Slab";

  const parsed: {
    from: number;
    to: number | null;
    idx: number;
  }[] = [];

  for (let i = 0; i < slabs.length; i++) {
    const raw = slabs[i];
    if (
      !raw.quantityFrom.trim() &&
      !raw.quantityTo.trim() &&
      !raw.discountValue.trim()
    ) {
      continue;
    }
    const from = parseNum(raw.quantityFrom);
    const to = parseOptionalNum(raw.quantityTo);
    if (from < 0) {
      return `Achievement Slab ${i + 1}: Quantity From cannot be negative`;
    }
    if (to == null) {
      // Above allowed for last slab only — checked below
    } else if (to <= from) {
      return `Achievement Slab ${i + 1}: Quantity To must be greater than Quantity From`;
    }
    const discErr = validateDiscountValue(
      raw.discountType,
      raw.discountValue,
      "Discount",
    );
    if (discErr) {
      if (raw.discountType === "Percentage" && parseNum(raw.discountValue) > 100) {
        return `Achievement Slab ${i + 1}: Discount percentage cannot exceed 100`;
      }
      return `Achievement Slab ${i + 1}: ${discErr}`;
    }
    parsed.push({ from, to, idx: i });
  }

  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i].from < parsed[i - 1].from) {
      return "Achievement Slabs must be in ascending order";
    }
  }

  const sorted = [...parsed].sort((a, b) => a.from - b.from);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      const aTo = a.to ?? Number.POSITIVE_INFINITY;
      const bTo = b.to ?? Number.POSITIVE_INFINITY;
      if (a.from < bTo && b.from < aTo) {
        return "Achievement Slabs must not overlap";
      }
    }
  }

  for (let i = 0; i < parsed.length - 1; i++) {
    if (parsed[i].to == null) {
      return 'Only the final Achievement Slab may leave "To" blank (Above)';
    }
  }

  return null;
}

function validateDiscountValue(
  type: DiscountType,
  raw: string,
  label = "Discount Value",
): string | null {
  const value = parseNum(raw);
  if (value <= 0) return `${label} must be greater than 0`;
  if (type === "Percentage" && value > 100) {
    return `${label} percentage must be no more than 100`;
  }
  return null;
}

export function validateUnifiedSchemeForm(form: SchemeUnifiedForm): string | null {
  if (!form.schemeName.trim()) return "Scheme Name is required";
  if (!form.startDate) return "Valid From is required";
  if (!form.endDate) return "Valid To is required";
  if (form.endDate < form.startDate) return "Valid To must be on or after Valid From";
  if (!form.stateNames.length) return "Select at least one State";
  if (!form.customerTypes.length) return "Select at least one Customer Type";

  const category = form.schemeCategory;

  if (formShowsProductApplicability(form)) {
    if (form.schemeCategory === "Special Discount") {
      if (form.specialDiscountBasedOn === "Sales Quantity") {
        if (!form.productIds.length) {
          return "Select at least one product.";
        }
        const { incompatible, uom } = resolveSpecialDiscountUom(form.productIds);
        if (incompatible || !uom) {
          return "Selected products must use the same unit of measurement for a quantity-based scheme.";
        }
      } else if (
        form.productScope === "Selected Products" &&
        form.productIds.length === 0
      ) {
        return "Select at least one product.";
      }
    } else if (
      categoryUsesProducts(category) &&
      category !== "Near Expiry Discount"
    ) {
      if (form.productScope === "Selected Products" && form.productIds.length === 0) {
        return "Select at least one product.";
      }
    }
  }

  switch (category) {
    case "Product Discount": {
      if (form.discountMode === "PRODUCT_WISE") {
        if (form.productScope !== "Selected Products" || !form.productIds.length) {
          return "Select at least one product.";
        }
        const rules = syncProductDiscountRules(
          form.productDiscountRules,
          form.productIds,
        );
        const nameById = new Map(
          loadSchemeProductSelectOptions().map((o) => [
            o.value,
            o.productName || o.label,
          ]),
        );
        for (const rule of rules) {
          const productLabel = nameById.get(rule.productId) ?? "product";
          if (!rule.discountType) {
            return `Enter discount for ${productLabel}.`;
          }
          if (!rule.applyDiscountOn) {
            return "Select where the discount should be applied.";
          }
          if (!rule.discountValue.trim()) {
            return `Enter discount for ${productLabel}.`;
          }
          const err = validateDiscountValue(
            rule.discountType,
            rule.discountValue,
            "Discount",
          );
          if (err) {
            if (rule.discountType === "Percentage" && parseNum(rule.discountValue) > 100) {
              return "Discount percentage cannot exceed 100.";
            }
            return `Enter discount for ${productLabel}.`;
          }
        }
        break;
      }
      if (!form.applyDiscountOn) {
        return "Select where the discount should be applied.";
      }
      const err = validateDiscountValue(form.discountType, form.discountValue);
      if (err) {
        if (form.discountType === "Percentage" && parseNum(form.discountValue) > 100) {
          return "Discount percentage cannot exceed 100.";
        }
        return err;
      }
      break;
    }
    case "Near Expiry Discount": {
      const days = parseWholeNumber(form.expiryWithinDays);
      if (days == null || days <= 0) {
        return "Expiry Within Days must be a positive whole number";
      }
      const err = validateDiscountValue(form.discountType, form.discountValue);
      if (err) return err;
      break;
    }
    case "Cash Discount": {
      const slabErr = validatePaymentDaySlabs(form.paymentDaySlabs);
      if (slabErr) return slabErr;
      break;
    }
    case "Turnover Discount": {
      const slabErr = validateTurnoverSlabs(form.turnoverSlabs);
      if (slabErr) return slabErr;
      break;
    }
    case "Payment Discount": {
      if (form.paymentCondition === "Minimum Payment Percentage") {
        const pct = parseNum(form.requiredPaymentPercentage);
        if (pct <= 0 || pct > 100) {
          return "Required Payment Percentage must be greater than 0 and no more than 100";
        }
      }
      const err = validateDiscountValue(form.discountType, form.discountValue);
      if (err) return err;
      break;
    }
    case "Special Discount": {
      if (form.specialDiscountBasedOn === "Sales Quantity") {
        const slabErr = validateSpecialDiscountQuantitySlabs(
          form.specialDiscountQuantitySlabs,
        );
        if (slabErr) return slabErr;
      } else {
        const slabErr = validateSpecialDiscountAmountSlabs(
          form.specialDiscountAmountSlabs,
        );
        if (slabErr) return slabErr;
      }
      break;
    }
  }

  return null;
}

// ─── Summary (business language) ─────────────────────────────────────────────

function formatPct(n: number): string {
  return `${n}%`;
}

function formatMoney(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDiscount(type: DiscountType, raw: string): string {
  const n = parseNum(raw);
  return type === "Fixed Amount" ? formatMoney(n) : formatPct(n);
}

function customerPhrase(form: SchemeUnifiedForm): string {
  const types = form.customerTypes.filter((t) =>
    (CUSTOMER_TYPE_MULTI_OPTIONS as string[]).includes(t),
  );
  const typeLabel =
    types.length === 0 || types.length === CUSTOMER_TYPE_MULTI_OPTIONS.length
      ? "all customers"
      : types.length === 1
        ? `${types[0]}s`
        : types.join(", ");
  const states =
    form.stateNames.length === 0
      ? ""
      : form.stateNames.length === 1
        ? ` in ${form.stateNames[0]}`
        : form.stateNames.length === 2
          ? ` in ${form.stateNames[0]} and ${form.stateNames[1]}`
          : ` in ${form.stateNames.slice(0, -1).join(", ")}, and ${form.stateNames[form.stateNames.length - 1]}`;
  return `${typeLabel}${states}`;
}

function resolveSelectedProductNames(productIds: string[]): string[] {
  const byId = new Map(
    loadSchemeProductSelectOptions().map((o) => [
      o.value,
      o.productName || o.label,
    ]),
  );
  return productIds
    .map((id) => byId.get(id))
    .filter((name): name is string => Boolean(name));
}

function productsPhrase(form: SchemeUnifiedForm): string {
  if (!formShowsProductApplicability(form)) return "";
  if (form.productScope !== "Selected Products") {
    return " for all products";
  }
  const names = resolveSelectedProductNames(form.productIds);
  if (names.length === 0) return " for selected products";
  if (names.length === 1) return ` for ${names[0]}`;
  if (names.length === 2) return ` for ${names[0]} and ${names[1]}`;
  return ` for ${names[0]}, ${names[1]} and ${names.length - 2} more products`;
}

export function getProductDiscountRowError(
  rule: ProductDiscountRuleForm,
): string | null {
  if (!rule.applyDiscountOn) return "Select where the discount should be applied.";
  if (!rule.discountValue.trim()) return "Enter discount value.";
  const err = validateDiscountValue(rule.discountType, rule.discountValue, "Discount");
  if (err) {
    if (rule.discountType === "Percentage" && parseNum(rule.discountValue) > 100) {
      return "Discount percentage cannot exceed 100.";
    }
    return err;
  }
  return null;
}

export function formatProductsApplicabilitySummary(form: SchemeUnifiedForm): string {
  if (!formShowsProductApplicability(form)) return "";
  if (form.productScope !== "Selected Products") {
    return "Applicable to all products.";
  }
  const names = resolveSelectedProductNames(form.productIds);
  if (names.length === 0) return "Applicable to selected products.";
  if (names.length === 1) return `Applicable to ${names[0]}.`;
  if (names.length === 2) {
    return `Applicable to ${names[0]} and ${names[1]}.`;
  }
  return `Applicable to ${names[0]}, ${names[1]} and ${names.length - 2} more products.`;
}

function formatProductWiseDiscountLines(form: SchemeUnifiedForm): string {
  const nameById = new Map(
    loadSchemeProductSelectOptions().map((o) => [
      o.value,
      o.productName || o.label,
    ]),
  );
  const rules = syncProductDiscountRules(form.productDiscountRules, form.productIds);
  const lines = rules
    .filter((r) => r.discountValue.trim())
    .map((r) => {
      const name = nameById.get(r.productId) ?? "Product";
      const disc = formatDiscount(r.discountType, r.discountValue);
      return `${name} — ${disc}`;
    });
  if (!lines.length) return "";
  if (lines.length <= 3) return lines.join(". ") + ".";
  return `${lines.slice(0, 3).join(". ")}. +${lines.length - 3} more.`;
}

export function buildSchemeWorkingSummary(form: SchemeUnifiedForm): string {
  const who = customerPhrase(form);
  const products = productsPhrase(form);
  const auto = resolveAutomaticBenefit(form.schemeCategory, {
    turnoverPeriod: form.turnoverPeriod,
    existingThrough: form.benefitThrough,
    existingWhen: form.benefitWhen,
    preserveNearExpiryInvoiceDiscount:
      form.schemeCategory === "Near Expiry Discount" &&
      form.benefitThrough === "Invoice Discount",
  });

  switch (form.schemeCategory) {
    case "Product Discount": {
      const count = form.productIds.length;
      const disc = formatDiscount(form.discountType, form.discountValue);
      const applyOn = form.applyDiscountOn.toLowerCase();
      const settlement =
        "This discount will be applied directly during invoice generation.";
      if (form.productScope !== "Selected Products") {
        return `Applicable to all products. A ${disc} discount will be applied on the ${applyOn}. ${settlement}`;
      }
      if (form.discountMode === "PRODUCT_WISE") {
        const compact = formatProductWiseDiscountLines(form);
        const base = `Applicable to ${count} selected product${count === 1 ? "" : "s"} with different product-wise discounts. ${settlement}`;
        return compact ? `${base} ${compact}` : base;
      }
      return `Applicable to ${count} selected product${count === 1 ? "" : "s"}. A ${disc} discount will be applied equally to all selected products on the ${applyOn}. ${settlement}`;
    }
    case "Near Expiry Discount": {
      const disc = formatDiscount(form.discountType, form.discountValue);
      const days = form.expiryWithinDays.trim() || "—";
      return `Applicable to ${who}${products}. Products expiring within ${days} days receive a ${disc} benefit via ${auto.benefitThrough}, given ${auto.benefitWhen.toLowerCase()}.`;
    }
    case "Cash Discount": {
      const slabs = formPaymentSlabsToConfig(form.paymentDaySlabs);
      const intro =
        "Customers who make payments within the configured payment periods will receive the corresponding cash discount on the amount received against the invoice.";
      if (!slabs.length) {
        return `${intro} Calculation: Calculated automatically on the payment amount received against the invoice.`;
      }
      const slabLines = slabs
        .map((s) => `${s.fromDay}–${s.toDay} Days → ${formatPct(s.discountPercentage)}`)
        .join(". ");
      return `${intro} Payment Slabs: ${slabLines}. Calculation: Calculated automatically on the payment amount received against the invoice.`;
    }
    case "Turnover Discount": {
      const slabs = formTurnoverSlabsToConfig(form.turnoverSlabs);
      const slabLines = slabs
        .map((s) =>
          s.turnoverTo == null
            ? `Above ${formatMoney(s.turnoverFrom)} → ${formatPct(s.discountPercentage)}`
            : `${formatMoney(s.turnoverFrom)} – ${formatMoney(s.turnoverTo)} → ${formatPct(s.discountPercentage)}`,
        )
        .join(". ");
      const base =
        "Turnover Discount. Financial Year: Current Financial Year. Calculation: Net Taxable Sales (Taxable Sales − Sales Returns).";
      if (!slabs.length) return base;
      return `${base} Turnover Slabs: ${slabLines}.`;
    }
    case "Payment Discount": {
      const disc = formatDiscount(form.discountType, form.discountValue);
      let condition = "on full payment";
      if (form.paymentCondition === "Minimum Payment Percentage") {
        condition = `when at least ${form.requiredPaymentPercentage || "—"}% is paid`;
      } else if (form.paymentCondition === "Payment Within Due Date") {
        condition = "when payment is made within the due date";
      }
      return `Applicable to ${who}. A ${disc} discount is given via Credit Note after payment ${condition}, calculated on ${form.paymentCalculationOn.toLowerCase()}.`;
    }
    case "Special Discount": {
      const period =
        form.startDate || form.endDate
          ? `Scheme period ${form.startDate || "—"} to ${form.endDate || "—"}.`
          : "Scheme period is defined by Valid From / Valid To.";
      if (form.specialDiscountBasedOn === "Sales Quantity") {
        const uom = form.specialDiscountUom || "UOM";
        const slabs = formSpecialQuantitySlabsToConfig(
          form.specialDiscountQuantitySlabs,
          uom,
        );
        const slabLines = slabs
          .map((s) => {
            const disc = formatDiscount(s.discountType, String(s.discountValue));
            return s.quantityTo == null
              ? `${s.quantityFrom}+ ${s.uom || uom} → ${disc}`
              : `${s.quantityFrom}–${s.quantityTo} ${s.uom || uom} → ${disc}`;
          })
          .join(". ");
        const count = form.productIds.length;
        return `Special Discount based on Sales Quantity for ${count} selected product${count === 1 ? "" : "s"}. ${period} Achievement: ${slabLines || "—"}. Entitlement is based on net sold quantity (invoice qty − returned qty) during the scheme period; settlement is via Credit Note (manual).`;
      }
      const slabs = formSpecialAmountSlabsToConfig(form.specialDiscountAmountSlabs);
      const slabLines = slabs
        .map((s) => {
          const disc = formatDiscount(s.discountType, String(s.discountValue));
          return s.eligibleSalesTo == null
            ? `${formatMoney(s.eligibleSalesFrom)}+ → ${disc}`
            : `${formatMoney(s.eligibleSalesFrom)}–${formatMoney(s.eligibleSalesTo)} → ${disc}`;
        })
        .join(". ");
      const productPart =
        form.productScope === "Selected Products"
          ? ` for ${form.productIds.length} selected product${form.productIds.length === 1 ? "" : "s"}`
          : " for all products";
      return `Special Discount based on Sales Amount${productPart}. ${period} Achievement: ${slabLines || "—"}. Entitlement is based on eligible taxable sales (taxable sales − sales returns, excluding GST) during the scheme period; settlement is via Credit Note (manual).`;
    }
  }
}

// ─── Persist ─────────────────────────────────────────────────────────────────

function buildConditionConfig(form: SchemeUnifiedForm): SchemeConditionConfig {
  const category = form.schemeCategory;
  // Near Expiry: blank selection = all products (no All/Selected dropdown).
  // Special Discount quantity: always SELECTED. Amount: All or Selected from form.
  const productScope: "ALL" | "SELECTED" =
    category === "Near Expiry Discount"
      ? form.productIds.length > 0
        ? "SELECTED"
        : "ALL"
      : category === "Special Discount"
        ? form.specialDiscountBasedOn === "Sales Quantity" ||
          form.productScope === "Selected Products"
          ? "SELECTED"
          : "ALL"
        : form.productScope === "Selected Products"
          ? "SELECTED"
          : "ALL";
  const persistsProducts = categoryPersistsProducts(category, form);
  const productIds =
    persistsProducts && productScope === "SELECTED" ? form.productIds : [];

  const discountValue = parseNum(form.discountValue);
  const base: SchemeConditionConfig = {
    productScope: persistsProducts || categoryUsesProducts(category)
      ? productScope
      : undefined,
    productIds: productIds.length ? productIds : undefined,
  };

  switch (category) {
    case "Product Discount": {
      const mode: "COMMON" | "PRODUCT_WISE" =
        form.productScope === "All Products" || form.discountMode !== "PRODUCT_WISE"
          ? "COMMON"
          : "PRODUCT_WISE";
      if (mode === "PRODUCT_WISE") {
        const rules = syncProductDiscountRules(
          form.productDiscountRules,
          form.productIds,
        )
          .map(
            (r): SchemeProductDiscountRule => ({
              productId: r.productId,
              discountType: r.discountType,
              discountValue: parseNum(r.discountValue),
              applyDiscountOn: r.applyDiscountOn,
            }),
          )
          .filter((r) => r.discountValue > 0);
        return {
          ...base,
          discountMode: "PRODUCT_WISE",
          productDiscountRules: rules,
          // Keep a representative common snapshot for legacy readers
          discountType: rules[0]?.discountType ?? form.discountType,
          discountValue: rules[0]?.discountValue ?? 0,
          applyDiscountOn: rules[0]?.applyDiscountOn ?? form.applyDiscountOn,
        };
      }
      return {
        ...base,
        discountMode: "COMMON",
        productDiscountRules: undefined,
        discountType: form.discountType,
        discountValue,
        applyDiscountOn: form.applyDiscountOn,
      };
    }
    case "Near Expiry Discount":
      return {
        ...base,
        discountType: form.discountType,
        discountValue,
        expiryWithinDays: parseNum(form.expiryWithinDays),
      };
    case "Cash Discount":
      return {
        paymentDaySlabs: formPaymentSlabsToConfig(form.paymentDaySlabs),
        cashCalculationOn: form.cashCalculationOn,
      };
    case "Turnover Discount":
      return {
        ...base,
        // Fixed business rules — not user-configurable in UI.
        turnoverPeriod: "Yearly",
        turnoverCalculationOn: "Net Sales After Returns",
        turnoverSlabs: formTurnoverSlabsToConfig(form.turnoverSlabs),
      };
    case "Payment Discount":
      return {
        discountType: form.discountType,
        discountValue,
        paymentCondition: form.paymentCondition,
        requiredPaymentPercentage:
          form.paymentCondition === "Minimum Payment Percentage"
            ? parseNum(form.requiredPaymentPercentage)
            : undefined,
        paymentCalculationOn: form.paymentCalculationOn,
      };
    case "Special Discount": {
      if (form.specialDiscountBasedOn === "Sales Quantity") {
        const { uom } = resolveSpecialDiscountUom(form.productIds);
        const resolvedUom = uom || form.specialDiscountUom;
        const quantitySlabs = formSpecialQuantitySlabsToConfig(
          form.specialDiscountQuantitySlabs,
          resolvedUom,
        );
        return {
          productScope: "SELECTED",
          productIds: form.productIds.length ? form.productIds : undefined,
          specialDiscountBasedOn: "SALES_QUANTITY",
          specialDiscountQuantitySlabs: quantitySlabs,
          specialDiscountUom: resolvedUom || undefined,
          discountType: quantitySlabs[0]?.discountType,
          discountValue: quantitySlabs[0]?.discountValue,
        };
      }
      const amountSlabs = formSpecialAmountSlabsToConfig(
        form.specialDiscountAmountSlabs,
      );
      const amountScope: "ALL" | "SELECTED" =
        form.productScope === "Selected Products" ? "SELECTED" : "ALL";
      const amountProductIds =
        amountScope === "SELECTED" ? form.productIds : [];
      return {
        productScope: amountScope,
        productIds: amountProductIds.length ? amountProductIds : undefined,
        specialDiscountBasedOn: "SALES_AMOUNT",
        specialDiscountAmountSlabs: amountSlabs,
        discountType: amountSlabs[0]?.discountType,
        discountValue: amountSlabs[0]?.discountValue,
      };
    }
  }
}

function buildBenefitConfig(form: SchemeUnifiedForm): SchemeBenefitConfig {
  const discountValue =
    form.schemeCategory === "Cash Discount" ||
    form.schemeCategory === "Turnover Discount" ||
    form.schemeCategory === "Special Discount"
      ? undefined
      : parseNum(form.discountValue);

  const auto = resolveAutomaticBenefit(form.schemeCategory, {
    turnoverPeriod:
      form.schemeCategory === "Turnover Discount" ? "Yearly" : form.turnoverPeriod,
    existingThrough: form.benefitThrough,
    existingWhen: form.benefitWhen,
    preserveNearExpiryInvoiceDiscount:
      form.schemeCategory === "Near Expiry Discount" &&
      form.benefitThrough === "Invoice Discount",
  });

  return {
    benefitType: form.discountType,
    benefitValue: discountValue,
    benefitThrough: auto.benefitThrough,
    benefitWhen: auto.benefitWhen,
  };
}

function syncLegacyConfigSlabs(
  category: SchemeCategory,
  condition: SchemeConditionConfig,
): SchemeConfigSlab[] | undefined {
  if (category === "Cash Discount" && condition.paymentDaySlabs?.length) {
    return condition.paymentDaySlabs.map((s) => ({
      id: s.id,
      fromValue: s.fromDay,
      toValue: s.toDay,
      discountType: "Percentage" as const,
      discountValue: s.discountPercentage,
    }));
  }
  if (category === "Turnover Discount" && condition.turnoverSlabs?.length) {
    return condition.turnoverSlabs.map((s) => ({
      id: s.id,
      fromValue: s.turnoverFrom,
      toValue: s.turnoverTo,
      discountType: "Percentage" as const,
      discountValue: s.discountPercentage,
    }));
  }
  if (
    category === "Special Discount" &&
    condition.specialDiscountBasedOn === "SALES_QUANTITY" &&
    condition.specialDiscountQuantitySlabs?.length
  ) {
    return condition.specialDiscountQuantitySlabs.map((s) => ({
      id: s.id,
      fromValue: s.quantityFrom,
      toValue: s.quantityTo,
      discountType: s.discountType,
      discountValue: s.discountValue,
    }));
  }
  if (
    category === "Special Discount" &&
    condition.specialDiscountAmountSlabs?.length
  ) {
    return condition.specialDiscountAmountSlabs.map((s) => ({
      id: s.id,
      fromValue: s.eligibleSalesFrom,
      toValue: s.eligibleSalesTo,
      discountType: s.discountType,
      discountValue: s.discountValue,
    }));
  }
  if (
    condition.discountValue != null &&
    condition.discountValue > 0 &&
    condition.discountType
  ) {
    return [
      {
        id: newId("disc"),
        fromValue: 0,
        toValue: null,
        discountType: condition.discountType,
        discountValue: condition.discountValue,
      },
    ];
  }
  return undefined;
}

function syncLegacyTurnoverSlabs(
  condition: SchemeConditionConfig,
): TurnoverSlab[] | undefined {
  if (!condition.turnoverSlabs?.length) return undefined;
  return condition.turnoverSlabs.map((s) => ({
    fromTurnover: s.turnoverFrom,
    toTurnover: s.turnoverTo,
    benefitPercent: s.discountPercentage,
  }));
}

function buildUnifiedProductDiscountSchemeLines(
  form: SchemeUnifiedForm,
): ProductDiscountSchemeLine[] | undefined {
  if (form.productScope !== "Selected Products" || !form.productIds.length) {
    return undefined;
  }
  const products = loadProducts();
  const byId = new Map(products.map((p) => [String(p.id), p]));
  const stateNames = [...form.stateNames];

  const ruleFor = (productId: string) => {
    if (form.discountMode === "PRODUCT_WISE") {
      const rule = form.productDiscountRules.find((r) => r.productId === productId);
      return {
        discountType: rule?.discountType ?? "Percentage",
        discountValue: parseNum(rule?.discountValue ?? ""),
      };
    }
    return {
      discountType: form.discountType,
      discountValue: parseNum(form.discountValue),
    };
  };

  return form.productIds.map((productId) => {
    const product = byId.get(productId);
    const { discountType, discountValue } = ruleFor(productId);
    const dealerPrice = 0;
    const discountAmount =
      discountType === "Percentage"
        ? (dealerPrice * discountValue) / 100
        : discountValue;
    return {
      productId,
      productCode: product?.productCode || product?.sku || "",
      productName: product?.productName || "",
      stateNames,
      dealerPrice,
      discountType,
      discountValue,
      discountAmount,
      finalSchemePrice: Math.max(0, dealerPrice - discountAmount),
      mrp: 0,
    };
  });
}

export function getUnifiedSchemeCodePreview(): string {
  const list = loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, SCHEME_SEED);
  return nextMasterCode(
    "SCH-",
    list.map((r) => r.schemeCode),
  );
}

export function unifiedFormToRecord(
  form: SchemeUnifiedForm,
  existingRecords: SchemeRecord[],
  startId: number,
  existing?: SchemeRecord | null,
): SchemeRecord {
  const behaviour = SCHEME_CATEGORY_BEHAVIOUR[form.schemeCategory];
  const schemeType: SchemeType = behaviour.schemeType;
  const effect = SCHEME_EFFECT_MAP[schemeType];
  const conditionType = SCHEME_CONDITION_TYPE_BY_CATEGORY[form.schemeCategory];
  const conditionConfig = buildConditionConfig(form);
  const benefitConfig = buildBenefitConfig(form);
  const configSlabs = syncLegacyConfigSlabs(form.schemeCategory, conditionConfig);
  const existingCodes = existingRecords.map((r) => r.schemeCode);
  const schemeCode =
    existing?.schemeCode ?? nextMasterCode("SCH-", existingCodes);
  const now = masterToday();
  const stateName = form.stateNames.join(", ");

  const usesProducts = categoryUsesProducts(form.schemeCategory);
  const isSpecificProducts =
    form.schemeCategory === "Near Expiry Discount"
      ? form.productIds.length > 0
      : form.schemeCategory === "Special Discount"
        ? form.specialDiscountBasedOn === "Sales Quantity" ||
          form.productScope === "Selected Products"
        : form.productScope === "Selected Products";
  const selectedProductIds =
    usesProducts && isSpecificProducts ? form.productIds : undefined;

  const legacyDiscountType: DiscountType =
    form.schemeCategory === "Product Discount" &&
    form.discountMode === "PRODUCT_WISE" &&
    form.productDiscountRules[0]
      ? form.productDiscountRules[0].discountType
      : form.schemeCategory === "Special Discount"
        ? form.specialDiscountBasedOn === "Sales Quantity"
          ? form.specialDiscountQuantitySlabs[0]?.discountType ?? form.discountType
          : form.specialDiscountAmountSlabs[0]?.discountType ?? form.discountType
        : form.discountType;
  const legacyDiscountValue =
    form.schemeCategory === "Cash Discount"
      ? conditionConfig.paymentDaySlabs?.[0]?.discountPercentage
      : form.schemeCategory === "Turnover Discount"
        ? conditionConfig.turnoverSlabs?.[0]?.discountPercentage
        : form.schemeCategory === "Special Discount"
          ? form.specialDiscountBasedOn === "Sales Quantity"
            ? conditionConfig.specialDiscountQuantitySlabs?.[0]?.discountValue
            : conditionConfig.specialDiscountAmountSlabs?.[0]?.discountValue
          : form.schemeCategory === "Product Discount" &&
              form.discountMode === "PRODUCT_WISE"
            ? conditionConfig.discountValue
            : parseNum(form.discountValue) || undefined;

  const productDiscountSchemeLines =
    form.schemeCategory === "Product Discount"
      ? buildUnifiedProductDiscountSchemeLines(form)
      : undefined;

  const base: SchemeRecord = {
    id: existing?.id ?? startId,
    schemeCode,
    schemeName: form.schemeName.trim(),
    schemeType,
    schemeCategory: form.schemeCategory,
    description: form.description.trim() || undefined,
    customerType: resolveCustomerTypeFromMulti(form.customerTypes),
    customerTypes: (() => {
      const selected = form.customerTypes.filter((t): t is Exclude<CustomerType, "All"> =>
        (CUSTOMER_TYPE_MULTI_OPTIONS as string[]).includes(t),
      );
      if (
        selected.length === 0 ||
        selected.length === CUSTOMER_TYPE_MULTI_OPTIONS.length
      ) {
        return undefined;
      }
      return selected;
    })(),
    customerIds: existing?.customerIds ?? [],
    stateId: form.stateNames[0] ?? "",
    stateName,
    stateSelectionMode: form.stateNames.length > 1 ? "Multiple" : "Single",
    selectedProductIds,
    productId:
      selectedProductIds?.[0] ??
      (usesProducts ? existing?.productId : undefined),
    productScope: usesProducts && isSpecificProducts ? "Specific" : "All",
    productScopeMode:
      usesProducts && isSpecificProducts ? "Specific Products" : "All",
    // Preserve legacy categoryIds; do not expose or rewrite via new UI
    categoryIds: existing?.categoryIds,
    conditionType,
    conditionConfig,
    benefitConfig,
    calculationBasis: behaviour.defaultCalculationBasis,
    slabMethod: existing?.slabMethod ?? "Highest Achieved Slab",
    configSlabs: configSlabs ?? existing?.configSlabs,
    settlementBehaviour: behaviour.settlementBehaviour,
    triggerEvent: behaviour.triggerEvent,
    configurableTriggerNote: existing?.configurableTriggerNote,
    excludeStockTransferSampleOrder: behaviour.appliesInstantlyOnInvoice,
    deductFromTurnoverBase: form.excludeFromTurnoverDiscount,
    deductFromCashDiscountBase: form.excludeFromCashDiscount,
    // Preserve accounting / approval fields on existing records; never clear silently
    accountingDiscountLedgerId: existing?.accountingDiscountLedgerId,
    accountingDiscountLedgerName: existing?.accountingDiscountLedgerName,
    accountingCreditNoteLedgerId: existing?.accountingCreditNoteLedgerId,
    accountingCreditNoteLedgerName: existing?.accountingCreditNoteLedgerName,
    accountingExpenseLedgerId: existing?.accountingExpenseLedgerId,
    accountingExpenseLedgerName: existing?.accountingExpenseLedgerName,
    accountingReasonCode: existing?.accountingReasonCode,
    approvalRequired: existing?.approvalRequired ?? false,
    selectionRuleNote:
      "Only one eligible scheme may be selected per Sales Order. Ineligible schemes cannot be forced.",
    startDate: form.startDate,
    endDate: form.endDate,
    status: form.status,
    discountType: legacyDiscountType,
    discountValue: legacyDiscountValue,
    expiryWithinDays:
      form.schemeCategory === "Near Expiry Discount"
        ? parseNum(form.expiryWithinDays)
        : existing?.expiryWithinDays,
    turnoverPeriod:
      form.schemeCategory === "Turnover Discount"
        ? turnoverPeriodToLegacy("Yearly")
        : existing?.turnoverPeriod,
    turnoverSlabs:
      form.schemeCategory === "Turnover Discount"
        ? syncLegacyTurnoverSlabs(conditionConfig)
        : existing?.turnoverSlabs,
    paymentWithinDays:
      form.schemeCategory === "Cash Discount" &&
      conditionConfig.paymentDaySlabs?.[0]
        ? conditionConfig.paymentDaySlabs[0].toDay
        : existing?.paymentWithinDays,
    effectType: effect.effectType,
    appliedIn: effect.appliedIn,
    settlementMethod: effect.settlementMethod,
    approvalStatus: existing?.approvalStatus ?? "draft",
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedBy: MASTER_CURRENT_USER,
    updatedAt: now,
    // Preserve specialised line / legacy fields
    schemeLines:
      form.schemeCategory === "Product Discount"
        ? productDiscountSchemeLines
        : existing?.schemeLines,
    nearExpiryLines: existing?.nearExpiryLines,
    discountApplication:
      form.schemeCategory === "Product Discount"
        ? form.productScope === "All Products" || form.discountMode !== "PRODUCT_WISE"
          ? "same"
          : "per_product"
        : existing?.discountApplication,
    festivalName: existing?.festivalName,
    priority: existing?.priority,
    freeQuantity: existing?.freeQuantity,
    paymentMode: existing?.paymentMode,
    paymentTiming: existing?.paymentTiming,
    outstandingAgeCondition: existing?.outstandingAgeCondition,
    paymentOfferBasis: existing?.paymentOfferBasis,
    batchId: existing?.batchId,
    minimumQuantity: existing?.minimumQuantity,
    minimumOrderValue: existing?.minimumOrderValue,
    dealerPrice: existing?.dealerPrice,
    discountAmount: existing?.discountAmount,
    finalSchemePrice: existing?.finalSchemePrice,
    mrp: existing?.mrp,
    productCode: existing?.productCode,
    productName: existing?.productName,
  };

  return base;
}

export function canEditUnifiedScheme(record: SchemeRecord): boolean {
  return (
    record.approvalStatus === "draft" ||
    record.approvalStatus === "rejected" ||
    record.approvalStatus === "submitted" ||
    record.approvalStatus === "manager_approval" ||
    record.approvalStatus === "finance_approval" ||
    record.approvalStatus === "final_approval"
  );
}

export { SCHEME_CUSTOMER_OPTIONS, SCHEME_TYPE_DISPLAY_LABELS };
