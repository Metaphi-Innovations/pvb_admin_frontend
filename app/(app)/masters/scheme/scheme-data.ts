import {
  MASTER_CURRENT_USER,
  masterToday,
  nextMasterCode,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";

export const SCHEME_STORAGE_KEY = "ds_master_scheme_v5";
export const SCHEME_SETTINGS_KEY = "ds_master_scheme_settings_v1";

export type SchemeEffectType =
  | "DIRECT_ORDER_DISCOUNT"
  | "POST_SALES_CN_JV"
  | "POST_PAYMENT_CN_JV";

export type SelectionMode = "Single" | "Multiple";

export interface SchemeEffectConfig {
  effectType: SchemeEffectType;
  appliedIn: string;
  settlementMethod: string;
}

export const SCHEME_EFFECT_MAP: Record<SchemeType, SchemeEffectConfig> = {
  "Product Discount Scheme": {
    effectType: "DIRECT_ORDER_DISCOUNT",
    appliedIn: "Sales Invoice",
    settlementMethod: "Instant Invoice Discount",
  },
  "Product Near Expiry Scheme": {
    effectType: "POST_SALES_CN_JV",
    appliedIn: "Dispatch / Batch Allocation",
    settlementMethod: "Credit Note",
  },
  "Cash Discount Scheme": {
    effectType: "POST_SALES_CN_JV",
    appliedIn: "Receipt Allocation",
    settlementMethod: "Credit Note",
  },
  "Festive Discount Scheme": {
    effectType: "POST_SALES_CN_JV",
    appliedIn: "Sales Order as eligible scheme only",
    settlementMethod: "Credit Note",
  },
  "Turnover Discount Scheme": {
    effectType: "POST_SALES_CN_JV",
    appliedIn: "Scheme Period End",
    settlementMethod: "Credit Note",
  },
  "Payment Discount Scheme": {
    effectType: "POST_PAYMENT_CN_JV",
    appliedIn: "Receipt Allocation",
    settlementMethod: "Credit Note",
  },
  "Special Discount Scheme": {
    effectType: "POST_SALES_CN_JV",
    appliedIn: "Configurable trigger",
    settlementMethod: "Credit Note",
  },
};

export const SCHEME_EFFECT_TYPE_LABELS: Record<SchemeEffectType, string> = {
  DIRECT_ORDER_DISCOUNT: "Direct Order Discount",
  POST_SALES_CN_JV: "Post-Sales CN / JV",
  POST_PAYMENT_CN_JV: "Post-Payment CN / JV",
};

export const SCHEME_TYPES = [
  "Product Discount Scheme",
  "Product Near Expiry Scheme",
  "Cash Discount Scheme",
  "Festive Discount Scheme",
  "Turnover Discount Scheme",
  "Payment Discount Scheme",
  "Special Discount Scheme",
] as const;

export type SchemeType = (typeof SCHEME_TYPES)[number];

/** Canonical categories for Scheme Master configuration (future SO / Accounts consumers). */
export const SCHEME_CATEGORIES = [
  "Product Discount",
  "Near Expiry Discount",
  "Cash Discount",
  "Turnover Discount",
  "Payment Discount",
  "Special Discount",
] as const;

export type SchemeCategory = (typeof SCHEME_CATEGORIES)[number];

export type SchemeCalculationBasis =
  | "Quantity"
  | "Product Value"
  | "Invoice Value"
  | "Turnover Value"
  | "Payment Days"
  | "Fixed Amount"
  | "Manual Approval";

export type SchemeDiscountValueType = "Percentage" | "Fixed Amount" | "Amount Per Unit";

export type SchemeSlabMethod = "Highest Achieved Slab" | "Incremental Slab";

export type SchemeSettlementBehaviour = "Instant Invoice Discount" | "Credit Note";

export type SchemeTriggerEvent =
  | "Sales Invoice"
  | "Dispatch / Batch Allocation"
  | "Receipt Allocation"
  | "Scheme Period End"
  | "Configurable";

export type SchemeProductScopeMode = "All" | "Category" | "Specific Products";

export interface SchemeConfigSlab {
  id: string;
  fromValue: number;
  toValue: number | null;
  discountType: SchemeDiscountValueType;
  discountValue: number;
}

/** Internal condition type — never shown as enum names in the UI. */
export type SchemeConditionType =
  | "PRODUCT"
  | "EXPIRY_DAYS"
  | "PAYMENT_DAYS"
  | "TURNOVER"
  | "PAYMENT_STATUS"
  | "MANUAL_SPECIAL";

export type SchemeApplyDiscountOn =
  | "Product Rate"
  | "Product Line Amount"
  | "Invoice Taxable Value";

export type SchemeCashCalculationOn =
  | "Invoice Taxable Value"
  | "Invoice Total Value"
  | "Outstanding Amount";

export type SchemeTurnoverPeriodUI =
  | "Monthly"
  | "Quarterly"
  | "Half-Yearly"
  | "Yearly"
  | "Scheme Validity Period";

export type SchemeTurnoverCalculationOn =
  | "Taxable Sales"
  | "Net Sales After Returns";

export type SchemePaymentCondition =
  | "Full Payment"
  | "Minimum Payment Percentage"
  | "Payment Within Due Date";

export type SchemePaymentCalculationOn =
  | "Amount Received"
  | "Invoice Value"
  | "Outstanding Amount";

export type SchemeBenefitThrough = "Invoice Discount" | "Credit Note";

export type SchemeBenefitWhen =
  | "During Invoice"
  | "End of Scheme Period"
  | "After Payment"
  | "End of Month"
  | "End of Quarter"
  | "Manual Settlement";

export interface SchemePaymentDaySlab {
  id: string;
  fromDay: number;
  toDay: number;
  discountPercentage: number;
}

export interface SchemeTurnoverConfigSlab {
  id: string;
  turnoverFrom: number;
  /** null / omitted = Above */
  turnoverTo: number | null;
  discountPercentage: number;
}

/** Special Discount — achievement basis (not a direct invoice discount). */
export type SchemeSpecialDiscountBasedOn = "SALES_AMOUNT" | "SALES_QUANTITY";

export interface SchemeSpecialDiscountAmountSlab {
  id: string;
  eligibleSalesFrom: number;
  /** null = Above */
  eligibleSalesTo: number | null;
  discountType: DiscountType;
  discountValue: number;
}

export interface SchemeSpecialDiscountQuantitySlab {
  id: string;
  quantityFrom: number;
  /** null = Above */
  quantityTo: number | null;
  uom: string;
  discountType: DiscountType;
  discountValue: number;
}

/** Generic condition payload — shape varies by conditionType / scheme category. */
export interface SchemeConditionConfig {
  productScope?: "ALL" | "SELECTED";
  productIds?: string[];
  discountType?: DiscountType;
  discountValue?: number;
  applyDiscountOn?: SchemeApplyDiscountOn;
  /** Product Discount only — common vs per-product discount rules. */
  discountMode?: "COMMON" | "PRODUCT_WISE";
  /** Product Discount only — active when discountMode is PRODUCT_WISE. */
  productDiscountRules?: SchemeProductDiscountRule[];
  expiryWithinDays?: number;
  paymentDaySlabs?: SchemePaymentDaySlab[];
  cashCalculationOn?: SchemeCashCalculationOn;
  turnoverPeriod?: SchemeTurnoverPeriodUI;
  turnoverCalculationOn?: SchemeTurnoverCalculationOn;
  turnoverSlabs?: SchemeTurnoverConfigSlab[];
  paymentCondition?: SchemePaymentCondition;
  requiredPaymentPercentage?: number;
  paymentCalculationOn?: SchemePaymentCalculationOn;
  /** Special Discount only — Sales Amount vs Sales Quantity achievement. */
  specialDiscountBasedOn?: SchemeSpecialDiscountBasedOn;
  /** Special Discount — amount achievement slabs (when based on Sales Amount). */
  specialDiscountAmountSlabs?: SchemeSpecialDiscountAmountSlab[];
  /** Special Discount — quantity achievement slabs (when based on Sales Quantity). */
  specialDiscountQuantitySlabs?: SchemeSpecialDiscountQuantitySlab[];
  /** Special Discount — derived UOM from selected products (quantity mode). */
  specialDiscountUom?: string;
}

/** Product Discount — one discount rule per selected product. */
export interface SchemeProductDiscountRule {
  productId: string;
  discountType: DiscountType;
  discountValue: number;
  applyDiscountOn: SchemeApplyDiscountOn;
}

export interface SchemeBenefitConfig {
  benefitType?: DiscountType;
  benefitValue?: number;
  benefitThrough?: SchemeBenefitThrough;
  benefitWhen?: SchemeBenefitWhen;
}

/** Display labels for Scheme Type dropdown (business language). */
export const SCHEME_TYPE_DISPLAY_LABELS: Record<SchemeCategory, string> = {
  "Product Discount": "Product Discount",
  "Near Expiry Discount": "Near Expiry",
  "Cash Discount": "Cash Discount",
  "Turnover Discount": "Turnover Discount",
  "Payment Discount": "Payment Discount",
  "Special Discount": "Special Discount",
};

export const SCHEME_CONDITION_TYPE_BY_CATEGORY: Record<
  SchemeCategory,
  SchemeConditionType
> = {
  "Product Discount": "PRODUCT",
  "Near Expiry Discount": "EXPIRY_DAYS",
  "Cash Discount": "PAYMENT_DAYS",
  "Turnover Discount": "TURNOVER",
  "Payment Discount": "PAYMENT_STATUS",
  "Special Discount": "MANUAL_SPECIAL",
};

export interface SchemeCategoryBehaviour {
  category: SchemeCategory;
  schemeType: SchemeType;
  settlementBehaviour: SchemeSettlementBehaviour;
  triggerEvent: SchemeTriggerEvent;
  defaultCalculationBasis: SchemeCalculationBasis;
  /** Product Discount only — instant on invoice; never on Stock Transfer / Sample Order. */
  appliesInstantlyOnInvoice: boolean;
}

export const SCHEME_CATEGORY_BEHAVIOUR: Record<SchemeCategory, SchemeCategoryBehaviour> = {
  "Product Discount": {
    category: "Product Discount",
    schemeType: "Product Discount Scheme",
    settlementBehaviour: "Instant Invoice Discount",
    triggerEvent: "Sales Invoice",
    defaultCalculationBasis: "Product Value",
    appliesInstantlyOnInvoice: true,
  },
  "Near Expiry Discount": {
    category: "Near Expiry Discount",
    schemeType: "Product Near Expiry Scheme",
    settlementBehaviour: "Credit Note",
    triggerEvent: "Dispatch / Batch Allocation",
    defaultCalculationBasis: "Quantity",
    appliesInstantlyOnInvoice: false,
  },
  "Cash Discount": {
    category: "Cash Discount",
    schemeType: "Cash Discount Scheme",
    settlementBehaviour: "Credit Note",
    triggerEvent: "Receipt Allocation",
    defaultCalculationBasis: "Payment Days",
    appliesInstantlyOnInvoice: false,
  },
  "Turnover Discount": {
    category: "Turnover Discount",
    schemeType: "Turnover Discount Scheme",
    settlementBehaviour: "Credit Note",
    triggerEvent: "Scheme Period End",
    defaultCalculationBasis: "Turnover Value",
    appliesInstantlyOnInvoice: false,
  },
  "Payment Discount": {
    category: "Payment Discount",
    schemeType: "Payment Discount Scheme",
    settlementBehaviour: "Credit Note",
    triggerEvent: "Receipt Allocation",
    defaultCalculationBasis: "Payment Days",
    appliesInstantlyOnInvoice: false,
  },
  "Special Discount": {
    category: "Special Discount",
    schemeType: "Special Discount Scheme",
    settlementBehaviour: "Credit Note",
    triggerEvent: "Configurable",
    defaultCalculationBasis: "Manual Approval",
    appliesInstantlyOnInvoice: false,
  },
};

export function schemeTypeToCategory(type: SchemeType): SchemeCategory | null {
  switch (type) {
    case "Product Discount Scheme":
      return "Product Discount";
    case "Product Near Expiry Scheme":
      return "Near Expiry Discount";
    case "Cash Discount Scheme":
      return "Cash Discount";
    case "Turnover Discount Scheme":
      return "Turnover Discount";
    case "Payment Discount Scheme":
      return "Payment Discount";
    case "Special Discount Scheme":
      return "Special Discount";
    case "Festive Discount Scheme":
      return "Special Discount";
    default:
      return null;
  }
}

export function categoryToSchemeType(category: SchemeCategory): SchemeType {
  return SCHEME_CATEGORY_BEHAVIOUR[category].schemeType;
}

export type ApprovalStatus =
  | "draft"
  | "submitted"
  | "manager_approval"
  | "finance_approval"
  | "final_approval"
  | "approved"
  | "active"
  | "rejected"
  | "expired";

export type CustomerType =
  | "All"
  | "Distributor"
  | "Retailer"
  | "Wholesaler"
  | "Institutional";

export type DiscountType = "Percentage" | "Fixed Amount";
export type FestiveDiscountType = "Percentage" | "Fixed Amount" | "Free Quantity";
export type TurnoverPeriod = "Monthly" | "Quarterly" | "Half-Yearly" | "Annual" | "Custom";
export type PaymentMode =
  | "Cash"
  | "Bank Transfer"
  | "UPI"
  | "Cheque"
  | "Advance"
  | "Early Payment";
export type PaymentTiming = "Immediate" | "Within X Days" | "Advance Payment";
export type OutstandingAgeCondition =
  | "Any"
  | "More than 30 Days"
  | "More than 60 Days"
  | "More than 90 Days"
  | "Custom Days";
export type PaymentOfferBasis =
  | "Fixed Settlement Amount"
  | "Discount / Waiver Amount"
  | "Discount / Waiver %";
export type ProductScope = "All" | "Specific";

export interface TurnoverSlab {
  fromTurnover: number;
  toTurnover: number | null;
  benefitPercent: number;
}

export type DiscountApplicationMode = "same" | "per_product";

export interface ProductDiscountSchemeLine {
  productId: string;
  productCode: string;
  productName: string;
  stateNames: string[];
  dealerPrice: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  finalSchemePrice: number;
  mrp: number;
}

export interface NearExpirySchemeLine {
  productId: string;
  productCode: string;
  productName: string;
  sku: string;
  batchNumber: string;
  expiryDate: string;
  warehouseName: string;
  warehouseState: string;
  dealerPrice: number;
  expiryWithinDays: number;
  benefitType: DiscountType;
  benefitValue: number;
  /** @deprecated Use benefitAmount */
  potentialBenefit?: number;
  benefitAmount: number;
  finalPrice: number;
  mrp: number;
}

export interface SchemeRecord extends BaseMasterRecord {
  schemeCode: string;
  schemeName: string;
  schemeType: SchemeType;
  description?: string;
  batchId?: string;
  effectType?: SchemeEffectType;
  appliedIn?: string;
  settlementMethod?: string;
  productSelectionMode?: SelectionMode;
  stateSelectionMode?: SelectionMode;
  productId?: string;
  productCode?: string;
  productName?: string;
  dealerPrice?: number;
  discountAmount?: number;
  finalSchemePrice?: number;
  mrp?: number;
  discountApplication?: DiscountApplicationMode;
  stateId: string;
  stateName: string;
  customerType: CustomerType;
  /** Multi-select customer types; when set, overrides single customerType for applicability. */
  customerTypes?: CustomerType[];
  discountType?: DiscountType | FestiveDiscountType;
  discountValue?: number;
  freeQuantity?: number;
  priority?: number;
  approvalStatus: ApprovalStatus;
  expiryWithinDays?: number;
  minimumOrderValue?: number;
  festivalName?: string;
  productScope?: ProductScope;
  selectedProductIds?: string[];
  turnoverPeriod?: TurnoverPeriod;
  turnoverSlabs?: TurnoverSlab[];
  customerIds?: string[];
  paymentMode?: PaymentMode;
  paymentTiming?: PaymentTiming;
  paymentWithinDays?: number;
  /** @deprecated Use minimumOutstandingAmount for Payment Discount Scheme */
  minimumPaymentAmount?: number;
  isPaymentLevel?: boolean;
  /** Payment Discount Scheme — outstanding / settlement collection */
  minimumOutstandingAmount?: number;
  outstandingAgeCondition?: OutstandingAgeCondition;
  outstandingDays?: number;
  paymentOfferBasis?: PaymentOfferBasis;
  originalOutstandingAmount?: number;
  customerPayableAmount?: number;
  waiverAmount?: number;
  waiverPercent?: number;
  startDate?: string;
  endDate?: string;
  /** Product Discount Scheme line items (one row per product in create/edit UI) */
  schemeLines?: ProductDiscountSchemeLine[];
  /** Product Near Expiry Scheme line items (one row per product) */
  nearExpiryLines?: NearExpirySchemeLine[];

  // ── Unified Scheme Master configuration (generic for all scheme types) ──
  /** Canonical category; derived from schemeType when missing. */
  schemeCategory?: SchemeCategory;
  conditionType?: SchemeConditionType;
  conditionConfig?: SchemeConditionConfig;
  benefitConfig?: SchemeBenefitConfig;
  /** @deprecated Prefer conditionConfig — retained for backward compatibility. */
  calculationBasis?: SchemeCalculationBasis;
  /** @deprecated Prefer conditionConfig — retained for backward compatibility. */
  slabMethod?: SchemeSlabMethod;
  /** @deprecated Prefer conditionConfig.paymentDaySlabs / turnoverSlabs. */
  configSlabs?: SchemeConfigSlab[];
  /** @deprecated Internal settlement; not shown in UI. */
  settlementBehaviour?: SchemeSettlementBehaviour;
  /** @deprecated Internal trigger; not shown in UI. */
  triggerEvent?: SchemeTriggerEvent;
  /** @deprecated Not used in new UI; preserved on existing records. */
  configurableTriggerNote?: string;
  productScopeMode?: SchemeProductScopeMode;
  /** @deprecated Not shown in new UI; preserved for legacy Category-scoped records. */
  categoryIds?: string[];
  /** @deprecated Not shown in new UI. */
  minimumQuantity?: number;
  /** System rule: only Product Discount applies instantly; others settle via CN. */
  excludeStockTransferSampleOrder?: boolean;
  /** Exclude this scheme amount from Turnover Discount calculation. */
  deductFromTurnoverBase?: boolean;
  /** Exclude this scheme amount from Cash Discount calculation. */
  deductFromCashDiscountBase?: boolean;
  /** @deprecated Not shown in new UI; preserved for accounting integration later. */
  accountingDiscountLedgerId?: number | null;
  accountingDiscountLedgerName?: string;
  accountingCreditNoteLedgerId?: number | null;
  accountingCreditNoteLedgerName?: string;
  accountingExpenseLedgerId?: number | null;
  accountingExpenseLedgerName?: string;
  accountingReasonCode?: string;
  /** @deprecated Not shown in new UI. */
  approvalRequired?: boolean;
  selectionRuleNote?: string;
}

export interface SchemeBulkForm {
  schemeType: SchemeType;
  schemeName: string;
  description: string;
  productSelectionMode: SelectionMode;
  stateSelectionMode: SelectionMode;
  productIds: string[];
  stateIds: string[];
  customerType: CustomerType;
  discountType: DiscountType | FestiveDiscountType;
  discountValue: string;
  freeQuantity: string;
  priority: string;
  status: MasterStatus;
  startDate: string;
  endDate: string;
  expiryWithinDays: string;
  minimumOrderValue: string;
  festivalName: string;
  productScope: ProductScope;
  turnoverPeriod: TurnoverPeriod;
  turnoverSlabs: { fromTurnover: string; toTurnover: string; benefitPercent: string }[];
  customerIds: string[];
  paymentMode: PaymentMode;
  paymentTiming: PaymentTiming;
  paymentWithinDays: string;
  minimumPaymentAmount: string;
}

export interface SchemeSettings {
  allowMultipleSchemes: boolean;
  applyHighestBenefit: boolean;
  priorityOverride: boolean;
}

export const DEFAULT_SCHEME_SETTINGS: SchemeSettings = {
  allowMultipleSchemes: false,
  applyHighestBenefit: true,
  priorityOverride: true,
};

export const SCHEME_PRODUCT_OPTIONS = [
  { id: "PRD-001", name: "Product A" },
  { id: "PRD-002", name: "Product B" },
  { id: "PRD-003", name: "Product C" },
  { id: "PRD-004", name: "Product D" },
];

export const SCHEME_STATE_OPTIONS = [
  { id: "MH", name: "Maharashtra" },
  { id: "GJ", name: "Gujarat" },
  { id: "KA", name: "Karnataka" },
  { id: "TN", name: "Tamil Nadu" },
  { id: "DL", name: "Delhi" },
];

export const SCHEME_CUSTOMER_OPTIONS = [
  { id: "CUST-001", name: "Sharma Distributors" },
  { id: "CUST-002", name: "Patel Retail Hub" },
  { id: "CUST-003", name: "Metro Wholesalers" },
  { id: "CUST-004", name: "ABC Distributor" },
];

export const SCHEME_TYPE_PRIORITY: Record<SchemeType, number> = {
  "Product Near Expiry Scheme": 1,
  "Festive Discount Scheme": 2,
  "Product Discount Scheme": 3,
  "Cash Discount Scheme": 4,
  "Payment Discount Scheme": 5,
  "Turnover Discount Scheme": 6,
  "Special Discount Scheme": 7,
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  manager_approval: "Manager Approval",
  finance_approval: "Finance Approval",
  final_approval: "Final Approval",
  approved: "Approved",
  active: "Active",
  rejected: "Rejected",
  expired: "Expired",
};

export const PENDING_APPROVAL_STATUSES: ApprovalStatus[] = [
  "submitted",
  "manager_approval",
  "finance_approval",
  "final_approval",
];

/** Draft, pending approval, or rejected schemes may be edited. */
export function isSchemeEditable(record: SchemeRecord): boolean {
  return (
    record.approvalStatus === "draft" ||
    PENDING_APPROVAL_STATUSES.includes(record.approvalStatus) ||
    record.approvalStatus === "rejected"
  );
}

const APPROVAL_FLOW: ApprovalStatus[] = [
  "submitted",
  "manager_approval",
  "finance_approval",
  "final_approval",
  "approved",
  "active",
];

export const DEFAULT_SCHEME_BULK_FORM: SchemeBulkForm = {
  schemeType: "Product Discount Scheme",
  schemeName: "",
  description: "",
  productSelectionMode: "Multiple",
  stateSelectionMode: "Multiple",
  productIds: [],
  stateIds: [],
  customerType: "All",
  discountType: "Percentage",
  discountValue: "",
  freeQuantity: "",
  priority: "",
  status: "inactive",
  startDate: "",
  endDate: "",
  expiryWithinDays: "",
  minimumOrderValue: "",
  festivalName: "",
  productScope: "Specific",
  turnoverPeriod: "Monthly",
  turnoverSlabs: [{ fromTurnover: "", toTurnover: "", benefitPercent: "" }],
  customerIds: [],
  paymentMode: "Cash",
  paymentTiming: "Immediate",
  paymentWithinDays: "",
  minimumPaymentAmount: "",
};

export function getSchemeEffectConfig(type: SchemeType): SchemeEffectConfig {
  return SCHEME_EFFECT_MAP[type];
}

export function generateBatchId(): string {
  const stamp = masterToday().replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BATCH-${stamp}-${suffix}`;
}

export function applyEffectFields(
  record: Omit<SchemeRecord, "effectType" | "appliedIn" | "settlementMethod"> & {
    schemeType: SchemeType;
  },
): Pick<SchemeRecord, "effectType" | "appliedIn" | "settlementMethod"> {
  const config = getSchemeEffectConfig(record.schemeType);
  return {
    effectType: config.effectType,
    appliedIn: config.appliedIn,
    settlementMethod: config.settlementMethod,
  };
}

export function migrateSchemeRecord(record: SchemeRecord): SchemeRecord {
  let next: SchemeRecord = record;

  if (record.schemeType === "Product Discount Scheme") {
    if (!record.schemeLines?.length) {
      const dealerPrice = record.dealerPrice ?? 0;
      const discountValue = record.discountValue ?? 0;
      const isPct = record.discountType === "Percentage";
      const discountAmount =
        record.discountAmount ??
        (isPct ? (dealerPrice * discountValue) / 100 : discountValue);
      const finalSchemePrice =
        record.finalSchemePrice ?? Math.max(0, dealerPrice - discountAmount);
      const line: ProductDiscountSchemeLine | null =
        record.productId && record.stateName
          ? {
              productId: record.productId,
              productCode: record.productCode ?? "",
              productName: record.productName ?? "",
              stateNames: [record.stateName],
              dealerPrice: dealerPrice || 0,
              discountType: record.discountType === "Fixed Amount" ? "Fixed Amount" : "Percentage",
              discountValue,
              discountAmount: discountAmount || 0,
              finalSchemePrice: finalSchemePrice || 0,
              mrp: record.mrp ?? 0,
            }
          : null;

      next = {
        ...record,
        schemeLines: line ? [line] : [],
        dealerPrice: dealerPrice || undefined,
        discountAmount: discountAmount || undefined,
        finalSchemePrice: finalSchemePrice || undefined,
      };
    }
  } else {
    const effect = applyEffectFields(record);
    next = {
      ...record,
      ...effect,
      stateSelectionMode: record.stateSelectionMode ?? "Single",
      productSelectionMode: record.productSelectionMode,
      batchId: record.batchId,
    };
  }

  // Enrich with unified Scheme Master configuration defaults (additive).
  const category = schemeTypeToCategory(next.schemeType);
  if (category) {
    const behaviour = SCHEME_CATEGORY_BEHAVIOUR[category];
    next = {
      ...next,
      schemeCategory: next.schemeCategory ?? category,
      conditionType: next.conditionType ?? SCHEME_CONDITION_TYPE_BY_CATEGORY[category],
      calculationBasis: next.calculationBasis ?? behaviour.defaultCalculationBasis,
      slabMethod: next.slabMethod ?? "Highest Achieved Slab",
      settlementBehaviour: behaviour.settlementBehaviour,
      triggerEvent: next.triggerEvent ?? behaviour.triggerEvent,
      excludeStockTransferSampleOrder:
        next.excludeStockTransferSampleOrder ?? behaviour.appliesInstantlyOnInvoice,
      deductFromTurnoverBase: next.deductFromTurnoverBase ?? false,
      deductFromCashDiscountBase: next.deductFromCashDiscountBase ?? false,
      approvalRequired: next.approvalRequired ?? false,
      selectionRuleNote:
        next.selectionRuleNote ??
        "Only one eligible scheme may be selected per Sales Order. Ineligible schemes cannot be forced.",
    };
  }

  return next;
}

export const SCHEME_SEED: SchemeRecord[] = [
  {
    id: 1,
    schemeCode: "SCH-001",
    schemeName: "Kharif NPK Distributor Offer",
    schemeType: "Product Discount Scheme",
    schemeCategory: "Product Discount",
    customerType: "Distributor",
    stateId: "Maharashtra",
    stateName: "Maharashtra, Gujarat",
    approvalStatus: "active",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-01-05",
    updatedAt: "2026-01-05",
    schemeLines: [
      {
        productId: "1",
        productCode: "PRD-001",
        productName: "NPK 19:19:19",
        stateNames: ["Maharashtra", "Gujarat"],
        dealerPrice: 1050,
        discountType: "Percentage",
        discountValue: 5,
        discountAmount: 52.5,
        finalSchemePrice: 997.5,
        mrp: 1250,
      },
    ],
  },
  {
    id: 2,
    schemeCode: "NE-001",
    schemeName: "Near Expiry 30 Days Offer",
    schemeType: "Product Near Expiry Scheme",
    schemeCategory: "Near Expiry Discount",
    stateId: "Maharashtra",
    stateName: "Maharashtra, Gujarat",
    customerType: "Distributor",
    discountType: "Percentage",
    discountValue: 10,
    expiryWithinDays: 30,
    approvalStatus: "active",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-06-01",
    updatedAt: "2026-06-20",
    nearExpiryLines: [
      {
        productId: "10",
        productCode: "BIO-000001",
        productName: "Bio Fertilizer A",
        sku: "BIO-000001",
        batchNumber: "B001",
        expiryDate: "2026-07-21",
        warehouseName: "Central Warehouse",
        warehouseState: "Maharashtra",
        dealerPrice: 420,
        expiryWithinDays: 30,
        benefitType: "Percentage",
        benefitValue: 10,
        benefitAmount: 42,
        finalPrice: 378,
        mrp: 650,
      },
    ],
  },
];

/** Canonical seed codes retained in Scheme Master (one per main category). */
const CANONICAL_SCHEME_SEED_CODES = new Set([
  "SCH-001",
  "NE-001",
  "CSH-001",
  "TUR-001",
  "PAY-001",
]);

/** Former sample / duplicate scheme codes removed from seed — pruned from local storage on load. */
const OBSOLETE_SAMPLE_SCHEME_CODES = new Set([
  "SCH-002",
  "SCH-003",
  "SCH-004",
  "SCH-005",
  "SCH-006",
  "SCH-007",
  "SCH-008",
  "FST-001",
  "FST-002",
  "CSH-002",
  "TUR-002",
  "PAY-002",
]);

/** Sample scheme codes kept in sync with SCHEME_SEED for Sales Order testing. */
const REFRESHABLE_SCHEME_CODES = CANONICAL_SCHEME_SEED_CODES;

/** Preserve draft — schemes start as Draft and move to Submitted via explicit submit. */
export function normalizeSchemeApprovalStatus(record: SchemeRecord): SchemeRecord {
  return record;
}

/** Merge missing seed schemes and refresh sample schemes from seed data. */
export function mergeSchemeSeedRecords(
  stored: SchemeRecord[],
  seed: SchemeRecord[],
): SchemeRecord[] {
  const pruned = stored
    .map(normalizeSchemeApprovalStatus)
    .filter((record) => !OBSOLETE_SAMPLE_SCHEME_CODES.has(record.schemeCode));
  const merged = pruned;
  const indexByCode = new Map(merged.map((record, index) => [record.schemeCode, index]));
  let nextId = merged.length ? Math.max(...merged.map((record) => record.id)) + 1 : 1;

  for (const seedRecord of seed) {
    const existingIndex = indexByCode.get(seedRecord.schemeCode);
    if (existingIndex === undefined) {
      const id = seedRecord.id > 0 ? seedRecord.id : nextId++;
      merged.push({ ...seedRecord, id });
      indexByCode.set(seedRecord.schemeCode, merged.length - 1);
      continue;
    }

    const existing = merged[existingIndex];
    if (REFRESHABLE_SCHEME_CODES.has(seedRecord.schemeCode)) {
      merged[existingIndex] = { ...seedRecord, id: existing.id };
      continue;
    }
  }

  return merged;
}

export function schemeTypeUsesProducts(type: SchemeType): boolean {
  return (
    type === "Product Discount Scheme" ||
    type === "Product Near Expiry Scheme" ||
    type === "Festive Discount Scheme"
  );
}

export function schemeTypeRequiresProducts(type: SchemeType, productScope?: ProductScope): boolean {
  if (type === "Festive Discount Scheme") return productScope === "Specific";
  return schemeTypeUsesProducts(type);
}

export function loadSchemeSettings(): SchemeSettings {
  if (typeof window === "undefined") return DEFAULT_SCHEME_SETTINGS;
  try {
    const raw = localStorage.getItem(SCHEME_SETTINGS_KEY);
    if (!raw) return DEFAULT_SCHEME_SETTINGS;
    return { ...DEFAULT_SCHEME_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SCHEME_SETTINGS;
  }
}

export function saveSchemeSettings(settings: SchemeSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SCHEME_SETTINGS_KEY, JSON.stringify(settings));
}

export function getDefaultPriority(type: SchemeType, override?: string): number {
  if (override?.trim()) {
    const n = parseInt(override, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return SCHEME_TYPE_PRIORITY[type];
}

export function formatBenefit(record: SchemeRecord): string {
  if (record.schemeType === "Turnover Discount Scheme" && record.turnoverSlabs?.length) {
    const first = record.turnoverSlabs[0];
    const last = record.turnoverSlabs[record.turnoverSlabs.length - 1];
    return `${first.benefitPercent}%–${last.benefitPercent}% slabs`;
  }
  if (record.schemeType === "Product Near Expiry Scheme") {
    const benefit =
      record.discountType === "Fixed Amount"
        ? `₹${record.discountValue ?? 0}`
        : `${record.discountValue ?? 0}%`;
    return `${benefit} (≤${record.expiryWithinDays ?? 0}d)`;
  }
  if (record.discountType === "Free Quantity") {
    return `${record.freeQuantity ?? record.discountValue ?? 0} Qty Free`;
  }
  if (record.discountType === "Percentage") {
    return `${record.discountValue ?? 0}%`;
  }
  if (record.discountType === "Fixed Amount") {
    return `₹${record.discountValue ?? 0}`;
  }
  return "—";
}

export function formatValidity(record: SchemeRecord): string {
  if (!record.startDate && !record.endDate) return "—";
  return `${record.startDate ?? "—"} → ${record.endDate ?? "—"}`;
}

export function isSchemeExpired(record: SchemeRecord): boolean {
  if (!record.endDate) return false;
  return record.endDate < masterToday();
}

export type SchemeOperationalStatus = "Active" | "Inactive" | "Pending";

/** Listing / view status: Active, Inactive, or Pending (in approval workflow). */
export function resolveSchemeOperationalStatus(record: SchemeRecord): SchemeOperationalStatus {
  if (PENDING_APPROVAL_STATUSES.includes(record.approvalStatus)) {
    return "Pending";
  }
  if (
    record.approvalStatus === "active" &&
    record.status === "active" &&
    !isSchemeExpired(record)
  ) {
    return "Active";
  }
  return "Inactive";
}

export function resolveDisplayApprovalStatus(record: SchemeRecord): ApprovalStatus {
  if (record.approvalStatus === "rejected") {
    return record.approvalStatus;
  }
  if (record.approvalStatus === "draft") {
    return "draft";
  }
  if (isSchemeExpired(record)) {
    return "expired";
  }
  return record.approvalStatus;
}

export function matchesListingTab(record: SchemeRecord, tab: string): boolean {
  const status = resolveDisplayApprovalStatus(record);
  switch (tab) {
    case "all":
      return true;
    case "pending":
      return status === "draft" || PENDING_APPROVAL_STATUSES.includes(status);
    case "approved":
      return status === "approved";
    case "active":
      return status === "active" && record.status === "active";
    case "expired":
      return status === "expired";
    case "rejected":
      return status === "rejected";
    default:
      return true;
  }
}

export function canEditRecord(record: SchemeRecord): boolean {
  return isSchemeEditable(record);
}

export function canSubmitRecord(record: SchemeRecord): boolean {
  return record.approvalStatus === "draft" || record.approvalStatus === "rejected";
}

export function canApproveRecord(record: SchemeRecord): boolean {
  return PENDING_APPROVAL_STATUSES.includes(record.approvalStatus);
}

export function canRejectRecord(record: SchemeRecord): boolean {
  return PENDING_APPROVAL_STATUSES.includes(record.approvalStatus);
}

export function canSendBackRecord(record: SchemeRecord): boolean {
  return PENDING_APPROVAL_STATUSES.includes(record.approvalStatus);
}

export function canActivateRecord(record: SchemeRecord): boolean {
  return record.approvalStatus === "approved";
}

export function canDeactivateRecord(record: SchemeRecord): boolean {
  return record.approvalStatus === "active" && record.status === "active";
}

export function canCopyRecord(record: SchemeRecord): boolean {
  if (resolveDisplayApprovalStatus(record) === "expired") return false;
  return record.approvalStatus === "rejected";
}

export function nextApprovalStatus(current: ApprovalStatus): ApprovalStatus | null {
  const idx = APPROVAL_FLOW.indexOf(current);
  if (idx < 0 || idx >= APPROVAL_FLOW.length - 1) return null;
  return APPROVAL_FLOW[idx + 1];
}

export function approveRecord(record: SchemeRecord): SchemeRecord {
  const next = nextApprovalStatus(record.approvalStatus);
  if (!next) return record;
  const today = masterToday();
  return {
    ...record,
    approvalStatus: next,
    status: next === "active" ? "active" : record.status,
    updatedBy: MASTER_CURRENT_USER,
    updatedAt: today,
  };
}

export function sendBackRecord(record: SchemeRecord): SchemeRecord {
  if (!PENDING_APPROVAL_STATUSES.includes(record.approvalStatus)) return record;
  const today = masterToday();
  return {
    ...record,
    approvalStatus: "rejected",
    status: "inactive",
    updatedBy: MASTER_CURRENT_USER,
    updatedAt: today,
  };
}

export function activateRecord(record: SchemeRecord): SchemeRecord {
  if (record.approvalStatus !== "approved") return record;
  const today = masterToday();
  return {
    ...record,
    approvalStatus: "active",
    status: "active",
    updatedBy: MASTER_CURRENT_USER,
    updatedAt: today,
  };
}

export function rejectRecord(record: SchemeRecord): SchemeRecord {
  return {
    ...record,
    approvalStatus: "rejected",
    status: "inactive",
    updatedBy: MASTER_CURRENT_USER,
    updatedAt: masterToday(),
  };
}

export function submitRecord(record: SchemeRecord): SchemeRecord {
  return {
    ...record,
    approvalStatus: "submitted",
    updatedBy: MASTER_CURRENT_USER,
    updatedAt: masterToday(),
  };
}

export function deactivateRecord(record: SchemeRecord): SchemeRecord {
  const today = masterToday();
  return {
    ...record,
    approvalStatus: "approved",
    status: "inactive",
    updatedBy: MASTER_CURRENT_USER,
    updatedAt: today,
  };
}

export function recordToBulkForm(record: SchemeRecord): SchemeBulkForm {
  return {
    schemeType: record.schemeType,
    schemeName: record.schemeName.replace(` - ${record.stateName}`, "").replace(` - ${record.productName ?? ""}`, ""),
    description: record.description ?? "",
    productSelectionMode: record.productSelectionMode ?? "Single",
    stateSelectionMode: record.stateSelectionMode ?? "Single",
    productIds: record.productId ? [record.productId] : [],
    stateIds: [record.stateId],
    customerType: record.customerType,
    discountType: record.discountType ?? "Percentage",
    discountValue: record.discountValue !== undefined ? String(record.discountValue) : "",
    freeQuantity: record.freeQuantity !== undefined ? String(record.freeQuantity) : "",
    priority: String(record.priority),
    status: record.status,
    startDate: record.startDate ?? "",
    endDate: record.endDate ?? "",
    expiryWithinDays: record.expiryWithinDays !== undefined ? String(record.expiryWithinDays) : "",
    minimumOrderValue: record.minimumOrderValue !== undefined ? String(record.minimumOrderValue) : "",
    festivalName: record.festivalName ?? "",
    productScope: record.productScope ?? (record.productId ? "Specific" : "All"),
    turnoverPeriod: record.turnoverPeriod ?? "Monthly",
    turnoverSlabs:
      record.turnoverSlabs?.map((s) => ({
        fromTurnover: String(s.fromTurnover),
        toTurnover: s.toTurnover !== null ? String(s.toTurnover) : "",
        benefitPercent: String(s.benefitPercent),
      })) ?? [{ fromTurnover: "", toTurnover: "", benefitPercent: "" }],
    customerIds: record.customerIds ?? [],
    paymentMode: record.paymentMode ?? "Cash",
    paymentTiming: record.paymentTiming ?? "Immediate",
    paymentWithinDays: record.paymentWithinDays !== undefined ? String(record.paymentWithinDays) : "",
    minimumPaymentAmount:
      record.minimumPaymentAmount !== undefined ? String(record.minimumPaymentAmount) : "",
  };
}

function enforceSelectionLimits(ids: string[], mode: SelectionMode): string[] {
  if (mode === "Single" && ids.length > 1) return [ids[0]];
  return ids;
}

export function validateSchemeBulkForm(form: SchemeBulkForm, mode: "add" | "edit"): string | null {
  if (form.schemeType === "Product Discount Scheme") {
    return "Use the Product Discount Scheme form to create or edit this scheme type.";
  }
  if (form.schemeType === "Product Near Expiry Scheme") {
    return "Use the Product Near Expiry Scheme form to create or edit this scheme type.";
  }

  const productIds = enforceSelectionLimits(form.productIds, form.productSelectionMode);
  const stateIds = enforceSelectionLimits(form.stateIds, form.stateSelectionMode);

  if (!stateIds.length) return "Select at least one state.";
  if (form.stateSelectionMode === "Single" && form.stateIds.length > 1) {
    return "State selection mode is Single — select only one state.";
  }
  if (schemeTypeRequiresProducts(form.schemeType, form.productScope) && !productIds.length) {
    return "Select at least one product.";
  }
  if (form.schemeType === "Festive Discount Scheme" && !form.festivalName.trim()) {
    return "Festival / campaign name is required.";
  }
  if (
    form.schemeType !== "Turnover Discount Scheme" &&
    form.discountType !== "Free Quantity"
  ) {
    if (!form.discountValue || parseFloat(form.discountValue) <= 0) {
      return "Discount value must be greater than 0.";
    }
  }
  if (form.discountType === "Free Quantity") {
    const qty = form.freeQuantity || form.discountValue;
    if (!qty || parseFloat(qty) <= 0) return "Free quantity is required.";
  }
  if (form.schemeType === "Cash Discount Scheme" || form.schemeType === "Festive Discount Scheme") {
    if (form.minimumOrderValue && parseFloat(form.minimumOrderValue) < 0) {
      return "Minimum order value cannot be negative.";
    }
  }
  if (form.schemeType === "Turnover Discount Scheme") {
    if (!form.turnoverSlabs.length) return "Add at least one turnover slab.";
    for (const slab of form.turnoverSlabs) {
      if (!slab.fromTurnover || !slab.benefitPercent) return "Complete all turnover slab fields.";
      if (parseFloat(slab.benefitPercent) <= 0) return "Benefit % must be greater than 0.";
    }
  }
  if (form.schemeType === "Payment Discount Scheme") {
    if (!form.minimumPaymentAmount || parseFloat(form.minimumPaymentAmount) <= 0) {
      return "Minimum payment amount is required.";
    }
  }
  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    return "End date must be after start date.";
  }
  if (mode === "add" && !form.schemeName.trim() && form.schemeType !== "Festive Discount Scheme") {
    // scheme name optional for bulk — derived from product/state
  }
  return null;
}

interface BulkCombo {
  productId?: string;
  productName?: string;
  stateId: string;
  stateName: string;
}

function buildCombos(form: SchemeBulkForm): BulkCombo[] {
  const stateIds = enforceSelectionLimits(form.stateIds, form.stateSelectionMode);
  const productIds = enforceSelectionLimits(form.productIds, form.productSelectionMode);
  const states = SCHEME_STATE_OPTIONS.filter((s) => stateIds.includes(s.id));
  const products = SCHEME_PRODUCT_OPTIONS.filter((p) => productIds.includes(p.id));

  if (!schemeTypeUsesProducts(form.schemeType)) {
    return states.map((s) => ({ stateId: s.id, stateName: s.name }));
  }
  if (form.schemeType === "Festive Discount Scheme" && form.productScope === "All") {
    return states.map((s) => ({ stateId: s.id, stateName: s.name, productName: "All Products" }));
  }
  const combos: BulkCombo[] = [];
  for (const product of products) {
    for (const state of states) {
      combos.push({
        productId: product.id,
        productName: product.name,
        stateId: state.id,
        stateName: state.name,
      });
    }
  }
  return combos;
}

function buildSchemeName(
  form: SchemeBulkForm,
  combo: BulkCombo,
): string {
  if (form.schemeType === "Festive Discount Scheme" && form.festivalName.trim()) {
    const productPart = combo.productName ?? "All Products";
    return `${form.festivalName.trim()} - ${productPart} - ${combo.stateName}`;
  }
  if (form.schemeName.trim()) {
    const parts = [form.schemeName.trim()];
    if (combo.productName) parts.push(combo.productName);
    parts.push(combo.stateName);
    return parts.join(" - ");
  }
  if (combo.productName) {
    return `${combo.productName} - ${combo.stateName} Scheme`;
  }
  return `${form.schemeType} - ${combo.stateName}`;
}

function parseTurnoverSlabs(
  slabs: SchemeBulkForm["turnoverSlabs"],
): TurnoverSlab[] {
  return slabs.map((s, i, arr) => ({
    fromTurnover: parseFloat(s.fromTurnover),
    toTurnover: s.toTurnover.trim() ? parseFloat(s.toTurnover) : i === arr.length - 1 ? null : parseFloat(s.toTurnover),
    benefitPercent: parseFloat(s.benefitPercent),
  }));
}

export function bulkFormToRecords(
  form: SchemeBulkForm,
  existingRecords: SchemeRecord[],
  startId: number,
  batchId?: string,
): SchemeRecord[] {
  const combos = buildCombos(form);
  const existingCodes = existingRecords.map((r) => r.schemeCode);
  const codes: string[] = [];
  for (let i = 0; i < combos.length; i++) {
    const code = nextMasterCode("SCH-", [...existingCodes, ...codes]);
    codes.push(code);
  }

  const now = masterToday();
  const priority = getDefaultPriority(form.schemeType, form.priority);
  const isPaymentLevel = form.schemeType === "Payment Discount Scheme";
  const effect = getSchemeEffectConfig(form.schemeType);
  const parentBatchId = batchId ?? generateBatchId();

  return combos.map((combo, index) => {
    const discountValue =
      form.discountType === "Free Quantity"
        ? parseFloat(form.freeQuantity || form.discountValue)
        : form.discountValue
          ? parseFloat(form.discountValue)
          : undefined;

    const record: SchemeRecord = {
      id: startId + index,
      schemeCode: codes[index],
      schemeName: buildSchemeName(form, combo),
      schemeType: form.schemeType,
      description: form.description.trim() || undefined,
      batchId: parentBatchId,
      effectType: effect.effectType,
      appliedIn: effect.appliedIn,
      settlementMethod: effect.settlementMethod,
      productSelectionMode:
        form.schemeType === "Product Discount Scheme" ? form.productSelectionMode : undefined,
      stateSelectionMode: form.stateSelectionMode ?? "Multiple",
      productId: combo.productId,
      productName: combo.productName,
      stateId: combo.stateId,
      stateName: combo.stateName,
      customerType: form.customerType,
      discountType: form.schemeType === "Turnover Discount Scheme" ? undefined : form.discountType,
      discountValue: form.schemeType === "Turnover Discount Scheme" ? undefined : discountValue,
      freeQuantity:
        form.discountType === "Free Quantity" ? parseFloat(form.freeQuantity || form.discountValue) : undefined,
      priority,
      approvalStatus: "submitted",
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      status: form.status === "active" ? "inactive" : form.status,
      createdBy: MASTER_CURRENT_USER,
      updatedBy: MASTER_CURRENT_USER,
      createdAt: now,
      updatedAt: now,
      isPaymentLevel,
    };

    if (form.schemeType === "Product Near Expiry Scheme") {
      record.expiryWithinDays = parseInt(form.expiryWithinDays, 10);
    }
    if (form.schemeType === "Cash Discount Scheme" || form.schemeType === "Festive Discount Scheme") {
      record.minimumOrderValue = form.minimumOrderValue ? parseFloat(form.minimumOrderValue) : undefined;
    }
    if (form.schemeType === "Festive Discount Scheme") {
      record.festivalName = form.festivalName.trim();
      record.productScope = form.productScope;
    }
    if (form.schemeType === "Turnover Discount Scheme") {
      record.turnoverPeriod = form.turnoverPeriod;
      record.turnoverSlabs = parseTurnoverSlabs(form.turnoverSlabs);
      record.customerIds = form.customerIds.length ? form.customerIds : undefined;
    }
    if (form.schemeType === "Payment Discount Scheme") {
      record.paymentMode = form.paymentMode;
      record.paymentTiming = form.paymentTiming;
      record.paymentWithinDays =
        form.paymentTiming === "Within X Days" ? parseInt(form.paymentWithinDays, 10) : undefined;
      record.minimumPaymentAmount = parseFloat(form.minimumPaymentAmount);
    }

    return record;
  });
}

export function bulkFormToSingleRecord(
  form: SchemeBulkForm,
  id: number,
  existing: SchemeRecord,
): SchemeRecord {
  const [record] = bulkFormToRecords(form, [], id, existing.batchId);
  return {
    ...record,
    id: existing.id,
    schemeCode: existing.schemeCode,
    batchId: existing.batchId,
    approvalStatus:
      existing.approvalStatus === "draft" ? "submitted" : existing.approvalStatus,
    createdBy: existing.createdBy,
    createdAt: existing.createdAt,
    updatedBy: MASTER_CURRENT_USER,
    updatedAt: masterToday(),
  };
}

export function copyRecord(record: SchemeRecord, newId: number, newCode: string): SchemeRecord {
  const now = masterToday();
  return {
    ...record,
    id: newId,
    schemeCode: newCode,
    batchId: generateBatchId(),
    approvalStatus: "submitted",
    status: "inactive",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: now,
    updatedAt: now,
  };
}

export function schemeNeedsReapproval(record: SchemeRecord): SchemeRecord {
  return {
    ...record,
    approvalStatus: "submitted",
    status: "inactive",
    updatedBy: MASTER_CURRENT_USER,
    updatedAt: masterToday(),
  };
}
