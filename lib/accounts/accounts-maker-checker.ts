/**
 * Accounts Maker-Checker workflow — uses User Management approver mapping
 * (employee approvalLevel1/2/3) as the read-only approval chain on vouchers.
 */

import {
  loadEmployees,
  type Employee,
} from "@/app/(app)/user-management/employee/employee-data";
import {
  ACCOUNTS_CHECKER_EMPLOYEE_ID,
  ACCOUNTS_CURRENT_EMPLOYEE_ID,
} from "@/lib/accounts/config";

export type AccountsVoucherCategory =
  | "sales_invoice"
  | "purchase_invoice"
  | "credit_note"
  | "debit_note"
  | "journal_entry"
  | "receipt_voucher"
  | "payment_voucher"
  | "bank_recon_adjustment"
  | "opening_balance"
  | "stock_opening"
  | "gst_adjustment"
  | "tds_tcs_adjustment";

export type AccountsVoucherWorkflowStatus =
  | "draft"
  | "pending_approval"
  | "sent_back"
  | "posted"
  | "rejected"
  | "cancelled";

export type ApprovalStepState =
  | "created"
  | "pending"
  | "waiting"
  | "approved"
  | "rejected"
  | "sent_back";

export interface AccountsApprovalStep {
  level: number;
  label: string;
  approverId: number | null;
  approverName: string;
  approverRole: string;
  state: ApprovalStepState;
  actedAt?: string;
  remarks?: string;
}

export interface AccountsApprovalHistoryEntry {
  at: string;
  action: string;
  by: string;
  byRole?: string;
  remarks?: string;
}

export interface AccountsDocumentWorkflow {
  status: AccountsVoucherWorkflowStatus;
  makerId: number;
  makerName: string;
  makerRole: string;
  steps: AccountsApprovalStep[];
  /** Index of the approver step currently pending (1-based approver levels; 0 = maker). */
  currentApproverIndex: number;
  remarks: string;
  history: AccountsApprovalHistoryEntry[];
  submittedAt?: string;
  postedAt?: string;
}

export const ACCOUNTS_VOUCHER_CATEGORY_LABELS: Record<AccountsVoucherCategory, string> = {
  sales_invoice: "Sales Invoice",
  purchase_invoice: "Purchase Invoice",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
  journal_entry: "Journal Entry",
  receipt_voucher: "Receipt Voucher",
  payment_voucher: "Payment Voucher",
  bank_recon_adjustment: "Bank Reconciliation Adjustment",
  opening_balance: "Opening Balance",
  stock_opening: "Stock Opening",
  gst_adjustment: "GST Adjustment",
  tds_tcs_adjustment: "TDS/TCS Adjustment",
};

export const WORKFLOW_STATUS_LABELS: Record<AccountsVoucherWorkflowStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  sent_back: "Sent Back",
  posted: "Posted",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

function nowIso(): string {
  return new Date().toISOString();
}

export function getEmployeeById(id: number): Employee | undefined {
  return loadEmployees().find((e) => e.id === id && e.status !== "archived");
}

export function getAccountsMakerEmployee(): Employee {
  const byId = getEmployeeById(ACCOUNTS_CURRENT_EMPLOYEE_ID);
  if (byId) return byId;
  const accountsDept = loadEmployees().find(
    (e) =>
      e.status === "active" &&
      e.department.toLowerCase().includes("account") &&
      /executive|accountant/i.test(e.role),
  );
  if (accountsDept) return accountsDept;
  const fallback = loadEmployees().find((e) => e.status === "active");
  if (fallback) return fallback;
  return {
    id: 0,
    employeeId: "SYS",
    firstName: "System",
    lastName: "User",
    fullName: "System User",
    email: "",
    mobile: "",
    bloodGroup: "Unknown",
    departmentId: null,
    department: "Accounts",
    roleId: null,
    role: "Accounts Executive",
    reportingManagerId: null,
    reportingManager: "",
    status: "active",
    joiningDate: "",
    emergencyContactName: "",
    emergencyContactMobile: "",
    emergencyContactRelation: "Other" as const,
    createdBy: "System",
    createdDate: "",
    updatedBy: "System",
    updatedDate: "",
    lastStatusChange: "",
  };
}

export function getAccountsCheckerEmployee(): Employee {
  return getEmployeeById(ACCOUNTS_CHECKER_EMPLOYEE_ID) ?? getAccountsMakerEmployee();
}

function approverLevelsFromEmployee(employee: Employee): {
  id: number | null;
  name: string;
  role: string;
}[] {
  const levels: { id: number | null; name: string; role: string }[] = [];
  if (employee.approvalLevel1Id || employee.approvalLevel1Name) {
    levels.push({
      id: employee.approvalLevel1Id ? Number(employee.approvalLevel1Id) : null,
      name: employee.approvalLevel1Name ?? "—",
      role: employee.approvalLevel1Role ?? "Approver",
    });
  }
  if (employee.approvalLevel2Id || employee.approvalLevel2Name) {
    levels.push({
      id: employee.approvalLevel2Id ? Number(employee.approvalLevel2Id) : null,
      name: employee.approvalLevel2Name ?? "—",
      role: employee.approvalLevel2Role ?? "Approver",
    });
  }
  if (employee.approvalLevel3Id || employee.approvalLevel3Name) {
    levels.push({
      id: employee.approvalLevel3Id ? Number(employee.approvalLevel3Id) : null,
      name: employee.approvalLevel3Name ?? "—",
      role: employee.approvalLevel3Role ?? "Approver",
    });
  }
  return levels;
}

/** Build read-only approval chain from maker's User Management approver mapping. */
export function buildApprovalChainForMaker(maker: Employee): AccountsApprovalStep[] {
  const steps: AccountsApprovalStep[] = [
    {
      level: 0,
      label: "Maker",
      approverId: maker.id,
      approverName: maker.fullName,
      approverRole: maker.role,
      state: "created",
    },
  ];

  const approvers = approverLevelsFromEmployee(maker);
  approvers.forEach((a, i) => {
    steps.push({
      level: i + 1,
      label: `Approver ${i + 1}`,
      approverId: a.id,
      approverName: a.name || "—",
      approverRole: a.role,
      state: "waiting",
    });
  });

  return steps;
}

export function createInitialWorkflow(maker = getAccountsMakerEmployee()): AccountsDocumentWorkflow {
  return {
    status: "draft",
    makerId: maker.id,
    makerName: maker.fullName,
    makerRole: maker.role,
    steps: buildApprovalChainForMaker(maker),
    currentApproverIndex: 0,
    remarks: "",
    history: [
      {
        at: nowIso(),
        action: "created",
        by: maker.fullName,
        byRole: maker.role,
        remarks: "Voucher created",
      },
    ],
  };
}

export function ensureDocumentWorkflow(
  workflow: AccountsDocumentWorkflow | undefined,
  maker = getAccountsMakerEmployee(),
): AccountsDocumentWorkflow {
  if (workflow?.steps?.length) return workflow;
  return createInitialWorkflow(maker);
}

export function resolveWorkflowStatus(
  workflow?: AccountsDocumentWorkflow,
  legacyStatus?: string,
): AccountsVoucherWorkflowStatus {
  if (workflow?.status) return workflow.status;
  const s = (legacyStatus ?? "draft").toLowerCase();
  if (s === "sent" || s === "approved" || s === "processed" || s === "posted") return "posted";
  if (s === "pending_approval") return "pending_approval";
  if (s === "sent_back") return "sent_back";
  if (s === "rejected") return "rejected";
  if (s === "cancelled") return "cancelled";
  return "draft";
}

/** Only posted vouchers affect accounting balances and reports. */
export function isPostedForReports(
  workflow?: AccountsDocumentWorkflow,
  legacyStatus?: string,
): boolean {
  if (!workflow) {
    if (!legacyStatus) return true;
    const s = legacyStatus.toLowerCase();
    return s === "posted" || s === "sent" || s === "approved" || s === "processed";
  }
  return resolveWorkflowStatus(workflow, legacyStatus) === "posted";
}

export function canEditAccountsDocument(workflow?: AccountsDocumentWorkflow, legacyStatus?: string): boolean {
  const status = resolveWorkflowStatus(workflow, legacyStatus);
  return status === "draft" || status === "sent_back";
}

export function canSubmitForApproval(workflow?: AccountsDocumentWorkflow, legacyStatus?: string): boolean {
  const status = resolveWorkflowStatus(workflow, legacyStatus);
  return status === "draft" || status === "sent_back";
}

function firstPendingApproverIndex(steps: AccountsApprovalStep[]): number {
  return steps.findIndex((s) => s.level > 0 && (s.state === "waiting" || s.state === "pending"));
}

function pushHistory(
  workflow: AccountsDocumentWorkflow,
  entry: Omit<AccountsApprovalHistoryEntry, "at">,
): AccountsDocumentWorkflow {
  return {
    ...workflow,
    history: [...workflow.history, { ...entry, at: nowIso() }],
  };
}

function activateNextApprover(steps: AccountsApprovalStep[]): AccountsApprovalStep[] {
  const next = steps.map((s) => ({ ...s }));
  const idx = firstPendingApproverIndex(next);
  if (idx >= 0) next[idx] = { ...next[idx], state: "pending" };
  return next;
}

export function submitForApproval(
  workflow: AccountsDocumentWorkflow,
  remarks = "",
): AccountsDocumentWorkflow {
  if (!canSubmitForApproval(workflow)) {
    throw new Error("This voucher cannot be submitted for approval.");
  }
  let steps = workflow.steps.map((s) => ({ ...s }));
  steps[0] = { ...steps[0], state: "created", actedAt: nowIso() };
  steps = activateNextApprover(steps);
  const pendingIdx = firstPendingApproverIndex(steps);
  let next: AccountsDocumentWorkflow = {
    ...workflow,
    status: "pending_approval",
    steps,
    currentApproverIndex: pendingIdx >= 0 ? pendingIdx : 1,
    remarks,
    submittedAt: nowIso(),
  };
  next = pushHistory(next, {
    action: "submitted",
    by: workflow.makerName,
    byRole: workflow.makerRole,
    remarks: remarks || "Submitted for approval",
  });
  return next;
}

function isActorCurrentApprover(workflow: AccountsDocumentWorkflow, actorId: number): boolean {
  const step = workflow.steps[workflow.currentApproverIndex];
  if (!step || step.level === 0) return false;
  return step.approverId === actorId;
}

export function canCurrentUserApprove(workflow: AccountsDocumentWorkflow): boolean {
  if (workflow.status !== "pending_approval") return false;
  const checker = getAccountsCheckerEmployee();
  const maker = getAccountsMakerEmployee();
  if (checker.id === workflow.makerId || checker.id === maker.id) {
    // Demo: checker employee must differ from maker
    if (checker.id === workflow.makerId) return false;
  }
  return isActorCurrentApprover(workflow, checker.id);
}

export function approveCurrentStep(
  workflow: AccountsDocumentWorkflow,
  actor: Employee = getAccountsCheckerEmployee(),
  remarks = "",
): AccountsDocumentWorkflow {
  if (workflow.status !== "pending_approval") {
    throw new Error("Voucher is not pending approval.");
  }
  if (actor.id === workflow.makerId) {
    throw new Error("Maker cannot approve their own voucher.");
  }
  if (!isActorCurrentApprover(workflow, actor.id)) {
    throw new Error("You are not the current approver for this voucher.");
  }

  const idx = workflow.currentApproverIndex;
  let steps = workflow.steps.map((s) => ({ ...s }));
  steps[idx] = {
    ...steps[idx],
    state: "approved",
    actedAt: nowIso(),
    remarks: remarks || undefined,
  };

  const nextWaiting = steps.findIndex((s, i) => i > idx && s.level > 0 && s.state === "waiting");
  let next: AccountsDocumentWorkflow;

  if (nextWaiting >= 0) {
    steps[nextWaiting] = { ...steps[nextWaiting], state: "pending" };
    next = {
      ...workflow,
      status: "pending_approval",
      steps,
      currentApproverIndex: nextWaiting,
      remarks,
    };
    next = pushHistory(next, {
      action: "approved",
      by: actor.fullName,
      byRole: actor.role,
      remarks: remarks || `Approved at ${steps[idx].label}`,
    });
    return next;
  }

  next = {
    ...workflow,
    status: "posted",
    steps,
    currentApproverIndex: idx,
    remarks,
    postedAt: nowIso(),
  };
  next = pushHistory(next, {
    action: "posted",
    by: actor.fullName,
    byRole: actor.role,
    remarks: remarks || "Final approval — voucher posted",
  });
  return next;
}

export function rejectVoucher(
  workflow: AccountsDocumentWorkflow,
  actor: Employee = getAccountsCheckerEmployee(),
  remarks: string,
): AccountsDocumentWorkflow {
  if (!remarks.trim()) throw new Error("Remarks are required to reject.");
  if (workflow.status !== "pending_approval") throw new Error("Voucher is not pending approval.");
  if (actor.id === workflow.makerId) throw new Error("Maker cannot reject their own voucher.");
  if (!isActorCurrentApprover(workflow, actor.id)) throw new Error("You are not the current approver.");

  const idx = workflow.currentApproverIndex;
  const steps = workflow.steps.map((s) => ({ ...s }));
  steps[idx] = { ...steps[idx], state: "rejected", actedAt: nowIso(), remarks };

  let next: AccountsDocumentWorkflow = {
    ...workflow,
    status: "rejected",
    steps,
    remarks,
  };
  next = pushHistory(next, {
    action: "rejected",
    by: actor.fullName,
    byRole: actor.role,
    remarks,
  });
  return next;
}

export function sendBackVoucher(
  workflow: AccountsDocumentWorkflow,
  actor: Employee = getAccountsCheckerEmployee(),
  remarks: string,
): AccountsDocumentWorkflow {
  if (!remarks.trim()) throw new Error("Remarks are required to send back.");
  if (workflow.status !== "pending_approval") throw new Error("Voucher is not pending approval.");
  if (actor.id === workflow.makerId) throw new Error("Maker cannot send back their own voucher.");
  if (!isActorCurrentApprover(workflow, actor.id)) throw new Error("You are not the current approver.");

  const idx = workflow.currentApproverIndex;
  const steps = workflow.steps.map((s) => ({ ...s }));
  steps[idx] = { ...steps[idx], state: "sent_back", actedAt: nowIso(), remarks };
  for (let i = idx + 1; i < steps.length; i++) {
    if (steps[i].level > 0) steps[i] = { ...steps[i], state: "waiting" };
  }

  let next: AccountsDocumentWorkflow = {
    ...workflow,
    status: "sent_back",
    steps,
    currentApproverIndex: 0,
    remarks,
  };
  next = pushHistory(next, {
    action: "sent_back",
    by: actor.fullName,
    byRole: actor.role,
    remarks,
  });
  return next;
}

export function mapWorkflowToLegacyStatus(
  workflow: AccountsDocumentWorkflow,
  category: AccountsVoucherCategory,
): string {
  switch (workflow.status) {
    case "posted":
      if (category === "sales_invoice") return "sent";
      if (category === "credit_note" || category === "debit_note") return "approved";
      return "posted";
    case "pending_approval":
      return "pending_approval";
    case "sent_back":
      return "sent_back";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    default:
      return "draft";
  }
}
