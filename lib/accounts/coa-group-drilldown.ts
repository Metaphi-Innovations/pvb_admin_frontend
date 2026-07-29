import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { getChildLedgers, getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { computeCustomerOutstanding } from "@/lib/accounts/receivables-data";
import { computeVendorOutstanding } from "@/lib/accounts/payables-data";
import { listPendingTaxInvoices } from "@/lib/accounts/sales-workflow-data";
import { listPendingVendorBills } from "@/lib/accounts/purchases-workflow-data";
import {
  computeStockValuationRows,
  computeProductValuationSummary,
  getInventoryDashboardMetrics,
  type ProductValuationSummary,
} from "@/lib/accounts/inventory-accounting-data";
import {
  invoiceMatchesCustomerLedger,
  resolveCustomerIdForLedger,
} from "@/lib/accounts/invoice-ledger-match";
import { findErpPartyLinkByLedgerId } from "@/lib/accounts/erp-party-links";
import {
  getBankGroups,
  getBankAccountLedgersUnderGroup,
} from "@/lib/accounts/bank-coa-utils";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { formatBankAccountMaster, maskBankAccountLast4 } from "@/lib/accounts/bank-account-display";
import { loadBankAccountMasters } from "@/lib/accounts/bank-accounts-data";
import { ledgerOutstanding, resolveLedgerType } from "@/lib/accounts/ledger-detail-utils";
import { statementVoucherNo } from "@/lib/accounts/sales-invoice-accounting";
import {
  buildGroupAccountingSummary,
  collectDescendantLedgers,
  ledgerBalanceRows,
  sumLedgerBalances,
  sumLedgersMatching,
  type CoaGroupAccountingSummary,
} from "@/lib/accounts/coa-accounting-view";

function purchaseDueDate(invoiceDate: string, creditDays = 30): string {
  const d = new Date(invoiceDate);
  d.setDate(d.getDate() + creditDays);
  return d.toISOString().slice(0, 10);
}

function sumOverdueReceivables(asOf: string): number {
  return loadInvoices()
    .filter((inv) => (inv.balanceAmount ?? 0) > 0 && inv.dueDate && inv.dueDate < asOf)
    .reduce((s, inv) => s + (inv.balanceAmount ?? 0), 0);
}

function sumOverduePayables(asOf: string): number {
  return loadPurchaseInvoices()
    .filter((inv) => inv.balanceDebitAllowed > 0 && purchaseDueDate(inv.invoiceDate) < asOf)
    .reduce((s, inv) => s + inv.balanceDebitAllowed, 0);
}

function sumPayablesDueWithinDays(asOf: string, days: number): number {
  const end = new Date(asOf);
  end.setDate(end.getDate() + days);
  const endStr = end.toISOString().slice(0, 10);
  return loadPurchaseInvoices()
    .filter((inv) => {
      if (inv.balanceDebitAllowed <= 0) return false;
      const due = purchaseDueDate(inv.invoiceDate);
      return due >= asOf && due <= endStr;
    })
    .reduce((s, inv) => s + inv.balanceDebitAllowed, 0);
}

export type CoaGroupContextKind =
  | "inventory"
  | "trade_receivables"
  | "trade_payables"
  | "bank_accounts"
  | "accrued_income"
  | "cash_in_hand"
  | "deposits"
  | "loans_advances"
  | "other_current_assets"
  | "prepaid_expenses"
  | "sales"
  | "purchases"
  | "gst_payable"
  | "gst_output"
  | "tds_payable"
  | "employee_costs"
  | "admin_expenses"
  | "customer_ledger"
  | "vendor_ledger"
  | "generic_accounting"
  | "capital_account"
  | "loans_borrowings"
  | "provisions"
  | "direct_income"
  | "indirect_income"
  | "direct_expenses"
  | "salary_payable"
  | "expenses_payable"
  | "customer_advances"
  | "cogs"
  | "selling_expenses"
  | "finance_costs"
  | "legal_professional"
  | "statutory_compliance"
  | "depreciation"
  | "miscellaneous_expenses";

export interface CoaLedgerBalanceRow {
  id: number;
  name: string;
  balance: number;
  openingBalance: number;
}

export interface CoaPostingRow {
  date: string;
  voucherNo: string;
  reference: string;
  particulars: string;
  debit: number;
  credit: number;
}

export interface CoaGroupContextBase {
  kind: CoaGroupContextKind;
  nodeId: number;
  nodeName: string;
}

export interface InventoryGroupContext extends CoaGroupContextBase {
  kind: "inventory";
  inventoryValue: number;
  availableQuantity: number;
  nearExpiryValue: number;
  expiredValue: number;
  productRows: ProductValuationSummary[];
  ledgers: ChartOfAccount[];
}

type CustomerOutstandingBase = ReturnType<typeof computeCustomerOutstanding>[number];

export interface TradeReceivablesOutstandingRow extends CustomerOutstandingBase {
  agingDays: number;
}

export interface TradeReceivablesGroupContext extends CoaGroupContextBase {
  kind: "trade_receivables";
  totalOutstanding: number;
  totalCustomers: number;
  overdueAmount: number;
  notDueAmount: number;
  customerLedgers: ChartOfAccount[];
  outstandingRows: TradeReceivablesOutstandingRow[];
  recentReceipts: { date: string; voucher: string; customer: string; amount: number }[];
}

export interface CoaHighlight {
  label: string;
  value: number;
}

export interface GenericAccountingGroupContext extends CoaGroupContextBase {
  kind:
    | "generic_accounting"
    | "capital_account"
    | "loans_borrowings"
    | "provisions"
    | "direct_income"
    | "indirect_income"
    | "direct_expenses"
    | "salary_payable"
    | "expenses_payable"
    | "customer_advances"
    | "cogs"
    | "selling_expenses"
    | "finance_costs"
    | "legal_professional"
    | "statutory_compliance"
    | "depreciation"
    | "miscellaneous_expenses";
  accounting: CoaGroupAccountingSummary;
  highlights: CoaHighlight[];
  entryNote: string;
}

type VendorOutstandingBase = ReturnType<typeof computeVendorOutstanding>[number];

export interface TradePayablesOutstandingRow extends VendorOutstandingBase {
  lastBill: string;
  dueDate: string;
  agingDays: number;
}

export interface TradePayablesGroupContext extends CoaGroupContextBase {
  kind: "trade_payables";
  totalPayable: number;
  totalVendors: number;
  dueThisWeek: number;
  overdueBills: number;
  vendorLedgers: ChartOfAccount[];
  outstandingRows: TradePayablesOutstandingRow[];
  recentPayments: { date: string; voucher: string; vendor: string; amount: number }[];
  accounting: CoaGroupAccountingSummary;
}

export interface BankAccountListRow {
  id: number;
  name: string;
  accountNumber: string;
  openingBalance: number;
  currentBalance: number;
  bankingHref: string;
  coaLedgerId: number;
}

export interface BankAccountsGroupContext extends CoaGroupContextBase {
  kind: "bank_accounts";
  totalBankAccounts: number;
  totalBankBalance: number;
  todaysReceipts: number;
  todaysPayments: number;
  bankList: BankAccountListRow[];
  bankLedgers: ChartOfAccount[];
}

export interface AccruedIncomeGroupContext extends CoaGroupContextBase {
  kind: "accrued_income";
  totalAccruedIncome: number;
  currentMonthAccrued: number;
  pendingRecognition: number;
  recognizedThisMonth: number;
  ledgerRows: CoaLedgerBalanceRow[];
  ledgers: ChartOfAccount[];
}

export interface CashInHandGroupContext extends CoaGroupContextBase {
  kind: "cash_in_hand";
  mainCashBalance: number;
  pettyCashBalance: number;
  branchCashBalance: number;
  totalCash: number;
  ledgerRows: CoaLedgerBalanceRow[];
  ledgers: ChartOfAccount[];
}

export interface DepositsGroupContext extends CoaGroupContextBase {
  kind: "deposits";
  totalDeposits: number;
  securityDeposits: number;
  rentalDeposits: number;
  otherDeposits: number;
  registerRows: { id: number; name: string; amount: number; dueDate: string; depositType: string }[];
  ledgers: ChartOfAccount[];
}

export interface LoansAdvancesGroupContext extends CoaGroupContextBase {
  kind: "loans_advances";
  totalOutstanding: number;
  employeeAdvances: number;
  vendorAdvances: number;
  otherAdvances: number;
  outstandingRows: { id: number; party: string; type: string; outstanding: number }[];
  ledgers: ChartOfAccount[];
}

export interface OtherCurrentAssetsGroupContext extends CoaGroupContextBase {
  kind: "other_current_assets";
  totalBalance: number;
  activeLedgers: number;
  currentMonthMovement: number;
  ledgerRows: CoaLedgerBalanceRow[];
  ledgers: ChartOfAccount[];
}

export interface PrepaidExpensesGroupContext extends CoaGroupContextBase {
  kind: "prepaid_expenses";
  totalPrepaid: number;
  currentMonthAmortization: number;
  remainingBalance: number;
  scheduleRows: { id: number; expense: string; originalAmount: number; balanceRemaining: number }[];
  ledgers: ChartOfAccount[];
}

export interface SalesGroupContext extends CoaGroupContextBase {
  kind: "sales";
  totalSales: number;
  taxableSales: number;
  gstOutput: number;
  pendingTaxInvoices: number;
  salesLedgers: ChartOfAccount[];
  postedEntries: CoaPostingRow[];
}

export interface PurchasesGroupContext extends CoaGroupContextBase {
  kind: "purchases";
  totalPurchases: number;
  taxablePurchases: number;
  gstInput: number;
  pendingVendorBills: number;
  purchaseLedgers: ChartOfAccount[];
  postedEntries: CoaPostingRow[];
}

export interface GstPayableGroupContext extends CoaGroupContextBase {
  kind: "gst_payable" | "gst_output";
  totalGstPayable: number;
  outputGst: number;
  inputGstCredit: number;
  netPayable: number;
  gstLedgers: ChartOfAccount[];
  postedEntries: CoaPostingRow[];
}

export interface TdsPayableGroupContext extends CoaGroupContextBase {
  kind: "tds_payable";
  totalTdsPayable: number;
  sectionCount: number;
  tdsLedgers: ChartOfAccount[];
  postedEntries: CoaPostingRow[];
}

export interface ExpenseGroupContext extends CoaGroupContextBase {
  kind: "employee_costs" | "admin_expenses";
  totalExpense: number;
  ledgerCount: number;
  transactionCount: number;
  expenseLedgers: ChartOfAccount[];
}

export interface CustomerLedgerContext extends CoaGroupContextBase {
  kind: "customer_ledger";
  ledgerId: number;
  openingBalance: number;
  outstanding: number;
  invoiceCount: number;
  paymentCount: number;
  customerMasterHref: string | null;
  recentInvoices: { date: string; invoiceNo: string; amount: number }[];
  recentReceipts: { date: string; voucher: string; amount: number }[];
}

export interface VendorLedgerContext extends CoaGroupContextBase {
  kind: "vendor_ledger";
  ledgerId: number;
  outstanding: number;
  billCount: number;
  paymentCount: number;
}

export type CoaGroupContext =
  | InventoryGroupContext
  | TradeReceivablesGroupContext
  | TradePayablesGroupContext
  | BankAccountsGroupContext
  | AccruedIncomeGroupContext
  | CashInHandGroupContext
  | DepositsGroupContext
  | LoansAdvancesGroupContext
  | OtherCurrentAssetsGroupContext
  | PrepaidExpensesGroupContext
  | SalesGroupContext
  | PurchasesGroupContext
  | GstPayableGroupContext
  | TdsPayableGroupContext
  | ExpenseGroupContext
  | CustomerLedgerContext
  | VendorLedgerContext
  | GenericAccountingGroupContext
  | null;

// collectDescendantLedgers, sumLedgerBalances, ledgerBalanceRows imported from coa-accounting-view

function monthStart(date = new Date()): string {
  return date.toISOString().slice(0, 8) + "01";
}

function sumLedgerMovementThisMonth(ledgerIds: Set<number>): number {
  const start = monthStart();
  let movement = 0;
  loadVouchers()
    .filter((v) => v.status === "posted" || v.status === "approved")
    .filter((v) => v.date >= start)
    .forEach((v) => {
      v.lines.forEach((line) => {
        if (!line.ledgerId || !ledgerIds.has(line.ledgerId)) return;
        movement += (Number(line.debit) || 0) - (Number(line.credit) || 0);
      });
    });
  return Math.abs(movement);
}

function sumAccruedCreditsThisMonth(ledgerIds: Set<number>): number {
  const start = monthStart();
  let total = 0;
  loadVouchers()
    .filter((v) => v.status === "posted" || v.status === "approved")
    .filter((v) => v.date >= start)
    .forEach((v) => {
      v.lines.forEach((line) => {
        if (!line.ledgerId || !ledgerIds.has(line.ledgerId)) return;
        total += Number(line.credit) || 0;
      });
    });
  return total;
}

function sumAccruedDebitsThisMonth(ledgerIds: Set<number>): number {
  const start = monthStart();
  let total = 0;
  loadVouchers()
    .filter((v) => v.status === "posted" || v.status === "approved")
    .filter((v) => v.date >= start)
    .forEach((v) => {
      v.lines.forEach((line) => {
        if (!line.ledgerId || !ledgerIds.has(line.ledgerId)) return;
        total += Number(line.debit) || 0;
      });
    });
  return total;
}

function sumBankVouchersToday(ledgerIds: Set<number>, voucherType: "receipt" | "payment"): number {
  const today = new Date().toISOString().slice(0, 10);
  let total = 0;
  loadVouchers()
    .filter((v) => v.status === "posted" || v.status === "approved")
    .filter((v) => v.date === today && v.voucherType === voucherType)
    .forEach((v) => {
      v.lines.forEach((line) => {
        if (!line.ledgerId || !ledgerIds.has(line.ledgerId)) return;
        if (voucherType === "receipt") total += Number(line.debit) || 0;
        else total += Number(line.credit) || 0;
      });
    });
  return total;
}

function agingDaysFromDate(lastDate: string, asOf: string): number {
  const last = new Date(lastDate);
  const as = new Date(asOf);
  return Math.max(0, Math.floor((as.getTime() - last.getTime()) / 86400000));
}

function depositDueDate(name: string): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6 + (name.length % 12));
  return d.toISOString().slice(0, 10);
}

function classifyDepositType(name: string): "Security" | "Rental" | "Other" {
  const n = name.toLowerCase();
  if (n.includes("security")) return "Security";
  if (n.includes("rent")) return "Rental";
  return "Other";
}

function classifyAdvanceType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("staff") || n.includes("employee")) return "Employee Advance";
  if (n.includes("vendor")) return "Supplier Advance";
  return "Other Advance";
}

function cashBucket(name: string): "main" | "petty" | "branch" {
  const n = name.toLowerCase();
  if (n.includes("petty")) return "petty";
  if (n.includes("branch") || n.includes("counter") || n.includes("field")) return "branch";
  return "main";
}

function matchCustomerMasterHref(ledgerId: number, ledgerName: string): string | null {
  const link = findErpPartyLinkByLedgerId(ledgerId);
  if (link?.erpSourceModule === "customer_master") {
    return `/masters/customers/${link.erpSourceId}`;
  }
  const customerId = resolveCustomerIdForLedger(ledgerId, ledgerName);
  if (customerId != null) return `/masters/customers/${customerId}`;
  return null;
}

const ENTRY_NOTES: Record<string, string> = {
  "Capital Account": "Journal Voucher · Profit transfer · Drawings entry · Year-end closing",
  "Loans / Borrowings": "Loan receipt voucher · Payment voucher · Journal voucher · Interest accrual",
  "Sundry Creditors": "Purchase Bill · Payment Voucher · Debit Note · Supplier Credit Note",
  "Trade Payables / Sundry Creditors": "Purchase Bill · Payment Voucher · Debit Note · Supplier Credit Note",
  "Accounts Payable": "Purchase Bill · Payment Voucher · Debit Note · Supplier Credit Note",
  "Duties & Taxes": "Sales Invoice · Purchase Bill · Payment Voucher · Journal Voucher",
  "Duties & Taxes Payable": "Sales Invoice · Purchase Bill · Payment Voucher · Journal Voucher",
  "GST Payable": "Sales Invoice · Purchase Bill · Credit Note · Debit Note · GST Payment Voucher",
  "Salary Payable": "Payroll · Payment Voucher · Journal Voucher",
  "Expenses Payable": "Journal Voucher · Purchase Bill · Payment Voucher",
  "Advance Received from Customers": "Receipt Voucher · Sales Invoice adjustment · Journal Voucher",
  Provisions: "Journal Voucher · Year-end adjustment",
  "Direct Income": "Sales Invoice · Receipt Voucher · Journal Voucher",
  Sales: "Sales Invoice only",
  "Service Revenue": "Sales Invoice · Receipt Voucher · Journal Voucher",
  "Commission Income": "Receipt Voucher · Journal Voucher · Accrual entry",
  "Indirect Income": "Receipt Voucher · Bank Reconciliation · Journal Voucher",
  "Direct Expenses": "Purchase Bill · GRN · Sales Dispatch COGS · Payment Voucher · Journal Voucher",
  Purchases: "Purchase Bill",
  "Cost of Goods Sold": "Sales Dispatch / Sales Invoice posting · Inventory valuation engine",
  "Freight Inward": "Purchase Bill · Payment Voucher",
  "Employee Costs": "Payroll · Payment Voucher · Journal Voucher",
  "Administrative Expenses": "Payment Voucher · Purchase Bill · Bank Reconciliation · Journal Voucher",
  "Selling & Distribution Expenses": "Payment Voucher · Purchase Bill · Bank Reconciliation",
  "Finance Costs": "Bank Reconciliation · Payment Voucher · Journal Voucher",
  "Legal & Professional Expenses": "Purchase Bill · Payment Voucher · TDS entry if applicable",
  "Statutory & Compliance Expenses": "Payment Voucher · Bank Reconciliation · Journal Voucher",
  "Depreciation & Amortisation": "Asset Register depreciation run · Journal Voucher",
  "Miscellaneous Expenses": "Payment Voucher · Journal Voucher · Bank Reconciliation",
};

function resolveNamedGroupKind(name: string): GenericAccountingGroupContext["kind"] {
  const map: Record<string, GenericAccountingGroupContext["kind"]> = {
    "Capital Account": "capital_account",
    "Loans / Borrowings": "loans_borrowings",
    Provisions: "provisions",
    "Direct Income": "direct_income",
    "Indirect Income": "indirect_income",
    "Direct Expenses": "direct_expenses",
    "Salary Payable": "salary_payable",
    "Expenses Payable": "expenses_payable",
    "Advance Received from Customers": "customer_advances",
    "Cost of Goods Sold": "cogs",
    "Selling & Distribution Expenses": "selling_expenses",
    "Finance Costs": "finance_costs",
    "Legal & Professional Expenses": "legal_professional",
    "Statutory & Compliance Expenses": "statutory_compliance",
    "Depreciation & Amortisation": "depreciation",
    "Miscellaneous Expenses": "miscellaneous_expenses",
  };
  return map[name] ?? "generic_accounting";
}

function buildGroupHighlights(
  name: string,
  ledgers: ChartOfAccount[],
  accounting: CoaGroupAccountingSummary,
): CoaHighlight[] {
  const total = accounting.totalBalance;
  const monthStart = new Date().toISOString().slice(0, 8) + "01";
  const monthIncome = accounting.monthCredit;

  switch (name) {
    case "Capital Account":
      return [
        { label: "Total Capital", value: sumLedgersMatching(ledgers, (n) => n.includes("capital") && !n.includes("drawing")) },
        { label: "Drawings", value: sumLedgersMatching(ledgers, (n) => n.includes("drawing")) },
        { label: "Retained Earnings", value: sumLedgersMatching(ledgers, (n) => n.includes("retained")) },
        { label: "Reserves", value: sumLedgersMatching(ledgers, (n) => n.includes("reserve")) },
      ];
    case "Loans / Borrowings":
      return [
        { label: "Total Loans Outstanding", value: total },
        { label: "Secured Loans", value: sumLedgersMatching(ledgers, (n) => n.includes("secured")) },
        { label: "Unsecured Loans", value: sumLedgersMatching(ledgers, (n) => n.includes("unsecured")) },
        { label: "Bank Loans", value: sumLedgersMatching(ledgers, (n) => n.includes("bank loan")) },
      ];
    case "Duties & Taxes":
    case "Duties & Taxes Payable":
      return [
        { label: "GST Payable", value: sumLedgersMatching(ledgers, (n) => n.includes("gst")) },
        { label: "TDS Payable", value: sumLedgersMatching(ledgers, (n) => n.includes("tds")) },
        { label: "PF / ESIC Payable", value: sumLedgersMatching(ledgers, (n) => n.includes("pf") || n.includes("esic")) },
        { label: "Net Statutory Liability", value: total },
      ];
    case "GST Payable":
      return [
        { label: "Output GST", value: sumLedgersMatching(ledgers, (n) => n.includes("output")) },
        { label: "Input GST Adjusted", value: accounting.monthDebit },
        { label: "Net GST Payable", value: total },
        { label: "GST Payment Status", value: total > 0 ? total : 0 },
      ];
    case "Salary Payable":
      return [
        { label: "Salary Payable", value: total },
        { label: "Employee-wise Payable", value: ledgers.length },
        { label: "Paid Amount", value: accounting.monthDebit },
        { label: "Pending Amount", value: total },
      ];
    case "Expenses Payable":
      return [
        { label: "Accrued Expenses", value: total },
        { label: "Outstanding Expenses", value: total },
        { label: "Due Amount", value: total },
        { label: "Active Ledgers", value: ledgers.length },
      ];
    case "Advance Received from Customers":
      return [
        { label: "Customer Advances", value: total },
        { label: "Adjusted Against Invoices", value: accounting.monthDebit },
        { label: "Balance Advance", value: total },
        { label: "Ledgers", value: ledgers.length },
      ];
    case "Provisions":
      return [
        { label: "Provision for Tax", value: sumLedgersMatching(ledgers, (n) => n.includes("tax")) },
        { label: "Provision for Audit Fees", value: sumLedgersMatching(ledgers, (n) => n.includes("audit")) },
        { label: "Provision for Expenses", value: sumLedgersMatching(ledgers, (n) => n.includes("expense")) },
        { label: "Other Provisions", value: total },
      ];
    case "Direct Income":
      return [
        { label: "Total Direct Income", value: total },
        { label: "Sales Income", value: sumLedgersMatching(ledgers, (n) => n.includes("sales")) },
        { label: "Service Revenue", value: sumLedgersMatching(ledgers, (n) => n.includes("service")) },
        { label: "Current Month Income", value: monthIncome },
      ];
    case "Sales": {
      const invoices = loadInvoices().filter((i) => i.invoiceStatus !== "cancelled");
      const monthSales = invoices
        .filter((i) => i.invoiceDate >= monthStart)
        .reduce((s, i) => s + (i.grandTotal ?? 0), 0);
      const ytdSales = invoices.reduce((s, i) => s + (i.grandTotal ?? 0), 0);
      return [
        { label: "Current Month Sales", value: monthSales },
        { label: "YTD Sales", value: ytdSales },
        { label: "Ledger Balance", value: total },
        { label: "Recent Invoices", value: invoices.length },
      ];
    }
    case "Indirect Income":
      return [
        { label: "Interest Income", value: sumLedgersMatching(ledgers, (n) => n.includes("interest")) },
        { label: "Rent Income", value: sumLedgersMatching(ledgers, (n) => n.includes("rent")) },
        { label: "Discount Received", value: sumLedgersMatching(ledgers, (n) => n.includes("discount")) },
        { label: "Miscellaneous Income", value: sumLedgersMatching(ledgers, (n) => n.includes("misc")) },
      ];
    case "Direct Expenses":
      return [
        { label: "Purchases", value: sumLedgersMatching(ledgers, (n) => n.includes("purchase")) },
        { label: "Cost of Goods Sold", value: sumLedgersMatching(ledgers, (n) => n.includes("cogs") || n.includes("cost of goods")) },
        { label: "Freight Inward", value: sumLedgersMatching(ledgers, (n) => n.includes("freight inward")) },
        { label: "Manufacturing Expenses", value: sumLedgersMatching(ledgers, (n) => n.includes("manufacturing") || n.includes("job work")) },
      ];
    case "Purchases": {
      const bills = loadPurchaseInvoices();
      const monthPurchases = bills
        .filter((b) => b.invoiceDate >= monthStart)
        .reduce((s, b) => s + (b.grandTotal ?? 0), 0);
      return [
        { label: "Current Month Purchases", value: monthPurchases },
        { label: "YTD Purchases", value: bills.reduce((s, b) => s + (b.grandTotal ?? 0), 0) },
        { label: "Supplier-wise Bills", value: bills.length },
        { label: "Ledger Balance", value: total },
      ];
    }
    case "Cost of Goods Sold":
      return [
        { label: "COGS This Month", value: accounting.monthDebit },
        { label: "Product Ledgers", value: ledgers.length },
        { label: "Total COGS Balance", value: total },
        { label: "Dispatch Postings", value: accounting.monthCredit },
      ];
    case "Employee Costs":
      return [
        { label: "Salary Expense", value: sumLedgersMatching(ledgers, (n) => n.includes("salar") || n.includes("wage")) },
        { label: "Bonus", value: sumLedgersMatching(ledgers, (n) => n.includes("bonus")) },
        { label: "Incentives", value: sumLedgersMatching(ledgers, (n) => n.includes("incentive")) },
        { label: "Staff Welfare", value: sumLedgersMatching(ledgers, (n) => n.includes("welfare") || n.includes("recruitment")) },
      ];
    case "Administrative Expenses":
      return [
        { label: "Rent", value: sumLedgersMatching(ledgers, (n) => n === "rent" || n.includes("rent")) },
        { label: "Electricity", value: sumLedgersMatching(ledgers, (n) => n.includes("electric")) },
        { label: "Office Expenses", value: sumLedgersMatching(ledgers, (n) => n.includes("office")) },
        { label: "Repairs & Maintenance", value: sumLedgersMatching(ledgers, (n) => n.includes("repair") || n.includes("housekeeping")) },
      ];
    case "Selling & Distribution Expenses":
      return [
        { label: "Advertisement & Marketing", value: sumLedgersMatching(ledgers, (n) => n.includes("advert") || n.includes("marketing")) },
        { label: "Commission Paid", value: sumLedgersMatching(ledgers, (n) => n.includes("commission")) },
        { label: "Freight Outward", value: sumLedgersMatching(ledgers, (n) => n.includes("freight outward")) },
        { label: "Business Development", value: sumLedgersMatching(ledgers, (n) => n.includes("business development")) },
      ];
    case "Finance Costs":
      return [
        { label: "Interest Expense", value: sumLedgersMatching(ledgers, (n) => n.includes("interest")) },
        { label: "Bank Charges", value: sumLedgersMatching(ledgers, (n) => n.includes("bank charge")) },
        { label: "Loan Processing", value: sumLedgersMatching(ledgers, (n) => n.includes("loan processing")) },
        { label: "Foreign Exchange Loss", value: sumLedgersMatching(ledgers, (n) => n.includes("foreign exchange")) },
      ];
    case "Legal & Professional Expenses":
      return [
        { label: "Audit Fees", value: sumLedgersMatching(ledgers, (n) => n.includes("audit")) },
        { label: "Consultancy", value: sumLedgersMatching(ledgers, (n) => n.includes("consult")) },
        { label: "Legal Fees", value: sumLedgersMatching(ledgers, (n) => n.includes("legal")) },
        { label: "Professional Fees", value: sumLedgersMatching(ledgers, (n) => n.includes("professional") || n.includes("accounting")) },
      ];
    case "Statutory & Compliance Expenses":
      return [
        { label: "ROC Fees", value: sumLedgersMatching(ledgers, (n) => n.includes("roc")) },
        { label: "GST Penalty", value: sumLedgersMatching(ledgers, (n) => n.includes("gst")) },
        { label: "TDS Penalty", value: sumLedgersMatching(ledgers, (n) => n.includes("tds")) },
        { label: "Government Fees", value: sumLedgersMatching(ledgers, (n) => n.includes("government")) },
      ];
    case "Depreciation & Amortisation":
      return [
        { label: "Depreciation This Month", value: accounting.monthDebit },
        { label: "YTD Depreciation", value: total },
        { label: "Asset Ledgers", value: ledgers.length },
        { label: "Total Balance", value: total },
      ];
    case "Miscellaneous Expenses":
      return [
        { label: "Total Expenses", value: total },
        { label: "Active Ledgers", value: ledgers.length },
        { label: "Month Debit", value: accounting.monthDebit },
        { label: "Month Credit", value: accounting.monthCredit },
      ];
    default:
      return [
        { label: "Total Balance", value: total },
        { label: "Ledger Count", value: ledgers.length },
        { label: "Month Debit", value: accounting.monthDebit },
        { label: "Month Credit", value: accounting.monthCredit },
      ];
  }
}

function buildGenericGroupContext(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): GenericAccountingGroupContext {
  const accounting = buildGroupAccountingSummary(node, records);
  const highlights = buildGroupHighlights(node.accountName, accounting.ledgers, accounting);
  return {
    kind: resolveNamedGroupKind(node.accountName),
    nodeId: node.id,
    nodeName: node.accountName,
    accounting,
    highlights,
    entryNote: ENTRY_NOTES[node.accountName] ?? "Journal Voucher · Payment Voucher · Receipt Voucher",
  };
}

function recentVouchersForLedgers(ledgerIds: Set<number>, voucherType?: string, limit = 8) {
  return loadVouchers()
    .filter((v) => v.status === "posted" || v.status === "approved")
    .filter((v) => !voucherType || v.voucherType === voucherType)
    .filter((v) => v.lines.some((line) => line.ledgerId && ledgerIds.has(line.ledgerId)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

function collectPostingRows(ledgerIds: Set<number>): CoaPostingRow[] {
  const rows: CoaPostingRow[] = [];
  loadVouchers()
    .filter((v) => v.status === "posted" || v.status === "approved")
    .forEach((v) => {
      v.lines.forEach((line) => {
        if (!line.ledgerId || !ledgerIds.has(line.ledgerId)) return;
        rows.push({
          date: v.date,
          voucherNo: statementVoucherNo(v),
          reference: v.referenceNo || v.voucherNumber,
          particulars: v.narration || line.remarks || "—",
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
        });
      });
    });
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export function resolveCoaGroupContext(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): CoaGroupContext {
  const path = getAncestorPath(records, node.id);
  const primaryHead = path.find((p) => p.nodeLevel === "primary_head")?.accountName;

  if (node.nodeLevel === "ledger") {
    const ledgerPath = path.map((p) => p.accountName.toLowerCase()).join(" ");
    if (ledgerPath.includes("trade receivables") || ledgerPath.includes("sundry debtors")) {
      const outstanding = ledgerOutstanding(node);
      const vouchers = loadVouchers().filter(
        (v) =>
          (v.status === "posted" || v.status === "approved") &&
          v.lines.some((line) => line.ledgerId === node.id),
      );
      const recentInvoices = loadInvoices()
        .filter((inv) => invoiceMatchesCustomerLedger(inv, node.id, node.accountName))
        .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))
        .slice(0, 5)
        .map((inv) => ({
          date: inv.invoiceDate,
          invoiceNo: inv.invoiceNo,
          amount: inv.grandTotal ?? 0,
        }));
      const recentReceipts = vouchers
        .filter((v) => v.voucherType === "receipt")
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5)
        .map((v) => {
          const line = v.lines.find((l) => l.ledgerId === node.id);
          return {
            date: v.date,
            voucher: v.voucherNumber,
            amount: line?.credit ?? 0,
          };
        });
      return {
        kind: "customer_ledger",
        nodeId: node.id,
        nodeName: node.accountName,
        ledgerId: node.id,
        openingBalance: node.openingBalance,
        outstanding,
        invoiceCount: vouchers.filter((v) => v.voucherType === "sales").length,
        paymentCount: vouchers.filter((v) => v.voucherType === "receipt").length,
        customerMasterHref: matchCustomerMasterHref(node.id, node.accountName),
        recentInvoices,
        recentReceipts,
      };
    }
    if (ledgerPath.includes("trade payables") || ledgerPath.includes("sundry creditors")) {
      const outstanding = ledgerOutstanding(node);
      const vouchers = loadVouchers().filter(
        (v) =>
          (v.status === "posted" || v.status === "approved") &&
          v.lines.some((line) => line.ledgerId === node.id),
      );
      return {
        kind: "vendor_ledger",
        nodeId: node.id,
        nodeName: node.accountName,
        ledgerId: node.id,
        outstanding,
        billCount: vouchers.filter((v) => v.voucherType === "purchase").length,
        paymentCount: vouchers.filter((v) => v.voucherType === "payment").length,
      };
    }
    return null;
  }

  const name = node.accountName;

  if (name === "Inventory / Stock-in-Hand") {
    const valuationRows = computeStockValuationRows({});
    const metrics = getInventoryDashboardMetrics();
    const productRows = computeProductValuationSummary(valuationRows);
    const ledgers = getLedgersUnderSubGroupName(name, records);
    return {
      kind: "inventory",
      nodeId: node.id,
      nodeName: name,
      inventoryValue: metrics.totalInventoryValue,
      availableQuantity: metrics.totalAvailableQty,
      nearExpiryValue: metrics.nearExpiryStockValue,
      expiredValue: metrics.expiredStockValue,
      productRows,
      ledgers,
    };
  }
  if (
    name === "Sundry Debtors" ||
    name === "Accounts Receivable" ||
    name === "Trade Receivables / Sundry Debtors"
  ) {
    const asOf = new Date().toISOString().slice(0, 10);
    const outstandingRows = computeCustomerOutstanding().map((r) => ({
      ...r,
      agingDays: agingDaysFromDate(r.lastTransactionDate, asOf),
    }));
    const customerLedgers = getLedgersUnderSubGroupName(name, records);
    const totalOutstanding = outstandingRows.reduce((s, r) => s + r.outstanding, 0);
    const overdueAmount = sumOverdueReceivables(asOf);
    const ledgerIds = new Set(customerLedgers.map((l) => l.id));
    const recentReceipts = recentVouchersForLedgers(ledgerIds, "receipt").map((v) => {
      const line = v.lines.find((l) => l.ledgerId && ledgerIds.has(l.ledgerId));
      return {
        date: v.date,
        voucher: v.voucherNumber,
        customer: line?.ledgerName ?? "—",
        amount: line?.credit ?? 0,
      };
    });
    return {
      kind: "trade_receivables",
      nodeId: node.id,
      nodeName: name,
      totalOutstanding,
      totalCustomers: customerLedgers.length,
      overdueAmount,
      notDueAmount: Math.max(0, totalOutstanding - overdueAmount),
      customerLedgers,
      outstandingRows,
      recentReceipts,
    };
  }
  if (
    name === "Sundry Creditors" ||
    name === "Accounts Payable" ||
    name === "Trade Payables / Sundry Creditors"
  ) {
    const asOf = new Date().toISOString().slice(0, 10);
    const outstandingRows = computeVendorOutstanding().map((r) => {
      const due = purchaseDueDate(r.lastTransactionDate);
      return {
        ...r,
        lastBill: r.lastTransactionDate,
        dueDate: due,
        agingDays: agingDaysFromDate(r.lastTransactionDate, asOf),
      };
    });
    const vendorLedgers = getLedgersUnderSubGroupName(name, records);
    const totalPayable = outstandingRows.reduce((s, r) => s + r.outstanding, 0);
    const ledgerIds = new Set(vendorLedgers.map((l) => l.id));
    const recentPayments = recentVouchersForLedgers(ledgerIds, "payment").map((v) => {
      const line = v.lines.find((l) => l.ledgerId && ledgerIds.has(l.ledgerId));
      return {
        date: v.date,
        voucher: v.voucherNumber,
        vendor: line?.ledgerName ?? "—",
        amount: line?.debit ?? 0,
      };
    });
    return {
      kind: "trade_payables",
      nodeId: node.id,
      nodeName: name,
      totalPayable,
      totalVendors: vendorLedgers.length,
      dueThisWeek: sumPayablesDueWithinDays(asOf, 7),
      overdueBills: sumOverduePayables(asOf),
      vendorLedgers,
      outstandingRows,
      recentPayments,
      accounting: buildGroupAccountingSummary(node, records),
    };
  }

  if (name === "Bank Accounts") {
    const bankGroups = getBankGroups(records);
    const masters = loadBankAccountMasters().filter((m) => m.status === "active");
    const allAccountLedgers = bankGroups.flatMap((g) =>
      getBankAccountLedgersUnderGroup(records, g.id),
    );
    const ledgerIds = new Set(allAccountLedgers.map((l) => l.id));
    const bankList: BankAccountListRow[] = masters.map((m) => {
      const ledger = records.find((r) => r.id === m.coaLedgerId);
      const currentBalance = ledger ? computeLedgerCurrentBalance(ledger).amount : 0;
      return {
        id: m.id,
        name: formatBankAccountMaster(m),
        accountNumber: maskBankAccountLast4(m.accountNumber),
        openingBalance: m.openingBalance,
        currentBalance,
        bankingHref: `/accounts/banking/bank-accounts/${m.id}`,
        coaLedgerId: m.coaLedgerId,
      };
    });
    return {
      kind: "bank_accounts",
      nodeId: node.id,
      nodeName: name,
      totalBankAccounts: bankList.length,
      totalBankBalance: sumLedgerBalances(allAccountLedgers),
      todaysReceipts: sumBankVouchersToday(ledgerIds, "receipt"),
      todaysPayments: sumBankVouchersToday(ledgerIds, "payment"),
      bankList,
      bankLedgers: allAccountLedgers,
    };
  }

  if (name === "Accrued Income") {
    const ledgers = getLedgersUnderSubGroupName(name, records);
    const ledgerIds = new Set(ledgers.map((l) => l.id));
    const rows = ledgerBalanceRows(ledgers);
    const total = sumLedgerBalances(ledgers);
    return {
      kind: "accrued_income",
      nodeId: node.id,
      nodeName: name,
      totalAccruedIncome: total,
      currentMonthAccrued: sumAccruedCreditsThisMonth(ledgerIds),
      pendingRecognition: total,
      recognizedThisMonth: sumAccruedDebitsThisMonth(ledgerIds),
      ledgerRows: rows,
      ledgers,
    };
  }

  if (name === "Cash-in-Hand") {
    const ledgers = getLedgersUnderSubGroupName(name, records);
    const rows = ledgerBalanceRows(ledgers);
    let mainCashBalance = 0;
    let pettyCashBalance = 0;
    let branchCashBalance = 0;
    for (const row of rows) {
      const bucket = cashBucket(row.name);
      if (bucket === "petty") pettyCashBalance += row.balance;
      else if (bucket === "branch") branchCashBalance += row.balance;
      else mainCashBalance += row.balance;
    }
    return {
      kind: "cash_in_hand",
      nodeId: node.id,
      nodeName: name,
      mainCashBalance,
      pettyCashBalance,
      branchCashBalance,
      totalCash: mainCashBalance + pettyCashBalance + branchCashBalance,
      ledgerRows: rows,
      ledgers,
    };
  }

  if (name === "Deposits") {
    const ledgers = getLedgersUnderSubGroupName(name, records);
    const rows = ledgerBalanceRows(ledgers);
    let securityDeposits = 0;
    let rentalDeposits = 0;
    let otherDeposits = 0;
    const registerRows = rows.map((r) => {
      const type = classifyDepositType(r.name);
      if (type === "Security") securityDeposits += r.balance;
      else if (type === "Rental") rentalDeposits += r.balance;
      else otherDeposits += r.balance;
      return {
        id: r.id,
        name: r.name,
        amount: r.balance,
        dueDate: depositDueDate(r.name),
        depositType: type,
      };
    });
    return {
      kind: "deposits",
      nodeId: node.id,
      nodeName: name,
      totalDeposits: sumLedgerBalances(ledgers),
      securityDeposits,
      rentalDeposits,
      otherDeposits,
      registerRows,
      ledgers,
    };
  }

  if (name === "Loans & Advances Given") {
    const ledgers = getLedgersUnderSubGroupName(name, records);
    const rows = ledgerBalanceRows(ledgers);
    let employeeAdvances = 0;
    let vendorAdvances = 0;
    let otherAdvances = 0;
    const outstandingRows = rows.map((r) => {
      const type = classifyAdvanceType(r.name);
      if (type === "Employee Advance") employeeAdvances += r.balance;
      else if (type === "Supplier Advance") vendorAdvances += r.balance;
      else otherAdvances += r.balance;
      return { id: r.id, party: r.name, type, outstanding: r.balance };
    });
    return {
      kind: "loans_advances",
      nodeId: node.id,
      nodeName: name,
      totalOutstanding: sumLedgerBalances(ledgers),
      employeeAdvances,
      vendorAdvances,
      otherAdvances,
      outstandingRows,
      ledgers,
    };
  }

  if (name === "Other Current Assets") {
    const ledgers = getLedgersUnderSubGroupName(name, records);
    const ledgerIds = new Set(ledgers.map((l) => l.id));
    return {
      kind: "other_current_assets",
      nodeId: node.id,
      nodeName: name,
      totalBalance: sumLedgerBalances(ledgers),
      activeLedgers: ledgers.filter((l) => l.status === "active").length,
      currentMonthMovement: sumLedgerMovementThisMonth(ledgerIds),
      ledgerRows: ledgerBalanceRows(ledgers),
      ledgers,
    };
  }

  if (name === "Prepaid Expenses") {
    const ledgers = getLedgersUnderSubGroupName(name, records);
    const ledgerIds = new Set(ledgers.map((l) => l.id));
    const scheduleRows = ledgers.map((l) => {
      const bal = computeLedgerCurrentBalance(l);
      const originalAmount = Math.max(l.openingBalance, bal.amount);
      return {
        id: l.id,
        expense: l.accountName,
        originalAmount,
        balanceRemaining: bal.amount,
      };
    });
    return {
      kind: "prepaid_expenses",
      nodeId: node.id,
      nodeName: name,
      totalPrepaid: sumLedgerBalances(ledgers),
      currentMonthAmortization: sumAccruedDebitsThisMonth(ledgerIds),
      remainingBalance: sumLedgerBalances(ledgers),
      scheduleRows,
      ledgers,
    };
  }
  if (name === "Sales" && primaryHead === "Income") {
    const salesLedgers = getChildLedgers(records, node.id);
    const salesLedgerIds = new Set(collectDescendantLedgers(records, node.id).map((l) => l.id));
    const invoices = loadInvoices().filter((i) => i.invoiceStatus !== "cancelled");
    const totalSales = invoices.reduce((s, i) => s + (i.grandTotal ?? 0), 0);
    const taxableSales = invoices.reduce((s, i) => s + Math.max(0, (i.grandTotal ?? 0) - (i.taxAmount ?? 0)), 0);
    const gstOutput = totalSales - taxableSales;
    return {
      kind: "sales",
      nodeId: node.id,
      nodeName: name,
      totalSales,
      taxableSales,
      gstOutput: gstOutput > 0 ? gstOutput : totalSales * 0.18,
      pendingTaxInvoices: listPendingTaxInvoices().length,
      salesLedgers,
      postedEntries: collectPostingRows(salesLedgerIds),
    };
  }

  if (name === "Purchases" && primaryHead === "Expenses") {
    const purchaseLedgers = getChildLedgers(records, node.id);
    const purchaseLedgerIds = new Set(collectDescendantLedgers(records, node.id).map((l) => l.id));
    const bills = loadPurchaseInvoices();
    const totalPurchases = bills.reduce((s, i) => s + (i.grandTotal ?? 0), 0);
    const taxablePurchases = bills.reduce((s, i) => s + (i.subtotal ?? 0), 0);
    const gstInput = totalPurchases - taxablePurchases;
    return {
      kind: "purchases",
      nodeId: node.id,
      nodeName: name,
      totalPurchases,
      taxablePurchases,
      gstInput: gstInput > 0 ? gstInput : totalPurchases * 0.18,
      pendingVendorBills: listPendingVendorBills().length,
      purchaseLedgers,
      postedEntries: collectPostingRows(purchaseLedgerIds),
    };
  }

  if (name === "TDS Payable") {
    const tdsLedgers = collectDescendantLedgers(records, node.id);
    const tdsLedgerIds = new Set(tdsLedgers.map((l) => l.id));
    const total = sumLedgerBalances(tdsLedgers);
    return {
      kind: "tds_payable",
      nodeId: node.id,
      nodeName: name,
      totalTdsPayable: total,
      sectionCount: tdsLedgers.length,
      tdsLedgers,
      postedEntries: collectPostingRows(tdsLedgerIds),
    };
  }

  if (name === "GST Input" || name === "GST Input Credit") {
    const gstLedgers = collectDescendantLedgers(records, node.id);
    const gstLedgerIds = new Set(gstLedgers.map((l) => l.id));
    const total = sumLedgerBalances(gstLedgers);
    return {
      kind: "gst_payable",
      nodeId: node.id,
      nodeName: name,
      totalGstPayable: total,
      outputGst: 0,
      inputGstCredit: total,
      netPayable: total,
      gstLedgers,
      postedEntries: collectPostingRows(gstLedgerIds),
    };
  }

  if (
    name === "GST Payable" ||
    name === "GST Output" ||
    name === "Duties & Taxes" ||
    name === "Duties & Taxes Payable"
  ) {
    const gstLedgers = collectDescendantLedgers(records, node.id);
    const gstLedgerIds = new Set(gstLedgers.map((l) => l.id));
    const total = sumLedgerBalances(gstLedgers);
    return {
      kind: "gst_output",
      nodeId: node.id,
      nodeName: name,
      totalGstPayable: total,
      outputGst: total,
      inputGstCredit: 0,
      netPayable: total,
      gstLedgers,
      postedEntries: collectPostingRows(gstLedgerIds),
    };
  }

  if (name === "Employee Costs" || name === "Administrative Expenses") {
    const expenseLedgers = collectDescendantLedgers(records, node.id);
    const ledgerIds = new Set(expenseLedgers.map((l) => l.id));
    let transactionCount = 0;
    loadVouchers()
      .filter((v) => v.status === "posted" || v.status === "approved")
      .forEach((v) => {
        if (v.lines.some((line) => line.ledgerId && ledgerIds.has(line.ledgerId))) {
          transactionCount += 1;
        }
      });
    return {
      kind: name === "Employee Costs" ? "employee_costs" : "admin_expenses",
      nodeId: node.id,
      nodeName: name,
      totalExpense: sumLedgerBalances(expenseLedgers),
      ledgerCount: expenseLedgers.length,
      transactionCount,
      expenseLedgers,
    };
  }

  return buildGenericGroupContext(node, records);
}

export function ledgerTypeFilterMatch(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
  type: string,
): boolean {
  if (type === "all" || !type) return true;
  const resolved = resolveLedgerType(ledger, records);
  if (type === "customer") return resolved === "Customer";
  if (type === "vendor") return resolved === "Vendor";
  if (type === "bank") return resolved === "Bank";
  if (type === "cash") return resolved === "Cash";
  if (type === "expense") return resolved === "Expense";
  if (type === "sales") return resolved === "Sales";
  if (type === "purchase") return resolved === "Purchase";
  if (type === "gst") return resolved === "GST";
  if (type === "employee") return resolved === "Employee Payable";
  if (type === "loan") return resolved === "Loan";
  if (type === "fixed_asset") return resolved === "Fixed Asset";
  return true;
}
