import { demoDateAt, demoTimestamp } from "@/lib/accounts/demo-date-utils";
/**
 * Audit trail — seeded demo data for Accounts → Reports → Audit Trail.
 */

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { matchesMultiFilter } from "@/lib/accounts/report-multi-filter-utils";

export type AuditTrailCategory = "user_activity" | "voucher_approval" | "edit_delete";

export type AuditTrailStatus =
  | "completed"
  | "approved"
  | "rejected"
  | "pending"
  | "posted"
  | "deleted"
  | "exported"
  | "matched";

export interface AuditTrailApprovalDetails {
  level: string;
  approver: string;
  approvedAt?: string;
  rejectionReason?: string;
  pendingWith?: string;
  note?: string;
}

export interface AuditTrailRecord {
  id: number;
  dateTime: string;
  category: AuditTrailCategory;
  user: string;
  role: string;
  userEmail?: string;
  module: string;
  moduleCode?: string;
  reference: string;
  activityType: string;
  /** Action performed — kept as `action` for backward compatibility */
  action: string;
  oldValue: string;
  newValue: string;
  status: AuditTrailStatus;
  details: string;
  remarks?: string;
  voucherAmount?: string;
  partyName?: string;
  approvalDetails?: AuditTrailApprovalDetails;
}

export const AUDIT_TRAIL_CATEGORY_LABELS: Record<AuditTrailCategory, string> = {
  user_activity: "User Wise Activity Log",
  voucher_approval: "Voucher Approval Log",
  edit_delete: "Edit / Delete Log",
};

export const AUDIT_TRAIL_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "pending", label: "Pending" },
  { value: "posted", label: "Posted" },
  { value: "deleted", label: "Deleted" },
  { value: "exported", label: "Exported" },
  { value: "matched", label: "Matched" },
];

export const AUDIT_TRAIL_ACTIVITY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "Create", label: "Create" },
  { value: "Edit", label: "Edit" },
  { value: "Delete", label: "Delete" },
  { value: "Approve", label: "Approve" },
  { value: "Reject", label: "Reject" },
  { value: "Post", label: "Post" },
  { value: "Export", label: "Export" },
  { value: "Match", label: "Match" },
  { value: "Update", label: "Update" },
  { value: "View", label: "View" },
  { value: "Login", label: "Login" },
];

export const AUDIT_TRAIL_MODULE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All modules" },
  { value: "Sales Invoice", label: "Sales Invoice" },
  { value: "Purchase Invoice", label: "Purchase Invoice" },
  { value: "Receipt Voucher", label: "Receipt Voucher" },
  { value: "Payment Voucher", label: "Payment Voucher" },
  { value: "Journal Voucher", label: "Journal Voucher" },
  { value: "Credit Note", label: "Credit Note" },
  { value: "Debit Note", label: "Debit Note" },
  { value: "Bank Reconciliation", label: "Bank Reconciliation" },
  { value: "Chart of Accounts", label: "Chart of Accounts" },
  { value: "Reports", label: "Reports" },
  { value: "Contra Voucher", label: "Contra Voucher" },
];

export const AUDIT_TRAIL_USER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All users" },
  { value: "Admin", label: "Admin" },
  { value: "Rajesh Kumar", label: "Rajesh Kumar" },
  { value: "Priya Sharma", label: "Priya Sharma" },
  { value: "Amit Patel", label: "Amit Patel" },
  { value: "Sneha Reddy", label: "Sneha Reddy" },
];

const STORAGE_KEY = "ds_accounts_audit_trail";
const SEED_VERSION_KEY = "ds_accounts_audit_trail_seed_version";
const SEED_VERSION = 3;

type SeedSpec = Omit<AuditTrailRecord, "id" | "dateTime"> & { time?: string };

function seedRecord(id: number, index: number, spec: SeedSpec): AuditTrailRecord {
  const date = demoDateAt(index);
  const time = spec.time ?? `${String(9 + (index % 9)).padStart(2, "0")}:${String((index * 11) % 60).padStart(2, "0")}:00`;
  const { time: _t, ...rest } = spec;
  return {
    id,
    dateTime: demoTimestamp(date, time),
    ...rest,
  };
}

function buildStaticSeed(): AuditTrailRecord[] {
  const specs: SeedSpec[] = [
    // ── User Wise Activity Log ──
    {
      category: "user_activity",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Reports",
      moduleCode: "RPT",
      reference: "Sales Register",
      activityType: "Export",
      action: "Exported Sales Register to Excel",
      oldValue: "—",
      newValue: "Sales_Register_Apr2026.xlsx",
      status: "exported",
      details: "Sales Register exported for Apr 2026 — 142 invoices",
      remarks: "Monthly MIS pack for management review",
    },
    {
      category: "user_activity",
      user: "Priya Sharma",
      role: "Finance Executive",
      userEmail: "priya.sharma@dharitrisutra.in",
      module: "Reports",
      moduleCode: "RPT",
      reference: "Trial Balance",
      activityType: "Export",
      action: "Exported Trial Balance to PDF",
      oldValue: "—",
      newValue: "Trial_Balance_Mar2026.pdf",
      status: "exported",
      details: "Trial Balance as on 31-Mar-2026 exported",
      remarks: "Shared with statutory auditor",
    },
    {
      category: "user_activity",
      user: "Sneha Reddy",
      role: "Internal Auditor",
      userEmail: "sneha.reddy@dharitrisutra.in",
      module: "Reports",
      moduleCode: "RPT",
      reference: "General Ledger",
      activityType: "View",
      action: "Viewed General Ledger statement",
      oldValue: "—",
      newValue: "—",
      status: "completed",
      details: "Reviewed Sundry Debtors ledger for Q4 FY25-26",
      remarks: "Audit sampling — customer ABC Agro",
    },
    {
      category: "user_activity",
      user: ACCOUNTS_CURRENT_USER,
      role: "System Admin",
      userEmail: "admin@dharitrisutra.in",
      module: "Reports",
      moduleCode: "RPT",
      reference: "GST Summary",
      activityType: "Export",
      action: "Exported GST Summary report",
      oldValue: "—",
      newValue: "GST_Summary_Q1FY26.xlsx",
      status: "exported",
      details: "GSTR-1 reconciliation pack exported",
    },
    {
      category: "user_activity",
      user: "Amit Patel",
      role: "Accounts Executive",
      userEmail: "amit.patel@dharitrisutra.in",
      module: "Reports",
      moduleCode: "RPT",
      reference: "Day Book",
      activityType: "View",
      action: "Viewed Day Book report",
      oldValue: "—",
      newValue: "—",
      status: "completed",
      details: "Day Book reviewed for today’s voucher postings",
    },
    {
      category: "user_activity",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Reports",
      moduleCode: "RPT",
      reference: "Purchase Register",
      activityType: "Export",
      action: "Exported Purchase Register to Excel",
      oldValue: "—",
      newValue: "Purchase_Register_Apr2026.xlsx",
      status: "exported",
      details: "Purchase Register — 87 bills, ₹42.8L taxable value",
    },
    {
      category: "user_activity",
      user: "Priya Sharma",
      role: "Finance Executive",
      userEmail: "priya.sharma@dharitrisutra.in",
      module: "Bank Reconciliation",
      moduleCode: "BRS",
      reference: "HDFC-Current-001",
      activityType: "View",
      action: "Opened bank reconciliation workspace",
      oldValue: "—",
      newValue: "—",
      status: "completed",
      details: "Reviewed unmatched HDFC bank entries for Apr 2026",
    },
    {
      category: "user_activity",
      user: "Sneha Reddy",
      role: "Internal Auditor",
      userEmail: "sneha.reddy@dharitrisutra.in",
      module: "Reports",
      moduleCode: "RPT",
      reference: "Audit Trail",
      activityType: "View",
      action: "Viewed Audit Trail report",
      oldValue: "—",
      newValue: "—",
      status: "completed",
      details: "Compliance review of accounts module activity",
      remarks: "Quarterly internal audit checkpoint",
    },
    {
      category: "user_activity",
      user: "Amit Patel",
      role: "Accounts Executive",
      userEmail: "amit.patel@dharitrisutra.in",
      module: "Reports",
      moduleCode: "RPT",
      reference: "Customer Ledger",
      activityType: "Export",
      action: "Exported Customer Ledger to PDF",
      oldValue: "—",
      newValue: "Customer_Ledger_Reliance_Agri.pdf",
      status: "exported",
      details: "Statement for Reliance Agri — FY 2025-26",
      partyName: "Reliance Agri Distributor",
    },
    {
      category: "user_activity",
      user: ACCOUNTS_CURRENT_USER,
      role: "System Admin",
      userEmail: "admin@dharitrisutra.in",
      module: "Reports",
      moduleCode: "RPT",
      reference: "Balance Sheet",
      activityType: "Export",
      action: "Exported Balance Sheet to PDF",
      oldValue: "—",
      newValue: "Balance_Sheet_Mar2026.pdf",
      status: "exported",
      details: "Year-end balance sheet for board meeting",
    },
    {
      category: "user_activity",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Reports",
      moduleCode: "RPT",
      reference: "TDS Party-wise",
      activityType: "Export",
      action: "Exported TDS Party-wise summary",
      oldValue: "—",
      newValue: "TDS_PartyWise_Q4.xlsx",
      status: "exported",
      details: "TDS deduction summary for vendor payments",
    },
    {
      category: "user_activity",
      user: "Priya Sharma",
      role: "Finance Executive",
      userEmail: "priya.sharma@dharitrisutra.in",
      module: "Chart of Accounts",
      moduleCode: "COA",
      reference: "SUNDRY-CRED-042",
      activityType: "View",
      action: "Viewed ledger master record",
      oldValue: "—",
      newValue: "—",
      status: "completed",
      details: "Opened Coromandel International vendor ledger",
      partyName: "Coromandel International",
    },
    {
      category: "user_activity",
      user: "Amit Patel",
      role: "Accounts Executive",
      userEmail: "amit.patel@dharitrisutra.in",
      module: "Reports",
      moduleCode: "RPT",
      reference: "Journal Register",
      activityType: "Export",
      action: "Exported Journal Register to Excel",
      oldValue: "—",
      newValue: "Journal_Register_Apr2026.xlsx",
      status: "exported",
      details: "Journal vouchers for Apr 2026 — 34 entries",
    },
    {
      category: "user_activity",
      user: "Sneha Reddy",
      role: "Internal Auditor",
      userEmail: "sneha.reddy@dharitrisutra.in",
      module: "Reports",
      moduleCode: "RPT",
      reference: "Bank Book",
      activityType: "View",
      action: "Viewed Bank Book report",
      oldValue: "—",
      newValue: "—",
      status: "completed",
      details: "Verified HDFC bank book entries against statements",
    },
    {
      category: "user_activity",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Reports",
      moduleCode: "RPT",
      reference: "Profit & Loss",
      activityType: "Export",
      action: "Exported P&L statement to PDF",
      oldValue: "—",
      newValue: "PL_Statement_Q4FY26.pdf",
      status: "exported",
      details: "Q4 FY25-26 profit & loss for management",
    },

    // ── Voucher Approval Log ──
    {
      category: "voucher_approval",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Purchase Invoice",
      moduleCode: "PINV",
      reference: "PINV-2026-0018",
      activityType: "Approve",
      action: "Approved purchase invoice",
      oldValue: "Pending Approval",
      newValue: "Approved",
      status: "approved",
      details: "Purchase bill approved — Rallis India Ltd — ₹1,18,000",
      voucherAmount: "₹1,18,000",
      partyName: "Rallis India Ltd",
      remarks: "GRN matched — qty and rate verified",
      approvalDetails: {
        level: "Level 1 — Accounts Manager",
        approver: "Rajesh Kumar",
        approvedAt: demoTimestamp(demoDateAt(15), "14:22:00"),
        note: "Within approval limit — auto-routed to L1",
      },
    },
    {
      category: "voucher_approval",
      user: "Priya Sharma",
      role: "Finance Executive",
      userEmail: "priya.sharma@dharitrisutra.in",
      module: "Payment Voucher",
      moduleCode: "PV",
      reference: "PV-2026-0047",
      activityType: "Approve",
      action: "Approved payment voucher",
      oldValue: "Pending Approval",
      newValue: "Approved",
      status: "approved",
      details: "Vendor payment ₹1,50,000 — Coromandel International",
      voucherAmount: "₹1,50,000",
      partyName: "Coromandel International",
      approvalDetails: {
        level: "Level 1 — Finance Executive",
        approver: "Priya Sharma",
        approvedAt: demoTimestamp(demoDateAt(16), "11:05:00"),
      },
    },
    {
      category: "voucher_approval",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Payment Voucher",
      moduleCode: "PV",
      reference: "PV-2026-0051",
      activityType: "Reject",
      action: "Rejected payment voucher",
      oldValue: "Pending Approval",
      newValue: "Rejected",
      status: "rejected",
      details: "Payment rejected — supporting invoice not attached",
      voucherAmount: "₹2,35,000",
      partyName: "Mahindra Agri Solutions",
      remarks: "Resubmit with signed delivery challan",
      approvalDetails: {
        level: "Level 1 — Accounts Manager",
        approver: "Rajesh Kumar",
        rejectionReason: "Missing supporting documents — delivery challan not uploaded",
      },
    },
    {
      category: "voucher_approval",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Debit Note",
      moduleCode: "DN",
      reference: "DN-2026-0008",
      activityType: "Approve",
      action: "Approved debit note",
      oldValue: "Pending Approval",
      newValue: "Approved",
      status: "approved",
      details: "Debit note approved — short supply claim ABC Agro",
      voucherAmount: "₹12,400",
      partyName: "ABC Agro Distributor",
      approvalDetails: {
        level: "Level 1 — Accounts Manager",
        approver: "Rajesh Kumar",
        approvedAt: demoTimestamp(demoDateAt(18), "16:40:00"),
        note: "Linked to sales return GRN-2026-0112",
      },
    },
    {
      category: "voucher_approval",
      user: "Priya Sharma",
      role: "Finance Executive",
      userEmail: "priya.sharma@dharitrisutra.in",
      module: "Credit Note",
      moduleCode: "CN",
      reference: "CN-2026-0004",
      activityType: "Approve",
      action: "Approved credit note",
      oldValue: "Pending Approval",
      newValue: "Approved",
      status: "approved",
      details: "Credit note approved — rate difference Reliance Agri",
      voucherAmount: "₹8,750",
      partyName: "Reliance Agri Distributor",
      approvalDetails: {
        level: "Level 1 — Finance Executive",
        approver: "Priya Sharma",
        approvedAt: demoTimestamp(demoDateAt(19), "10:18:00"),
      },
    },
    {
      category: "voucher_approval",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Journal Voucher",
      moduleCode: "JV",
      reference: "JV-2026-0029",
      activityType: "Approve",
      action: "Approved journal voucher",
      oldValue: "Pending Approval",
      newValue: "Approved",
      status: "approved",
      details: "April rent provision journal — ₹45,000",
      voucherAmount: "₹45,000",
      approvalDetails: {
        level: "Level 1 — Accounts Manager",
        approver: "Rajesh Kumar",
        approvedAt: demoTimestamp(demoDateAt(20), "09:45:00"),
      },
    },
    {
      category: "voucher_approval",
      user: "Priya Sharma",
      role: "Finance Executive",
      userEmail: "priya.sharma@dharitrisutra.in",
      module: "Receipt Voucher",
      moduleCode: "RV",
      reference: "RV-2026-0056",
      activityType: "Approve",
      action: "Approved receipt voucher",
      oldValue: "Pending Approval",
      newValue: "Approved",
      status: "approved",
      details: "Customer receipt ₹80,000 — ABC Agro Distributor",
      voucherAmount: "₹80,000",
      partyName: "ABC Agro Distributor",
      approvalDetails: {
        level: "Level 1 — Finance Executive",
        approver: "Priya Sharma",
        approvedAt: demoTimestamp(demoDateAt(21), "15:30:00"),
      },
    },
    {
      category: "voucher_approval",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Purchase Invoice",
      moduleCode: "PINV",
      reference: "PINV-2026-0022",
      activityType: "Reject",
      action: "Rejected purchase invoice",
      oldValue: "Pending Approval",
      newValue: "Rejected",
      status: "rejected",
      details: "Purchase bill rejected — GSTIN mismatch on vendor invoice",
      voucherAmount: "₹67,200",
      partyName: "UPL Limited",
      approvalDetails: {
        level: "Level 1 — Accounts Manager",
        approver: "Rajesh Kumar",
        rejectionReason: "Vendor GSTIN on bill does not match master record",
      },
    },
    {
      category: "voucher_approval",
      user: "Priya Sharma",
      role: "Finance Executive",
      userEmail: "priya.sharma@dharitrisutra.in",
      module: "Payment Voucher",
      moduleCode: "PV",
      reference: "PV-2026-0058",
      activityType: "Approve",
      action: "Approved payment voucher",
      oldValue: "Pending Approval",
      newValue: "Approved",
      status: "approved",
      details: "Advance payment ₹35,000 — transport charges",
      voucherAmount: "₹35,000",
      partyName: "Gati Logistics",
      approvalDetails: {
        level: "Level 1 — Finance Executive",
        approver: "Priya Sharma",
        approvedAt: demoTimestamp(demoDateAt(23), "12:10:00"),
      },
    },
    {
      category: "voucher_approval",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Sales Invoice",
      moduleCode: "SINV",
      reference: "INV-2026-0142",
      activityType: "Approve",
      action: "Approved sales invoice for dispatch",
      oldValue: "Pending Approval",
      newValue: "Approved",
      status: "approved",
      details: "Tax invoice approved — Mahindra Farms — ₹1,62,400",
      voucherAmount: "₹1,62,400",
      partyName: "Mahindra Farms",
      approvalDetails: {
        level: "Level 1 — Accounts Manager",
        approver: "Rajesh Kumar",
        approvedAt: demoTimestamp(demoDateAt(24), "17:05:00"),
        note: "Credit limit check passed",
      },
    },
    {
      category: "voucher_approval",
      user: "Amit Patel",
      role: "Accounts Executive",
      userEmail: "amit.patel@dharitrisutra.in",
      module: "Payment Voucher",
      moduleCode: "PV",
      reference: "PV-2026-0062",
      activityType: "Approve",
      action: "Submitted payment voucher for approval",
      oldValue: "Draft",
      newValue: "Pending Approval",
      status: "pending",
      details: "Salary advance payment ₹18,500 — field staff",
      voucherAmount: "₹18,500",
      approvalDetails: {
        level: "Level 1 — Accounts Manager",
        approver: "—",
        pendingWith: "Rajesh Kumar",
        note: "Awaiting checker approval",
      },
    },
    {
      category: "voucher_approval",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Debit Note",
      moduleCode: "DN",
      reference: "DN-2026-0011",
      activityType: "Approve",
      action: "Approved debit note",
      oldValue: "Pending Approval",
      newValue: "Approved",
      status: "approved",
      details: "Debit note approved — freight recovery from vendor",
      voucherAmount: "₹4,200",
      partyName: "Syngenta India",
      approvalDetails: {
        level: "Level 1 — Accounts Manager",
        approver: "Rajesh Kumar",
        approvedAt: demoTimestamp(demoDateAt(26), "11:55:00"),
      },
    },
    {
      category: "voucher_approval",
      user: "Priya Sharma",
      role: "Finance Executive",
      userEmail: "priya.sharma@dharitrisutra.in",
      module: "Contra Voucher",
      moduleCode: "CV",
      reference: "CONTRA-2026-0007",
      activityType: "Approve",
      action: "Approved contra voucher",
      oldValue: "Pending Approval",
      newValue: "Approved",
      status: "approved",
      details: "Cash deposited to HDFC Bank — ₹50,000",
      voucherAmount: "₹50,000",
      approvalDetails: {
        level: "Level 1 — Finance Executive",
        approver: "Priya Sharma",
        approvedAt: demoTimestamp(demoDateAt(27), "10:30:00"),
      },
    },
    {
      category: "voucher_approval",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Credit Note",
      moduleCode: "CN",
      reference: "CN-2026-0007",
      activityType: "Reject",
      action: "Rejected credit note",
      oldValue: "Pending Approval",
      newValue: "Rejected",
      status: "rejected",
      details: "Credit note rejected — quantity mismatch with return note",
      voucherAmount: "₹22,100",
      partyName: "Kaveri Seeds",
      approvalDetails: {
        level: "Level 1 — Accounts Manager",
        approver: "Rajesh Kumar",
        rejectionReason: "Return qty 120 bags does not match CN line qty 150 bags",
      },
    },

    // ── Edit / Delete Log ──
    {
      category: "edit_delete",
      user: "Amit Patel",
      role: "Accounts Executive",
      userEmail: "amit.patel@dharitrisutra.in",
      module: "Sales Invoice",
      moduleCode: "SINV",
      reference: "INV-2026-0138",
      activityType: "Create",
      action: "Created sales invoice",
      oldValue: "—",
      newValue: "Draft — ₹97,650",
      status: "completed",
      details: "Tax invoice created for Reliance Agri — ₹97,650",
      voucherAmount: "₹97,650",
      partyName: "Reliance Agri Distributor",
    },
    {
      category: "edit_delete",
      user: "Amit Patel",
      role: "Accounts Executive",
      userEmail: "amit.patel@dharitrisutra.in",
      module: "Sales Invoice",
      moduleCode: "SINV",
      reference: "INV-2026-0138",
      activityType: "Edit",
      action: "Edited sales invoice line items",
      oldValue: "Qty: 50 bags @ ₹1,850",
      newValue: "Qty: 52 bags @ ₹1,850",
      status: "completed",
      details: "Updated quantity on Urea 46% N line before posting",
      voucherAmount: "₹97,650 → ₹1,01,350",
      partyName: "Reliance Agri Distributor",
      remarks: "Customer revised PO quantity",
    },
    {
      category: "edit_delete",
      user: "Priya Sharma",
      role: "Finance Executive",
      userEmail: "priya.sharma@dharitrisutra.in",
      module: "Sales Invoice",
      moduleCode: "SINV",
      reference: "INV-2026-0138",
      activityType: "Post",
      action: "Posted sales invoice",
      oldValue: "Approved",
      newValue: "Posted",
      status: "posted",
      details: "Tax invoice posted for Reliance Agri — ₹1,01,350",
      voucherAmount: "₹1,01,350",
      partyName: "Reliance Agri Distributor",
    },
    {
      category: "edit_delete",
      user: "Amit Patel",
      role: "Accounts Executive",
      userEmail: "amit.patel@dharitrisutra.in",
      module: "Purchase Invoice",
      moduleCode: "PINV",
      reference: "PINV-2026-0015",
      activityType: "Create",
      action: "Created purchase invoice",
      oldValue: "—",
      newValue: "Draft — ₹86,400",
      status: "completed",
      details: "Purchase bill captured — Bayer CropScience",
      voucherAmount: "₹86,400",
      partyName: "Bayer CropScience",
    },
    {
      category: "edit_delete",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Purchase Invoice",
      moduleCode: "PINV",
      reference: "PINV-2026-0015",
      activityType: "Post",
      action: "Posted purchase invoice",
      oldValue: "Approved",
      newValue: "Posted",
      status: "posted",
      details: "Purchase bill posted — Bayer CropScience — ₹86,400",
      voucherAmount: "₹86,400",
      partyName: "Bayer CropScience",
    },
    {
      category: "edit_delete",
      user: "Amit Patel",
      role: "Accounts Executive",
      userEmail: "amit.patel@dharitrisutra.in",
      module: "Receipt Voucher",
      moduleCode: "RV",
      reference: "RV-2026-0053",
      activityType: "Create",
      action: "Created receipt voucher",
      oldValue: "—",
      newValue: "Draft — ₹1,25,000",
      status: "completed",
      details: "NEFT receipt from Mahindra Farms",
      voucherAmount: "₹1,25,000",
      partyName: "Mahindra Farms",
    },
    {
      category: "edit_delete",
      user: "Priya Sharma",
      role: "Finance Executive",
      userEmail: "priya.sharma@dharitrisutra.in",
      module: "Receipt Voucher",
      moduleCode: "RV",
      reference: "RV-2026-0053",
      activityType: "Post",
      action: "Posted receipt voucher",
      oldValue: "Approved",
      newValue: "Posted",
      status: "posted",
      details: "Customer receipt ₹1,25,000 posted to bank",
      voucherAmount: "₹1,25,000",
      partyName: "Mahindra Farms",
    },
    {
      category: "edit_delete",
      user: "Amit Patel",
      role: "Accounts Executive",
      userEmail: "amit.patel@dharitrisutra.in",
      module: "Payment Voucher",
      moduleCode: "PV",
      reference: "PV-2026-0044",
      activityType: "Create",
      action: "Created payment voucher",
      oldValue: "—",
      newValue: "Draft — ₹92,000",
      status: "completed",
      details: "Vendor payment draft — Rallis India Ltd",
      voucherAmount: "₹92,000",
      partyName: "Rallis India Ltd",
    },
    {
      category: "edit_delete",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Journal Voucher",
      moduleCode: "JV",
      reference: "JV-RENT-APR26",
      activityType: "Post",
      action: "Posted journal voucher",
      oldValue: "Approved",
      newValue: "Posted",
      status: "posted",
      details: "April rent journal — ₹45,000",
      voucherAmount: "₹45,000",
      remarks: "Dr Rent Expense / Cr Sundry Creditors — Landlord",
    },
    {
      category: "edit_delete",
      user: "Priya Sharma",
      role: "Finance Executive",
      userEmail: "priya.sharma@dharitrisutra.in",
      module: "Credit Note",
      moduleCode: "CN",
      reference: "CN-2026-0006",
      activityType: "Edit",
      action: "Edited credit note amount",
      oldValue: "₹15,200",
      newValue: "₹14,800",
      status: "completed",
      details: "Adjusted credit note after customer confirmation",
      voucherAmount: "₹14,800",
      partyName: "ABC Agro Distributor",
      remarks: "Rate correction on DAP 18:46:0 line",
    },
    {
      category: "edit_delete",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Debit Note",
      moduleCode: "DN",
      reference: "DN-2026-0009",
      activityType: "Post",
      action: "Posted debit note after approval",
      oldValue: "Approved",
      newValue: "Posted",
      status: "posted",
      details: "Debit note posted — short supply claim",
      voucherAmount: "₹12,400",
      partyName: "ABC Agro Distributor",
    },
    {
      category: "edit_delete",
      user: "Priya Sharma",
      role: "Finance Executive",
      userEmail: "priya.sharma@dharitrisutra.in",
      module: "Bank Reconciliation",
      moduleCode: "BRS",
      reference: "HDFC-UTR-8844221",
      activityType: "Match",
      action: "Matched bank statement entry",
      oldValue: "Unmatched",
      newValue: "Matched → RV-2026-0053",
      status: "matched",
      details: "Bank reconciliation — NEFT ₹1,25,000 matched to receipt",
      voucherAmount: "₹1,25,000",
      partyName: "Mahindra Farms",
      remarks: "Auto-suggested match confirmed manually",
    },
    {
      category: "edit_delete",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Chart of Accounts",
      moduleCode: "COA",
      reference: "SUNDRY-DEBT-018",
      activityType: "Update",
      action: "Updated ledger credit limit",
      oldValue: "Credit Limit: ₹5,00,000",
      newValue: "Credit Limit: ₹7,50,000",
      status: "completed",
      details: "Customer ledger updated — Reliance Agri Distributor",
      partyName: "Reliance Agri Distributor",
      remarks: "Approved by sales head — FY26 enhancement",
    },
    {
      category: "edit_delete",
      user: "Amit Patel",
      role: "Accounts Executive",
      userEmail: "amit.patel@dharitrisutra.in",
      module: "Sales Invoice",
      moduleCode: "SINV",
      reference: "INV-2026-0129",
      activityType: "Delete",
      action: "Deleted draft sales invoice",
      oldValue: "Draft — ₹34,500",
      newValue: "Deleted",
      status: "deleted",
      details: "Draft invoice removed — duplicate entry",
      voucherAmount: "₹34,500",
      remarks: "Duplicate of INV-2026-0128 — removed before posting",
    },
    {
      category: "edit_delete",
      user: "Priya Sharma",
      role: "Finance Executive",
      userEmail: "priya.sharma@dharitrisutra.in",
      module: "Bank Reconciliation",
      moduleCode: "BRS",
      reference: "HDFC-CHQ-77219",
      activityType: "Match",
      action: "Matched cheque deposit entry",
      oldValue: "Unmatched",
      newValue: "Matched → RV-2026-0048",
      status: "matched",
      details: "Cheque deposit ₹48,600 reconciled with books",
      voucherAmount: "₹48,600",
    },
    {
      category: "edit_delete",
      user: ACCOUNTS_CURRENT_USER,
      role: "System Admin",
      userEmail: "admin@dharitrisutra.in",
      module: "Chart of Accounts",
      moduleCode: "COA",
      reference: "BANK-HDFC-001",
      activityType: "Update",
      action: "Updated bank ledger IFSC",
      oldValue: "IFSC: HDFC0001234",
      newValue: "IFSC: HDFC0005678",
      status: "completed",
      details: "HDFC Current Account ledger — branch migration update",
      remarks: "Bank branch shifted to SG Highway, Ahmedabad",
    },
    {
      category: "edit_delete",
      user: "Amit Patel",
      role: "Accounts Executive",
      userEmail: "amit.patel@dharitrisutra.in",
      module: "Journal Voucher",
      moduleCode: "JV",
      reference: "JV-DEPR-Q4",
      activityType: "Create",
      action: "Created depreciation journal",
      oldValue: "—",
      newValue: "Draft — ₹1,82,000",
      status: "completed",
      details: "Q4 FY25-26 depreciation provision journal",
      voucherAmount: "₹1,82,000",
    },
    {
      category: "edit_delete",
      user: "Rajesh Kumar",
      role: "Accounts Manager",
      userEmail: "rajesh.kumar@dharitrisutra.in",
      module: "Purchase Invoice",
      moduleCode: "PINV",
      reference: "PINV-2026-0019",
      activityType: "Edit",
      action: "Edited purchase invoice GST",
      oldValue: "IGST 18% — ₹9,720",
      newValue: "CGST+SGST 9% each — ₹9,720",
      status: "completed",
      details: "Corrected tax type on intra-state purchase bill",
      voucherAmount: "₹63,720",
      partyName: "Gujarat Agro Chemicals",
      remarks: "Vendor is intra-state — IGST was entered in error",
    },
  ];

  return specs
    .map((spec, i) => seedRecord(i + 1, i, spec))
    .sort((a, b) => b.dateTime.localeCompare(a.dateTime));
}

const STATIC_SEED = buildStaticSeed();

function normalizeLegacyRecord(raw: Record<string, unknown>, id: number): AuditTrailRecord {
  const action = String(raw.action ?? "");
  const module = String(raw.module ?? "");
  const isApproval =
    /approv|reject/i.test(action) ||
    ["approved", "rejected", "pending"].includes(String(raw.status ?? ""));
  const isEditDelete =
    /creat|edit|delet|post|updat|match/i.test(action) && !isApproval;

  let category: AuditTrailCategory = "user_activity";
  if (isApproval) category = "voucher_approval";
  else if (isEditDelete) category = "edit_delete";

  const statusRaw = String(raw.status ?? "completed").toLowerCase();
  const status = (
    ["completed", "approved", "rejected", "pending", "posted", "deleted", "exported", "matched"].includes(
      statusRaw,
    )
      ? statusRaw
      : action.toLowerCase().includes("approv")
        ? "approved"
        : action.toLowerCase().includes("reject")
          ? "rejected"
          : action.toLowerCase().includes("post")
            ? "posted"
            : action.toLowerCase().includes("delet")
              ? "deleted"
              : action.toLowerCase().includes("export")
                ? "exported"
                : "completed"
  ) as AuditTrailStatus;

  return {
    id,
    dateTime: String(raw.dateTime ?? demoTimestamp(demoDateAt(0))),
    category: (raw.category as AuditTrailCategory) ?? category,
    user: String(raw.user ?? ACCOUNTS_CURRENT_USER),
    role: String(raw.role ?? "Accounts User"),
    userEmail: raw.userEmail ? String(raw.userEmail) : undefined,
    module,
    moduleCode: raw.moduleCode ? String(raw.moduleCode) : undefined,
    reference: String(raw.reference ?? "—"),
    activityType: String(raw.activityType ?? action.split(" ")[0] ?? "Update"),
    action,
    oldValue: String(raw.oldValue ?? "—"),
    newValue: String(raw.newValue ?? String(raw.details ?? "—")),
    status,
    details: String(raw.details ?? ""),
    remarks: raw.remarks ? String(raw.remarks) : undefined,
    voucherAmount: raw.voucherAmount ? String(raw.voucherAmount) : undefined,
    partyName: raw.partyName ? String(raw.partyName) : undefined,
    approvalDetails: raw.approvalDetails as AuditTrailApprovalDetails | undefined,
  };
}

function saveRecords(records: AuditTrailRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function loadAuditTrailRecords(): AuditTrailRecord[] {
  if (typeof window === "undefined") return STATIC_SEED;

  try {
    const version = localStorage.getItem(SEED_VERSION_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);

    if (version !== String(SEED_VERSION) || !raw) {
      saveRecords(STATIC_SEED);
      localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
      return STATIC_SEED;
    }

    const stored = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(stored) || stored.length < 30) {
      saveRecords(STATIC_SEED);
      return STATIC_SEED;
    }

    return stored.map((row, i) =>
      row.category && row.role && row.activityType
        ? (row as unknown as AuditTrailRecord)
        : normalizeLegacyRecord(row, Number(row.id) || i + 1),
    );
  } catch {
    return STATIC_SEED;
  }
}

/** Append a user action — persists across refresh. */
export function appendAuditTrailEntry(
  entry: Omit<AuditTrailRecord, "id">,
): AuditTrailRecord[] {
  const records = loadAuditTrailRecords();
  const next: AuditTrailRecord = {
    ...entry,
    id: records.reduce((max, r) => Math.max(max, r.id), 0) + 1,
  };
  const updated = [next, ...records];
  saveRecords(updated);
  return updated;
}

export function countAuditTrailByCategory(
  records: AuditTrailRecord[],
): Record<AuditTrailCategory, number> {
  return records.reduce(
    (acc, r) => {
      acc[r.category] += 1;
      return acc;
    },
    { user_activity: 0, voucher_approval: 0, edit_delete: 0 } as Record<AuditTrailCategory, number>,
  );
}

export function filterAuditTrail(
  records: AuditTrailRecord[],
  opts: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    module?: string | string[];
    category?: string;
    user?: string | string[];
    activityType?: string | string[];
    status?: string | string[];
  },
): AuditTrailRecord[] {
  let list = [...records];

  if (opts.category && opts.category !== "all") {
    list = list.filter((r) => r.category === opts.category);
  }
  list = list.filter((r) => matchesMultiFilter(opts.user, r.user));
  list = list.filter((r) => matchesMultiFilter(opts.activityType, r.activityType));
  list = list.filter((r) => matchesMultiFilter(opts.status, r.status));
  list = list.filter((r) => matchesMultiFilter(opts.module, r.module));
  if (opts.search?.trim()) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.user.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        r.module.toLowerCase().includes(q) ||
        r.activityType.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q) ||
        r.oldValue.toLowerCase().includes(q) ||
        r.newValue.toLowerCase().includes(q) ||
        r.details.toLowerCase().includes(q) ||
        (r.partyName?.toLowerCase().includes(q) ?? false),
    );
  }
  if (opts.dateFrom) {
    list = list.filter((r) => r.dateTime.slice(0, 10) >= opts.dateFrom!);
  }
  if (opts.dateTo) {
    list = list.filter((r) => r.dateTime.slice(0, 10) <= opts.dateTo!);
  }

  return list;
}
