import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "paid"
  | "cancelled";

export type ExpensePaidStatus = "unpaid" | "paid";
export type ExpenseSource = "mobile_app" | "web_admin" | "tada_claim";
export type PaymentMode =
  | "Cash"
  | "UPI"
  | "Bank Transfer"
  | "Cheque"
  | "NEFT"
  | "RTGS"
  | "Card"
  | "Other";

export interface ExpenseAttachment {
  id: string;
  documentName: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  dataUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ApprovalHistoryEntry {
  action: "submitted" | "approved" | "rejected" | "cancelled" | "paid" | "created";
  by: string;
  at: string;
  remarks: string;
  claimedAmount?: number;
  approvedAmount?: number;
  paidAmount?: number;
}

export interface PaymentDetails {
  paymentDate: string;
  paymentMode: PaymentMode;
  paymentReferenceNo: string;
  paidAmount: number;
  paymentRemarks: string;
  paidBy: string;
  paidAt: string;
}

export interface AccountExpense {
  id: number;
  expenseNumber: string;
  expenseDate: string;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string;
  categoryId: number;
  categoryName: string;
  description: string;
  amount: number;
  withTax: boolean;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  /** Total claimed (incl. tax) — reimbursement basis */
  claimedAmount: number;
  /** Amount approved for payment (may be less than claimed) */
  approvedAmount: number;
  /** Amount actually paid */
  paidAmount: number;
  paymentMode?: PaymentMode;
  source: ExpenseSource;
  sourceReferenceNo: string;
  status: ExpenseStatus;
  paidStatus: ExpensePaidStatus;
  attachments: ExpenseAttachment[];
  approvalHistory: ApprovalHistoryEntry[];
  payment?: PaymentDetails;
  approvedBy?: string;
  approvalRemarks?: string;
  isPartialApproval?: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFormValues {
  expenseDate: string;
  employeeId: number | null;
  categoryId: number | null;
  description: string;
  amount: number;
  withTax: boolean;
  gstPercent: number;
  paymentMode?: PaymentMode;
  source: ExpenseSource;
  sourceReferenceNo: string;
  attachments: ExpenseAttachment[];
}

const STORAGE_KEY = "ds_accounts_expenses_v2";

export function getClaimedAmount(expense: AccountExpense): number {
  return expense.claimedAmount ?? expense.totalAmount ?? 0;
}

export function getApprovedAmount(expense: AccountExpense): number {
  if (expense.approvedAmount > 0) return expense.approvedAmount;
  if (expense.status === "approved" || expense.status === "paid") {
    return getClaimedAmount(expense);
  }
  return 0;
}

export function getPaidAmount(expense: AccountExpense): number {
  if (expense.paidAmount > 0) return expense.paidAmount;
  return expense.payment?.paidAmount ?? 0;
}

export function getDeductedAmount(expense: AccountExpense): number {
  const claimed = getClaimedAmount(expense);
  const approved = getApprovedAmount(expense);
  return Math.max(0, claimed - approved);
}

export function normalizeExpense(raw: AccountExpense): AccountExpense {
  const claimed = raw.claimedAmount ?? raw.totalAmount ?? 0;
  let approved = raw.approvedAmount ?? 0;
  if ((raw.status === "approved" || raw.status === "paid") && approved === 0) {
    approved = claimed;
  }
  const paid = raw.paidAmount ?? raw.payment?.paidAmount ?? 0;
  return {
    ...raw,
    claimedAmount: claimed,
    approvedAmount: approved,
    paidAmount: paid,
  };
}

export interface ExpenseListFilters {
  tab: string;
  search: string;
  categoryId: string;
  employeeId: string;
  status: string;
  source: string;
  dateFrom: string;
  dateTo: string;
}

export function filterExpenses(records: AccountExpense[], filters: ExpenseListFilters): AccountExpense[] {
  let r = records.filter((e) => tabMatches(e, filters.tab));
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    r = r.filter(
      (e) =>
        e.expenseNumber.toLowerCase().includes(q) ||
        e.employeeName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.categoryName.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q),
    );
  }
  if (filters.categoryId !== "all") r = r.filter((e) => String(e.categoryId) === filters.categoryId);
  if (filters.employeeId !== "all") r = r.filter((e) => String(e.employeeId) === filters.employeeId);
  if (filters.status !== "all") r = r.filter((e) => e.status === filters.status);
  if (filters.source !== "all") r = r.filter((e) => e.source === filters.source);
  if (filters.dateFrom) r = r.filter((e) => e.expenseDate >= filters.dateFrom);
  if (filters.dateTo) r = r.filter((e) => e.expenseDate <= filters.dateTo);
  return r.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
}

export function newAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function calcTax(amount: number, withTax: boolean, gstPercent: number) {
  if (!withTax || gstPercent <= 0) {
    return { gstAmount: 0, totalAmount: amount };
  }
  const gstAmount = Math.round((amount * gstPercent) / 100);
  return { gstAmount, totalAmount: amount + gstAmount };
}

export function generateExpenseNumber(existing: AccountExpense[]): string {
  const year = new Date().getFullYear();
  const prefix = `EXP-${year}-`;
  const nums = existing
    .map((e) => e.expenseNumber)
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.replace(prefix, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export function loadExpenses(): AccountExpense[] {
  if (typeof window === "undefined") return SEED_EXPENSES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_EXPENSES));
      return SEED_EXPENSES;
    }
    return (JSON.parse(raw) as AccountExpense[]).map(normalizeExpense);
  } catch {
    return SEED_EXPENSES;
  }
}

export function saveExpenses(expenses: AccountExpense[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function getExpenseById(id: number): AccountExpense | undefined {
  return loadExpenses().find((e) => e.id === id);
}

export function sourceLabel(source: ExpenseSource): string {
  const map: Record<ExpenseSource, string> = {
    mobile_app: "Mobile App",
    web_admin: "Web Admin",
    tada_claim: "TA/DA Claim",
  };
  return map[source];
}

export function tabMatches(expense: AccountExpense, tab: string): boolean {
  if (tab === "all") return true;
  if (tab === "pending") return expense.status === "submitted" || expense.status === "pending_approval";
  if (tab === "approved") return expense.status === "approved";
  if (tab === "paid") return expense.status === "paid";
  if (tab === "rejected") return expense.status === "rejected";
  if (tab === "cancelled") return expense.status === "cancelled";
  return true;
}

export function computeTabCounts(expenses: AccountExpense[]): Record<string, number> {
  return {
    all: expenses.length,
    pending: expenses.filter((e) => tabMatches(e, "pending")).length,
    approved: expenses.filter((e) => tabMatches(e, "approved")).length,
    paid: expenses.filter((e) => tabMatches(e, "paid")).length,
    rejected: expenses.filter((e) => tabMatches(e, "rejected")).length,
    cancelled: expenses.filter((e) => tabMatches(e, "cancelled")).length,
  };
}

export function computeSummary(expenses: AccountExpense[]) {
  const active = expenses.filter((e) => e.status !== "cancelled" && e.status !== "rejected");
  const total = active.reduce((s, e) => s + getClaimedAmount(e), 0);
  const approved = expenses
    .filter((e) => e.status === "approved" || e.status === "paid")
    .reduce((s, e) => s + getApprovedAmount(e), 0);
  const paid = expenses.filter((e) => e.status === "paid").reduce((s, e) => s + getPaidAmount(e), 0);
  const pending = expenses
    .filter((e) => ["submitted", "pending_approval", "approved"].includes(e.status) && e.paidStatus !== "paid")
    .reduce((s, e) => s + (e.status === "approved" ? getApprovedAmount(e) : getClaimedAmount(e)), 0);
  return { total, approved, paid, pending };
}

export type ExpenseAction =
  | "view"
  | "edit"
  | "submit"
  | "approve"
  | "reject"
  | "mark_paid"
  | "cancel"
  | "delete";

export function getExpenseActions(expense: AccountExpense): ExpenseAction[] {
  switch (expense.status) {
    case "draft":
      return ["view", "edit", "submit", "cancel", "delete"];
    case "submitted":
    case "pending_approval":
      return ["view", "approve"];
    case "approved":
      return ["view", "mark_paid", "cancel"];
    case "paid":
    case "rejected":
    case "cancelled":
      return ["view"];
    default:
      return ["view"];
  }
}

export function canEditExpense(expense: AccountExpense): boolean {
  return expense.status === "draft" || expense.status === "submitted" || expense.status === "pending_approval";
}

export function validateExpenseForm(form: ExpenseFormValues): string | null {
  if (!form.employeeId) return "Select an employee.";
  if (!form.categoryId) return "Select an expense category.";
  if (!form.expenseDate) return "Expense date is required.";
  if (!form.description.trim()) return "Description is required.";
  if (form.amount <= 0) return "Expense amount must be greater than zero.";
  if (form.withTax && (form.gstPercent < 0 || form.gstPercent > 100)) return "Enter a valid GST %.";
  if (
    (form.source === "mobile_app" || form.source === "tada_claim") &&
    !form.sourceReferenceNo.trim()
  ) {
    return "Source reference number is required for this source.";
  }
  return null;
}

function touch(expense: AccountExpense, patch: Partial<AccountExpense>): AccountExpense {
  return {
    ...expense,
    ...patch,
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: nowIso(),
  };
}

function addHistory(
  expense: AccountExpense,
  action: ApprovalHistoryEntry["action"],
  remarks: string,
  by = ACCOUNTS_CURRENT_USER,
  amounts?: Pick<ApprovalHistoryEntry, "claimedAmount" | "approvedAmount" | "paidAmount">,
): AccountExpense {
  return {
    ...expense,
    approvalHistory: [
      ...expense.approvalHistory,
      { action, by, at: nowIso(), remarks, ...amounts },
    ],
  };
}

export function formToExpense(
  form: ExpenseFormValues,
  id: number,
  expenseNumber: string,
  employee: { fullName: string; employeeId: string; department: string },
  categoryName: string,
  status: ExpenseStatus,
): AccountExpense {
  const { gstAmount, totalAmount } = calcTax(form.amount, form.withTax, form.gstPercent);
  const ts = nowIso();
  return {
    id,
    expenseNumber,
    expenseDate: form.expenseDate,
    employeeId: form.employeeId!,
    employeeName: employee.fullName,
    employeeCode: employee.employeeId,
    department: employee.department,
    categoryId: form.categoryId!,
    categoryName,
    description: form.description.trim(),
    amount: form.amount,
    withTax: form.withTax,
    gstPercent: form.withTax ? form.gstPercent : 0,
    gstAmount,
    totalAmount,
    claimedAmount: totalAmount,
    approvedAmount: 0,
    paidAmount: 0,
    paymentMode: form.paymentMode,
    source: form.source,
    sourceReferenceNo: form.sourceReferenceNo.trim(),
    status,
    paidStatus: "unpaid",
    attachments: form.attachments,
    approvalHistory: [{ action: "created", by: ACCOUNTS_CURRENT_USER, at: ts, remarks: "Expense created" }],
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function expenseToForm(expense: AccountExpense): ExpenseFormValues {
  return {
    expenseDate: expense.expenseDate,
    employeeId: expense.employeeId,
    categoryId: expense.categoryId,
    description: expense.description,
    amount: expense.amount,
    withTax: expense.withTax,
    gstPercent: expense.gstPercent,
    paymentMode: expense.paymentMode,
    source: expense.source,
    sourceReferenceNo: expense.sourceReferenceNo,
    attachments: [...expense.attachments],
  };
}

export const DEFAULT_EXPENSE_FORM: ExpenseFormValues = {
  expenseDate: new Date().toISOString().slice(0, 10),
  employeeId: null,
  categoryId: null,
  description: "",
  amount: 0,
  withTax: false,
  gstPercent: 18,
  paymentMode: undefined,
  source: "web_admin",
  sourceReferenceNo: "",
  attachments: [],
};

export function submitExpense(expense: AccountExpense): AccountExpense {
  const claimed = getClaimedAmount(expense);
  return touch(
    addHistory(expense, "submitted", "Submitted for approval", ACCOUNTS_CURRENT_USER, {
      claimedAmount: claimed,
    }),
    { status: "pending_approval" },
  );
}

export function validateApprovedAmount(expense: AccountExpense, approvedAmount: number): string | null {
  const claimed = getClaimedAmount(expense);
  if (approvedAmount <= 0) return "Approved amount must be greater than zero.";
  if (approvedAmount > claimed) return `Approved amount cannot exceed claimed amount (${claimed}).`;
  return null;
}

export function approveExpense(
  expense: AccountExpense,
  approvedAmount: number,
  remarks: string,
): AccountExpense {
  const err = validateApprovedAmount(expense, approvedAmount);
  if (err) throw new Error(err);
  const claimed = getClaimedAmount(expense);
  const partial = approvedAmount < claimed;
  const note =
    remarks.trim() ||
    (partial
      ? `Partial approval: ${approvedAmount} of ${claimed}`
      : "Approved for full claimed amount");
  return touch(
    addHistory(expense, "approved", note, ACCOUNTS_CURRENT_USER, {
      claimedAmount: claimed,
      approvedAmount,
    }),
    {
      status: "approved",
      approvedAmount,
      approvedBy: ACCOUNTS_CURRENT_USER,
      approvalRemarks: remarks.trim() || note,
      isPartialApproval: partial,
    },
  );
}

export function rejectExpense(expense: AccountExpense, remarks: string): AccountExpense {
  return touch(addHistory(expense, "rejected", remarks), { status: "rejected" });
}

export function cancelExpense(expense: AccountExpense, remarks = "Cancelled"): AccountExpense {
  return touch(addHistory(expense, "cancelled", remarks), { status: "cancelled" });
}

export function markExpensePaid(
  expense: AccountExpense,
  payment: Omit<PaymentDetails, "paidBy" | "paidAt">,
): AccountExpense {
  const paidAt = nowIso();
  return touch(
    addHistory(expense, "paid", payment.paymentRemarks || "Marked as paid", ACCOUNTS_CURRENT_USER, {
      paidAmount: payment.paidAmount,
      approvedAmount: getApprovedAmount(expense),
    }),
    {
      status: "paid",
      paidStatus: "paid",
      paidAmount: payment.paidAmount,
      payment: {
        ...payment,
        paidBy: ACCOUNTS_CURRENT_USER,
        paidAt,
      },
    },
  );
}

export function updateExpenseFromForm(
  expense: AccountExpense,
  form: ExpenseFormValues,
  employee: { fullName: string; employeeId: string; department: string },
  categoryName: string,
): AccountExpense {
  const { gstAmount, totalAmount } = calcTax(form.amount, form.withTax, form.gstPercent);
  return touch(expense, {
    expenseDate: form.expenseDate,
    employeeId: form.employeeId!,
    employeeName: employee.fullName,
    employeeCode: employee.employeeId,
    department: employee.department,
    categoryId: form.categoryId!,
    categoryName,
    description: form.description.trim(),
    amount: form.amount,
    withTax: form.withTax,
    gstPercent: form.withTax ? form.gstPercent : 0,
    gstAmount,
    totalAmount,
    claimedAmount: totalAmount,
    paymentMode: form.paymentMode,
    source: form.source,
    sourceReferenceNo: form.sourceReferenceNo.trim(),
    attachments: form.attachments,
  });
}

const SEED_EXPENSES: AccountExpense[] = [
  {
    id: 1,
    expenseNumber: "EXP-2026-0001",
    expenseDate: "2026-05-28",
    employeeId: 3,
    employeeName: "Amit Deshmukh",
    employeeCode: "EMP-0003",
    department: "Sales",
    categoryId: 2,
    categoryName: "Transportation & Travel Expense",
    description: "Client visit — Wardha",
    amount: 1200,
    withTax: false,
    gstPercent: 0,
    gstAmount: 0,
    totalAmount: 1200,
    claimedAmount: 1200,
    approvedAmount: 0,
    paidAmount: 0,
    source: "mobile_app",
    sourceReferenceNo: "MOB-EXP-8821",
    status: "pending_approval",
    paidStatus: "unpaid",
    attachments: [
      {
        id: "a1",
        documentName: "Travel Receipt",
        fileName: "travel_may28.pdf",
        fileSize: "124 KB",
        mimeType: "application/pdf",
        uploadedAt: "2026-05-28",
        uploadedBy: "Amit Deshmukh",
      },
    ],
    approvalHistory: [
      { action: "created", by: "Amit Deshmukh", at: "2026-05-28T09:00:00.000Z", remarks: "Submitted from mobile" },
      { action: "submitted", by: "Amit Deshmukh", at: "2026-05-28T09:05:00.000Z", remarks: "Submitted for approval" },
    ],
    createdBy: "Amit Deshmukh",
    updatedBy: "Amit Deshmukh",
    createdAt: "2026-05-28T09:00:00.000Z",
    updatedAt: "2026-05-28T09:05:00.000Z",
  },
  {
    id: 2,
    expenseNumber: "EXP-2026-0002",
    expenseDate: "2026-05-20",
    employeeId: 2,
    employeeName: "Priya Patil",
    employeeCode: "EMP-0002",
    department: "Sales",
    categoryId: 5,
    categoryName: "Rent Expense",
    description: "Field office rent — May",
    amount: 15000,
    withTax: true,
    gstPercent: 18,
    gstAmount: 2700,
    totalAmount: 17700,
    claimedAmount: 17700,
    approvedAmount: 15000,
    paidAmount: 0,
    source: "tada_claim",
    sourceReferenceNo: "TAC-2026-0002",
    status: "approved",
    paidStatus: "unpaid",
    isPartialApproval: true,
    approvalRemarks: "Partial approval — rent cap applied",
    attachments: [],
    approvalHistory: [
      { action: "created", by: ACCOUNTS_CURRENT_USER, at: "2026-05-20T10:00:00.000Z", remarks: "From TA/DA claim" },
      {
        action: "submitted",
        by: ACCOUNTS_CURRENT_USER,
        at: "2026-05-20T10:30:00.000Z",
        remarks: "Submitted",
        claimedAmount: 17700,
      },
      {
        action: "approved",
        by: ACCOUNTS_CURRENT_USER,
        at: "2026-05-21T11:00:00.000Z",
        remarks: "Partial approval — rent cap applied",
        claimedAmount: 17700,
        approvedAmount: 15000,
      },
    ],
    approvedBy: ACCOUNTS_CURRENT_USER,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: "2026-05-20T10:00:00.000Z",
    updatedAt: "2026-05-21T11:00:00.000Z",
  },
  {
    id: 3,
    expenseNumber: "EXP-2026-0003",
    expenseDate: "2026-05-15",
    employeeId: 1,
    employeeName: "Rahul Sharma",
    employeeCode: "EMP-0001",
    department: "Management",
    categoryId: 7,
    categoryName: "Office Expense",
    description: "Printer cartridges and stationery",
    amount: 4500,
    withTax: true,
    gstPercent: 12,
    gstAmount: 540,
    totalAmount: 5040,
    claimedAmount: 5040,
    approvedAmount: 5040,
    paidAmount: 5040,
    source: "web_admin",
    sourceReferenceNo: "",
    status: "paid",
    paidStatus: "paid",
    approvalRemarks: "Approved",
    attachments: [
      {
        id: "a2",
        documentName: "Invoice",
        fileName: "office_inv_may.pdf",
        fileSize: "89 KB",
        mimeType: "application/pdf",
        uploadedAt: "2026-05-15",
        uploadedBy: ACCOUNTS_CURRENT_USER,
      },
    ],
    approvalHistory: [
      { action: "created", by: ACCOUNTS_CURRENT_USER, at: "2026-05-15T08:00:00.000Z", remarks: "Expense created" },
      { action: "submitted", by: ACCOUNTS_CURRENT_USER, at: "2026-05-15T08:30:00.000Z", remarks: "Submitted" },
      {
        action: "approved",
        by: ACCOUNTS_CURRENT_USER,
        at: "2026-05-16T09:00:00.000Z",
        remarks: "Approved",
        claimedAmount: 5040,
        approvedAmount: 5040,
      },
      {
        action: "paid",
        by: ACCOUNTS_CURRENT_USER,
        at: "2026-05-18T14:00:00.000Z",
        remarks: "Paid via bank transfer",
        paidAmount: 5040,
        approvedAmount: 5040,
      },
    ],
    approvedBy: ACCOUNTS_CURRENT_USER,
    payment: {
      paymentDate: "2026-05-18",
      paymentMode: "Bank Transfer",
      paymentReferenceNo: "UTR-88291002",
      paidAmount: 5040,
      paymentRemarks: "Paid via bank transfer",
      paidBy: ACCOUNTS_CURRENT_USER,
      paidAt: "2026-05-18T14:00:00.000Z",
    },
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: "2026-05-15T08:00:00.000Z",
    updatedAt: "2026-05-18T14:00:00.000Z",
  },
  {
    id: 4,
    expenseNumber: "EXP-2026-0004",
    expenseDate: "2026-06-01",
    employeeId: 3,
    employeeName: "Amit Deshmukh",
    employeeCode: "EMP-0003",
    department: "Sales",
    categoryId: 8,
    categoryName: "Fuel Expense",
    description: "Fuel for field visit",
    amount: 800,
    withTax: false,
    gstPercent: 0,
    gstAmount: 0,
    totalAmount: 800,
    claimedAmount: 800,
    approvedAmount: 0,
    paidAmount: 0,
    source: "web_admin",
    sourceReferenceNo: "",
    status: "draft",
    paidStatus: "unpaid",
    attachments: [],
    approvalHistory: [
      { action: "created", by: ACCOUNTS_CURRENT_USER, at: "2026-06-01T10:00:00.000Z", remarks: "Draft expense" },
    ],
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
  },
];
