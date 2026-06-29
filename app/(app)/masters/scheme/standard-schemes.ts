import {
  MASTER_CURRENT_USER,
  masterToday,
  nextMasterCode,
  loadMasterRecords,
} from "@/lib/masters/common";
import {
  isSchemeEditable,
  PENDING_APPROVAL_STATUSES,
  resolveDisplayApprovalStatus,
  SCHEME_SEED,
  SCHEME_STORAGE_KEY,
  resolveSchemeOperationalStatus,
  type CustomerType,
  type DiscountType,
  type OutstandingAgeCondition,
  type PaymentOfferBasis,
  type ProductScope,
  type SchemeRecord,
  type TurnoverPeriod,
  type TurnoverSlab,
  SCHEME_CUSTOMER_OPTIONS,
  SCHEME_EFFECT_MAP,
} from "./scheme-data";
import {
  formatSchemeRupee,
  loadSchemeStateOptions,
} from "./product-discount-scheme";

// ─── Shared UI / stored type helpers ─────────────────────────────────────────

export type StandardBenefitTypeUI = "Percentage" | "Rupees";

export interface TurnoverSlabForm {
  fromTurnover: string;
  toTurnover: string;
  benefitPercent: string;
}

function parseNumeric(raw: string): number {
  const cleaned = raw.replace(/[₹,\s]/g, "");
  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? 0 : value;
}

function parseIntSafe(raw: string): number {
  const value = parseInt(raw, 10);
  return Number.isNaN(value) ? 0 : value;
}

function toStoredBenefitType(type: StandardBenefitTypeUI): DiscountType {
  return type === "Rupees" ? "Fixed Amount" : "Percentage";
}

function fromStoredBenefitType(type?: string): StandardBenefitTypeUI {
  if (type === "Fixed Amount" || type === "Rupees") return "Rupees";
  return "Percentage";
}

function summarizeSchemeStates(stateNames: string[]): string {
  return stateNames.join(", ");
}

function parseStateNames(record: SchemeRecord): string[] {
  return record.stateName.split(",").map((s) => s.trim()).filter(Boolean);
}

function countStatesFromRecord(record: SchemeRecord): number {
  return parseStateNames(record).length;
}

function isStandardSchemeExpired(record: SchemeRecord): boolean {
  return resolveDisplayApprovalStatus(record) === "expired";
}

function canEditStandardScheme(
  record: SchemeRecord,
  guard: (r: SchemeRecord) => boolean,
): boolean {
  return guard(record) && (record.approvalStatus === "draft" || isSchemeEditable(record));
}

function canSubmitStandardScheme(
  record: SchemeRecord,
  guard: (r: SchemeRecord) => boolean,
): boolean {
  return (
    guard(record) &&
    (record.approvalStatus === "draft" || record.approvalStatus === "rejected")
  );
}

function canApproveStandardScheme(
  record: SchemeRecord,
  guard: (r: SchemeRecord) => boolean,
): boolean {
  return (
    guard(record) &&
    ["submitted", "manager_approval", "finance_approval", "final_approval"].includes(
      record.approvalStatus,
    )
  );
}

function formatStandardOperationalStatus(record: SchemeRecord): string {
  return resolveSchemeOperationalStatus(record);
}

function formatBenefitLabel(type?: string, value?: number): string {
  if (value === undefined || value <= 0) return "—";
  if (type === "Fixed Amount" || type === "Rupees") return formatSchemeRupee(value);
  return `${value}%`;
}

function validateCommonFields(
  schemeName: string,
  stateNames: string[],
  startDate: string,
  endDate: string,
): string | null {
  if (!schemeName.trim()) return "Scheme name is required.";
  if (!stateNames.length) return "State is required.";
  if (!startDate) return "Start Date is required.";
  if (!endDate) return "End Date is required.";
  if (startDate > endDate) return "End Date cannot be before Start Date.";
  return null;
}

function validateBenefitValue(
  benefitType: StandardBenefitTypeUI,
  benefitValue: number,
  label = "Benefit",
): string | null {
  if (benefitValue <= 0) return `${label} value must be greater than 0.`;
  if (benefitType === "Percentage" && benefitValue > 100) {
    return `${label} % cannot be more than 100%.`;
  }
  return null;
}

function buildBaseRecord(
  form: {
    schemeName: string;
    customerType: CustomerType;
    stateNames: string[];
    startDate: string;
    endDate: string;
  },
  schemeType: SchemeRecord["schemeType"],
  existingRecords: SchemeRecord[],
  id: number,
  existing?: SchemeRecord,
  codePrefix = "SCH-",
): Pick<
  SchemeRecord,
  | "id"
  | "schemeCode"
  | "schemeName"
  | "schemeType"
  | "stateId"
  | "stateName"
  | "customerType"
  | "approvalStatus"
  | "startDate"
  | "endDate"
  | "status"
  | "createdBy"
  | "updatedBy"
  | "createdAt"
  | "updatedAt"
> {
  const existingCodes = existingRecords.map((r) => r.schemeCode);
  const schemeCode = existing?.schemeCode ?? nextMasterCode(codePrefix, existingCodes);
  const now = masterToday();

  return {
    id,
    schemeCode,
    schemeName: form.schemeName.trim(),
    schemeType,
    stateId: form.stateNames[0] ?? "",
    stateName: summarizeSchemeStates(form.stateNames),
    customerType: form.customerType,
    approvalStatus: existing?.approvalStatus ?? "draft",
    startDate: form.startDate,
    endDate: form.endDate,
    status: existing?.status ?? "inactive",
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function validateTurnoverSlabs(slabs: TurnoverSlabForm[]): string | null {
  if (!slabs.length) return "Add at least one turnover slab.";

  const parsed: { from: number; to: number | null; benefit: number; index: number }[] = [];

  for (let i = 0; i < slabs.length; i++) {
    const slab = slabs[i];
    const from = parseNumeric(slab.fromTurnover);
    const toRaw = slab.toTurnover.trim();
    const to = toRaw ? parseNumeric(toRaw) : null;
    const benefit = parseNumeric(slab.benefitPercent);
    const isLast = i === slabs.length - 1;

    if (!slab.fromTurnover.trim()) return `Slab ${i + 1}: From turnover is required.`;
    if (from < 0) return `Slab ${i + 1}: From turnover cannot be negative.`;
    if (!slab.benefitPercent.trim() || benefit <= 0) {
      return `Slab ${i + 1}: Benefit % must be greater than 0.`;
    }
    if (benefit > 100) return `Slab ${i + 1}: Benefit % cannot be more than 100%.`;

    if (to !== null) {
      if (to <= from) return `Slab ${i + 1}: To turnover must be greater than From turnover.`;
    } else if (!isLast) {
      return `Slab ${i + 1}: To turnover is required (only the last slab may be open-ended).`;
    }

    parsed.push({ from, to, benefit, index: i });
  }

  const sorted = [...parsed].sort((a, b) => a.from - b.from);
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const currentEnd = current.to ?? Number.POSITIVE_INFINITY;
    if (currentEnd >= next.from) {
      return `Turnover slabs overlap between slab ${current.index + 1} and slab ${next.index + 1}.`;
    }
  }

  return null;
}

function parseTurnoverSlabsFromForm(slabs: TurnoverSlabForm[]): TurnoverSlab[] {
  return slabs.map((s, i, arr) => ({
    fromTurnover: parseNumeric(s.fromTurnover),
    toTurnover: s.toTurnover.trim() ? parseNumeric(s.toTurnover) : i === arr.length - 1 ? null : parseNumeric(s.toTurnover),
    benefitPercent: parseNumeric(s.benefitPercent),
  }));
}

function turnoverSlabsToForm(slabs?: TurnoverSlab[]): TurnoverSlabForm[] {
  if (!slabs?.length) {
    return [{ fromTurnover: "", toTurnover: "", benefitPercent: "" }];
  }
  return slabs.map((s) => ({
    fromTurnover: String(s.fromTurnover),
    toTurnover: s.toTurnover !== null ? String(s.toTurnover) : "",
    benefitPercent: String(s.benefitPercent),
  }));
}

function getCodePreview(prefix: string): string {
  const list = loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, [
    ...SCHEME_SEED,
    ...STANDARD_SCHEME_SEED,
  ]);
  return nextMasterCode(prefix, list.map((r) => r.schemeCode));
}

// ─── Type guards ─────────────────────────────────────────────────────────────

export function isFestiveRecord(record: SchemeRecord): boolean {
  return record.schemeType === "Festive Discount Scheme";
}

export function isCashRecord(record: SchemeRecord): boolean {
  return record.schemeType === "Cash Discount Scheme";
}

export function isTurnoverRecord(record: SchemeRecord): boolean {
  return record.schemeType === "Turnover Discount Scheme";
}

export function isPaymentRecord(record: SchemeRecord): boolean {
  return record.schemeType === "Payment Discount Scheme";
}

export function isStandardSchemeRecord(record: SchemeRecord): boolean {
  return (
    isFestiveRecord(record) ||
    isCashRecord(record) ||
    isTurnoverRecord(record) ||
    isPaymentRecord(record)
  );
}

// ─── Festive Discount Scheme ─────────────────────────────────────────────────

export interface FestiveSchemeForm {
  schemeName: string;
  festivalName: string;
  customerType: CustomerType;
  stateNames: string[];
  productScope: ProductScope;
  selectedProductIds: string[];
  minimumOrderValue: string;
  discountType: StandardBenefitTypeUI;
  discountValue: string;
  startDate: string;
  endDate: string;
}

export const DEFAULT_FESTIVE_FORM: FestiveSchemeForm = {
  schemeName: "",
  festivalName: "",
  customerType: "All",
  stateNames: [],
  productScope: "All",
  selectedProductIds: [],
  minimumOrderValue: "",
  discountType: "Percentage",
  discountValue: "",
  startDate: "",
  endDate: "",
};

export function countFestiveProducts(record: SchemeRecord): number {
  if (!isFestiveRecord(record)) return 0;
  if (record.productScope === "All") return 0;
  return record.selectedProductIds?.length ?? 0;
}

export function countFestiveStates(record: SchemeRecord): number {
  if (!isFestiveRecord(record)) return 0;
  return countStatesFromRecord(record);
}

export function formatFestiveBenefit(record: SchemeRecord): string {
  if (!isFestiveRecord(record)) return "—";
  const benefit = formatBenefitLabel(record.discountType, record.discountValue);
  const festival = record.festivalName?.trim() || "Festive";
  const scope =
    record.productScope === "Specific"
      ? `${countFestiveProducts(record)} product(s)`
      : "All Products";
  return `${festival} · ${benefit} · ${scope}`;
}

export function validateFestiveForm(form: FestiveSchemeForm): string | null {
  const common = validateCommonFields(
    form.schemeName,
    form.stateNames,
    form.startDate,
    form.endDate,
  );
  if (common) return common;

  if (!form.festivalName.trim()) return "Festival / campaign name is required.";

  const discountValue = parseNumeric(form.discountValue);
  const benefitErr = validateBenefitValue(form.discountType, discountValue, "Discount");
  if (benefitErr) return benefitErr;

  if (form.minimumOrderValue.trim()) {
    const mov = parseNumeric(form.minimumOrderValue);
    if (mov < 0) return "Minimum order value cannot be negative.";
  }

  return null;
}

export function festiveFormToRecord(
  form: FestiveSchemeForm,
  existingRecords: SchemeRecord[],
  id: number,
  existing?: SchemeRecord,
): SchemeRecord {
  const base = buildBaseRecord(
    form,
    "Festive Discount Scheme",
    existingRecords,
    id,
    existing,
    "FST-",
  );

  return {
    ...base,
    festivalName: form.festivalName.trim(),
    productScope: form.productScope,
    selectedProductIds:
      form.productScope === "Specific" && form.selectedProductIds.length
        ? form.selectedProductIds
        : undefined,
    minimumOrderValue: form.minimumOrderValue.trim()
      ? parseNumeric(form.minimumOrderValue)
      : undefined,
    discountType: toStoredBenefitType(form.discountType),
    discountValue: parseNumeric(form.discountValue),
  };
}

export function festiveRecordToForm(record: SchemeRecord): FestiveSchemeForm {
  return {
    schemeName: record.schemeName,
    festivalName: record.festivalName ?? "",
    customerType: record.customerType,
    stateNames: parseStateNames(record),
    productScope: record.productScope ?? "All",
    selectedProductIds: record.selectedProductIds ?? [],
    minimumOrderValue:
      record.minimumOrderValue !== undefined ? String(record.minimumOrderValue) : "",
    discountType: fromStoredBenefitType(record.discountType),
    discountValue: record.discountValue !== undefined ? String(record.discountValue) : "",
    startDate: record.startDate ?? "",
    endDate: record.endDate ?? "",
  };
}

export function formatFestiveOperationalStatus(record: SchemeRecord): string {
  return formatStandardOperationalStatus(record);
}

export function canEditFestiveScheme(record: SchemeRecord): boolean {
  return canEditStandardScheme(record, isFestiveRecord);
}

export function canSubmitFestiveScheme(record: SchemeRecord): boolean {
  return canSubmitStandardScheme(record, isFestiveRecord);
}

export function canApproveFestiveScheme(record: SchemeRecord): boolean {
  return canApproveStandardScheme(record, isFestiveRecord);
}

export function canRejectFestiveScheme(record: SchemeRecord): boolean {
  return canApproveFestiveScheme(record);
}

export function canSendBackFestiveScheme(record: SchemeRecord): boolean {
  return canApproveFestiveScheme(record);
}

export function canActivateFestiveScheme(record: SchemeRecord): boolean {
  return isFestiveRecord(record) && record.approvalStatus === "approved";
}

export function canDeactivateFestiveScheme(record: SchemeRecord): boolean {
  return (
    isFestiveRecord(record) &&
    record.approvalStatus === "active" &&
    record.status === "active"
  );
}

export function canCopyFestiveScheme(record: SchemeRecord): boolean {
  return isFestiveRecord(record) && record.approvalStatus === "rejected";
}

export function getFestiveCodePreview(): string {
  return getCodePreview("FST-");
}

// ─── Cash Discount Scheme ────────────────────────────────────────────────────

export interface CashSchemeForm {
  schemeName: string;
  customerType: CustomerType;
  stateNames: string[];
  minimumOrderValue: string;
  benefitType: StandardBenefitTypeUI;
  benefitValue: string;
  startDate: string;
  endDate: string;
}

export const DEFAULT_CASH_FORM: CashSchemeForm = {
  schemeName: "",
  customerType: "All",
  stateNames: [],
  minimumOrderValue: "",
  benefitType: "Percentage",
  benefitValue: "",
  startDate: "",
  endDate: "",
};

export function countCashStates(record: SchemeRecord): number {
  if (!isCashRecord(record)) return 0;
  return countStatesFromRecord(record);
}

export function formatCashBenefit(record: SchemeRecord): string {
  if (!isCashRecord(record)) return "—";
  const benefit = formatBenefitLabel(record.discountType, record.discountValue);
  const mov =
    record.minimumOrderValue !== undefined
      ? ` · MOV ${formatSchemeRupee(record.minimumOrderValue)}`
      : "";
  return `${benefit}${mov}`;
}

export function validateCashForm(form: CashSchemeForm): string | null {
  const common = validateCommonFields(
    form.schemeName,
    form.stateNames,
    form.startDate,
    form.endDate,
  );
  if (common) return common;

  if (!form.minimumOrderValue.trim()) return "Minimum order value is required.";
  const mov = parseNumeric(form.minimumOrderValue);
  if (mov <= 0) return "Minimum order value must be greater than 0.";

  const benefitValue = parseNumeric(form.benefitValue);
  const benefitErr = validateBenefitValue(form.benefitType, benefitValue, "Benefit");
  if (benefitErr) return benefitErr;

  return null;
}

export function cashFormToRecord(
  form: CashSchemeForm,
  existingRecords: SchemeRecord[],
  id: number,
  existing?: SchemeRecord,
): SchemeRecord {
  const base = buildBaseRecord(
    form,
    "Cash Discount Scheme",
    existingRecords,
    id,
    existing,
    "CSH-",
  );

  return {
    ...base,
    minimumOrderValue: parseNumeric(form.minimumOrderValue),
    discountType: toStoredBenefitType(form.benefitType),
    discountValue: parseNumeric(form.benefitValue),
  };
}

export function cashRecordToForm(record: SchemeRecord): CashSchemeForm {
  return {
    schemeName: record.schemeName,
    customerType: record.customerType,
    stateNames: parseStateNames(record),
    minimumOrderValue:
      record.minimumOrderValue !== undefined ? String(record.minimumOrderValue) : "",
    benefitType: fromStoredBenefitType(record.discountType),
    benefitValue: record.discountValue !== undefined ? String(record.discountValue) : "",
    startDate: record.startDate ?? "",
    endDate: record.endDate ?? "",
  };
}

export function formatCashOperationalStatus(record: SchemeRecord): string {
  return formatStandardOperationalStatus(record);
}

export function canEditCashScheme(record: SchemeRecord): boolean {
  return canEditStandardScheme(record, isCashRecord);
}

export function canSubmitCashScheme(record: SchemeRecord): boolean {
  return canSubmitStandardScheme(record, isCashRecord);
}

export function canApproveCashScheme(record: SchemeRecord): boolean {
  return canApproveStandardScheme(record, isCashRecord);
}

export function canRejectCashScheme(record: SchemeRecord): boolean {
  return canApproveCashScheme(record);
}

export function canSendBackCashScheme(record: SchemeRecord): boolean {
  return canApproveCashScheme(record);
}

export function canActivateCashScheme(record: SchemeRecord): boolean {
  return isCashRecord(record) && record.approvalStatus === "approved";
}

export function canDeactivateCashScheme(record: SchemeRecord): boolean {
  return (
    isCashRecord(record) &&
    record.approvalStatus === "active" &&
    record.status === "active"
  );
}

export function canCopyCashScheme(record: SchemeRecord): boolean {
  return isCashRecord(record) && record.approvalStatus === "rejected";
}

export function getCashCodePreview(): string {
  return getCodePreview("CSH-");
}

// ─── Turnover Discount Scheme ────────────────────────────────────────────────

export interface TurnoverSchemeForm {
  schemeName: string;
  customerType: CustomerType;
  stateNames: string[];
  turnoverPeriod: TurnoverPeriod;
  startDate: string;
  endDate: string;
  customerIds: string[];
  turnoverSlabs: TurnoverSlabForm[];
}

export const DEFAULT_TURNOVER_FORM: TurnoverSchemeForm = {
  schemeName: "",
  customerType: "All",
  stateNames: [],
  turnoverPeriod: "Monthly",
  startDate: "",
  endDate: "",
  customerIds: [],
  turnoverSlabs: [{ fromTurnover: "", toTurnover: "", benefitPercent: "" }],
};

export function countTurnoverSlabs(record: SchemeRecord): number {
  if (!isTurnoverRecord(record)) return 0;
  return record.turnoverSlabs?.length ?? 0;
}

export function countTurnoverStates(record: SchemeRecord): number {
  if (!isTurnoverRecord(record)) return 0;
  return countStatesFromRecord(record);
}

export function countTurnoverCustomers(record: SchemeRecord): number {
  if (!isTurnoverRecord(record)) return 0;
  return record.customerIds?.length ?? 0;
}

export function formatTurnoverBenefit(record: SchemeRecord): string {
  if (!isTurnoverRecord(record)) return "—";
  const slabs = record.turnoverSlabs ?? [];
  if (!slabs.length) return "—";
  const first = slabs[0];
  const last = slabs[slabs.length - 1];
  const period = record.turnoverPeriod ?? "—";
  if (slabs.length === 1) {
    return `${period} · ${first.benefitPercent}% from ${formatSchemeRupee(first.fromTurnover)}`;
  }
  return `${period} · ${first.benefitPercent}%–${last.benefitPercent}% (${slabs.length} slabs)`;
}

export function validateTurnoverForm(form: TurnoverSchemeForm): string | null {
  const common = validateCommonFields(
    form.schemeName,
    form.stateNames,
    form.startDate,
    form.endDate,
  );
  if (common) return common;

  if (form.turnoverPeriod === "Custom") {
    if (!form.startDate || !form.endDate) {
      return "Start and End dates are required for Custom turnover period.";
    }
  }

  return validateTurnoverSlabs(form.turnoverSlabs);
}

export function turnoverFormToRecord(
  form: TurnoverSchemeForm,
  existingRecords: SchemeRecord[],
  id: number,
  existing?: SchemeRecord,
): SchemeRecord {
  const base = buildBaseRecord(
    form,
    "Turnover Discount Scheme",
    existingRecords,
    id,
    existing,
    "TUR-",
  );

  return {
    ...base,
    turnoverPeriod: form.turnoverPeriod,
    turnoverSlabs: parseTurnoverSlabsFromForm(form.turnoverSlabs),
    customerIds: form.customerIds.length ? form.customerIds : undefined,
  };
}

export function turnoverRecordToForm(record: SchemeRecord): TurnoverSchemeForm {
  return {
    schemeName: record.schemeName,
    customerType: record.customerType,
    stateNames: parseStateNames(record),
    turnoverPeriod: record.turnoverPeriod ?? "Monthly",
    startDate: record.startDate ?? "",
    endDate: record.endDate ?? "",
    customerIds: record.customerIds ?? [],
    turnoverSlabs: turnoverSlabsToForm(record.turnoverSlabs),
  };
}

export function formatTurnoverOperationalStatus(record: SchemeRecord): string {
  return formatStandardOperationalStatus(record);
}

export function canEditTurnoverScheme(record: SchemeRecord): boolean {
  return canEditStandardScheme(record, isTurnoverRecord);
}

export function canSubmitTurnoverScheme(record: SchemeRecord): boolean {
  return canSubmitStandardScheme(record, isTurnoverRecord);
}

export function canApproveTurnoverScheme(record: SchemeRecord): boolean {
  return canApproveStandardScheme(record, isTurnoverRecord);
}

export function canRejectTurnoverScheme(record: SchemeRecord): boolean {
  return canApproveTurnoverScheme(record);
}

export function canSendBackTurnoverScheme(record: SchemeRecord): boolean {
  return canApproveTurnoverScheme(record);
}

export function canActivateTurnoverScheme(record: SchemeRecord): boolean {
  return isTurnoverRecord(record) && record.approvalStatus === "approved";
}

export function canDeactivateTurnoverScheme(record: SchemeRecord): boolean {
  return (
    isTurnoverRecord(record) &&
    record.approvalStatus === "active" &&
    record.status === "active"
  );
}

export function canCopyTurnoverScheme(record: SchemeRecord): boolean {
  return isTurnoverRecord(record) && record.approvalStatus === "rejected";
}

export function getTurnoverCodePreview(): string {
  return getCodePreview("TUR-");
}

// ─── Payment Discount Scheme (Outstanding / Collection Settlement) ─────────────

export interface PaymentSchemeForm {
  schemeName: string;
  customerType: CustomerType;
  stateNames: string[];
  customerIds: string[];
  minimumOutstandingAmount: string;
  outstandingAgeCondition: OutstandingAgeCondition;
  outstandingDays: string;
  offerBasis: PaymentOfferBasis;
  originalOutstandingAmount: string;
  customerPayableAmount: string;
  waiverAmount: string;
  waiverPercent: string;
  startDate: string;
  endDate: string;
}

export const DEFAULT_PAYMENT_FORM: PaymentSchemeForm = {
  schemeName: "",
  customerType: "All",
  stateNames: [],
  customerIds: [],
  minimumOutstandingAmount: "",
  outstandingAgeCondition: "Any",
  outstandingDays: "",
  offerBasis: "Fixed Settlement Amount",
  originalOutstandingAmount: "",
  customerPayableAmount: "",
  waiverAmount: "",
  waiverPercent: "",
  startDate: "",
  endDate: "",
};

export function computePaymentSettlement(form: PaymentSchemeForm): {
  waiverAmount: number;
  customerPayableAmount: number;
  waiverPercent: number;
} {
  const outstanding = parseNumeric(form.originalOutstandingAmount);
  if (outstanding <= 0) {
    return { waiverAmount: 0, customerPayableAmount: 0, waiverPercent: 0 };
  }

  if (form.offerBasis === "Fixed Settlement Amount") {
    const payable = parseNumeric(form.customerPayableAmount);
    const waiver = outstanding - payable;
    return {
      waiverAmount: waiver,
      customerPayableAmount: payable,
      waiverPercent: (waiver / outstanding) * 100,
    };
  }

  if (form.offerBasis === "Discount / Waiver Amount") {
    const waiver = parseNumeric(form.waiverAmount);
    const payable = outstanding - waiver;
    return {
      waiverAmount: waiver,
      customerPayableAmount: payable,
      waiverPercent: (waiver / outstanding) * 100,
    };
  }

  const waiverPercent = parseNumeric(form.waiverPercent);
  const waiver = (outstanding * waiverPercent) / 100;
  const payable = outstanding - waiver;
  return {
    waiverAmount: waiver,
    customerPayableAmount: payable,
    waiverPercent,
  };
}

export function formatOutstandingAgeLabel(
  condition?: OutstandingAgeCondition,
  days?: number,
): string {
  if (!condition || condition === "Any") return "Any";
  if (condition === "Custom Days" && days) return `More than ${days} days`;
  return condition;
}

export function formatPaymentCustomerDisplay(record: SchemeRecord): string {
  if (!isPaymentRecord(record)) return "—";
  const customerNames =
    record.customerIds
      ?.map((id) => SCHEME_CUSTOMER_OPTIONS.find((c) => c.id === id)?.name ?? id)
      .join(", ") || "";
  if (customerNames) return `${record.customerType} · ${customerNames}`;
  return record.customerType;
}

export function formatPaymentOfferBasis(record: SchemeRecord): string {
  if (!isPaymentRecord(record)) return "—";
  return record.paymentOfferBasis ?? "—";
}

export function formatPaymentListingSettlement(record: SchemeRecord): string {
  if (!isPaymentRecord(record)) return "—";
  const payable =
    record.customerPayableAmount !== undefined
      ? formatSchemeRupee(record.customerPayableAmount)
      : "—";
  const waiver =
    record.waiverAmount !== undefined ? formatSchemeRupee(record.waiverAmount) : "—";
  return `${payable} / ${waiver}`;
}

export function countPaymentStates(record: SchemeRecord): number {
  if (!isPaymentRecord(record)) return 0;
  return countStatesFromRecord(record);
}

export function formatPaymentBenefit(record: SchemeRecord): string {
  if (!isPaymentRecord(record)) return "—";
  const basis = record.paymentOfferBasis ?? "—";
  const payable =
    record.customerPayableAmount !== undefined
      ? formatSchemeRupee(record.customerPayableAmount)
      : "—";
  const waiver =
    record.waiverAmount !== undefined ? formatSchemeRupee(record.waiverAmount) : "—";
  const minOut =
    record.minimumOutstandingAmount !== undefined
      ? `Min ${formatSchemeRupee(record.minimumOutstandingAmount)}`
      : "";
  const age = formatOutstandingAgeLabel(record.outstandingAgeCondition, record.outstandingDays);
  return `${basis} · Pay ${payable} · Waiver ${waiver}${minOut ? ` · ${minOut}` : ""} · Age: ${age}`;
}

export function validatePaymentForm(form: PaymentSchemeForm): string | null {
  const common = validateCommonFields(
    form.schemeName,
    form.stateNames,
    form.startDate,
    form.endDate,
  );
  if (common) return common;

  if (!form.minimumOutstandingAmount.trim()) {
    return "Minimum outstanding amount is required.";
  }
  const minOutstanding = parseNumeric(form.minimumOutstandingAmount);
  if (minOutstanding <= 0) return "Minimum outstanding amount must be greater than 0.";

  if (form.outstandingAgeCondition === "Custom Days") {
    const days = parseIntSafe(form.outstandingDays);
    if (!form.outstandingDays.trim() || days <= 0) {
      return "Outstanding days is required when age condition is Custom Days.";
    }
  }

  const outstanding = parseNumeric(form.originalOutstandingAmount);
  if (outstanding <= 0) return "Original outstanding amount must be greater than 0.";

  const { waiverAmount, customerPayableAmount } = computePaymentSettlement(form);

  if (customerPayableAmount < 0) {
    return "Customer payable amount cannot be negative.";
  }
  if (customerPayableAmount > outstanding) {
    return "Customer payable amount cannot be greater than outstanding amount.";
  }
  if (waiverAmount > outstanding) {
    return "Waiver amount cannot be greater than outstanding amount.";
  }
  if (waiverAmount < 0) {
    return "Waiver amount cannot be negative.";
  }

  if (form.offerBasis === "Discount / Waiver %") {
    const pct = parseNumeric(form.waiverPercent);
    if (pct <= 0) return "Waiver % must be greater than 0.";
    if (pct > 100) return "Waiver % cannot be more than 100%.";
  }

  if (form.offerBasis === "Discount / Waiver Amount") {
    const waiver = parseNumeric(form.waiverAmount);
    if (waiver <= 0) return "Waiver amount must be greater than 0.";
  }

  if (form.offerBasis === "Fixed Settlement Amount") {
    const payable = parseNumeric(form.customerPayableAmount);
    if (payable <= 0) return "Customer payable amount must be greater than 0.";
  }

  return null;
}

export function paymentFormToRecord(
  form: PaymentSchemeForm,
  existingRecords: SchemeRecord[],
  id: number,
  existing?: SchemeRecord,
): SchemeRecord {
  const base = buildBaseRecord(
    form,
    "Payment Discount Scheme",
    existingRecords,
    id,
    existing,
    "PAY-",
  );

  const settlement = computePaymentSettlement(form);
  const effect = SCHEME_EFFECT_MAP["Payment Discount Scheme"];

  return {
    ...base,
    effectType: effect.effectType,
    appliedIn: effect.appliedIn,
    settlementMethod: effect.settlementMethod,
    customerIds: form.customerIds.length ? form.customerIds : undefined,
    minimumOutstandingAmount: parseNumeric(form.minimumOutstandingAmount),
    outstandingAgeCondition: form.outstandingAgeCondition,
    outstandingDays:
      form.outstandingAgeCondition === "Custom Days"
        ? parseIntSafe(form.outstandingDays)
        : undefined,
    paymentOfferBasis: form.offerBasis,
    originalOutstandingAmount: parseNumeric(form.originalOutstandingAmount),
    customerPayableAmount: settlement.customerPayableAmount,
    waiverAmount: settlement.waiverAmount,
    waiverPercent: settlement.waiverPercent,
    isPaymentLevel: true,
  };
}

export function paymentRecordToForm(record: SchemeRecord): PaymentSchemeForm {
  const offerBasis = record.paymentOfferBasis ?? "Fixed Settlement Amount";
  const outstanding =
    record.originalOutstandingAmount !== undefined
      ? String(record.originalOutstandingAmount)
      : "";

  let customerPayableAmount = "";
  let waiverAmount = "";
  let waiverPercent = "";

  if (offerBasis === "Fixed Settlement Amount") {
    customerPayableAmount =
      record.customerPayableAmount !== undefined
        ? String(record.customerPayableAmount)
        : "";
    waiverAmount =
      record.waiverAmount !== undefined ? String(record.waiverAmount) : "";
  } else if (offerBasis === "Discount / Waiver Amount") {
    waiverAmount = record.waiverAmount !== undefined ? String(record.waiverAmount) : "";
    customerPayableAmount =
      record.customerPayableAmount !== undefined
        ? String(record.customerPayableAmount)
        : "";
  } else {
    waiverPercent =
      record.waiverPercent !== undefined ? String(record.waiverPercent) : "";
    waiverAmount = record.waiverAmount !== undefined ? String(record.waiverAmount) : "";
    customerPayableAmount =
      record.customerPayableAmount !== undefined
        ? String(record.customerPayableAmount)
        : "";
  }

  return {
    schemeName: record.schemeName,
    customerType: record.customerType,
    stateNames: parseStateNames(record),
    customerIds: record.customerIds ?? [],
    minimumOutstandingAmount:
      record.minimumOutstandingAmount !== undefined
        ? String(record.minimumOutstandingAmount)
        : record.minimumPaymentAmount !== undefined
          ? String(record.minimumPaymentAmount)
          : "",
    outstandingAgeCondition: record.outstandingAgeCondition ?? "Any",
    outstandingDays:
      record.outstandingDays !== undefined ? String(record.outstandingDays) : "",
    offerBasis,
    originalOutstandingAmount: outstanding,
    customerPayableAmount,
    waiverAmount,
    waiverPercent,
    startDate: record.startDate ?? "",
    endDate: record.endDate ?? "",
  };
}

export function formatPaymentOperationalStatus(record: SchemeRecord): string {
  return formatStandardOperationalStatus(record);
}

export function canEditPaymentScheme(record: SchemeRecord): boolean {
  return canEditStandardScheme(record, isPaymentRecord);
}

export function canSubmitPaymentScheme(record: SchemeRecord): boolean {
  return canSubmitStandardScheme(record, isPaymentRecord);
}

export function canApprovePaymentScheme(record: SchemeRecord): boolean {
  return canApproveStandardScheme(record, isPaymentRecord);
}

export function canRejectPaymentScheme(record: SchemeRecord): boolean {
  return canApprovePaymentScheme(record);
}

export function canSendBackPaymentScheme(record: SchemeRecord): boolean {
  return canApprovePaymentScheme(record);
}

export function canActivatePaymentScheme(record: SchemeRecord): boolean {
  return isPaymentRecord(record) && record.approvalStatus === "approved";
}

export function canDeactivatePaymentScheme(record: SchemeRecord): boolean {
  return (
    isPaymentRecord(record) &&
    record.approvalStatus === "active" &&
    record.status === "active"
  );
}

export function canCopyPaymentScheme(record: SchemeRecord): boolean {
  return isPaymentRecord(record) && record.approvalStatus === "rejected";
}

export function getPaymentCodePreview(): string {
  return getCodePreview("PAY-");
}

// ─── Copy action ─────────────────────────────────────────────────────────────

export function copyStandardSchemeRecord(
  record: SchemeRecord,
  newId: number,
  newCode: string,
): SchemeRecord {
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

// ─── Seed data ─────────────────────────────────────────────────────────────────

export const STANDARD_SCHEME_SEED: SchemeRecord[] = [
  {
    id: 101,
    schemeCode: "FST-001",
    schemeName: "Diwali Distributor Offer",
    schemeType: "Festive Discount Scheme",
    festivalName: "Diwali",
    productScope: "All",
    stateId: "Maharashtra",
    stateName: "Maharashtra, Gujarat",
    customerType: "Distributor",
    discountType: "Percentage",
    discountValue: 5,
    minimumOrderValue: 50000,
    approvalStatus: "active",
    startDate: "2026-10-01",
    endDate: "2026-11-15",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-09-01",
    updatedAt: "2026-10-05",
  },
  {
    id: 102,
    schemeCode: "FST-002",
    schemeName: "Holi Specific Products Draft",
    schemeType: "Festive Discount Scheme",
    festivalName: "Holi",
    productScope: "Specific",
    selectedProductIds: ["1", "2"],
    stateId: "Karnataka",
    stateName: "Karnataka",
    customerType: "Retailer",
    discountType: "Fixed Amount",
    discountValue: 100,
    approvalStatus: "draft",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    status: "inactive",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-02-15",
    updatedAt: "2026-02-15",
  },
  {
    id: 103,
    schemeCode: "CSH-001",
    schemeName: "Cash Payment Instant Rebate",
    schemeType: "Cash Discount Scheme",
    minimumOrderValue: 25000,
    stateId: "Maharashtra",
    stateName: "Maharashtra",
    customerType: "Distributor",
    discountType: "Percentage",
    discountValue: 2,
    approvalStatus: "active",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-01-05",
    updatedAt: "2026-01-10",
  },
  {
    id: 104,
    schemeCode: "CSH-002",
    schemeName: "Prepaid Order Discount Draft",
    schemeType: "Cash Discount Scheme",
    minimumOrderValue: 100000,
    stateId: "Gujarat",
    stateName: "Gujarat, Maharashtra",
    customerType: "Wholesaler",
    discountType: "Fixed Amount",
    discountValue: 1500,
    approvalStatus: "draft",
    startDate: "2026-04-01",
    endDate: "2026-09-30",
    status: "inactive",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-03-20",
    updatedAt: "2026-03-20",
  },
  {
    id: 105,
    schemeCode: "TUR-001",
    schemeName: "Q1 Turnover Slab Rebate",
    schemeType: "Turnover Discount Scheme",
    turnoverPeriod: "Quarterly",
    turnoverSlabs: [
      { fromTurnover: 500000, toTurnover: 1000000, benefitPercent: 1 },
      { fromTurnover: 1000000, toTurnover: 2500000, benefitPercent: 2 },
      { fromTurnover: 2500000, toTurnover: null, benefitPercent: 3 },
    ],
    stateId: "Maharashtra",
    stateName: "Maharashtra, Karnataka",
    customerType: "Distributor",
    customerIds: ["CUST-001", "CUST-003"],
    approvalStatus: "active",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2025-12-15",
    updatedAt: "2026-01-02",
  },
  {
    id: 106,
    schemeCode: "TUR-002",
    schemeName: "Custom Period Turnover Draft",
    schemeType: "Turnover Discount Scheme",
    turnoverPeriod: "Custom",
    turnoverSlabs: [
      { fromTurnover: 200000, toTurnover: 500000, benefitPercent: 1.5 },
      { fromTurnover: 500000, toTurnover: null, benefitPercent: 2.5 },
    ],
    stateId: "Tamil Nadu",
    stateName: "Tamil Nadu",
    customerType: "All",
    approvalStatus: "draft",
    startDate: "2026-05-01",
    endDate: "2026-08-31",
    status: "inactive",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-04-10",
    updatedAt: "2026-04-10",
  },
  {
    id: 107,
    schemeCode: "PAY-001",
    schemeName: "ABC Distributor Outstanding Settlement",
    schemeType: "Payment Discount Scheme",
    effectType: "POST_PAYMENT_CN_JV",
    appliedIn: "Accounts Receivables / Payment Collection",
    settlementMethod: "Credit Note / Journal Voucher",
    stateId: "Maharashtra",
    stateName: "Maharashtra",
    customerType: "Distributor",
    customerIds: ["CUST-004"],
    minimumOutstandingAmount: 100000,
    outstandingAgeCondition: "More than 90 Days",
    paymentOfferBasis: "Fixed Settlement Amount",
    originalOutstandingAmount: 500000,
    customerPayableAmount: 350000,
    waiverAmount: 150000,
    waiverPercent: 30,
    isPaymentLevel: true,
    approvalStatus: "active",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-01-08",
    updatedAt: "2026-01-15",
  },
  {
    id: 108,
    schemeCode: "PAY-002",
    schemeName: "Partial Collection Waiver Draft",
    schemeType: "Payment Discount Scheme",
    effectType: "POST_PAYMENT_CN_JV",
    appliedIn: "Accounts Receivables / Payment Collection",
    settlementMethod: "Credit Note / Journal Voucher",
    stateId: "Delhi",
    stateName: "Delhi",
    customerType: "Retailer",
    minimumOutstandingAmount: 50000,
    outstandingAgeCondition: "More than 60 Days",
    paymentOfferBasis: "Discount / Waiver %",
    originalOutstandingAmount: 200000,
    customerPayableAmount: 160000,
    waiverAmount: 40000,
    waiverPercent: 20,
    isPaymentLevel: true,
    approvalStatus: "draft",
    startDate: "2026-06-01",
    endDate: "2026-12-31",
    status: "inactive",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-05-20",
    updatedAt: "2026-05-20",
  },
];

export { loadSchemeStateOptions };

// ─── Aggregated action helpers (listing / view) ────────────────────────────────

export function canEditStandardSchemeRecord(record: SchemeRecord): boolean {
  if (isFestiveRecord(record)) return canEditFestiveScheme(record);
  if (isCashRecord(record)) return canEditCashScheme(record);
  if (isTurnoverRecord(record)) return canEditTurnoverScheme(record);
  if (isPaymentRecord(record)) return canEditPaymentScheme(record);
  return false;
}

export function canSubmitStandardSchemeRecord(record: SchemeRecord): boolean {
  if (isFestiveRecord(record)) return canSubmitFestiveScheme(record);
  if (isCashRecord(record)) return canSubmitCashScheme(record);
  if (isTurnoverRecord(record)) return canSubmitTurnoverScheme(record);
  if (isPaymentRecord(record)) return canSubmitPaymentScheme(record);
  return false;
}

export function canApproveStandardSchemeRecord(record: SchemeRecord): boolean {
  if (isFestiveRecord(record)) return canApproveFestiveScheme(record);
  if (isCashRecord(record)) return canApproveCashScheme(record);
  if (isTurnoverRecord(record)) return canApproveTurnoverScheme(record);
  if (isPaymentRecord(record)) return canApprovePaymentScheme(record);
  return false;
}

export function canRejectStandardSchemeRecord(record: SchemeRecord): boolean {
  return canApproveStandardSchemeRecord(record);
}

export function canSendBackStandardSchemeRecord(record: SchemeRecord): boolean {
  return canApproveStandardSchemeRecord(record);
}

export function canActivateStandardSchemeRecord(record: SchemeRecord): boolean {
  if (isFestiveRecord(record)) return canActivateFestiveScheme(record);
  if (isCashRecord(record)) return canActivateCashScheme(record);
  if (isTurnoverRecord(record)) return canActivateTurnoverScheme(record);
  if (isPaymentRecord(record)) return canActivatePaymentScheme(record);
  return false;
}

export function canDeactivateStandardSchemeRecord(record: SchemeRecord): boolean {
  if (isFestiveRecord(record)) return canDeactivateFestiveScheme(record);
  if (isCashRecord(record)) return canDeactivateCashScheme(record);
  if (isTurnoverRecord(record)) return canDeactivateTurnoverScheme(record);
  if (isPaymentRecord(record)) return canDeactivatePaymentScheme(record);
  return false;
}

export function canCopyStandardSchemeRecord(record: SchemeRecord): boolean {
  if (isFestiveRecord(record)) return canCopyFestiveScheme(record);
  if (isCashRecord(record)) return canCopyCashScheme(record);
  if (isTurnoverRecord(record)) return canCopyTurnoverScheme(record);
  if (isPaymentRecord(record)) return canCopyPaymentScheme(record);
  return false;
}

export function formatStandardSchemeOperationalStatus(record: SchemeRecord): string {
  if (isFestiveRecord(record)) return formatFestiveOperationalStatus(record);
  if (isCashRecord(record)) return formatCashOperationalStatus(record);
  if (isTurnoverRecord(record)) return formatTurnoverOperationalStatus(record);
  if (isPaymentRecord(record)) return formatPaymentOperationalStatus(record);
  return "Inactive";
}

export function resolveStandardSchemeScope(record: SchemeRecord): string {
  if (isFestiveRecord(record)) {
    if (record.productScope === "All") return "All products";
    const n = record.selectedProductIds?.length ?? 0;
    return n ? `${n} product${n > 1 ? "s" : ""}` : "Specific";
  }
  if (isCashRecord(record)) {
    return record.minimumOrderValue !== undefined
      ? `MOV ${formatSchemeRupee(record.minimumOrderValue)}`
      : "Cash discount";
  }
  if (isTurnoverRecord(record)) {
    const slabs = record.turnoverSlabs?.length ?? 0;
    return slabs ? `${slabs} slab${slabs > 1 ? "s" : ""}` : "—";
  }
  if (isPaymentRecord(record)) {
    const minOut =
      record.minimumOutstandingAmount !== undefined
        ? formatSchemeRupee(record.minimumOutstandingAmount)
        : "—";
    return `Min ${minOut}`;
  }
  return "—";
}

export function resolveStandardSchemeBenefit(record: SchemeRecord): string {
  if (isFestiveRecord(record)) return formatFestiveBenefit(record);
  if (isCashRecord(record)) return formatCashBenefit(record);
  if (isTurnoverRecord(record)) return formatTurnoverBenefit(record);
  if (isPaymentRecord(record)) return formatPaymentBenefit(record);
  return "—";
}

export function countStandardSchemeStates(record: SchemeRecord): number {
  if (!isStandardSchemeRecord(record)) return 0;
  return countStatesFromRecord(record);
}
