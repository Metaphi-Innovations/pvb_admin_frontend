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
    appliedIn: "Sales Order",
    settlementMethod: "Immediate Order Discount",
  },
  "Product Near Expiry Scheme": {
    effectType: "POST_SALES_CN_JV",
    appliedIn: "Sales Order as eligible scheme only",
    settlementMethod: "Credit Note / Journal Voucher",
  },
  "Cash Discount Scheme": {
    effectType: "POST_SALES_CN_JV",
    appliedIn: "Sales Order as eligible scheme only",
    settlementMethod: "Credit Note / Journal Voucher",
  },
  "Festive Discount Scheme": {
    effectType: "POST_SALES_CN_JV",
    appliedIn: "Sales Order as eligible scheme only",
    settlementMethod: "Credit Note / Journal Voucher",
  },
  "Turnover Discount Scheme": {
    effectType: "POST_SALES_CN_JV",
    appliedIn: "Turnover review / Accounts settlement",
    settlementMethod: "Credit Note / Journal Voucher",
  },
  "Payment Discount Scheme": {
    effectType: "POST_PAYMENT_CN_JV",
    appliedIn: "Payment receipt / Accounts settlement",
    settlementMethod: "Credit Note / Journal Voucher",
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
] as const;

export type SchemeType = (typeof SCHEME_TYPES)[number];

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
  discountType?: DiscountType | FestiveDiscountType;
  discountValue?: number;
  freeQuantity?: number;
  priority?: number;
  approvalStatus: ApprovalStatus;
  expiryWithinDays?: number;
  minimumOrderValue?: number;
  festivalName?: string;
  productScope?: ProductScope;
  turnoverPeriod?: TurnoverPeriod;
  turnoverSlabs?: TurnoverSlab[];
  customerIds?: string[];
  paymentMode?: PaymentMode;
  paymentTiming?: PaymentTiming;
  paymentWithinDays?: number;
  minimumPaymentAmount?: number;
  isPaymentLevel?: boolean;
  startDate?: string;
  endDate?: string;
  /** Product Discount Scheme line items (one row per product in create/edit UI) */
  schemeLines?: ProductDiscountSchemeLine[];
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
];

export const SCHEME_TYPE_PRIORITY: Record<SchemeType, number> = {
  "Product Near Expiry Scheme": 1,
  "Festive Discount Scheme": 2,
  "Product Discount Scheme": 3,
  "Cash Discount Scheme": 4,
  "Payment Discount Scheme": 5,
  "Turnover Discount Scheme": 6,
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

/** Schemes in pending approval or rejected may be edited (no draft state). */
export function isSchemeEditable(record: SchemeRecord): boolean {
  return (
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
  if (record.schemeType === "Product Discount Scheme") {
    if (record.schemeLines?.length) {
      return record;
    }
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

    return {
      ...record,
      schemeLines: line ? [line] : [],
      dealerPrice: dealerPrice || undefined,
      discountAmount: discountAmount || undefined,
      finalSchemePrice: finalSchemePrice || undefined,
    };
  }

  const effect = applyEffectFields(record);
  return {
    ...record,
    ...effect,
    stateSelectionMode: record.stateSelectionMode ?? "Single",
    productSelectionMode: record.productSelectionMode,
    batchId: record.batchId,
  };
}

export const SCHEME_SEED: SchemeRecord[] = [
  {
    id: 1,
    schemeCode: "SCH-001",
    schemeName: "Kharif NPK Distributor Offer",
    schemeType: "Product Discount Scheme",
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
    schemeCode: "SCH-002",
    schemeName: "Gujarat Summer Draft Scheme",
    schemeType: "Product Discount Scheme",
    customerType: "All",
    stateId: "Gujarat",
    stateName: "Gujarat",
    approvalStatus: "submitted",
    startDate: "2026-04-01",
    endDate: "2026-09-30",
    status: "inactive",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-02-01",
    updatedAt: "2026-02-01",
    schemeLines: [
      {
        productId: "1",
        productCode: "PRD-001",
        productName: "NPK 19:19:19",
        stateNames: ["Gujarat"],
        dealerPrice: 1050,
        discountType: "Fixed Amount",
        discountValue: 50,
        discountAmount: 50,
        finalSchemePrice: 1000,
        mrp: 1250,
      },
    ],
  },
  {
    id: 4,
    schemeCode: "SCH-004",
    schemeName: "Winter Retailer Approved Scheme",
    schemeType: "Product Discount Scheme",
    customerType: "Retailer",
    stateId: "Maharashtra",
    stateName: "Maharashtra",
    approvalStatus: "approved",
    startDate: "2026-06-01",
    endDate: "2026-12-31",
    status: "inactive",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-05-15",
    updatedAt: "2026-05-20",
    schemeLines: [
      {
        productId: "1",
        productCode: "PRD-001",
        productName: "NPK 19:19:19",
        stateNames: ["Maharashtra"],
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
    id: 5,
    schemeCode: "SCH-005",
    schemeName: "Maharashtra DAP Active Offer",
    schemeType: "Product Discount Scheme",
    customerType: "Distributor",
    stateId: "Maharashtra",
    stateName: "Maharashtra",
    approvalStatus: "active",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-01-10",
    updatedAt: "2026-01-10",
    schemeLines: [
      {
        productId: "2",
        productCode: "PRD-002",
        productName: "DAP Fertilizer",
        stateNames: ["Maharashtra"],
        dealerPrice: 1250,
        discountType: "Percentage",
        discountValue: 8,
        discountAmount: 100,
        finalSchemePrice: 1150,
        mrp: 1500,
      },
    ],
  },
  {
    id: 6,
    schemeCode: "SCH-006",
    schemeName: "Urea Draft Scheme Maharashtra",
    schemeType: "Product Discount Scheme",
    customerType: "Distributor",
    stateId: "Maharashtra",
    stateName: "Maharashtra",
    approvalStatus: "submitted",
    startDate: "2026-07-01",
    endDate: "2026-12-31",
    status: "inactive",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01",
    schemeLines: [
      {
        productId: "3",
        productCode: "PRD-003",
        productName: "Urea 46%",
        stateNames: ["Maharashtra"],
        dealerPrice: 820,
        discountType: "Fixed Amount",
        discountValue: 40,
        discountAmount: 40,
        finalSchemePrice: 780,
        mrp: 950,
      },
    ],
  },
  {
    id: 7,
    schemeCode: "SCH-007",
    schemeName: "NPK Pending Approval Scheme",
    schemeType: "Product Discount Scheme",
    customerType: "Distributor",
    stateId: "Maharashtra",
    stateName: "Maharashtra",
    approvalStatus: "submitted",
    startDate: "2026-06-01",
    endDate: "2026-12-31",
    status: "inactive",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
    schemeLines: [
      {
        productId: "1",
        productCode: "PRD-001",
        productName: "NPK 19:19:19",
        stateNames: ["Maharashtra"],
        dealerPrice: 1050,
        discountType: "Percentage",
        discountValue: 12,
        discountAmount: 126,
        finalSchemePrice: 924,
        mrp: 1250,
      },
    ],
  },
  {
    id: 8,
    schemeCode: "SCH-008",
    schemeName: "NPK 10% Active — Maharashtra Only",
    schemeType: "Product Discount Scheme",
    customerType: "Distributor",
    stateId: "Maharashtra",
    stateName: "Maharashtra",
    approvalStatus: "active",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-01-12",
    updatedAt: "2026-06-01",
    schemeLines: [
      {
        productId: "1",
        productCode: "PRD-001",
        productName: "NPK 19:19:19",
        stateNames: ["Maharashtra"],
        dealerPrice: 1050,
        discountType: "Percentage",
        discountValue: 10,
        discountAmount: 105,
        finalSchemePrice: 945,
        mrp: 1250,
      },
    ],
  },
  {
    id: 3,
    schemeCode: "SCH-003",
    schemeName: "Near Expiry - Product A - Karnataka",
    schemeType: "Product Near Expiry Scheme",
    description: "Near-expiry incentive for Product A batches expiring within 60 days",
    batchId: "BATCH-SEED-003",
    effectType: "POST_SALES_CN_JV",
    appliedIn: "Sales Order as eligible scheme only",
    settlementMethod: "Credit Note / Journal Voucher",
    stateSelectionMode: "Single",
    productId: "PRD-001",
    productName: "Product A",
    stateId: "KA",
    stateName: "Karnataka",
    customerType: "All",
    discountType: "Percentage",
    discountValue: 10,
    expiryWithinDays: 60,
    priority: 1,
    approvalStatus: "submitted",
    startDate: "2025-06-01",
    endDate: "2025-12-31",
    status: "inactive",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2025-06-10",
    updatedAt: "2025-06-10",
  },
];

/** Sample scheme codes kept in sync with SCHEME_SEED for Sales Order testing. */
const REFRESHABLE_SCHEME_CODES = new Set([
  "SCH-001",
  "SCH-002",
  "SCH-004",
  "SCH-005",
  "SCH-006",
  "SCH-007",
  "SCH-008",
]);

/** Normalize legacy draft records — draft is not used in the workflow. */
export function normalizeSchemeApprovalStatus(record: SchemeRecord): SchemeRecord {
  if (record.approvalStatus !== "draft") return record;
  return {
    ...record,
    approvalStatus: "submitted",
    status: record.status === "active" ? "inactive" : record.status,
  };
}

/** Merge missing seed schemes and refresh sample schemes from seed data. */
export function mergeSchemeSeedRecords(
  stored: SchemeRecord[],
  seed: SchemeRecord[],
): SchemeRecord[] {
  const merged = stored.map(normalizeSchemeApprovalStatus);
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
    return `${record.discountValue ?? 0}% (≤${record.expiryWithinDays ?? 0}d)`;
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

export function resolveDisplayApprovalStatus(record: SchemeRecord): ApprovalStatus {
  if (record.approvalStatus === "rejected") {
    return record.approvalStatus;
  }
  if (record.approvalStatus === "draft") {
    return "submitted";
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
      return PENDING_APPROVAL_STATUSES.includes(status);
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
  return record.approvalStatus === "rejected";
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
    form.schemeType !== "Product Near Expiry Scheme" &&
    form.discountType !== "Free Quantity"
  ) {
    if (!form.discountValue || parseFloat(form.discountValue) <= 0) {
      return "Discount value must be greater than 0.";
    }
  }
  if (form.schemeType === "Product Near Expiry Scheme") {
    if (!form.expiryWithinDays || parseInt(form.expiryWithinDays, 10) <= 0) {
      return "Expiry within days is required.";
    }
    if (!form.discountValue || parseFloat(form.discountValue) <= 0) {
      return "Discount % is required.";
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
