import {
  MASTER_CURRENT_USER,
  masterToday,
  nextMasterCode,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";

export const SCHEME_STORAGE_KEY = "ds_master_scheme_v2";
export const SCHEME_SETTINGS_KEY = "ds_master_scheme_settings_v1";

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

export interface SchemeRecord extends BaseMasterRecord {
  schemeCode: string;
  schemeName: string;
  schemeType: SchemeType;
  productId?: string;
  productName?: string;
  stateId: string;
  stateName: string;
  customerType: CustomerType;
  discountType?: DiscountType | FestiveDiscountType;
  discountValue?: number;
  freeQuantity?: number;
  priority: number;
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
}

export interface SchemeBulkForm {
  schemeType: SchemeType;
  schemeName: string;
  productIds: string[];
  stateIds: string[];
  customerType: CustomerType;
  discountType: DiscountType | FestiveDiscountType;
  discountValue: string;
  freeQuantity: string;
  priority: string;
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

const APPROVAL_FLOW: ApprovalStatus[] = [
  "draft",
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
  productIds: [],
  stateIds: [],
  customerType: "All",
  discountType: "Percentage",
  discountValue: "",
  freeQuantity: "",
  priority: "",
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

export const SCHEME_SEED: SchemeRecord[] = [
  {
    id: 1,
    schemeCode: "SCH-001",
    schemeName: "Product A - Maharashtra Scheme",
    schemeType: "Product Discount Scheme",
    productId: "PRD-001",
    productName: "Product A",
    stateId: "MH",
    stateName: "Maharashtra",
    customerType: "Distributor",
    discountType: "Percentage",
    discountValue: 10,
    priority: 3,
    approvalStatus: "active",
    startDate: "2025-06-01",
    endDate: "2025-12-31",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2025-05-01",
    updatedAt: "2025-05-01",
  },
  {
    id: 2,
    schemeCode: "SCH-002",
    schemeName: "Product B - Gujarat Scheme",
    schemeType: "Product Discount Scheme",
    productId: "PRD-002",
    productName: "Product B",
    stateId: "GJ",
    stateName: "Gujarat",
    customerType: "All",
    discountType: "Fixed Amount",
    discountValue: 500,
    priority: 3,
    approvalStatus: "draft",
    startDate: "2025-07-01",
    endDate: "2025-09-30",
    status: "inactive",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2025-06-01",
    updatedAt: "2025-06-01",
  },
  {
    id: 3,
    schemeCode: "SCH-003",
    schemeName: "Near Expiry - Product A - Karnataka",
    schemeType: "Product Near Expiry Scheme",
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
  if (record.approvalStatus === "rejected" || record.approvalStatus === "draft") {
    return record.approvalStatus;
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
    case "draft":
      return status === "draft";
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
  return record.approvalStatus === "draft";
}

export function canSubmitRecord(record: SchemeRecord): boolean {
  return record.approvalStatus === "draft";
}

export function canApproveRecord(record: SchemeRecord): boolean {
  return PENDING_APPROVAL_STATUSES.includes(record.approvalStatus) || record.approvalStatus === "approved";
}

export function canRejectRecord(record: SchemeRecord): boolean {
  return (
    PENDING_APPROVAL_STATUSES.includes(record.approvalStatus) ||
    record.approvalStatus === "approved" ||
    record.approvalStatus === "active"
  );
}

export function canDeactivateRecord(record: SchemeRecord): boolean {
  return record.approvalStatus === "active" || record.approvalStatus === "approved";
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
  const withinDates =
    (!record.startDate || record.startDate <= today) && (!record.endDate || record.endDate >= today);
  const approvalStatus = next === "approved" && withinDates ? "active" : next;
  return {
    ...record,
    approvalStatus,
    status: approvalStatus === "active" ? "active" : record.status,
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
  return {
    ...record,
    status: "inactive",
    updatedBy: MASTER_CURRENT_USER,
    updatedAt: masterToday(),
  };
}

export function recordToBulkForm(record: SchemeRecord): SchemeBulkForm {
  return {
    schemeType: record.schemeType,
    schemeName: record.schemeName.replace(` - ${record.stateName}`, "").replace(` - ${record.productName ?? ""}`, ""),
    productIds: record.productId ? [record.productId] : [],
    stateIds: [record.stateId],
    customerType: record.customerType,
    discountType: record.discountType ?? "Percentage",
    discountValue: record.discountValue !== undefined ? String(record.discountValue) : "",
    freeQuantity: record.freeQuantity !== undefined ? String(record.freeQuantity) : "",
    priority: String(record.priority),
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

export function validateSchemeBulkForm(form: SchemeBulkForm, mode: "add" | "edit"): string | null {
  if (!form.stateIds.length) return "Select at least one state.";
  if (schemeTypeRequiresProducts(form.schemeType, form.productScope) && !form.productIds.length) {
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
  const states = SCHEME_STATE_OPTIONS.filter((s) => form.stateIds.includes(s.id));
  const products = SCHEME_PRODUCT_OPTIONS.filter((p) => form.productIds.includes(p.id));

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
      approvalStatus: "draft",
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      status: "inactive",
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
  const [record] = bulkFormToRecords(form, [], id);
  return {
    ...record,
    id: existing.id,
    schemeCode: existing.schemeCode,
    approvalStatus: existing.approvalStatus === "draft" ? "draft" : "draft",
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
    approvalStatus: "draft",
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
    approvalStatus: "draft",
    status: "inactive",
    updatedBy: MASTER_CURRENT_USER,
    updatedAt: masterToday(),
  };
}
