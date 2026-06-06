import { ACCOUNTS_CURRENT_USER, ACCOUNTS_PAYMENT_ADMIN } from "@/lib/accounts/config";
import type { ClaimApprovalTrailEntry, ClaimAttachment } from "@/app/(app)/hr/claims/tada/tada-claim-data";
import { loadTadaClaims, type TadaClaim } from "@/app/(app)/hr/claims/tada/tada-claim-data";
import { loadExpenses } from "../expenses/expense-data";
import {
  getPurchaseInvoiceById,
  loadPurchaseInvoices,
  recordPurchaseInvoicePayment,
} from "../purchase-invoices/purchase-invoices-data";
import type { PaymentMode } from "../expenses/expense-data";

export type PaymentExecutionStatus = "payment_pending" | "partially_paid" | "payment_done" | "cancelled";

export type PaymentSourceType =
  | "purchase"
  | "expense"
  | "tada_claim"
  | "vendor_adjustment"
  | "manual"
  | "other";

export const PAYMENT_MODES: PaymentMode[] = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Cheque",
  "NEFT",
  "RTGS",
];

export interface PaymentActivityEntry {
  at: string;
  action: string;
  by: string;
  detail: string;
}

export type PaidToType = "employee" | "vendor" | "other";

export interface PaymentInstallment {
  id: number;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentReferenceNo: string;
  transactionNo: string;
  remarks: string;
  createdBy: string;
  createdAt: string;
}

export interface CompanyPaymentRecord {
  id: number;
  paymentNo: string;
  paymentDate: string;
  paidToType: PaidToType;
  paidTo: string;
  sourceType: PaymentSourceType;
  sourceModuleLabel: string;
  sourceReferenceNo: string;
  employeeOrVendor: string;
  claimedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentExecutionStatus;
  installments: PaymentInstallment[];
  paymentMode?: PaymentMode;
  paymentReferenceNo?: string;
  paymentRemarks?: string;
  hrClaimId?: number | null;
  sourceDocumentId?: number | null;
  /** Payable before debit notes (future: invoice − debits) */
  effectivePayableAmount?: number;
  approvalTrail?: ClaimApprovalTrailEntry[];
  attachments?: ClaimAttachment[];
  activity: PaymentActivityEntry[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "ds_accounts_company_payments_v1";
const LEGACY_EXPENSE_KEY = "ds_accounts_finance_payments_v1";

export const SOURCE_TYPE_OPTIONS: { value: PaymentSourceType; label: string }[] = [
  { value: "purchase", label: "Purchase Invoice" },
  { value: "expense", label: "Expense" },
  { value: "tada_claim", label: "TA/DA Claim" },
  { value: "vendor_adjustment", label: "Vendor Adjustment" },
  { value: "manual", label: "Manual Payment" },
];

function normalizeSourceType(type: string): PaymentSourceType {
  if (type === "vendor_payment") return "vendor_adjustment";
  return (SOURCE_TYPE_OPTIONS.some((o) => o.value === type) ? type : "manual") as PaymentSourceType;
}

export function sourceTypeLabel(type: PaymentSourceType | string): string {
  const t = normalizeSourceType(type);
  return SOURCE_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

export function payeeDisplay(rec: CompanyPaymentRecord): string {
  return rec.employeeOrVendor || rec.paidTo;
}

export function getBalanceAmount(rec: CompanyPaymentRecord): number {
  return Math.max(0, rec.approvedAmount - rec.paidAmount);
}

export function derivePaymentStatus(
  approvedAmount: number,
  paidAmount: number,
  cancelled?: boolean,
): PaymentExecutionStatus {
  if (cancelled) return "cancelled";
  if (approvedAmount <= 0) return "payment_pending";
  if (paidAmount <= 0) return "payment_pending";
  if (paidAmount >= approvedAmount) return "payment_done";
  if (paidAmount > 0 && paidAmount < approvedAmount) return "partially_paid";
  return "payment_pending";
}

function sumInstallments(installments: PaymentInstallment[]): number {
  return installments.reduce((s, i) => s + i.amount, 0);
}

function latestInstallment(installments: PaymentInstallment[]): PaymentInstallment | undefined {
  if (!installments.length) return undefined;
  return [...installments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))[0];
}

export function normalizeCompanyPayment(rec: CompanyPaymentRecord): CompanyPaymentRecord {
  const paidAmount = sumInstallments(rec.installments);
  const balanceAmount = getBalanceAmount({ ...rec, paidAmount });
  const paymentStatus = derivePaymentStatus(
    rec.approvedAmount,
    paidAmount,
    rec.paymentStatus === "cancelled",
  );
  const latest = latestInstallment(rec.installments);
  const effectivePayableAmount =
    rec.effectivePayableAmount != null && rec.effectivePayableAmount > 0
      ? rec.effectivePayableAmount
      : rec.approvedAmount;
  return {
    ...rec,
    sourceType: normalizeSourceType(rec.sourceType),
    paidAmount,
    balanceAmount,
    paymentStatus,
    effectivePayableAmount,
    paymentDate: latest?.paymentDate ?? rec.paymentDate,
    paymentMode: latest?.paymentMode ?? rec.paymentMode,
    paymentReferenceNo: latest?.paymentReferenceNo ?? rec.paymentReferenceNo,
    paymentRemarks: latest?.remarks ?? rec.paymentRemarks,
    activity: rec.activity ?? [],
    installments: rec.installments.map((i) => ({ ...i, transactionNo: i.transactionNo ?? "" })),
  };
}

function nextPaymentNo(records: CompanyPaymentRecord[]): string {
  const max = records.reduce((m, r) => {
    const n = parseInt(r.paymentNo.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `PAY-${String(max + 1).padStart(4, "0")}`;
}

function nextInstallmentId(records: CompanyPaymentRecord[]): number {
  let max = 0;
  for (const r of records) {
    for (const i of r.installments) max = Math.max(max, i.id);
  }
  return max + 1;
}

function claimToRecord(claim: TadaClaim, id: number, paymentNo: string, existing?: CompanyPaymentRecord): CompanyPaymentRecord {
  const approved = claim.approvedAmount > 0 ? claim.approvedAmount : claim.claimAmount;
  const installments = existing?.installments ?? [];
  const base: CompanyPaymentRecord = {
    id,
    paymentNo: existing?.paymentNo ?? paymentNo,
    paymentDate: existing?.paymentDate ?? claim.finalApprovedAt?.slice(0, 10) ?? claim.claimDate,
    paidToType: "employee",
    paidTo: claim.employeeName,
    sourceType: "tada_claim",
    sourceModuleLabel: "HR — TA/DA Claims",
    sourceReferenceNo: claim.claimNumber,
    employeeOrVendor: claim.employeeName,
    claimedAmount: claim.claimAmount,
    approvedAmount: approved,
    paidAmount: 0,
    balanceAmount: 0,
    paymentStatus: "payment_pending",
    installments,
    hrClaimId: claim.id,
    sourceDocumentId: claim.id,
    effectivePayableAmount: approved,
    approvalTrail: claim.approvalTrail ?? [],
    attachments: claim.attachments,
    activity: existing?.activity ?? [],
    createdBy: existing?.createdBy ?? ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return normalizeCompanyPayment(base);
}

type LegacyFinance = {
  id: number;
  referenceNo: string;
  sourceModule: string;
  sourceModuleLabel: string;
  hrClaimId: number | null;
  employeeName: string;
  employeeCode: string;
  claimDate: string;
  categoryName: string;
  claimedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  paymentStatus: PaymentExecutionStatus;
  paymentMode?: PaymentMode;
  paymentDate?: string;
  paymentReferenceNo?: string;
  paymentRemarks?: string;
  paidBy?: string;
  approvalTrail?: ClaimApprovalTrailEntry[];
  attachments?: ClaimAttachment[];
  createdAt: string;
};

function legacyToCompanyPayment(leg: LegacyFinance, paymentNo: string): CompanyPaymentRecord {
  const installments: PaymentInstallment[] = [];
  if (leg.paidAmount > 0 && leg.paymentDate) {
    installments.push({
      id: 1,
      paymentDate: leg.paymentDate,
      amount: leg.paidAmount,
      paymentMode: leg.paymentMode ?? "Bank Transfer",
      paymentReferenceNo: leg.paymentReferenceNo ?? "",
      transactionNo: "",
      remarks: leg.paymentRemarks ?? "",
      createdBy: leg.paidBy ?? ACCOUNTS_CURRENT_USER,
      createdAt: leg.createdAt,
    });
  }
  const sourceType: PaymentSourceType =
    leg.sourceModule === "hr_tada_claim" ? "tada_claim" : leg.sourceModule === "hr_expense" ? "expense" : "other";

  return normalizeCompanyPayment({
    id: leg.id,
    paymentNo,
    paymentDate: leg.paymentDate ?? leg.claimDate,
    paidToType: "employee",
    paidTo: leg.employeeName,
    sourceType,
    sourceModuleLabel: leg.sourceModuleLabel,
    sourceReferenceNo: leg.referenceNo,
    employeeOrVendor: leg.employeeName,
    claimedAmount: leg.claimedAmount,
    approvedAmount: leg.approvedAmount,
    paidAmount: leg.paidAmount,
    balanceAmount: 0,
    paymentStatus: leg.paymentStatus,
    installments,
    hrClaimId: leg.hrClaimId,
    activity: [],
    approvalTrail: leg.approvalTrail,
    attachments: leg.attachments,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: leg.createdAt,
    updatedAt: new Date().toISOString(),
  });
}

function migrateLegacyOnce(existing: CompanyPaymentRecord[]): CompanyPaymentRecord[] {
  if (typeof window === "undefined") return existing;
  try {
    const raw = localStorage.getItem(LEGACY_EXPENSE_KEY);
    if (!raw) return existing;
    const legacy: LegacyFinance[] = JSON.parse(raw);
    const byRef = new Map(existing.map((r) => [`${r.sourceType}:${r.sourceReferenceNo}`, r]));
    let nextId = existing.length ? Math.max(...existing.map((r) => r.id)) + 1 : 1;
    const merged = [...existing];
    for (const leg of legacy) {
      const key = `${leg.sourceModule === "hr_tada_claim" ? "tada_claim" : "expense"}:${leg.referenceNo}`;
      if (byRef.has(key)) continue;
      const paymentNo = nextPaymentNo(merged);
      const rec = legacyToCompanyPayment(leg, paymentNo);
      rec.id = nextId++;
      merged.push(rec);
      byRef.set(key, rec);
    }
    return merged;
  } catch {
    return existing;
  }
}

function purchaseToRecord(
  inv: ReturnType<typeof loadPurchaseInvoices>[0],
  existing?: CompanyPaymentRecord,
): CompanyPaymentRecord {
  const ref = inv.vendorInvoiceNo || inv.invoiceNo;
  const approved = inv.grandTotal;
  const paidFromInv = inv.amountPaid ?? 0;
  const installments = existing?.installments ?? [];
  const base: CompanyPaymentRecord = {
    id: existing?.id ?? 0,
    paymentNo: existing?.paymentNo ?? "",
    paymentDate: existing?.paymentDate ?? inv.invoiceDate,
    paidToType: "vendor",
    paidTo: inv.vendorName,
    sourceType: "purchase",
    sourceModuleLabel: "Accounts — Purchase",
    sourceReferenceNo: ref,
    employeeOrVendor: inv.vendorName,
    claimedAmount: approved,
    approvedAmount: approved,
    paidAmount: 0,
    balanceAmount: 0,
    paymentStatus: "payment_pending",
    installments,
    sourceDocumentId: inv.id,
    effectivePayableAmount: approved,
    activity: existing?.activity ?? [],
    createdBy: existing?.createdBy ?? ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const normalized = normalizeCompanyPayment(base);
  if (paidFromInv > 0 && installments.length === 0) {
    return normalizeCompanyPayment({
      ...normalized,
      installments: [
        {
          id: 1,
          paymentDate: inv.invoiceDate,
          amount: paidFromInv,
          paymentMode: "Bank Transfer",
          paymentReferenceNo: "",
          transactionNo: "",
          remarks: "Synced from purchase",
          createdBy: ACCOUNTS_CURRENT_USER,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }
  return normalized;
}

export function syncPayablesFromPurchases(existing: CompanyPaymentRecord[]): CompanyPaymentRecord[] {
  const invoices = loadPurchaseInvoices();
  const byRef = new Map(
    existing
      .filter((r) => r.sourceType === "purchase")
      .map((r) => [r.sourceReferenceNo, normalizeCompanyPayment(r)]),
  );
  let nextId = existing.length ? Math.max(...existing.map((r) => r.id)) + 1 : 1;
  const list = existing.filter((r) => r.sourceType !== "purchase");

  for (const inv of invoices) {
    const ref = inv.vendorInvoiceNo || inv.invoiceNo;
    const key = ref;
    if (byRef.has(key)) {
      const cur = byRef.get(key)!;
      byRef.set(key, purchaseToRecord(inv, cur));
    } else {
      const paymentNo = nextPaymentNo([...list, ...Array.from(byRef.values())]);
      const rec = purchaseToRecord(inv, undefined);
      rec.id = nextId++;
      rec.paymentNo = paymentNo;
      byRef.set(key, rec);
    }
  }
  return [...list, ...Array.from(byRef.values())].map(normalizeCompanyPayment);
}

function expenseToRecord(
  exp: ReturnType<typeof loadExpenses>[0],
  existing?: CompanyPaymentRecord,
): CompanyPaymentRecord {
  const approved = exp.approvedAmount > 0 ? exp.approvedAmount : exp.claimedAmount;
  const base: CompanyPaymentRecord = {
    id: existing?.id ?? 0,
    paymentNo: existing?.paymentNo ?? "",
    paymentDate: existing?.paymentDate ?? exp.expenseDate,
    paidToType: "employee",
    paidTo: exp.employeeName,
    sourceType: "expense",
    sourceModuleLabel: "Accounts — Expenses",
    sourceReferenceNo: exp.expenseNumber,
    employeeOrVendor: exp.employeeName,
    claimedAmount: exp.claimedAmount,
    approvedAmount: approved,
    paidAmount: 0,
    balanceAmount: 0,
    paymentStatus: "payment_pending",
    installments: existing?.installments ?? [],
    sourceDocumentId: exp.id,
    effectivePayableAmount: approved,
    activity: existing?.activity ?? [],
    createdBy: existing?.createdBy ?? ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return normalizeCompanyPayment(base);
}

export function syncPayablesFromExpenses(existing: CompanyPaymentRecord[]): CompanyPaymentRecord[] {
  const approved = loadExpenses().filter((e) => e.status === "approved");
  const byRef = new Map(
    existing
      .filter((r) => r.sourceType === "expense")
      .map((r) => [r.sourceReferenceNo, normalizeCompanyPayment(r)]),
  );
  let nextId = existing.length ? Math.max(...existing.map((r) => r.id)) + 1 : 1;
  const list = existing.filter((r) => r.sourceType !== "expense");

  for (const exp of approved) {
    const key = exp.expenseNumber;
    if (byRef.has(key)) {
      byRef.set(key, expenseToRecord(exp, byRef.get(key)));
    } else {
      const paymentNo = nextPaymentNo([...list, ...Array.from(byRef.values())]);
      const rec = expenseToRecord(exp);
      rec.id = nextId++;
      rec.paymentNo = paymentNo;
      byRef.set(key, rec);
    }
  }
  return [...list, ...Array.from(byRef.values())].map(normalizeCompanyPayment);
}

export function syncPayablesFromHr(existing: CompanyPaymentRecord[]): CompanyPaymentRecord[] {
  const approved = loadTadaClaims().filter((c) => c.status === "approved" || c.status === "paid");
  const byRef = new Map(existing.map((r) => [`tada_claim:${r.sourceReferenceNo}`, normalizeCompanyPayment(r)]));
  let nextId = existing.length ? Math.max(...existing.map((r) => r.id)) + 1 : 1;
  const list = [...existing];

  for (const claim of approved) {
    const key = `tada_claim:${claim.claimNumber}`;
    if (byRef.has(key)) {
      const cur = byRef.get(key)!;
      byRef.set(key, claimToRecord(claim, cur.id, cur.paymentNo, cur));
    } else {
      const paymentNo = nextPaymentNo([...list, ...Array.from(byRef.values())]);
      const rec = claimToRecord(claim, nextId++, paymentNo);
      byRef.set(key, rec);
      list.push(rec);
    }
  }
  return Array.from(byRef.values())
    .map(normalizeCompanyPayment)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

export function loadCompanyPayments(): CompanyPaymentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let existing: CompanyPaymentRecord[] = raw ? JSON.parse(raw) : [];
    existing = migrateLegacyOnce(existing);
    let synced = syncPayablesFromHr(existing);
    synced = syncPayablesFromPurchases(synced);
    synced = syncPayablesFromExpenses(synced);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
    return synced;
  } catch {
    return syncPayablesFromHr([]);
  }
}

export function saveCompanyPayments(records: CompanyPaymentRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.map(normalizeCompanyPayment)));
}

export function getCompanyPaymentById(id: number): CompanyPaymentRecord | undefined {
  const r = loadCompanyPayments().find((p) => p.id === id);
  return r ? normalizeCompanyPayment(r) : undefined;
}

export interface PayableSourceLookup {
  sourceReferenceNo: string;
  sourceType: PaymentSourceType;
  sourceModuleLabel: string;
  paidToType: PaidToType;
  paidTo: string;
  employeeOrVendor: string;
  claimedAmount: number;
  approvedAmount: number;
  balanceAmount: number;
  hrClaimId?: number | null;
  sourceDocumentId?: number | null;
}

export interface PayableReferenceOption {
  value: string;
  label: string;
  sub: string;
  documentId?: number;
}

export function listPayableReferenceOptions(sourceType: PaymentSourceType): PayableReferenceOption[] {
  loadCompanyPayments();
  if (sourceType === "manual" || sourceType === "vendor_adjustment") return [];

  if (sourceType === "tada_claim") {
    return loadTadaClaims()
      .filter((c) => c.status === "approved" || c.status === "paid")
      .map((c) => {
        const approved = c.approvedAmount > 0 ? c.approvedAmount : c.claimAmount;
        const existing = loadCompanyPayments().find(
          (p) => p.sourceType === "tada_claim" && p.sourceReferenceNo === c.claimNumber,
        );
        const balance = existing ? getBalanceAmount(existing) : approved;
        return {
          value: c.claimNumber,
          label: c.claimNumber,
          sub: `${c.employeeName} · Approved ${approved} · Balance ${balance}`,
          documentId: c.id,
        };
      })
      .filter((o) => {
        const m = o.sub.match(/Balance ([\d.]+)/);
        return !m || parseFloat(m[1]) > 0;
      });
  }

  if (sourceType === "purchase") {
    return loadPurchaseInvoices().map((inv) => {
      const ref = inv.vendorInvoiceNo || inv.invoiceNo;
      const existing = loadCompanyPayments().find(
        (p) => p.sourceType === "purchase" && p.sourceReferenceNo === ref,
      );
      const balance = existing ? getBalanceAmount(existing) : Math.max(0, inv.grandTotal - inv.amountPaid);
      return {
        value: ref,
        label: `${ref} (${inv.invoiceNo})`,
        sub: `${inv.vendorName} · ${inv.grandTotal} · Balance ${balance}`,
        documentId: inv.id,
      };
    });
  }

  if (sourceType === "expense") {
    return loadExpenses()
      .filter((e) => e.status === "approved")
      .map((e) => {
        const approved = e.approvedAmount > 0 ? e.approvedAmount : e.claimedAmount;
        const existing = loadCompanyPayments().find(
          (p) => p.sourceType === "expense" && p.sourceReferenceNo === e.expenseNumber,
        );
        const balance = existing ? getBalanceAmount(existing) : approved;
        return {
          value: e.expenseNumber,
          label: e.expenseNumber,
          sub: `${e.employeeName} · ${approved} · Balance ${balance}`,
          documentId: e.id,
        };
      });
  }

  return [];
}

export function lookupPayableSource(
  sourceType: PaymentSourceType,
  sourceReferenceNo: string,
): PayableSourceLookup | null {
  const ref = sourceReferenceNo.trim();
  if (!ref) return null;
  const type = normalizeSourceType(sourceType);

  if (type === "purchase") {
    const inv =
      loadPurchaseInvoices().find(
        (i) => i.vendorInvoiceNo === ref || i.invoiceNo === ref,
      ) ?? getPurchaseInvoiceById(Number(ref));
    if (!inv) return null;
    const invRef = inv.vendorInvoiceNo || inv.invoiceNo;
    const approved = inv.grandTotal;
    const existing = loadCompanyPayments().find(
      (p) => p.sourceType === "purchase" && p.sourceReferenceNo === invRef,
    );
    const paid = existing?.paidAmount ?? inv.amountPaid ?? 0;
    return {
      sourceReferenceNo: invRef,
      sourceType: "purchase",
      sourceModuleLabel: "Accounts — Purchase",
      paidToType: "vendor",
      paidTo: inv.vendorName,
      employeeOrVendor: inv.vendorName,
      claimedAmount: approved,
      approvedAmount: approved,
      balanceAmount: Math.max(0, approved - paid),
      sourceDocumentId: inv.id,
    };
  }

  if (type === "expense") {
    const exp = loadExpenses().find((e) => e.expenseNumber === ref);
    if (!exp || exp.status !== "approved") return null;
    const approved = exp.approvedAmount > 0 ? exp.approvedAmount : exp.claimedAmount;
    const existing = loadCompanyPayments().find(
      (p) => p.sourceType === "expense" && p.sourceReferenceNo === ref,
    );
    const paid = existing?.paidAmount ?? 0;
    return {
      sourceReferenceNo: ref,
      sourceType: "expense",
      sourceModuleLabel: "Accounts — Expenses",
      paidToType: "employee",
      paidTo: exp.employeeName,
      employeeOrVendor: exp.employeeName,
      claimedAmount: exp.claimedAmount,
      approvedAmount: approved,
      balanceAmount: Math.max(0, approved - paid),
      sourceDocumentId: exp.id,
    };
  }

  if (type === "tada_claim") {
    const claim = loadTadaClaims().find((c) => c.claimNumber === ref);
    if (!claim || (claim.status !== "approved" && claim.status !== "paid")) return null;
    const approved = claim.approvedAmount > 0 ? claim.approvedAmount : claim.claimAmount;
    const existing = loadCompanyPayments().find(
      (p) => p.sourceType === "tada_claim" && p.sourceReferenceNo === ref,
    );
    const paid = existing?.paidAmount ?? (claim.status === "paid" ? approved : 0);
    return {
      sourceReferenceNo: ref,
      sourceType: "tada_claim",
      sourceModuleLabel: "HR — TA/DA Claims",
      paidToType: "employee",
      paidTo: claim.employeeName,
      employeeOrVendor: claim.employeeName,
      claimedAmount: claim.claimAmount,
      approvedAmount: approved,
      balanceAmount: Math.max(0, approved - paid),
      hrClaimId: claim.id,
      sourceDocumentId: claim.id,
    };
  }

  const existing = loadCompanyPayments().find(
    (p) => normalizeSourceType(p.sourceType) === type && p.sourceReferenceNo === ref,
  );
  if (existing) {
    return {
      sourceReferenceNo: ref,
      sourceType: existing.sourceType,
      sourceModuleLabel: existing.sourceModuleLabel,
      paidToType: existing.paidToType,
      paidTo: existing.paidTo,
      employeeOrVendor: existing.employeeOrVendor,
      claimedAmount: existing.claimedAmount,
      approvedAmount: existing.approvedAmount,
      balanceAmount: getBalanceAmount(existing),
      hrClaimId: existing.hrClaimId,
    };
  }
  return null;
}

export interface PaymentListFilters {
  tab: string;
  search: string;
  paymentMode: string;
  sourceType: string;
  dateFrom: string;
  dateTo: string;
  statusFilter: string;
}

export function tabMatchesPayment(rec: CompanyPaymentRecord, tab: string): boolean {
  const balance = getBalanceAmount(rec);
  const { paidAmount, approvedAmount, paymentStatus } = rec;

  if (tab === "all") return paymentStatus !== "cancelled";
  if (tab === "cancelled") return paymentStatus === "cancelled";
  if (tab === "pending" || tab === "payment_pending") return balance > 0 && paidAmount === 0;
  if (tab === "partially_paid") return paidAmount > 0 && paidAmount < approvedAmount;
  if (tab === "paid" || tab === "payment_done") return approvedAmount > 0 && paidAmount >= approvedAmount;
  return true;
}

export function filterCompanyPayments(
  records: CompanyPaymentRecord[],
  filters: PaymentListFilters,
): CompanyPaymentRecord[] {
  let r = records.map(normalizeCompanyPayment).filter((e) => tabMatchesPayment(e, filters.tab));

  if (filters.statusFilter && filters.statusFilter !== "all") {
    r = r.filter((e) => e.paymentStatus === filters.statusFilter);
  }
  if (filters.paymentMode && filters.paymentMode !== "all") {
    r = r.filter((e) => e.paymentMode === filters.paymentMode);
  }
  if (filters.sourceType && filters.sourceType !== "all") {
    r = r.filter((e) => e.sourceType === filters.sourceType);
  }
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    r = r.filter(
      (e) =>
        e.paymentNo.toLowerCase().includes(q) ||
        e.sourceReferenceNo.toLowerCase().includes(q) ||
        e.paidTo.toLowerCase().includes(q) ||
        e.employeeOrVendor.toLowerCase().includes(q),
    );
  }
  if (filters.dateFrom) r = r.filter((e) => e.paymentDate >= filters.dateFrom);
  if (filters.dateTo) r = r.filter((e) => e.paymentDate <= filters.dateTo);
  return r;
}

export function computePaymentTabCounts(records: CompanyPaymentRecord[]): Record<string, number> {
  const normalized = records.map(normalizeCompanyPayment);
  return {
    all: normalized.filter((r) => r.paymentStatus !== "cancelled").length,
    pending: normalized.filter((r) => tabMatchesPayment(r, "pending")).length,
    partially_paid: normalized.filter((r) => tabMatchesPayment(r, "partially_paid")).length,
    paid: normalized.filter((r) => tabMatchesPayment(r, "paid")).length,
    cancelled: normalized.filter((r) => r.paymentStatus === "cancelled").length,
  };
}

export function canEditPayment(rec: CompanyPaymentRecord): boolean {
  if (ACCOUNTS_PAYMENT_ADMIN) return true;
  return rec.paymentStatus === "payment_pending" || rec.paymentStatus === "partially_paid";
}

export function getPaymentRowActions(rec: CompanyPaymentRecord): ("view" | "edit" | "pay" | "cancel")[] {
  const actions: ("view" | "edit" | "pay" | "cancel")[] = ["view"];
  if (canEditPayment(rec)) actions.push("edit");
  if (rec.paymentStatus !== "cancelled" && getBalanceAmount(rec) > 0) actions.push("pay");
  if (rec.paymentStatus !== "cancelled" && rec.paymentStatus !== "payment_done") actions.push("cancel");
  return actions;
}

export interface CreatePaymentInput {
  paymentDate: string;
  paidToType: PaidToType;
  paidTo: string;
  sourceType: PaymentSourceType;
  sourceModuleLabel: string;
  sourceReferenceNo: string;
  employeeOrVendor: string;
  claimedAmount: number;
  approvedAmount: number;
  installment: {
    amount: number;
    paymentMode: PaymentMode;
    paymentReferenceNo: string;
    transactionNo: string;
    remarks: string;
  };
}

function appendPaymentActivity(
  existing: PaymentActivityEntry[],
  action: string,
  detail: string,
): PaymentActivityEntry[] {
  return [...existing, { at: new Date().toISOString(), action, by: ACCOUNTS_CURRENT_USER, detail }];
}

function findPayableBySource(
  all: CompanyPaymentRecord[],
  sourceType: PaymentSourceType,
  sourceReferenceNo: string,
): CompanyPaymentRecord | undefined {
  const ref = sourceReferenceNo.trim();
  if (!ref) return undefined;
  return all.find(
    (p) =>
      normalizeSourceType(p.sourceType) === normalizeSourceType(sourceType) &&
      p.sourceReferenceNo === ref &&
      p.paymentStatus !== "cancelled",
  );
}

export function createCompanyPayment(input: CreatePaymentInput): CompanyPaymentRecord {
  const all = loadCompanyPayments();
  const existing = findPayableBySource(all, input.sourceType, input.sourceReferenceNo);
  if (existing && input.installment.amount > 0) {
    return addPaymentInstallment(existing.id, {
      paymentDate: input.paymentDate,
      amount: input.installment.amount,
      paymentMode: input.installment.paymentMode,
      paymentReferenceNo: input.installment.paymentReferenceNo,
      transactionNo: input.installment.transactionNo,
      remarks: input.installment.remarks,
    });
  }

  const id = all.length ? Math.max(...all.map((r) => r.id)) + 1 : 1;
  const instId = nextInstallmentId(all);
  const installments: PaymentInstallment[] = [];
  if (input.installment.amount > 0) {
    installments.push({
      id: instId,
      paymentDate: input.paymentDate,
      amount: input.installment.amount,
      paymentMode: input.installment.paymentMode,
      paymentReferenceNo: input.installment.paymentReferenceNo,
      transactionNo: input.installment.transactionNo ?? "",
      remarks: input.installment.remarks,
      createdBy: ACCOUNTS_CURRENT_USER,
      createdAt: new Date().toISOString(),
    });
  }
  const lookup = lookupPayableSource(input.sourceType, input.sourceReferenceNo);
  const rec = normalizeCompanyPayment({
    id,
    paymentNo: nextPaymentNo(all),
    paymentDate: input.paymentDate,
    paidToType: input.paidToType,
    paidTo: input.paidTo,
    sourceType: normalizeSourceType(input.sourceType),
    sourceModuleLabel: input.sourceModuleLabel || sourceTypeLabel(input.sourceType),
    sourceReferenceNo: input.sourceReferenceNo,
    employeeOrVendor: input.employeeOrVendor || input.paidTo,
    claimedAmount: input.claimedAmount,
    approvedAmount: input.approvedAmount,
    effectivePayableAmount: input.approvedAmount,
    paidAmount: 0,
    balanceAmount: 0,
    paymentStatus: "payment_pending",
    installments,
    hrClaimId: lookup?.hrClaimId ?? undefined,
    sourceDocumentId: lookup?.sourceDocumentId ?? lookup?.hrClaimId ?? undefined,
    activity: appendPaymentActivity([], "created", `Payment record ${nextPaymentNo(all)}`),
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (input.installment.amount > getBalanceAmount({ ...rec, approvedAmount: input.approvedAmount })) {
    throw new Error("Payment amount cannot exceed balance (approved − paid).");
  }
  const updated = [...all, rec];
  saveCompanyPayments(updated);
  return rec;
}

export function updateCompanyPaymentHeader(
  id: number,
  input: Omit<CreatePaymentInput, "installment">,
): CompanyPaymentRecord {
  const all = loadCompanyPayments();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Payment not found.");
  const cur = normalizeCompanyPayment(all[idx]);
  if (!canEditPayment(cur)) throw new Error("Cannot edit completed or cancelled payments.");

  const updated = normalizeCompanyPayment({
    ...cur,
    paymentDate: input.paymentDate,
    paidToType: input.paidToType,
    paidTo: input.paidTo,
    sourceType: input.sourceType,
    sourceModuleLabel: input.sourceModuleLabel || sourceTypeLabel(input.sourceType),
    sourceReferenceNo: input.sourceReferenceNo,
    employeeOrVendor: input.employeeOrVendor || input.paidTo,
    claimedAmount: input.claimedAmount,
    approvedAmount: input.approvedAmount,
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  all[idx] = updated;
  saveCompanyPayments(all);
  return updated;
}

export function addPaymentInstallment(
  id: number,
  payload: {
    paymentDate: string;
    amount: number;
    paymentMode: PaymentMode;
    paymentReferenceNo: string;
    transactionNo?: string;
    remarks: string;
  },
): CompanyPaymentRecord {
  const all = loadCompanyPayments();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Payment not found.");
  const cur = normalizeCompanyPayment(all[idx]);
  if (cur.paymentStatus === "cancelled") throw new Error("Cancelled payment cannot receive installments.");
  const balance = getBalanceAmount(cur);
  if (payload.amount <= 0) throw new Error("Amount must be greater than zero.");
  if (payload.amount > balance) throw new Error(`Amount cannot exceed balance (${balance}).`);

  const inst: PaymentInstallment = {
    id: nextInstallmentId(all),
    paymentDate: payload.paymentDate,
    amount: payload.amount,
    paymentMode: payload.paymentMode,
    paymentReferenceNo: payload.paymentReferenceNo,
    transactionNo: payload.transactionNo ?? "",
    remarks: payload.remarks,
    createdBy: ACCOUNTS_CURRENT_USER,
    createdAt: new Date().toISOString(),
  };
  const updated = normalizeCompanyPayment({
    ...cur,
    installments: [...cur.installments, inst],
    activity: appendPaymentActivity(
      cur.activity ?? [],
      "payment_recorded",
      `${payload.paymentMode} ${payload.amount}${payload.transactionNo ? ` · Txn ${payload.transactionNo}` : ""}`,
    ),
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  all[idx] = updated;
  saveCompanyPayments(all);

  if (updated.sourceType === "purchase" && updated.sourceDocumentId) {
    recordPurchaseInvoicePayment(updated.sourceDocumentId, payload.amount);
  }

  return updated;
}

export function cancelCompanyPayment(id: number): CompanyPaymentRecord {
  const all = loadCompanyPayments();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Payment not found.");
  const updated = normalizeCompanyPayment({
    ...all[idx],
    paymentStatus: "cancelled",
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  all[idx] = updated;
  saveCompanyPayments(all);
  return updated;
}

/** Adapter for Accounts → Expenses finance view */
export function toAccountPaymentRecord(cp: CompanyPaymentRecord) {
  return {
    id: cp.id,
    referenceNo: cp.sourceReferenceNo,
    sourceModule:
      cp.sourceType === "tada_claim"
        ? ("hr_tada_claim" as const)
        : cp.sourceType === "expense"
          ? ("hr_expense" as const)
          : ("mobile_expense" as const),
    sourceModuleLabel: cp.sourceModuleLabel,
    hrClaimId: cp.hrClaimId ?? null,
    employeeName: cp.paidTo,
    employeeCode: "",
    department: "",
    claimDate: cp.paymentDate,
    categoryName: sourceTypeLabel(cp.sourceType),
    description: cp.paymentRemarks ?? "",
    claimedAmount: cp.claimedAmount,
    approvedAmount: cp.approvedAmount,
    paidAmount: cp.paidAmount,
    remainingAmount: cp.balanceAmount,
    pendingPaymentAmount: cp.balanceAmount,
    paymentStatus: cp.paymentStatus,
    paymentMode: cp.paymentMode,
    paymentDate: cp.paymentDate,
    paymentReferenceNo: cp.paymentReferenceNo,
    paymentRemarks: cp.paymentRemarks,
    paidBy: cp.installments[cp.installments.length - 1]?.createdBy,
    approvalTrail: cp.approvalTrail ?? [],
    attachments: cp.attachments ?? [],
    createdAt: cp.createdAt,
    updatedAt: cp.updatedAt,
  };
}

export function loadAccountPaymentsFromCompany(): ReturnType<typeof toAccountPaymentRecord>[] {
  return loadCompanyPayments().map(toAccountPaymentRecord);
}

export type AccountPaymentAdapter = ReturnType<typeof toAccountPaymentRecord>;

export function saveAccountPaymentsFromCompany(records: AccountPaymentAdapter[]): void {
  const company = loadCompanyPayments();
  const byId = new Map(company.map((c) => [c.id, c]));
  for (const leg of records) {
    const existing = byId.get(leg.id);
    if (!existing) continue;
    const paid = leg.paidAmount;
    if (paid === existing.paidAmount) {
      byId.set(leg.id, normalizeCompanyPayment({ ...existing, paymentStatus: leg.paymentStatus }));
      continue;
    }
    const delta = paid - existing.paidAmount;
    if (delta > 0) {
      byId.set(
        leg.id,
        normalizeCompanyPayment({
          ...existing,
          installments: [
            ...existing.installments,
            {
              id: nextInstallmentId(Array.from(byId.values())),
              paymentDate: leg.paymentDate ?? new Date().toISOString().slice(0, 10),
              amount: delta,
              paymentMode: leg.paymentMode ?? "Bank Transfer",
              paymentReferenceNo: leg.paymentReferenceNo ?? "",
              transactionNo: "",
              remarks: leg.paymentRemarks ?? "",
              createdBy: leg.paidBy ?? ACCOUNTS_CURRENT_USER,
              createdAt: new Date().toISOString(),
            },
          ],
          updatedAt: new Date().toISOString(),
        }),
      );
    }
  }
  saveCompanyPayments(Array.from(byId.values()));
}
