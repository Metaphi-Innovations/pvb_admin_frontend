/**
 * Maps Scheme Master unified form ↔ API create/update/detail payloads.
 */

import type { SchemeUnifiedForm } from "./scheme-unified-config";
import {
  createDefaultUnifiedForm,
  emptyPaymentDaySlab,
  emptySpecialDiscountAmountSlab,
  emptySpecialDiscountQuantitySlab,
  emptyTurnoverSlab,
  syncProductDiscountRules,
  type ProductDiscountRuleForm,
} from "./scheme-unified-config";
import type { SchemeCategory, DiscountType } from "./scheme-data";
import type { SchemeApiType } from "@/services/scheme-list.service";
import { SCHEME_TYPE_LABELS } from "@/services/scheme-list.service";

export const API_SCHEME_CATEGORIES: SchemeCategory[] = [
  "Product Discount",
  "Near Expiry Discount",
  "Cash Discount",
  "Turnover Discount",
  "Special Discount",
];

const CATEGORY_TO_API: Record<string, SchemeApiType> = {
  "Product Discount": "PRODUCT_DISCOUNT",
  "Near Expiry Discount": "NEAR_EXPIRY",
  "Cash Discount": "CASH_DISCOUNT",
  "Turnover Discount": "TURNOVER_DISCOUNT",
  "Special Discount": "SPECIAL_SCHEME",
  /** UI-only legacy — maps to cash payment-day slabs */
  "Payment Discount": "CASH_DISCOUNT",
};

const API_TO_CATEGORY: Record<SchemeApiType, SchemeCategory> = {
  PRODUCT_DISCOUNT: "Product Discount",
  NEAR_EXPIRY: "Near Expiry Discount",
  CASH_DISCOUNT: "Cash Discount",
  TURNOVER_DISCOUNT: "Turnover Discount",
  SPECIAL_SCHEME: "Special Discount",
};

function parseNum(raw: string): number {
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function toApiDiscountType(type: DiscountType): "Percentage" | "Flat" {
  return type === "Fixed Amount" ? "Flat" : "Percentage";
}

function fromApiDiscountType(type: unknown): DiscountType {
  return type === "Flat" ? "Fixed Amount" : "Percentage";
}

function fromApplyOn(value: unknown): string {
  if (value === "PRODUCT_LINE_AMOUNT") return "Product Line Amount";
  if (value === "MRP") return "Product Rate";
  return "Product Rate";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const n = Number(asString(value));
  return Number.isFinite(n) ? n : 0;
}

function formatDateInput(value: unknown): string {
  const raw = asString(value);
  return raw ? raw.slice(0, 10) : "";
}

function openEndedTo(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return parseNum(trimmed);
}

/** Option id lists used to detect UI "Select All" → API scope ALL. */
export type SchemeScopeOptionLists = {
  customerTypeIds?: string[];
  customerIds?: string[];
  stateNames?: string[];
  productIds?: string[];
};

function setsEqual(selected: string[], available: string[]): boolean {
  if (!available.length || selected.length !== available.length) return false;
  const selectedSet = new Set(selected);
  return available.every((id) => selectedSet.has(id));
}

/**
 * If every available option is selected (Select All), treat as ALL scope with no mapping rows.
 * Otherwise SPECIFIC with the selected ids. Empty → ALL (no rows).
 */
function resolveScope(
  selected: string[],
  available?: string[],
): { scope: "ALL" | "SPECIFIC"; ids: string[] } {
  const picked = selected.filter(Boolean);
  if (!picked.length) {
    return { scope: "ALL", ids: [] };
  }
  if (available?.length && setsEqual(picked, available)) {
    return { scope: "ALL", ids: [] };
  }
  return { scope: "SPECIFIC", ids: picked };
}

function buildScopes(
  form: SchemeUnifiedForm,
  optionLists?: SchemeScopeOptionLists,
) {
  const customerTypes = resolveScope(
    form.customerTypes,
    optionLists?.customerTypeIds,
  );
  const customers = resolveScope(form.customerIds, optionLists?.customerIds);
  const states = resolveScope(form.stateNames, optionLists?.stateNames);

  const forceProductSpecific =
    (form.schemeCategory === "Special Discount" &&
      form.specialDiscountBasedOn === "Sales Quantity") ||
    (form.schemeCategory === "Product Discount" &&
      form.discountMode === "PRODUCT_WISE");

  const rawProductIds = form.productIds.filter(Boolean);
  let product_scope: "ALL" | "SPECIFIC" = "ALL";
  let product_ids: string[] = [];

  if (forceProductSpecific) {
    product_scope = "SPECIFIC";
    product_ids = rawProductIds;
  } else if (rawProductIds.length > 0) {
    const products = resolveScope(rawProductIds, optionLists?.productIds);
    product_scope = products.scope;
    product_ids = products.ids;
  } else if (form.productScope === "Selected Products") {
    product_scope = "SPECIFIC";
    product_ids = [];
  }

  return {
    customer_type_scope: customerTypes.scope,
    customer_type_ids: customerTypes.ids,
    customer_scope: customers.scope,
    customer_ids: customers.ids,
    state_scope: states.scope,
    state_names: states.ids,
    product_scope,
    product_ids,
    exclude_from_turnover_discount: form.excludeFromTurnoverDiscount,
    exclude_from_cash_discount: form.excludeFromCashDiscount,
  };
}

function buildCommon(
  form: SchemeUnifiedForm,
  optionLists?: SchemeScopeOptionLists,
) {
  return {
    scheme_name: form.schemeName.trim(),
    description: form.description.trim() || null,
    start_date: form.startDate,
    end_date: form.endDate,
    ...buildScopes(form, optionLists),
  };
}

function mapCashSlabs(form: SchemeUnifiedForm) {
  return form.paymentDaySlabs.map((slab, index) => ({
    from_value: parseNum(slab.fromDay),
    to_value: openEndedTo(slab.toDay),
    discount_type: "Percentage" as const,
    discount_value: parseNum(slab.discountPercentage),
    sort_order: index,
  }));
}

function mapTurnoverSlabs(form: SchemeUnifiedForm) {
  return form.turnoverSlabs.map((slab, index) => ({
    from_value: parseNum(slab.turnoverFrom),
    to_value: openEndedTo(slab.turnoverTo),
    discount_type: "Percentage" as const,
    discount_value: parseNum(slab.discountPercentage),
    sort_order: index,
  }));
}

function mapSpecialSlabs(form: SchemeUnifiedForm) {
  if (form.specialDiscountBasedOn === "Sales Quantity") {
    return form.specialDiscountQuantitySlabs.map((slab, index) => ({
      from_value: parseNum(slab.quantityFrom),
      to_value: openEndedTo(slab.quantityTo),
      uom: slab.uom.trim() || form.specialDiscountUom.trim() || null,
      discount_type: toApiDiscountType(slab.discountType),
      discount_value: parseNum(slab.discountValue),
      sort_order: index,
    }));
  }

  return form.specialDiscountAmountSlabs.map((slab, index) => ({
    from_value: parseNum(slab.eligibleSalesFrom),
    to_value: openEndedTo(slab.eligibleSalesTo),
    discount_type: toApiDiscountType(slab.discountType),
    discount_value: parseNum(slab.discountValue),
    sort_order: index,
  }));
}

function mapProductDiscount(form: SchemeUnifiedForm) {
  if (form.discountMode === "PRODUCT_WISE") {
    const rules = syncProductDiscountRules(
      form.productDiscountRules,
      form.productIds,
    );
    return {
      discount_setup: "DIFFERENT_BY_PRODUCT" as const,
      apply_discount_on: "PRODUCT_RATE" as const,
      items: rules.map((rule: ProductDiscountRuleForm) => ({
        product_id: rule.productId,
        discount_type: toApiDiscountType(rule.discountType),
        discount_value: parseNum(rule.discountValue),
        apply_discount_on: "PRODUCT_RATE" as const,
      })),
    };
  }

  return {
    discount_setup: "SAME_FOR_ALL_PRODUCTS" as const,
    apply_discount_on: "PRODUCT_RATE" as const,
    discount_type: toApiDiscountType(form.discountType),
    discount_value: parseNum(form.discountValue),
  };
}

export function categoryToApiSchemeType(category: SchemeCategory): SchemeApiType {
  return CATEGORY_TO_API[category] ?? "PRODUCT_DISCOUNT";
}

export function apiSchemeTypeToCategory(type: string): SchemeCategory {
  if (type in API_TO_CATEGORY) {
    return API_TO_CATEGORY[type as SchemeApiType];
  }
  return "Product Discount";
}

export function schemeTypeLabel(type: string): string {
  if (type in SCHEME_TYPE_LABELS) {
    return SCHEME_TYPE_LABELS[type as SchemeApiType];
  }
  return type;
}

/** Build POST /create body from unified form. */
export function unifiedFormToCreatePayload(
  form: SchemeUnifiedForm,
  optionLists?: SchemeScopeOptionLists,
): Record<string, unknown> {
  const scheme_type = categoryToApiSchemeType(form.schemeCategory);
  const common = buildCommon(form, optionLists);

  switch (scheme_type) {
    case "PRODUCT_DISCOUNT":
      return {
        ...common,
        scheme_type,
        product_discount: mapProductDiscount(form),
      };
    case "NEAR_EXPIRY":
      return {
        ...common,
        scheme_type,
        near_expiry: {
          expiry_within_days: parseNum(form.expiryWithinDays),
          discount_type: toApiDiscountType(form.discountType),
          discount_value: parseNum(form.discountValue),
        },
      };
    case "CASH_DISCOUNT":
      return {
        ...common,
        scheme_type,
        slabs: mapCashSlabs(form),
      };
    case "TURNOVER_DISCOUNT":
      return {
        ...common,
        scheme_type,
        slabs: mapTurnoverSlabs(form),
      };
    case "SPECIAL_SCHEME":
      return {
        ...common,
        scheme_type,
        special: {
          based_on:
            form.specialDiscountBasedOn === "Sales Quantity"
              ? "SALES_QUANTITY"
              : "SALES_AMOUNT",
          has_slabs: form.specialHasSlabs,
          threshold_value: form.specialHasSlabs
            ? null
            : parseNum(form.specialThresholdValue),
          discount_type: form.specialHasSlabs
            ? null
            : toApiDiscountType(form.discountType),
          discount_value: form.specialHasSlabs
            ? null
            : parseNum(form.discountValue),
          uom:
            form.specialHasSlabs ||
            form.specialDiscountBasedOn !== "Sales Quantity"
              ? null
              : form.specialDiscountUom.trim() || "Case",
          product_evaluation_mode: form.specialCombineProducts
            ? "COMBINED"
            : "INDIVIDUAL",
          evaluation_scope:
            form.specialEvaluationScope === "One Invoice"
              ? "PER_INVOICE"
              : "SCHEME_PERIOD",
          settlement_run_mode:
            form.specialSettlementRunMode === "Automatic"
              ? "AUTOMATIC"
              : "MANUAL",
        },
        slabs: form.specialHasSlabs ? mapSpecialSlabs(form) : [],
      };
    default:
      return { ...common, scheme_type };
  }
}

/** Build PUT /update body — same shape as create for type-specific replace. */
export function unifiedFormToUpdatePayload(
  form: SchemeUnifiedForm,
  optionLists?: SchemeScopeOptionLists,
): Record<string, unknown> {
  return unifiedFormToCreatePayload(form, optionLists);
}

/**
 * When detail has scope ALL (no mapping rows), fill the form multi-selects with
 * every option so the UI shows Select All / All (N) while editing.
 */
export function expandAllScopesForUi(
  form: SchemeUnifiedForm,
  detail: Record<string, unknown>,
  optionLists: SchemeScopeOptionLists,
): SchemeUnifiedForm {
  const next: SchemeUnifiedForm = { ...form };

  if (
    asString(detail.customer_type_scope) === "ALL" &&
    optionLists.customerTypeIds?.length
  ) {
    next.customerTypes = [...optionLists.customerTypeIds];
  }

  if (
    asString(detail.customer_scope) === "ALL" &&
    optionLists.customerIds?.length
  ) {
    next.customerIds = [...optionLists.customerIds];
  }

  if (
    asString(detail.state_scope) === "ALL" &&
    optionLists.stateNames?.length
  ) {
    next.stateNames = [...optionLists.stateNames];
  }

  if (
    asString(detail.product_scope) === "ALL" &&
    optionLists.productIds?.length
  ) {
    next.productIds = [...optionLists.productIds];
    next.productScope = "Selected Products";
  }

  return next;
}

/** Hydrate unified form from GET /details response. */
export function detailToUnifiedForm(
  detail: Record<string, unknown>,
): SchemeUnifiedForm {
  const schemeType = asString(detail.scheme_type);
  const category = apiSchemeTypeToCategory(schemeType);
  const form = createDefaultUnifiedForm(category);

  const customerTypes = Array.isArray(detail.customer_types)
    ? detail.customer_types.map((row) =>
        asString((row as Record<string, unknown>).customer_type_id),
      )
    : [];
  const customers = Array.isArray(detail.customers)
    ? detail.customers.map((row) =>
        asString((row as Record<string, unknown>).customer_id),
      )
    : [];
  const states = Array.isArray(detail.states)
    ? detail.states.map((row) =>
        asString((row as Record<string, unknown>).state_name),
      )
    : [];
  const products = Array.isArray(detail.products)
    ? detail.products.map((row) =>
        asString((row as Record<string, unknown>).product_id),
      )
    : [];

  form.schemeName = asString(detail.scheme_name);
  form.description = asString(detail.description);
  form.startDate = formatDateInput(detail.start_date);
  form.endDate = formatDateInput(detail.end_date);
  form.status = detail.is_active === true ? "active" : "inactive";
  form.customerTypes = customerTypes;
  form.customerIds = customers;
  form.stateNames = states;
  form.productIds = products;
  form.productScope =
    asString(detail.product_scope) === "SPECIFIC" || products.length > 0
      ? "Selected Products"
      : "All Products";
  form.excludeFromTurnoverDiscount = Boolean(detail.exclude_from_turnover_discount);
  form.excludeFromCashDiscount = Boolean(detail.exclude_from_cash_discount);

  const pdConfig =
    detail.product_discount_config &&
    typeof detail.product_discount_config === "object"
      ? (detail.product_discount_config as Record<string, unknown>)
      : null;

  if (category === "Product Discount" && pdConfig) {
    form.applyDiscountOn = fromApplyOn(pdConfig.apply_discount_on) as SchemeUnifiedForm["applyDiscountOn"];
    if (asString(pdConfig.discount_setup) === "DIFFERENT_BY_PRODUCT") {
      form.discountMode = "PRODUCT_WISE";
      const items = Array.isArray(detail.product_discount_items)
        ? detail.product_discount_items
        : [];
      form.productDiscountRules = items.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          productId: asString(row.product_id),
          discountType: fromApiDiscountType(row.discount_type),
          discountValue: asString(row.discount_value),
          applyDiscountOn: fromApplyOn(
            row.apply_discount_on,
          ) as ProductDiscountRuleForm["applyDiscountOn"],
        };
      });
      form.productIds = form.productDiscountRules.map((r) => r.productId);
      form.productScope = "Selected Products";
    } else {
      form.discountMode = "COMMON";
      form.discountType = fromApiDiscountType(pdConfig.discount_type);
      form.discountValue = asString(pdConfig.discount_value);
    }
  }

  const neConfig =
    detail.near_expiry_config && typeof detail.near_expiry_config === "object"
      ? (detail.near_expiry_config as Record<string, unknown>)
      : null;

  if (category === "Near Expiry Discount" && neConfig) {
    form.expiryWithinDays = asString(neConfig.expiry_within_days);
    form.discountType = fromApiDiscountType(neConfig.discount_type);
    form.discountValue = asString(neConfig.discount_value);
  }

  const slabs = Array.isArray(detail.slabs) ? detail.slabs : [];

  if (category === "Cash Discount" || category === "Payment Discount") {
    form.paymentDaySlabs =
      slabs.length > 0
        ? slabs.map((item) => {
            const row = item as Record<string, unknown>;
            return {
              id: asString(row.scheme_slab_id) || `slab-${Math.random()}`,
              fromDay: asString(row.from_value),
              toDay:
                row.to_value == null || row.to_value === ""
                  ? ""
                  : asString(row.to_value),
              discountPercentage: asString(row.discount_value),
            };
          })
        : [emptyPaymentDaySlab()];
  }

  if (category === "Turnover Discount") {
    form.turnoverSlabs =
      slabs.length > 0
        ? slabs.map((item) => {
            const row = item as Record<string, unknown>;
            return {
              id: asString(row.scheme_slab_id) || `slab-${Math.random()}`,
              turnoverFrom: asString(row.from_value),
              turnoverTo:
                row.to_value == null || row.to_value === ""
                  ? ""
                  : asString(row.to_value),
              discountPercentage: asString(row.discount_value),
            };
          })
        : [emptyTurnoverSlab()];
  }

  const specialConfig =
    detail.special_config && typeof detail.special_config === "object"
      ? (detail.special_config as Record<string, unknown>)
      : null;

  if (category === "Special Discount") {
    const basedOn = asString(specialConfig?.based_on);
    form.specialDiscountBasedOn =
      basedOn === "SALES_QUANTITY" ? "Sales Quantity" : "Sales Amount";

    form.specialHasSlabs =
      specialConfig?.has_slabs === undefined ||
      specialConfig?.has_slabs === null
        ? true
        : Boolean(specialConfig.has_slabs);

    form.specialThresholdValue =
      specialConfig?.threshold_value != null &&
      specialConfig.threshold_value !== ""
        ? asString(specialConfig.threshold_value)
        : "";

    if (
      !form.specialHasSlabs &&
      specialConfig?.discount_type != null
    ) {
      form.discountType = fromApiDiscountType(specialConfig.discount_type);
      form.discountValue = asString(specialConfig.discount_value ?? "");
    }

    const evalScope = asString(specialConfig?.evaluation_scope);
    form.specialEvaluationScope =
      evalScope === "PER_INVOICE" ? "One Invoice" : "Multiple Invoices";

    const runMode = asString(specialConfig?.settlement_run_mode);
    form.specialSettlementRunMode =
      runMode === "AUTOMATIC" ? "Automatic" : "Manual";

    form.specialCombineProducts =
      asString(specialConfig?.product_evaluation_mode) !== "INDIVIDUAL";

    if (form.specialDiscountBasedOn === "Sales Quantity") {
      const configUom = asString(specialConfig?.uom);
      if (configUom) form.specialDiscountUom = configUom;

      form.specialDiscountQuantitySlabs =
        slabs.length > 0
          ? slabs.map((item) => {
              const row = item as Record<string, unknown>;
              const uom = asString(row.uom) || form.specialDiscountUom || "Case";
              if (uom) form.specialDiscountUom = uom;
              return {
                id: asString(row.scheme_slab_id) || `slab-${Math.random()}`,
                quantityFrom: asString(row.from_value),
                quantityTo:
                  row.to_value == null || row.to_value === ""
                    ? ""
                    : asString(row.to_value),
                uom,
                discountType: fromApiDiscountType(row.discount_type),
                discountValue: asString(row.discount_value),
              };
            })
          : [emptySpecialDiscountQuantitySlab("Case")];
    } else {
      form.specialDiscountAmountSlabs =
        slabs.length > 0
          ? slabs.map((item) => {
              const row = item as Record<string, unknown>;
              return {
                id: asString(row.scheme_slab_id) || `slab-${Math.random()}`,
                eligibleSalesFrom: asString(row.from_value),
                eligibleSalesTo:
                  row.to_value == null || row.to_value === ""
                    ? ""
                    : asString(row.to_value),
                discountType: fromApiDiscountType(row.discount_type),
                discountValue: asString(row.discount_value),
              };
            })
          : [emptySpecialDiscountAmountSlab()];
    }
  }

  void asNumber;
  return form;
}
