import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";

export type LedgerTypeOption =
  | "Customer"
  | "Vendor"
  | "Bank"
  | "Cash"
  | "GST"
  | "Sales"
  | "Purchase"
  | "Inventory"
  | "Expense"
  | "Income"
  | "Liability"
  | "Asset"
  | "Equity"
  | "GST Input"
  | "GST Output"
  | "TDS"
  | "Employee Payable"
  | "Loan"
  | "Fixed Asset"
  | "Other";

export const LEDGER_TYPE_OPTIONS: LedgerTypeOption[] = [
  "Customer",
  "Vendor",
  "Bank",
  "Cash",
  "GST",
  "GST Input",
  "GST Output",
  "Sales",
  "Purchase",
  "Inventory",
  "Expense",
  "Income",
  "Liability",
  "Asset",
  "Equity",
  "TDS",
  "Employee Payable",
  "Loan",
  "Fixed Asset",
  "Other",
];

export const MASTER_OWNED_LEDGER_TYPES = new Set<LedgerTypeOption>([
  "Customer",
  "Vendor",
  "Bank",
  "Inventory",
  "Fixed Asset",
  "Employee Payable",
]);

export interface LedgerExtendedMeta {
  ledgerType: LedgerTypeOption;
  description: string;
  branch: string;
  customerCode: string;
  vendorCode: string;
  gstin: string;
  pan: string;
  creditLimit: string;
  creditDays: string;
  address: string;
  billingAddress: string;
  shippingAddress: string;
  contactPerson: string;
  mobile: string;
  email: string;
  paymentTerms: string;
  tdsApplicableMeta: boolean;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branchName: string;
  accountType: string;
  reconciliationEnabled: boolean;
  expenseCategory: string;
  gstApplicableMeta: boolean;
  taxType: string;
  taxRate: string;
  taxUsage: string;
  employeeMapping: string;
  department: string;
  claimPayableEnabled: boolean;
}

export const DEFAULT_LEDGER_META: LedgerExtendedMeta = {
  ledgerType: "Expense",
  description: "",
  branch: "",
  customerCode: "",
  vendorCode: "",
  gstin: "",
  pan: "",
  creditLimit: "",
  creditDays: "",
  address: "",
  billingAddress: "",
  shippingAddress: "",
  contactPerson: "",
  mobile: "",
  email: "",
  paymentTerms: "",
  tdsApplicableMeta: false,
  bankName: "",
  accountNumber: "",
  ifsc: "",
  branchName: "",
  accountType: "Current",
  reconciliationEnabled: true,
  expenseCategory: "",
  gstApplicableMeta: false,
  taxType: "Output",
  taxRate: "",
  taxUsage: "Both",
  employeeMapping: "",
  department: "",
  claimPayableEnabled: true,
};

const STORAGE_KEY = "ds_accounts_ledger_metadata_v1";

function readAll(): Record<string, LedgerExtendedMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LedgerExtendedMeta>) : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, LedgerExtendedMeta>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadLedgerMeta(ledgerId: number): LedgerExtendedMeta {
  const stored = readAll()[String(ledgerId)];
  return stored ? { ...DEFAULT_LEDGER_META, ...stored } : { ...DEFAULT_LEDGER_META };
}

export function saveLedgerMeta(ledgerId: number, meta: LedgerExtendedMeta) {
  const all = readAll();
  all[String(ledgerId)] = meta;
  writeAll(all);
}

export function deleteLedgerMeta(ledgerId: number) {
  const all = readAll();
  delete all[String(ledgerId)];
  writeAll(all);
}

function findSubGroup(records: ChartOfAccount[], nameIncludes: string): ChartOfAccount | null {
  const q = nameIncludes.toLowerCase();
  return (
    records.find(
      (r) => r.nodeLevel === "sub_group" && r.accountName.toLowerCase().includes(q),
    ) ?? null
  );
}

/** Auto-map parent sub-group for manual ledger types */
export function resolveParentForLedgerType(
  ledgerType: LedgerTypeOption,
  records = loadChartOfAccounts(),
): number | null {
  switch (ledgerType) {
    case "Customer":
      return findSubGroup(records, "trade receivables")?.id ?? findSubGroup(records, "sundry debtors")?.id ?? null;
    case "Vendor":
      return findSubGroup(records, "trade payables")?.id ?? findSubGroup(records, "sundry creditors")?.id ?? null;
    case "Bank":
      return findSubGroup(records, "bank accounts")?.id ?? null;
    case "Cash":
      return findSubGroup(records, "cash-in-hand")?.id ?? findSubGroup(records, "cash in hand")?.id ?? null;
    case "Sales":
      return findSubGroup(records, "sales")?.id ?? null;
    case "Purchase":
      return findSubGroup(records, "purchase")?.id ?? findSubGroup(records, "direct expenses")?.id ?? null;
    case "Inventory":
      return findSubGroup(records, "stock-in-hand")?.id ?? findSubGroup(records, "inventory")?.id ?? null;
    case "Income":
      return findSubGroup(records, "sales")?.id ?? null;
    case "Liability":
      return findSubGroup(records, "current liabilities")?.id ?? null;
    case "Asset":
      return findSubGroup(records, "current assets")?.id ?? null;
    case "Equity":
      return findSubGroup(records, "capital")?.id ?? findSubGroup(records, "equity")?.id ?? null;
    case "GST":
    case "GST Input":
      return findSubGroup(records, "gst payable")?.id ?? findSubGroup(records, "duties")?.id ?? null;
    case "GST Output":
      return findSubGroup(records, "gst payable")?.id ?? findSubGroup(records, "duties")?.id ?? null;
    case "TDS":
      return findSubGroup(records, "tds payable")?.id ?? findSubGroup(records, "duties")?.id ?? null;
    case "Employee Payable":
      return findSubGroup(records, "expenses payable")?.id ?? findSubGroup(records, "employee")?.id ?? null;
    case "Loan":
      return findSubGroup(records, "secured loans")?.id ?? findSubGroup(records, "borrowings")?.id ?? null;
    case "Fixed Asset":
      return findSubGroup(records, "plant & machinery")?.id ?? findSubGroup(records, "fixed assets")?.id ?? null;
    case "Expense":
    case "Other":
    default:
      return null;
  }
}

export function inferLedgerTypeFromCoa(
  ledger: ChartOfAccount,
  records = loadChartOfAccounts(),
): LedgerTypeOption {
  const path = getAncestorPath(records, ledger.id)
    .map((p) => p.accountName.toLowerCase())
    .join(" ");
  if (path.includes("trade receivables") || path.includes("sundry debtors")) return "Customer";
  if (path.includes("trade payables") || path.includes("sundry creditors")) return "Vendor";
  if (path.includes("bank accounts") || ledger.bankAccountFlag) return "Bank";
  if (path.includes("cash-in-hand")) return "Cash";
  if (path.includes("income") && path.includes("sales")) return "Sales";
  if (path.includes("purchase")) return "Purchase";
  if (path.includes("expenses payable") || path.includes("employee")) return "Employee Payable";
  if (path.includes("gst") || path.includes("duties")) return "GST Output";
  if (ledger.accountType === "Expense") return "Expense";
  return "Other";
}

export function validateLedgerMetaForSave(
  meta: LedgerExtendedMeta,
  mode: "add" | "edit",
): string | null {
  if (MASTER_OWNED_LEDGER_TYPES.has(meta.ledgerType) && mode === "add") {
    if (meta.ledgerType === "Customer") {
      return "Create customers from Sales → Customer Master. A receivable ledger is created automatically.";
    }
    if (meta.ledgerType === "Vendor") {
      return "Create vendors from Procurement → Vendor Master. A payable ledger is created automatically.";
    }
    return "Create bank accounts from Banking → Bank Accounts. Recommended: use Banking module instead of Ledgers.";
  }
  if (!meta.ledgerType) return "Ledger type is required.";
  return null;
}
