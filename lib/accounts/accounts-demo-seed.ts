/**
 * Realistic accounts demo data — masters, posted transactions, bank recon, and GL impact.
 * Runs once per version when the Accounts module loads (client-side localStorage).
 * Does not modify Chart of Accounts structure — only adds allowed ledgers.
 */

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  loadCustomers,
  saveCustomers,
  type Customer,
} from "@/app/(app)/masters/customers/customer-data";
import {
  loadVendors,
  saveVendors,
  emptyAddress,
  VENDOR_TYPE_GOODS,
  type Vendor,
} from "@/app/(app)/masters/vendors/vendor-data";
import {
  loadEmployees,
  saveEmployees,
  type Employee,
} from "@/app/(app)/user-management/employee/employee-data";
import {
  recalculateLineItem,
  loadInvoices,
  saveInvoices,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import {
  savePurchaseInvoices,
  type PurchaseInvoiceRecord,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { saveCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { saveDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { saveExpenses } from "@/app/(app)/accounts/expenses/expense-data";
import { saveVouchers, createVoucher, loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  loadChartOfAccounts,
  saveChartOfAccounts,
  type AccountType,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import {
  maybePostSalesInvoice,
  maybePostPurchaseInvoice,
  maybePostCreditNote,
} from "@/lib/accounts/document-posting-bridge";
import {
  loadAccountingSettings,
  saveAccountingSettings,
} from "@/lib/accounts/accounting-settings-data";
import { resolveMappingLedger } from "@/lib/accounts/ledger-mappings";
import {
  syncCustomerLedger,
  syncVendorLedger,
} from "@/lib/accounts/erp-accounting-mapping";
import { ensureBankAccountWithLedger } from "@/lib/accounts/bank-accounts-data";
import { DEMO_BANK_SPECS } from "@/lib/accounts/banking-demo-spec";
import { seedBankingDemoData } from "@/lib/accounts/banking-demo-seed";
import { createLedgerQuick } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-data";
import { seedAccountsDemoBankReconciliation } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-demo";
import { CREDIT_LIMIT_DEMO_INVOICE_SPECS } from "@/lib/sales/credit-limit-demo-seed";
import {
  assignDemoOpeningBalances,
  seedDemoAccountingVouchers,
  seedInventoryLedgersFromBatchRegister,
} from "@/lib/accounts/ledger-balance-seed";
import { seedReceivablesDemoData } from "@/lib/accounts/receivables-demo-seed";
import { seedPayablesDemoData } from "@/lib/accounts/payables-demo-seed";
import type { CreditNoteRecord } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { findErpPartyLink } from "@/lib/accounts/erp-party-links";

export const ACCOUNTS_DEMO_SEED_VERSION = "2026-jun-demo-v15";
const VERSION_KEY = "ds_accounts_demo_seed_version";

// ── Demo master specs (5 each) ───────────────────────────────────────────────

const DEMO_CUSTOMERS: Array<{
  id: number;
  customerCode: string;
  customerName: string;
  mobile: string;
  email: string;
  gstin: string;
  address: string;
  creditLimit: number;
  openingBalance: number;
  customerType: string;
}> = [
  {
    id: 1,
    customerCode: "CUST-0001",
    customerName: "ABC Agro Distributor",
    mobile: "9876543210",
    email: "accounts@abcagro.in",
    gstin: "27AABCU9603R1ZM",
    address: "Plot 12, MIDC, Pune, Maharashtra 411057",
    creditLimit: 500000,
    openingBalance: 50000,
    customerType: "distributor",
  },
  {
    id: 2,
    customerCode: "CUST-0002",
    customerName: "Krishna Retail Store",
    mobile: "9812345678",
    email: "billing@krishnaretail.in",
    gstin: "27AABCK1234R1Z5",
    address: "Shop 4, Market Yard, Nagpur, Maharashtra 440001",
    creditLimit: 200000,
    openingBalance: 18500,
    customerType: "retailer",
  },
  {
    id: 3,
    customerCode: "CUST-0003",
    customerName: "Yavatmal Cotton FPO",
    mobile: "9823456789",
    email: "office@yavatmalcottonfpo.org",
    gstin: "27AABCY5678C1Z3",
    address: "FPO Bhawan, Cotton Market, Yavatmal, Maharashtra 445001",
    creditLimit: 350000,
    openingBalance: 32000,
    customerType: "fpo",
  },
  {
    id: 4,
    customerCode: "CUST-0004",
    customerName: "Green Harvest Agro",
    mobile: "9834567890",
    email: "purchase@greenharvest.in",
    gstin: "27AABCG9012H1Z7",
    address: "Warehouse 7, Hinjewadi, Pune, Maharashtra 411057",
    creditLimit: 750000,
    openingBalance: 56000,
    customerType: "distributor",
  },
  {
    id: 5,
    customerCode: "CUST-0005",
    customerName: "Shree Ganesh Seeds",
    mobile: "9845678901",
    email: "accounts@shreeganeshseeds.in",
    gstin: "27AABCS3456G1Z9",
    address: "Seed Godown, Jalna Road, Aurangabad, Maharashtra 431001",
    creditLimit: 300000,
    openingBalance: 12800,
    customerType: "retailer",
  },
  {
    id: 6,
    customerCode: "CUST-0006",
    customerName: "Konkan Fertilizer Depot",
    mobile: "9856789012",
    email: "billing@konkanfert.in",
    gstin: "27AABCK6789D1Z2",
    address: "Shop 2, Ratnagiri Market, Ratnagiri, Maharashtra 415612",
    creditLimit: 50000,
    openingBalance: 0,
    customerType: "dealer",
  },
  {
    id: 7,
    customerCode: "CUST-0007",
    customerName: "Vidarbha Agro Mart",
    mobile: "9867890123",
    email: "accounts@vidarbhaagro.in",
    gstin: "27AABCV2345E1Z4",
    address: "Agro Complex, Wardha Road, Nagpur, Maharashtra 440015",
    creditLimit: 250000,
    openingBalance: 15000,
    customerType: "distributor",
  },
  {
    id: 8,
    customerCode: "CUST-0008",
    customerName: "Bharat Krishi Kendra",
    mobile: "9878901234",
    email: "office@bharatkrishi.in",
    gstin: "27AABCB5678F1Z6",
    address: "Krishi Kendra, Amravati Road, Nagpur, Maharashtra 440023",
    creditLimit: 180000,
    openingBalance: 8500,
    customerType: "retailer",
  },
];

const DEMO_VENDORS: Array<{
  id: number;
  vendorCode: string;
  vendorName: string;
  mobile: string;
  email: string;
  gstin: string;
  address: string;
  openingBalance: number;
}> = [
  {
    id: 1,
    vendorCode: "CG-001",
    vendorName: "AgroChem Traders",
    mobile: "9876501234",
    email: "accounts@agrochem.in",
    gstin: "27AABCA1234F1Z2",
    address: "12 MIDC Road, Bhosari, Pune, Maharashtra 411026",
    openingBalance: 75000,
  },
  {
    id: 2,
    vendorCode: "CG-002",
    vendorName: "GreenField Suppliers",
    mobile: "9988776655",
    email: "billing@greenfield.in",
    gstin: "29AABCG5678F1Z4",
    address: "45 Industrial Area, Whitefield, Bengaluru, Karnataka 560066",
    openingBalance: 42000,
  },
  {
    id: 3,
    vendorCode: "CG-003",
    vendorName: "Bharat Fertilizers",
    mobile: "9123456780",
    email: "sales@bharatfert.in",
    gstin: "24AABCB9012D1Z6",
    address: "NH-6, MIDC, Nagpur, Maharashtra 440016",
    openingBalance: 95000,
  },
  {
    id: 4,
    vendorCode: "CG-004",
    vendorName: "Kisan Inputs Pvt Ltd",
    mobile: "9765432109",
    email: "ap@kisaninputs.com",
    gstin: "27AABCK4567E1Z8",
    address: "Sector 5, Aurangabad Industrial, Maharashtra 431136",
    openingBalance: 31500,
  },
  {
    id: 5,
    vendorCode: "CG-005",
    vendorName: "Crop Care Industries",
    mobile: "9654321098",
    email: "finance@cropcare.in",
    gstin: "27AABCC7890F1Z1",
    address: "Plot 22, Kurkumbh MIDC, Pune, Maharashtra 413802",
    openingBalance: 54000,
  },
];

const DEMO_EMPLOYEES = [
  { id: 1, firstName: "Rajesh", lastName: "Sharma", fullName: "Rajesh Sharma" },
  { id: 2, firstName: "Priya", lastName: "Singh", fullName: "Priya Singh" },
  { id: 3, firstName: "Amit", lastName: "Verma", fullName: "Amit Verma" },
  { id: 4, firstName: "Neha", lastName: "Patel", fullName: "Neha Patel" },
  { id: 5, firstName: "Suresh", lastName: "Kumar", fullName: "Suresh Kumar" },
] as const;

const DEMO_BANKS = DEMO_BANK_SPECS.map((spec) => ({
  bankName: spec.bankName,
  nickname: spec.accountNickname,
  accountNumber: spec.accountNumber,
  ifsc: spec.ifsc,
  branch: spec.branchName,
  openingBalance: spec.openingBalance,
  openingBalanceDate: spec.openingBalanceDate,
  defaultReceipts: spec.defaultForReceipts,
  defaultPayments: spec.defaultForPayments,
}));

/**
 * Comprehensive COA ledger seeds — every leaf sub-group gets 3-5 realistic
 * agro/fertilizer/distribution business ledgers.
 * subGroup must exactly match the system node accountName in coa-seed-nodes.ts.
 * Bank Accounts and Trade Receivables/Payables are handled separately
 * by createBankAccountWithLedger, syncCustomerLedger, syncVendorLedger.
 */
const COA_LEDGER_SEEDS: Array<{ subGroup: string; name: string; accountType: AccountType }> = [
  // ── ASSETS: Fixed Assets ────────────────────────────────────────────────
  { subGroup: "Land & Building", name: "Head Office Building", accountType: "Asset" },
  { subGroup: "Land & Building", name: "Warehouse Land & Structure", accountType: "Asset" },
  { subGroup: "Land & Building", name: "Branch Office Premises", accountType: "Asset" },

  { subGroup: "Plant & Machinery", name: "Fertilizer Blending Machine", accountType: "Asset" },
  { subGroup: "Plant & Machinery", name: "Seed Processing Unit", accountType: "Asset" },
  { subGroup: "Plant & Machinery", name: "Bagging & Packaging Machine", accountType: "Asset" },
  { subGroup: "Plant & Machinery", name: "Water Treatment Plant", accountType: "Asset" },

  { subGroup: "Furniture & Fixtures", name: "Office Furniture - HO", accountType: "Asset" },
  { subGroup: "Furniture & Fixtures", name: "Warehouse Racking & Shelving", accountType: "Asset" },
  { subGroup: "Furniture & Fixtures", name: "Reception Counter & Fittings", accountType: "Asset" },

  { subGroup: "Office Equipment", name: "Air Conditioning Units", accountType: "Asset" },
  { subGroup: "Office Equipment", name: "Office Printers & Scanners", accountType: "Asset" },
  { subGroup: "Office Equipment", name: "Security & Surveillance Equipment", accountType: "Asset" },

  { subGroup: "Computers & IT Equipment", name: "Laptop - Management", accountType: "Asset" },
  { subGroup: "Computers & IT Equipment", name: "ERP Server Infrastructure", accountType: "Asset" },
  { subGroup: "Computers & IT Equipment", name: "Network & Communication Equipment", accountType: "Asset" },
  { subGroup: "Computers & IT Equipment", name: "CCTV & Access Control System", accountType: "Asset" },

  { subGroup: "Vehicles", name: "Delivery Van MH-12-AB-1234", accountType: "Asset" },
  { subGroup: "Vehicles", name: "Company Car MH-12-XY-5678", accountType: "Asset" },
  { subGroup: "Vehicles", name: "Field Staff Motorcycle Fleet", accountType: "Asset" },

  { subGroup: "Intangible Assets", name: "ERP Software License", accountType: "Asset" },
  { subGroup: "Intangible Assets", name: "Brand & Trademark Value", accountType: "Asset" },
  { subGroup: "Intangible Assets", name: "Goodwill - Business Acquisition", accountType: "Asset" },

  // ── ASSETS: Current Assets ──────────────────────────────────────────────
  { subGroup: "Cash-in-Hand", name: "Office Petty Cash", accountType: "Asset" },
  { subGroup: "Cash-in-Hand", name: "Field Staff Cash Float", accountType: "Asset" },
  { subGroup: "Cash-in-Hand", name: "Branch Counter Cash", accountType: "Asset" },

  // Bank Accounts → handled by createBankAccountWithLedger in ensureBankAccount()
  // Trade Receivables → handled by syncCustomerLedger()

  { subGroup: "Inventory / Stock-in-Hand", name: "Urea 50kg Stock", accountType: "Asset" },
  { subGroup: "Inventory / Stock-in-Hand", name: "NPK Fertilizer Stock", accountType: "Asset" },
  { subGroup: "Inventory / Stock-in-Hand", name: "DAP Fertilizer Stock", accountType: "Asset" },
  { subGroup: "Inventory / Stock-in-Hand", name: "Pesticide Inventory", accountType: "Asset" },
  { subGroup: "Inventory / Stock-in-Hand", name: "Seed Inventory", accountType: "Asset" },

  { subGroup: "Loans & Advances Given", name: "Staff Advance - Sales Team", accountType: "Asset" },
  { subGroup: "Loans & Advances Given", name: "Supplier Advance - AgroChem Traders", accountType: "Asset" },
  { subGroup: "Loans & Advances Given", name: "Advance to Contractors", accountType: "Asset" },
  { subGroup: "Loans & Advances Given", name: "Security Deposit - Warehouse Landlord", accountType: "Asset" },

  { subGroup: "Deposits", name: "Electricity Security Deposit - HO", accountType: "Asset" },
  { subGroup: "Deposits", name: "Electricity Deposit - Warehouse", accountType: "Asset" },
  { subGroup: "Deposits", name: "Rent Deposit - Branch Office", accountType: "Asset" },
  { subGroup: "Deposits", name: "MIDC Industrial Deposit", accountType: "Asset" },

  { subGroup: "Prepaid Expenses", name: "Prepaid Insurance - Plant & Machinery", accountType: "Asset" },
  { subGroup: "Prepaid Expenses", name: "Prepaid Annual Software Subscription", accountType: "Asset" },
  { subGroup: "Prepaid Expenses", name: "Prepaid Office Rent", accountType: "Asset" },

  { subGroup: "Accrued Income", name: "Accrued Bank Interest Income", accountType: "Asset" },
  { subGroup: "Accrued Income", name: "Accrued Dealer Commission Income", accountType: "Asset" },
  { subGroup: "Accrued Income", name: "Unbilled Agronomy Service Revenue", accountType: "Asset" },

  { subGroup: "Other Current Assets", name: "GST Input Credit (CGST)", accountType: "Asset" },
  { subGroup: "Other Current Assets", name: "GST Input Credit (SGST)", accountType: "Asset" },
  { subGroup: "Other Current Assets", name: "GST Input Credit (IGST)", accountType: "Asset" },
  { subGroup: "Other Current Assets", name: "TDS Receivable", accountType: "Asset" },
  { subGroup: "Other Current Assets", name: "Input Tax Credit Receivable", accountType: "Asset" },

  // ── ASSETS: Investments ─────────────────────────────────────────────────
  { subGroup: "Short-Term Investments", name: "Fixed Deposit - HDFC Bank", accountType: "Asset" },
  { subGroup: "Short-Term Investments", name: "Liquid Mutual Fund - HDFC AMC", accountType: "Asset" },
  { subGroup: "Short-Term Investments", name: "Treasury Bills", accountType: "Asset" },

  { subGroup: "Long-Term Investments", name: "Equity Shares - AgroCo Ltd", accountType: "Asset" },
  { subGroup: "Long-Term Investments", name: "NABARD Infrastructure Bonds", accountType: "Asset" },
  { subGroup: "Long-Term Investments", name: "Investment in Associate Company", accountType: "Asset" },

  { subGroup: "Other Investments", name: "Security Deposit - Long Term", accountType: "Asset" },
  { subGroup: "Other Investments", name: "Investment in Subsidiary", accountType: "Asset" },
  { subGroup: "Other Investments", name: "Post Office Savings Deposit", accountType: "Asset" },

  // ── LIABILITIES: Capital Account ────────────────────────────────────────
  { subGroup: "Proprietor / Partner / Shareholder Capital", name: "Promoter Capital - Krishnamurthy Agro", accountType: "Liability" },
  { subGroup: "Proprietor / Partner / Shareholder Capital", name: "Equity Share Capital", accountType: "Liability" },
  { subGroup: "Proprietor / Partner / Shareholder Capital", name: "Preference Share Capital", accountType: "Liability" },

  { subGroup: "Drawings", name: "Director Drawings - FY 2026", accountType: "Liability" },
  { subGroup: "Drawings", name: "Partner Drawings Account", accountType: "Liability" },

  { subGroup: "Reserves & Surplus", name: "General Reserve", accountType: "Liability" },
  { subGroup: "Reserves & Surplus", name: "Capital Reserve", accountType: "Liability" },
  { subGroup: "Reserves & Surplus", name: "Securities Premium Reserve", accountType: "Liability" },

  { subGroup: "Retained Earnings", name: "Profit & Loss Account", accountType: "Liability" },
  { subGroup: "Retained Earnings", name: "Accumulated Surplus - Prior Years", accountType: "Liability" },
  { subGroup: "Retained Earnings", name: "Current Year Retained Profit", accountType: "Liability" },

  // ── LIABILITIES: Loans / Borrowings ────────────────────────────────────
  { subGroup: "Secured Loans", name: "HDFC Term Loan - Plant & Machinery", accountType: "Liability" },
  { subGroup: "Secured Loans", name: "SBI Secured Loan - Warehouse", accountType: "Liability" },
  { subGroup: "Secured Loans", name: "ICICI Equipment Finance Loan", accountType: "Liability" },

  { subGroup: "Unsecured Loans", name: "Unsecured Loan from Promoter", accountType: "Liability" },
  { subGroup: "Unsecured Loans", name: "Inter-Company Unsecured Loan", accountType: "Liability" },

  { subGroup: "Bank Loans", name: "HDFC Working Capital Loan", accountType: "Liability" },
  { subGroup: "Bank Loans", name: "SBI Cash Credit Limit", accountType: "Liability" },
  { subGroup: "Bank Loans", name: "Axis Bank Demand Loan", accountType: "Liability" },

  { subGroup: "NBFC Loans", name: "Bajaj Finance Equipment Loan", accountType: "Liability" },
  { subGroup: "NBFC Loans", name: "Tata Capital Business Loan", accountType: "Liability" },

  { subGroup: "Director / Related Party Loans", name: "Loan from Director - Krishnamurthy", accountType: "Liability" },
  { subGroup: "Director / Related Party Loans", name: "Loan from Related Party - Agro Trust", accountType: "Liability" },
  { subGroup: "Director / Related Party Loans", name: "Inter-Company Loan Payable", accountType: "Liability" },

  // ── LIABILITIES: Current Liabilities ────────────────────────────────────
  // Trade Payables → handled by syncVendorLedger()

  { subGroup: "Duties & Taxes Payable", name: "Professional Tax Payable", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "Income Tax Payable - Advance", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "Custom Duty Payable", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "State Cess Payable", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "CGST Payable", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "SGST Payable", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "IGST Payable", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "CGST Receivable", accountType: "Asset" },
  { subGroup: "Duties & Taxes Payable", name: "SGST Receivable", accountType: "Asset" },
  { subGroup: "Duties & Taxes Payable", name: "IGST Receivable", accountType: "Asset" },

  { subGroup: "TDS Payable", name: "TDS Payable - Sec 194C (Contractors)", accountType: "Liability" },
  { subGroup: "TDS Payable", name: "TDS Payable - Sec 194H (Commission)", accountType: "Liability" },
  { subGroup: "TDS Payable", name: "TDS Payable - Sec 194J (Professional)", accountType: "Liability" },
  { subGroup: "TDS Payable", name: "TDS Payable - Sec 192 (Salary)", accountType: "Liability" },

  { subGroup: "GST Payable", name: "Output CGST Payable", accountType: "Liability" },
  { subGroup: "GST Payable", name: "Output SGST Payable", accountType: "Liability" },
  { subGroup: "GST Payable", name: "Output IGST Payable", accountType: "Liability" },
  { subGroup: "GST Payable", name: "GST Payable Control Account", accountType: "Liability" },

  { subGroup: "PF / ESIC Payable", name: "PF Payable - Employee Contribution", accountType: "Liability" },
  { subGroup: "PF / ESIC Payable", name: "PF Payable - Employer Contribution", accountType: "Liability" },
  { subGroup: "PF / ESIC Payable", name: "ESIC Payable", accountType: "Liability" },

  { subGroup: "Salary Payable", name: "Salary Payable - HO Staff", accountType: "Liability" },
  { subGroup: "Salary Payable", name: "Salary Payable - Sales Team", accountType: "Liability" },
  { subGroup: "Salary Payable", name: "Salary Payable - Warehouse Team", accountType: "Liability" },
  { subGroup: "Salary Payable", name: "Incentive & Bonus Payable", accountType: "Liability" },

  { subGroup: "Expenses Payable", name: "Audit Fees Payable", accountType: "Liability" },
  { subGroup: "Expenses Payable", name: "Electricity Charges Payable", accountType: "Liability" },
  { subGroup: "Expenses Payable", name: "Rent Payable - Branch", accountType: "Liability" },
  { subGroup: "Expenses Payable", name: "Supplier Expenses Payable", accountType: "Liability" },

  { subGroup: "Advance Received from Customers", name: "Advance from ABC Agro Distributor", accountType: "Liability" },
  { subGroup: "Advance Received from Customers", name: "Advance from Green Harvest Agro", accountType: "Liability" },
  { subGroup: "Advance Received from Customers", name: "Season Advance - Kharif 2026", accountType: "Liability" },

  { subGroup: "Other Current Liabilities", name: "Refundable Security Deposits Held", accountType: "Liability" },
  { subGroup: "Other Current Liabilities", name: "Unclaimed Dividends", accountType: "Liability" },
  { subGroup: "Other Current Liabilities", name: "Sundry Payables - Others", accountType: "Liability" },

  // ── LIABILITIES: Provisions ─────────────────────────────────────────────
  { subGroup: "Provision for Tax", name: "Provision for Income Tax FY26", accountType: "Liability" },
  { subGroup: "Provision for Tax", name: "Provision for Deferred Tax Liability", accountType: "Liability" },
  { subGroup: "Provision for Tax", name: "Provision for GST Liability", accountType: "Liability" },

  { subGroup: "Provision for Audit Fees", name: "Provision for Statutory Audit", accountType: "Liability" },
  { subGroup: "Provision for Audit Fees", name: "Provision for Internal Audit", accountType: "Liability" },
  { subGroup: "Provision for Audit Fees", name: "Provision for Tax Audit Fees", accountType: "Liability" },

  { subGroup: "Provision for Expenses", name: "Provision for Annual Bonus", accountType: "Liability" },
  { subGroup: "Provision for Expenses", name: "Provision for Gratuity", accountType: "Liability" },
  { subGroup: "Provision for Expenses", name: "Provision for Leave Encashment", accountType: "Liability" },

  { subGroup: "Other Provisions", name: "Provision for Bad & Doubtful Debts", accountType: "Liability" },
  { subGroup: "Other Provisions", name: "Provision for Warranty Claims", accountType: "Liability" },
  { subGroup: "Other Provisions", name: "Provision for Returns & Disputes", accountType: "Liability" },

  // ── INCOME: Direct Income ───────────────────────────────────────────────
  { subGroup: "Sales", name: "Fertilizer Sales", accountType: "Income" },
  { subGroup: "Sales", name: "Pesticide Sales", accountType: "Income" },
  { subGroup: "Sales", name: "Seed Sales", accountType: "Income" },
  { subGroup: "Sales", name: "Micronutrient Sales", accountType: "Income" },
  { subGroup: "Sales", name: "Bio Product Sales", accountType: "Income" },

  { subGroup: "Service Revenue", name: "Agronomy Consulting Revenue", accountType: "Income" },
  { subGroup: "Service Revenue", name: "Training Program Revenue", accountType: "Income" },
  { subGroup: "Service Revenue", name: "Technical Advisory Revenue", accountType: "Income" },
  { subGroup: "Service Revenue", name: "Field Service Revenue", accountType: "Income" },

  { subGroup: "Professional Fees Income", name: "Agri Consultancy Fees Received", accountType: "Income" },
  { subGroup: "Professional Fees Income", name: "Project Advisory Income", accountType: "Income" },
  { subGroup: "Professional Fees Income", name: "Knowledge Transfer Fee Income", accountType: "Income" },

  { subGroup: "Commission Income", name: "Commission - AgroChem Traders", accountType: "Income" },
  { subGroup: "Commission Income", name: "Dealer Incentive Earned", accountType: "Income" },
  { subGroup: "Commission Income", name: "Agency Commission - Seeds Division", accountType: "Income" },

  { subGroup: "Other Operating Income", name: "Scrap Sales Income", accountType: "Income" },
  { subGroup: "Other Operating Income", name: "By-Product Revenue", accountType: "Income" },
  { subGroup: "Other Operating Income", name: "Packaging Material Recovery", accountType: "Income" },
  { subGroup: "Other Operating Income", name: "Export Incentive Income", accountType: "Income" },

  // ── INCOME: Indirect Income ─────────────────────────────────────────────
  { subGroup: "Interest Income", name: "Bank Interest - HDFC Current Account", accountType: "Income" },
  { subGroup: "Interest Income", name: "FD Interest Income", accountType: "Income" },
  { subGroup: "Interest Income", name: "Interest on Security Deposits", accountType: "Income" },

  { subGroup: "Dividend Income", name: "Dividend from AgroCo Ltd", accountType: "Income" },
  { subGroup: "Dividend Income", name: "Mutual Fund Dividend Income", accountType: "Income" },

  { subGroup: "Rent Income", name: "Warehouse Rental Income", accountType: "Income" },
  { subGroup: "Rent Income", name: "Office Space Rental Income", accountType: "Income" },
  { subGroup: "Rent Income", name: "Equipment Hire Charges Received", accountType: "Income" },

  { subGroup: "Discount Received", name: "Purchase Discount from AgroChem", accountType: "Income" },
  { subGroup: "Discount Received", name: "Early Payment Discount Earned", accountType: "Income" },
  { subGroup: "Discount Received", name: "Volume Rebate from Supplier", accountType: "Income" },

  { subGroup: "Profit on Sale of Asset", name: "Profit on Sale of Old Vehicle", accountType: "Income" },
  { subGroup: "Profit on Sale of Asset", name: "Profit on Sale of Plant Equipment", accountType: "Income" },

  { subGroup: "Foreign Exchange Gain", name: "Forex Gain - Import Transactions", accountType: "Income" },
  { subGroup: "Foreign Exchange Gain", name: "Forex Revaluation Gain", accountType: "Income" },

  { subGroup: "Miscellaneous Income", name: "Insurance Claim Received", accountType: "Income" },
  { subGroup: "Miscellaneous Income", name: "Bad Debt Recovery", accountType: "Income" },
  { subGroup: "Miscellaneous Income", name: "Sundry Receipts", accountType: "Income" },

  // ── EXPENSES: Direct Expenses ───────────────────────────────────────────
  { subGroup: "Purchases", name: "Fertilizer Purchase", accountType: "Expense" },
  { subGroup: "Purchases", name: "Pesticide Purchase", accountType: "Expense" },
  { subGroup: "Purchases", name: "Seed Purchase", accountType: "Expense" },
  { subGroup: "Purchases", name: "Packaging Material Purchase", accountType: "Expense" },
  { subGroup: "Purchases", name: "Raw Material Purchase", accountType: "Expense" },

  { subGroup: "Cost of Goods Sold", name: "Cost of Fertilizers Sold", accountType: "Expense" },
  { subGroup: "Cost of Goods Sold", name: "Cost of Pesticides Sold", accountType: "Expense" },
  { subGroup: "Cost of Goods Sold", name: "Cost of Seeds Sold", accountType: "Expense" },
  { subGroup: "Cost of Goods Sold", name: "Inventory Adjustment - Write-off", accountType: "Expense" },

  { subGroup: "Direct Labour", name: "Packing Labour Charges", accountType: "Expense" },
  { subGroup: "Direct Labour", name: "Loading & Unloading Labour", accountType: "Expense" },
  { subGroup: "Direct Labour", name: "Casual Labour - Warehouse", accountType: "Expense" },
  { subGroup: "Direct Labour", name: "Daily Wage - Field Operations", accountType: "Expense" },

  { subGroup: "Freight Inward", name: "Transport - Fertilizer Inward", accountType: "Expense" },
  { subGroup: "Freight Inward", name: "Freight from Supplier - Seeds", accountType: "Expense" },
  { subGroup: "Freight Inward", name: "Rail Freight - Bulk Fertilizer", accountType: "Expense" },
  { subGroup: "Freight Inward", name: "Octroi & Entry Tax", accountType: "Expense" },

  { subGroup: "Manufacturing Expenses", name: "Fertilizer Blending Charges", accountType: "Expense" },
  { subGroup: "Manufacturing Expenses", name: "Quality Testing Expense", accountType: "Expense" },
  { subGroup: "Manufacturing Expenses", name: "Wastage & Spoilage - Production", accountType: "Expense" },
  { subGroup: "Manufacturing Expenses", name: "Power & Fuel - Plant", accountType: "Expense" },

  { subGroup: "Job Work Charges", name: "Agro Processing Job Work", accountType: "Expense" },
  { subGroup: "Job Work Charges", name: "Bagging & Labelling Job Work", accountType: "Expense" },
  { subGroup: "Job Work Charges", name: "Third Party Lab Testing Charges", accountType: "Expense" },

  // ── EXPENSES: Employee Costs ────────────────────────────────────────────
  { subGroup: "Salaries & Wages", name: "HO Salary Expense", accountType: "Expense" },
  { subGroup: "Salaries & Wages", name: "Sales Team Salary Expense", accountType: "Expense" },
  { subGroup: "Salaries & Wages", name: "Warehouse Staff Salary Expense", accountType: "Expense" },
  { subGroup: "Salaries & Wages", name: "Contract Labour Expense", accountType: "Expense" },

  { subGroup: "Bonus", name: "Annual Performance Bonus", accountType: "Expense" },
  { subGroup: "Bonus", name: "Festival Bonus - Diwali", accountType: "Expense" },
  { subGroup: "Bonus", name: "Seasonal Incentive Payout", accountType: "Expense" },

  { subGroup: "Incentives", name: "Sales Commission Expense", accountType: "Expense" },
  { subGroup: "Incentives", name: "Target Achievement Incentive", accountType: "Expense" },
  { subGroup: "Incentives", name: "Dealer Scheme Incentive Expense", accountType: "Expense" },

  { subGroup: "Staff Welfare", name: "Employee Medical Expense", accountType: "Expense" },
  { subGroup: "Staff Welfare", name: "Staff Training & Development", accountType: "Expense" },
  { subGroup: "Staff Welfare", name: "Team Building & Outing Expense", accountType: "Expense" },
  { subGroup: "Staff Welfare", name: "Canteen & Refreshment Expense", accountType: "Expense" },

  { subGroup: "Recruitment Expenses", name: "Job Portal Subscription Fee", accountType: "Expense" },
  { subGroup: "Recruitment Expenses", name: "Recruitment Agency Fee", accountType: "Expense" },
  { subGroup: "Recruitment Expenses", name: "Onboarding & Joining Expense", accountType: "Expense" },

  // ── EXPENSES: Administrative Expenses ──────────────────────────────────
  { subGroup: "Rent", name: "Head Office Rent", accountType: "Expense" },
  { subGroup: "Rent", name: "Warehouse Rent", accountType: "Expense" },
  { subGroup: "Rent", name: "Branch Office Rent", accountType: "Expense" },

  { subGroup: "Electricity", name: "Head Office Electricity", accountType: "Expense" },
  { subGroup: "Electricity", name: "Warehouse Electricity", accountType: "Expense" },
  { subGroup: "Electricity", name: "Branch Electricity", accountType: "Expense" },

  { subGroup: "Office Expenses", name: "Office Supplies & Materials", accountType: "Expense" },
  { subGroup: "Office Expenses", name: "Pantry & Cafeteria Expense", accountType: "Expense" },
  { subGroup: "Office Expenses", name: "Courier & Postage Expense", accountType: "Expense" },
  { subGroup: "Office Expenses", name: "Miscellaneous Office Expense", accountType: "Expense" },

  { subGroup: "Printing & Stationery", name: "Invoice & Bill Printing", accountType: "Expense" },
  { subGroup: "Printing & Stationery", name: "Office Stationery", accountType: "Expense" },
  { subGroup: "Printing & Stationery", name: "Product Brochure & Catalogue Printing", accountType: "Expense" },

  { subGroup: "Telephone & Internet", name: "Office Landline Charges", accountType: "Expense" },
  { subGroup: "Telephone & Internet", name: "Internet Broadband Expense", accountType: "Expense" },
  { subGroup: "Telephone & Internet", name: "Mobile Reimbursement - Sales Team", accountType: "Expense" },

  { subGroup: "Repairs & Maintenance", name: "Vehicle Maintenance & Service", accountType: "Expense" },
  { subGroup: "Repairs & Maintenance", name: "Office Premises Maintenance", accountType: "Expense" },
  { subGroup: "Repairs & Maintenance", name: "Plant & Equipment Servicing", accountType: "Expense" },
  { subGroup: "Repairs & Maintenance", name: "IT & Computer Maintenance", accountType: "Expense" },

  { subGroup: "Housekeeping", name: "Cleaning Supplies Expense", accountType: "Expense" },
  { subGroup: "Housekeeping", name: "Housekeeping Agency Charges", accountType: "Expense" },
  { subGroup: "Housekeeping", name: "Pest Control Expense", accountType: "Expense" },

  // ── EXPENSES: Selling & Distribution ───────────────────────────────────
  { subGroup: "Advertisement & Marketing", name: "Google Ads", accountType: "Expense" },
  { subGroup: "Advertisement & Marketing", name: "Facebook & Social Media Ads", accountType: "Expense" },
  { subGroup: "Advertisement & Marketing", name: "Farmer Awareness Campaign", accountType: "Expense" },
  { subGroup: "Advertisement & Marketing", name: "Dealer Promotion Expense", accountType: "Expense" },
  { subGroup: "Advertisement & Marketing", name: "Agricultural Exhibition Expense", accountType: "Expense" },

  { subGroup: "Sales Promotion", name: "Product Demo & Sample Expense", accountType: "Expense" },
  { subGroup: "Sales Promotion", name: "Farmer Field Trial Expense", accountType: "Expense" },
  { subGroup: "Sales Promotion", name: "Kisan Mela Participation", accountType: "Expense" },
  { subGroup: "Sales Promotion", name: "Dealer Meet Expense", accountType: "Expense" },

  { subGroup: "Commission Paid", name: "Dealer Commission Expense", accountType: "Expense" },
  { subGroup: "Commission Paid", name: "Agent Commission - Seeds Division", accountType: "Expense" },
  { subGroup: "Commission Paid", name: "Referral Commission Paid", accountType: "Expense" },

  { subGroup: "Freight Outward", name: "Delivery Freight - Pune Zone", accountType: "Expense" },
  { subGroup: "Freight Outward", name: "Transport - Distributor Deliveries", accountType: "Expense" },
  { subGroup: "Freight Outward", name: "Courier Charges - Dispatch", accountType: "Expense" },
  { subGroup: "Freight Outward", name: "Last Mile Delivery Expense", accountType: "Expense" },

  { subGroup: "Packing Expenses", name: "HDPE Bag Purchase", accountType: "Expense" },
  { subGroup: "Packing Expenses", name: "Carton Box Expense", accountType: "Expense" },
  { subGroup: "Packing Expenses", name: "Stretch Film & Wrapping Material", accountType: "Expense" },

  { subGroup: "Business Development Expenses", name: "Client Meeting & Travel Expense", accountType: "Expense" },
  { subGroup: "Business Development Expenses", name: "Dealer Conference Expense", accountType: "Expense" },
  { subGroup: "Business Development Expenses", name: "New Market Development Expense", accountType: "Expense" },

  // ── EXPENSES: Finance Costs ─────────────────────────────────────────────
  { subGroup: "Interest Expense", name: "Interest on Working Capital Loan", accountType: "Expense" },
  { subGroup: "Interest Expense", name: "Interest on Term Loan - HDFC", accountType: "Expense" },
  { subGroup: "Interest Expense", name: "Bank Overdraft Interest", accountType: "Expense" },

  { subGroup: "Bank Charges", name: "HDFC Bank Service Charges", accountType: "Expense" },
  { subGroup: "Bank Charges", name: "ICICI Bank Service Charges", accountType: "Expense" },
  { subGroup: "Bank Charges", name: "Payment Gateway Charges", accountType: "Expense" },
  { subGroup: "Bank Charges", name: "RTGS / NEFT Transaction Charges", accountType: "Expense" },

  { subGroup: "Loan Processing Charges", name: "HDFC Loan Processing Fee", accountType: "Expense" },
  { subGroup: "Loan Processing Charges", name: "SBI Loan Documentation Charges", accountType: "Expense" },
  { subGroup: "Loan Processing Charges", name: "Mortgage Stamping Charges", accountType: "Expense" },

  { subGroup: "Foreign Exchange Loss", name: "Forex Loss - Import Payments", accountType: "Expense" },
  { subGroup: "Foreign Exchange Loss", name: "Forex Revaluation Loss", accountType: "Expense" },

  // ── EXPENSES: Legal & Professional ─────────────────────────────────────
  { subGroup: "Audit Fees", name: "Statutory Audit Fees", accountType: "Expense" },
  { subGroup: "Audit Fees", name: "Tax Audit Fees", accountType: "Expense" },
  { subGroup: "Audit Fees", name: "GST Audit Expense", accountType: "Expense" },

  { subGroup: "Consultancy Charges", name: "Management Consultancy Expense", accountType: "Expense" },
  { subGroup: "Consultancy Charges", name: "HR Consulting Charges", accountType: "Expense" },
  { subGroup: "Consultancy Charges", name: "IT System Consulting Expense", accountType: "Expense" },

  { subGroup: "Legal Fees", name: "Legal Retainer Fees", accountType: "Expense" },
  { subGroup: "Legal Fees", name: "Court Filing & Litigation Charges", accountType: "Expense" },
  { subGroup: "Legal Fees", name: "Contract Drafting & Vetting Fees", accountType: "Expense" },

  { subGroup: "Accounting Charges", name: "Internal Audit Fees", accountType: "Expense" },
  { subGroup: "Accounting Charges", name: "Bookkeeping Service Charges", accountType: "Expense" },
  { subGroup: "Accounting Charges", name: "Payroll Processing Charges", accountType: "Expense" },

  { subGroup: "Professional Fees", name: "CA Fees", accountType: "Expense" },
  { subGroup: "Professional Fees", name: "GST Consultant Fees", accountType: "Expense" },
  { subGroup: "Professional Fees", name: "CS Annual Retainer Fees", accountType: "Expense" },

  // ── EXPENSES: Statutory & Compliance ───────────────────────────────────
  { subGroup: "ROC Fees", name: "ROC Annual Filing Fees", accountType: "Expense" },
  { subGroup: "ROC Fees", name: "Annual Return Filing Fees", accountType: "Expense" },
  { subGroup: "ROC Fees", name: "Trade License Fees", accountType: "Expense" },

  { subGroup: "GST Late Fees / Penalty", name: "GST Penalty & Interest", accountType: "Expense" },
  { subGroup: "GST Late Fees / Penalty", name: "GSTR-3B Late Filing Charges", accountType: "Expense" },
  { subGroup: "GST Late Fees / Penalty", name: "GST Demand Notice Payment", accountType: "Expense" },

  { subGroup: "TDS Late Fees / Penalty", name: "TDS Penalty & Interest", accountType: "Expense" },
  { subGroup: "TDS Late Fees / Penalty", name: "TDS Late Deposit Charges", accountType: "Expense" },
  { subGroup: "TDS Late Fees / Penalty", name: "TDS Return Filing Penalty", accountType: "Expense" },

  { subGroup: "Other Government Fees", name: "Shop & Establishment License Fees", accountType: "Expense" },
  { subGroup: "Other Government Fees", name: "Pollution Control Board Fees", accountType: "Expense" },
  { subGroup: "Other Government Fees", name: "FSSAI Registration Charges", accountType: "Expense" },
  { subGroup: "Other Government Fees", name: "Weights & Measures License Fees", accountType: "Expense" },

  // ── EXPENSES: Depreciation & Amortisation ──────────────────────────────
  { subGroup: "Depreciation & Amortisation", name: "Depreciation - Buildings", accountType: "Expense" },
  { subGroup: "Depreciation & Amortisation", name: "Depreciation - Plant & Machinery", accountType: "Expense" },
  { subGroup: "Depreciation & Amortisation", name: "Depreciation - Vehicles", accountType: "Expense" },
  { subGroup: "Depreciation & Amortisation", name: "Depreciation - Computer Equipment", accountType: "Expense" },
  { subGroup: "Depreciation & Amortisation", name: "Amortisation - ERP Software License", accountType: "Expense" },

  // ── EXPENSES: Miscellaneous ─────────────────────────────────────────────
  { subGroup: "Miscellaneous Expenses", name: "Miscellaneous Administrative Expense", accountType: "Expense" },
  { subGroup: "Miscellaneous Expenses", name: "Rounding Off Differences", accountType: "Expense" },
  { subGroup: "Miscellaneous Expenses", name: "Sundry Losses & Write-offs", accountType: "Expense" },
  { subGroup: "Miscellaneous Expenses", name: "Donation & CSR Contribution", accountType: "Expense" },
];

/** 12 posted sales invoices — mixed payment status for receivables demo */
type DemoSalesInvoiceSpec = {
  id: number;
  invoiceNo: string;
  customerId: number;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  amountReceived: number;
  amountCredited?: number;
};

const DEMO_SALES_INVOICES: DemoSalesInvoiceSpec[] = [
  {
    id: 1,
    invoiceNo: "INV-2026-001",
    customerId: 1,
    invoiceDate: "2026-03-05",
    dueDate: "2026-04-04",
    subtotal: 127119,
    taxAmount: 22881,
    grandTotal: 150000,
    amountReceived: 80000,
    amountCredited: 20000,
  },
  {
    id: 2,
    invoiceNo: "INV-2026-002",
    customerId: 1,
    invoiceDate: "2026-05-10",
    dueDate: "2026-07-09",
    subtotal: 76271,
    taxAmount: 13729,
    grandTotal: 90000,
    amountReceived: 45000,
    amountCredited: 0,
  },
  {
    id: 3,
    invoiceNo: "INV-2026-003",
    customerId: 1,
    invoiceDate: "2026-05-28",
    dueDate: "2026-07-27",
    subtotal: 67797,
    taxAmount: 12203,
    grandTotal: 80000,
    amountReceived: 0,
    amountCredited: 0,
  },
  {
    id: 4,
    invoiceNo: "INV-2026-004",
    customerId: 4,
    invoiceDate: "2026-03-15",
    dueDate: "2026-04-14",
    subtotal: 84746,
    taxAmount: 15254,
    grandTotal: 100000,
    amountReceived: 80000,
    amountCredited: 0,
  },
  {
    id: 5,
    invoiceNo: "INV-2026-005",
    customerId: 4,
    invoiceDate: "2026-05-08",
    dueDate: "2026-07-07",
    subtotal: 67797,
    taxAmount: 12203,
    grandTotal: 80000,
    amountReceived: 10000,
    amountCredited: 0,
  },
  {
    id: 6,
    invoiceNo: "INV-2026-006",
    customerId: 2,
    invoiceDate: "2026-04-22",
    dueDate: "2026-05-22",
    subtotal: 100000,
    taxAmount: 18000,
    grandTotal: 118000,
    amountReceived: 118000,
    amountCredited: 0,
  },
  {
    id: 7,
    invoiceNo: "INV-2026-007",
    customerId: 3,
    invoiceDate: "2026-04-18",
    dueDate: "2026-06-02",
    subtotal: 122881,
    taxAmount: 22119,
    grandTotal: 145000,
    amountReceived: 0,
    amountCredited: 0,
  },
  {
    id: 8,
    invoiceNo: "INV-2026-008",
    customerId: 3,
    invoiceDate: "2026-05-12",
    dueDate: "2026-06-26",
    subtotal: 80508,
    taxAmount: 14492,
    grandTotal: 95000,
    amountReceived: 50000,
    amountCredited: 0,
  },
  {
    id: 9,
    invoiceNo: "INV-2026-009",
    customerId: 6,
    invoiceDate: "2026-05-25",
    dueDate: "2026-06-09",
    subtotal: 4271,
    taxAmount: 769,
    grandTotal: 5040,
    amountReceived: 0,
    amountCredited: 0,
  },
  {
    id: 10,
    invoiceNo: "INV-2026-010",
    customerId: 5,
    invoiceDate: "2026-05-20",
    dueDate: "2026-06-19",
    subtotal: 60000,
    taxAmount: 10800,
    grandTotal: 70800,
    amountReceived: 70800,
    amountCredited: 0,
  },
  {
    id: 11,
    invoiceNo: "INV-2026-011",
    customerId: 7,
    invoiceDate: "2026-05-15",
    dueDate: "2026-06-14",
    subtotal: 72034,
    taxAmount: 12966,
    grandTotal: 85000,
    amountReceived: 42500,
    amountCredited: 0,
  },
  {
    id: 12,
    invoiceNo: "INV-2026-012",
    customerId: 8,
    invoiceDate: "2026-05-28",
    dueDate: "2026-07-27",
    subtotal: 52542,
    taxAmount: 9458,
    grandTotal: 62000,
    amountReceived: 0,
    amountCredited: 0,
  },
] as const;

/** Purchase invoices linked to the demo GRNs (GRN-001 to GRN-005) */
const DEMO_PURCHASE_INVOICES: Array<{
  id: number;
  invoiceNo: string;
  vendorId: number;
  invoiceDate: string;
  grnId: string;
  grnNo: string;
  vendorInvoiceNo: string;
  amountPaid: number;
  lines: Array<{ name: string; qty: number; unit: string; rate: number; taxPct: number }>;
}> = [
  {
    id: 1,
    invoiceNo: "PUR-2026-001",
    vendorId: 1,
    invoiceDate: "2026-04-12",
    grnId: "demo-grn-1",
    grnNo: "GRN-001",
    vendorInvoiceNo: "AC/26/INV-101",
    amountPaid: 94400,
    lines: [
      { name: "Urea 50kg", qty: 400, unit: "BAG", rate: 1400, taxPct: 18 },
      { name: "DAP 50kg", qty: 200, unit: "BAG", rate: 1850, taxPct: 18 },
    ],
  },
  {
    id: 2,
    invoiceNo: "PUR-2026-002",
    vendorId: 2,
    invoiceDate: "2026-04-20",
    grnId: "demo-grn-2",
    grnNo: "GRN-002",
    vendorInvoiceNo: "GF/INV/2026/055",
    amountPaid: 0,
    lines: [
      { name: "NPK 10:26:26", qty: 250, unit: "BAG", rate: 1600, taxPct: 18 },
      { name: "Pesticide - Chlorpyrifos 20EC", qty: 100, unit: "LTR", rate: 850, taxPct: 18 },
    ],
  },
  {
    id: 3,
    invoiceNo: "PUR-2026-003",
    vendorId: 3,
    invoiceDate: "2026-05-05",
    grnId: "demo-grn-3",
    grnNo: "GRN-003",
    vendorInvoiceNo: "BF/2026/77A",
    amountPaid: 70000,
    lines: [
      { name: "Zinc Sulphate 21%", qty: 200, unit: "KG", rate: 250, taxPct: 18 },
      { name: "Hybrid Maize Seed 1kg", qty: 300, unit: "PKT", rate: 220, taxPct: 12 },
    ],
  },
  {
    id: 4,
    invoiceNo: "PUR-2026-004",
    vendorId: 4,
    invoiceDate: "2026-05-12",
    grnId: "demo-grn-4",
    grnNo: "GRN-004",
    vendorInvoiceNo: "KIP/26/INV-033",
    amountPaid: 0,
    lines: [
      { name: "Bio Stimulant - Humic Acid", qty: 150, unit: "LTR", rate: 900, taxPct: 18 },
      { name: "Micronutrient Mix Powder", qty: 250, unit: "KG", rate: 320, taxPct: 18 },
    ],
  },
  {
    id: 5,
    invoiceNo: "PUR-2026-005",
    vendorId: 5,
    invoiceDate: "2026-05-20",
    grnId: "demo-grn-5",
    grnNo: "GRN-005",
    vendorInvoiceNo: "CCI/26/19B",
    amountPaid: 35000,
    lines: [
      { name: "Imidacloprid 17.8% SL", qty: 120, unit: "LTR", rate: 1100, taxPct: 18 },
      { name: "Mancozeb 75% WP", qty: 180, unit: "KG", rate: 450, taxPct: 18 },
    ],
  },
];

// ── COA helpers (add ledgers only — never modify structure) ─────────────────

function findSubGroupId(name: string): number | null {
  const records = loadChartOfAccounts();
  const node = records.find(
    (r) => r.nodeLevel === "account_group" && r.accountName.toLowerCase() === name.toLowerCase(),
  );
  return node?.id ?? null;
}

function findLedgerByName(name: string): ChartOfAccount | undefined {
  return loadChartOfAccounts().find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.accountName.toLowerCase() === name.toLowerCase(),
  );
}

function ensureLedgerUnderSubGroup(
  subGroupName: string,
  ledgerName: string,
  accountType: AccountType,
): ChartOfAccount {
  const existing = findLedgerByName(ledgerName);
  if (existing) return existing;
  const parentId = findSubGroupId(subGroupName);
  if (!parentId) throw new Error(`COA sub-group not found: ${subGroupName}`);
  return createLedgerQuick({ ledgerName, accountType, parentGroupId: parentId });
}

function setLedgerOpeningBalance(
  ledgerId: number,
  amount: number,
  balanceType: "Debit" | "Credit" = "Debit",
): void {
  const records = loadChartOfAccounts();
  const idx = records.findIndex((r) => r.id === ledgerId);
  if (idx < 0) return;
  records[idx] = { ...records[idx], openingBalance: amount, balanceType };
  saveChartOfAccounts(records);
}

function ensureBankAccount(spec: (typeof DEMO_BANKS)[number]): void {
  ensureBankAccountWithLedger({
    bankName: spec.bankName,
    accountNickname: spec.nickname,
    accountNumber: spec.accountNumber,
    ifsc: spec.ifsc,
    branchName: spec.branch,
    accountType: "Current",
    openingBalance: spec.openingBalance,
    openingBalanceDate: spec.openingBalanceDate,
    balanceType: "Debit",
    reconciliationEnabled: true,
    defaultForReceipts: spec.defaultReceipts,
    defaultForPayments: spec.defaultPayments,
    status: "active",
  });
}

// ── Master seeding ───────────────────────────────────────────────────────────

function patchCustomer(base: Customer, spec: (typeof DEMO_CUSTOMERS)[number]): Customer {
  const [city, statePin] = spec.address.split(",").slice(-2);
  return {
    ...base,
    id: spec.id,
    customerCode: spec.customerCode,
    customerName: spec.customerName,
    customerType: spec.customerType,
    status: "active",
    blockReason: "",
    mobile: spec.mobile,
    email: spec.email,
    gstApplicable: true,
    gstin: spec.gstin,
    gstCategory: "regular",
    address: spec.address,
    stateName: statePin?.trim().split(" ").slice(0, -1).join(" ") || "Maharashtra",
    pincode: statePin?.trim().split(" ").pop() || "411057",
    creditLimit: spec.creditLimit,
    paymentTerms: "net-30",
    salesManId: spec.id <= 5 ? spec.id : 1,
    salesManName: DEMO_EMPLOYEES.find((e) => e.id === (spec.id <= 5 ? spec.id : 1))?.fullName ?? "Rajesh Sharma",
    territoryName: spec.id <= 4 ? "Pune Zone" : spec.id <= 6 ? "Konkan Region" : "Vidarbha Region",
    districtName: city?.trim() || "Pune",
    branches: [
      {
        branchName: "Main",
        isMain: true,
        billingAddress: {
          address: spec.address,
          city: city?.trim() || "Pune",
          state: "Maharashtra",
          pincode: statePin?.trim().split(" ").pop() || "411057",
        },
        shippingAddress: {
          address: spec.address,
          city: city?.trim() || "Pune",
          state: "Maharashtra",
          pincode: statePin?.trim().split(" ").pop() || "411057",
        },
        documents: [],
      },
    ],
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedDate: new Date().toISOString().slice(0, 10),
  };
}

function vendorTemplate(): Vendor {
  const existing = loadVendors()[0];
  if (existing) return existing;
  return {
    id: 1,
    vendorCode: "CG-001",
    vendorName: "Demo Vendor",
    vendorType: VENDOR_TYPE_GOODS,
    contactPerson: "Accounts",
    paymentTerms: "net-30",
    companyName: "Demo Vendor",
    mobileCountryCode: "+91",
    mobile: "9876500000",
    email: "accounts@vendor.in",
    gstApplicable: true,
    gstNumber: "27AABCA1234F1Z2",
    gstCategory: "regular",
    legalCompanyName: "Demo Vendor",
    billingAddress: {
      line1: "MIDC Road",
      line2: "",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      pincode: "411026",
    },
    tdsApplicable: false,
    tdsMasterId: null,
    panNumber: "AABCA1234F",
    tags: "",
    creditPeriodValue: "30",
    creditPeriodUnit: "days",
    contacts: [],
    accountHolderName: "",
    bankName: "",
    branch: "",
    accountNumber: "",
    ifscCode: "",
    documents: [],
    remarks: "",
    status: "active",
    createdBy: ACCOUNTS_CURRENT_USER,
    createdDate: "2026-04-01",
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedDate: "2026-04-01",
  };
}

function patchVendor(base: Vendor, spec: (typeof DEMO_VENDORS)[number]): Vendor {
  const parts = spec.address.split(",");
  const city = parts[parts.length - 2]?.trim() || "Pune";
  const statePin = parts[parts.length - 1]?.trim() || "Maharashtra 411026";
  const [state, pincode] = statePin.split(/\s+(?=\d)/);
  return {
    ...base,
    id: spec.id,
    vendorCode: spec.vendorCode,
    vendorName: spec.vendorName,
    companyName: spec.vendorName,
    legalCompanyName: spec.vendorName,
    vendorType: VENDOR_TYPE_GOODS,
    contactPerson: "Accounts Desk",
    mobile: spec.mobile,
    email: spec.email,
    gstApplicable: true,
    gstNumber: spec.gstin,
    gstCategory: "regular",
    billingAddress: {
      line1: parts[0]?.trim() || spec.address,
      line2: parts.slice(1, -2).join(", ").trim(),
      city,
      state: state || "Maharashtra",
      country: "India",
      pincode: pincode || "411026",
    },
    status: "active",
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedDate: new Date().toISOString().slice(0, 10),
  };
}

function seedDemoMasters(): void {
  const existingCustomers = loadCustomers();
  const customerTemplate = existingCustomers.find((c) => c.id === 1) ?? existingCustomers[0];
  const demoCustomerIds = new Set(DEMO_CUSTOMERS.map((c) => c.id));
  const patchedCustomers = DEMO_CUSTOMERS.map((spec) => {
    const base = existingCustomers.find((c) => c.id === spec.id) ?? customerTemplate!;
    return patchCustomer(base, spec);
  });
  const otherCustomers = existingCustomers.filter((c) => !demoCustomerIds.has(c.id));
  saveCustomers([...patchedCustomers, ...otherCustomers]);

  const employees = loadEmployees();
  const patchedEmployees = employees.map((emp) => {
    const spec = DEMO_EMPLOYEES.find((e) => e.id === emp.id);
    if (!spec) return emp;
    return {
      ...emp,
      firstName: spec.firstName,
      lastName: spec.lastName,
      fullName: spec.fullName,
      email: `${spec.firstName.toLowerCase()}.${spec.lastName.toLowerCase()}@paramverse.bio`,
    };
  });
  saveEmployees(patchedEmployees);

  for (const bank of DEMO_BANKS) ensureBankAccount(bank);

  for (const entry of COA_LEDGER_SEEDS) {
    try {
      ensureLedgerUnderSubGroup(entry.subGroup, entry.name, entry.accountType);
    } catch {
      // Sub-group rename in a future COA revision — skip silently
    }
  }

  for (const spec of DEMO_CUSTOMERS) {
    const customer = loadCustomers().find((c) => c.id === spec.id);
    if (!customer) continue;
    const ledger = syncCustomerLedger(customer);
    if (ledger && spec.openingBalance > 0) {
      setLedgerOpeningBalance(ledger.id, spec.openingBalance, "Debit");
    }
  }
  // Vendor masters and ledgers seeded via seedPayablesDemoData()
}

// ── Transaction builders ───────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildSalesInvoice(
  spec: DemoSalesInvoiceSpec,
  customerName: string,
  customerLedgerId: number | null = null,
): InvoiceRecord {
  const unitPrice = spec.subtotal / 100;
  const line = recalculateLineItem({
    id: `inv-line-${spec.id}`,
    productId: 1,
    productName: "Urea 50kg",
    description: "Agro input — demo invoice line",
    qty: 100,
    unit: "BAG",
    unitPrice,
    discountPct: 0,
    taxPct: 18,
    amount: 0,
    creditedQty: 0,
    creditedAmount: 0,
  });

  const collections =
    spec.amountReceived > 0
      ? [
          {
            id: spec.id,
            paymentDate: spec.invoiceDate,
            amount: spec.amountReceived,
            paymentMode: "NEFT" as const,
            referenceNo: `RCPT-${spec.invoiceNo}`,
            remarks: `Payment against ${spec.invoiceNo}`,
            createdBy: ACCOUNTS_CURRENT_USER,
            createdAt: `${spec.invoiceDate}T10:00:00.000Z`,
          },
        ]
      : [];

  const amountCredited = spec.amountCredited ?? 0;
  const dueDate =
    "dueDate" in spec && spec.dueDate
      ? spec.dueDate
      : addDays((spec as { invoiceDate: string }).invoiceDate, 30);

  return {
    id: spec.id,
    invoiceNo: spec.invoiceNo,
    invoiceDate: spec.invoiceDate,
    dueDate,
    referenceNo: spec.invoiceNo,
    salesOrderNo: "",
    remarks: `Posted sales invoice ${spec.invoiceNo}`,
    customerId: spec.customerId,
    customerName,
    customerLedgerId,
    customerMobile: DEMO_CUSTOMERS.find((c) => c.id === spec.customerId)?.mobile ?? "",
    customerEmail: DEMO_CUSTOMERS.find((c) => c.id === spec.customerId)?.email ?? "",
    customerGst: DEMO_CUSTOMERS.find((c) => c.id === spec.customerId)?.gstin ?? "",
    billingAddress: DEMO_CUSTOMERS.find((c) => c.id === spec.customerId)?.address ?? "",
    shippingAddress: DEMO_CUSTOMERS.find((c) => c.id === spec.customerId)?.address ?? "",
    receivableLedger: customerName,
    salesperson: "Rajesh Sharma",
    lineItems: [line],
    subtotal: spec.subtotal,
    discountTotal: 0,
    taxAmount: spec.taxAmount,
    grandTotal: spec.grandTotal,
    amountReceived: spec.amountReceived,
    balanceAmount: spec.grandTotal - spec.amountReceived - amountCredited,
    amountCredited,
    balanceCreditAllowed: spec.grandTotal - amountCredited,
    creditStatus: amountCredited > 0 ? ("partially_credited" as const) : ("no_credit" as const),
    soAdjustmentStatus: "open",
    invoiceStatus: "sent",
    paymentStatus:
      spec.amountReceived <= 0
        ? "unpaid"
        : spec.amountReceived >= spec.grandTotal
          ? "paid"
          : "partially_paid",
    collections,
    attachments: [],
    activity: [
      {
        at: `${spec.invoiceDate}T09:00:00.000Z`,
        action: "created",
        by: ACCOUNTS_CURRENT_USER,
        detail: `Posted sales invoice ${spec.invoiceNo}`,
      },
    ],
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: `${spec.invoiceDate}T09:00:00.000Z`,
    updatedAt: `${spec.invoiceDate}T09:00:00.000Z`,
  };
}

function buildPurchaseInvoice(
  spec: (typeof DEMO_PURCHASE_INVOICES)[number],
  vendorName: string,
  vendorGst: string,
): PurchaseInvoiceRecord {
  const lineItems = spec.lines.map((l, i) => {
    const lineAmount = Math.round(l.qty * l.rate * 100) / 100;
    const taxAmount = Math.round(lineAmount * l.taxPct) / 100;
    return {
      id: `pur-line-${spec.id}-${i}`,
      productId: null as null,
      productName: l.name,
      description: `GRN: ${spec.grnNo}`,
      invoiceQty: l.qty,
      unit: l.unit,
      unitPrice: l.rate,
      taxPct: l.taxPct,
      lineAmount,
      taxAmount,
      debitedQty: 0,
      debitedAmount: 0,
    };
  });
  const productAmount = lineItems.reduce((s, l) => s + l.lineAmount, 0);
  const taxAmount = lineItems.reduce((s, l) => s + l.taxAmount, 0);
  const grandTotal = productAmount + taxAmount;
  return {
    id: spec.id,
    invoiceNo: spec.invoiceNo,
    invoiceDate: spec.invoiceDate,
    vendorInvoiceNo: spec.vendorInvoiceNo,
    vendorId: spec.vendorId,
    vendorName,
    vendorGst,
    poId: null,
    poNumber: "",
    poDate: "",
    grnId: spec.grnId,
    grnNo: spec.grnNo,
    source: "po_invoice" as const,
    lineItems,
    additionalCharges: [],
    productAmount,
    subtotal: productAmount,
    taxAmount,
    grandTotal,
    amountPaid: spec.amountPaid,
    amountDebited: 0,
    balanceDebitAllowed: grandTotal,
    debitStatus: "no_debit" as const,
    poAdjustmentStatus: "open" as const,
    remarks: `GRN-linked purchase invoice — ${spec.grnNo}`,
    attachment: null,
    activity: [
      {
        date: spec.invoiceDate,
        action: "Invoice Created from GRN",
        by: ACCOUNTS_CURRENT_USER,
        remarks: spec.grnNo,
      },
    ],
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: `${spec.invoiceDate}T09:00:00.000Z`,
    updatedAt: `${spec.invoiceDate}T09:00:00.000Z`,
  };
}

function resolveBankLedger(): ChartOfAccount | null {
  return (
    findLedgerByName("HDFC Current Account (xxxx7890)") ??
    findLedgerByName("HDFC Current Account") ??
    findLedgerByName("HDFC Bank") ??
    resolveMappingLedger("bank_ledger", "HDFC Bank", { createIfMissing: true })
  );
}

function seedCustomerReceipt(
  customerName: string,
  amount: number,
  date: string,
  referenceNo: string,
  invoiceNo: string,
  voucherNumber?: string,
): void {
  if (amount <= 0) return;
  const customer = resolveMappingLedger("sales_receivable", customerName, { createIfMissing: true });
  const bank = resolveBankLedger();
  if (!customer?.id || !bank?.id) return;
  const voucher = createVoucher("receipt", {
    date,
    referenceNo,
    narration: `Customer receipt — ${customerName} (${invoiceNo})`,
    status: "posted",
    lines: [
      {
        id: 1,
        ledgerId: bank.id,
        ledgerName: bank.accountName,
        debit: amount,
        credit: 0,
        remarks: invoiceNo,
      },
      {
        id: 2,
        ledgerId: customer.id,
        ledgerName: customer.accountName,
        debit: 0,
        credit: amount,
        remarks: customerName,
      },
    ],
  });
  if (voucherNumber) {
    const list = loadVouchers();
    const idx = list.findIndex((v) => v.id === voucher.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], voucherNumber };
      saveVouchers(list);
    }
  }
}

function seedVendorPayment(
  vendorName: string,
  amount: number,
  date: string,
  referenceNo: string,
  billNo: string,
  voucherNumber?: string,
): void {
  if (amount <= 0) return;
  const vendor = resolveMappingLedger("purchase_payable", vendorName, { createIfMissing: true });
  const bank = resolveBankLedger();
  if (!vendor?.id || !bank?.id) return;
  const voucher = createVoucher("payment", {
    date,
    referenceNo,
    narration: `Supplier payment — ${vendorName} (${billNo})`,
    status: "posted",
    lines: [
      {
        id: 1,
        ledgerId: vendor.id,
        ledgerName: vendor.accountName,
        debit: amount,
        credit: 0,
        remarks: billNo,
      },
      {
        id: 2,
        ledgerId: bank.id,
        ledgerName: bank.accountName,
        debit: 0,
        credit: amount,
        remarks: vendorName,
      },
    ],
  });
  if (voucherNumber) {
    const list = loadVouchers();
    const idx = list.findIndex((v) => v.id === voucher.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], voucherNumber };
      saveVouchers(list);
    }
  }
}

function postAllTransactions(invoices: InvoiceRecord[]): void {
  saveVouchers([]);
  for (const inv of invoices) {
    maybePostSalesInvoice(inv);
  }

  seedCustomerReceipt("ABC Agro Distributor", 80000, "2026-04-20", "NEFT-ABC-001", "INV-2026-001", "RV-2026-001");
  seedCustomerReceipt("ABC Agro Distributor", 45000, "2026-05-15", "NEFT-ABC-002", "INV-2026-002", "RV-2026-002");
  seedCustomerReceipt("Krishna Retail Store", 118000, "2026-05-05", "NEFT-KRS-001", "INV-2026-006", "RV-2026-003");
  seedCustomerReceipt("Green Harvest Agro", 90000, "2026-05-18", "NEFT-GHA-001", "INV-2026-004", "RV-2026-004");
  seedCustomerReceipt("Yavatmal Cotton FPO", 50000, "2026-06-08", "NEFT-YCF-001", "INV-2026-008", "RV-2026-005");
  seedCustomerReceipt("Vidarbha Agro Mart", 60000, "2026-06-12", "NEFT-VAM-001", "INV-2026-011", "RV-2026-006");
}

function buildDemoCreditNotes(): CreditNoteRecord[] {
  return [
    {
      id: 1,
      creditNoteNo: "CN-2026-001",
      creditNoteDate: "2026-04-25",
      againstType: "sales_invoice",
      sourceInvoiceId: 1,
      sourceInvoiceNo: "INV-2026-001",
      sourceOrderId: null,
      sourceOrderNo: "",
      customerId: 1,
      customerName: "ABC Agro Distributor",
      receivableLedger: "ABC Agro Distributor",
      originalAmount: 150000,
      alreadyAdjustedAmount: 0,
      currentCreditAmount: 20000,
      balanceAfterAdjustment: 130000,
      taxCreditAmount: 3051,
      lineItems: [],
      reason: "Sales return",
      remarks: "Return of damaged bags — credit against INV-2026-001",
      status: "approved",
      activity: [
        {
          at: "2026-04-25T10:00:00.000Z",
          action: "approved",
          by: ACCOUNTS_CURRENT_USER,
          detail: "Credit note posted against INV-2026-001",
        },
      ],
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
      approvedBy: ACCOUNTS_CURRENT_USER,
      approvedAt: "2026-04-25T10:00:00.000Z",
      createdAt: "2026-04-25T09:00:00.000Z",
      updatedAt: "2026-04-25T10:00:00.000Z",
    },
    {
      id: 2,
      creditNoteNo: "CN-2026-002",
      creditNoteDate: "2026-06-01",
      againstType: "sales_invoice",
      sourceInvoiceId: 7,
      sourceInvoiceNo: "INV-2026-007",
      sourceOrderId: null,
      sourceOrderNo: "",
      customerId: 3,
      customerName: "Yavatmal Cotton FPO",
      receivableLedger: "Yavatmal Cotton FPO",
      originalAmount: 145000,
      alreadyAdjustedAmount: 0,
      currentCreditAmount: 15000,
      balanceAfterAdjustment: 130000,
      taxCreditAmount: 2288,
      lineItems: [],
      reason: "Rate difference",
      remarks: "Rate difference adjustment on bulk urea supply",
      status: "approved",
      activity: [
        {
          at: "2026-06-01T10:00:00.000Z",
          action: "approved",
          by: ACCOUNTS_CURRENT_USER,
          detail: "Credit note approved — pending invoice adjustment in receivables view",
        },
      ],
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
      approvedBy: ACCOUNTS_CURRENT_USER,
      approvedAt: "2026-06-01T10:00:00.000Z",
      createdAt: "2026-06-01T09:00:00.000Z",
      updatedAt: "2026-06-01T10:00:00.000Z",
    },
  ];
}

function ensureAutoPostingEnabled(): void {
  const settings = loadAccountingSettings();
  saveAccountingSettings({
    ...settings,
    autoPostSales: true,
    autoPostPurchase: true,
    autoPostHrClaims: true,
    requireVoucherApproval: false,
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function isAccountsDemoSeedCurrent(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(VERSION_KEY) === ACCOUNTS_DEMO_SEED_VERSION;
}

/** Idempotent demo bootstrap — 5 masters + 5 sales + 5 purchase invoices (all posted). */
export function seedAccountsDemoData(force = false): void {
  if (typeof window === "undefined") return;
  if (!force && localStorage.getItem(VERSION_KEY) === ACCOUNTS_DEMO_SEED_VERSION) return;

  try {
    ensureAutoPostingEnabled();
    seedDemoMasters();

    const customers = loadCustomers();
    const allDemoInvoiceSpecs: DemoSalesInvoiceSpec[] = [
      ...DEMO_SALES_INVOICES,
      ...CREDIT_LIMIT_DEMO_INVOICE_SPECS,
    ];
    const demoInvoiceIds = new Set<number>(
      allDemoInvoiceSpecs.map((spec) => spec.id),
    );
    const preservedInvoices = loadInvoices().filter((inv) => !demoInvoiceIds.has(inv.id));

    const invoices = allDemoInvoiceSpecs.map((spec) => {
      const customer = customers.find((c) => c.id === spec.customerId);
      const link = customer ? findErpPartyLink("customer_master", customer.id) : undefined;
      return buildSalesInvoice(
        spec,
        customer?.customerName ?? "Customer",
        link?.ledgerId ?? null,
      );
    });

    saveInvoices([...invoices, ...preservedInvoices]);
    const creditNotes = buildDemoCreditNotes();
    saveCreditNotes(creditNotes);
    saveDebitNotes([]);
    saveExpenses([]);

    postAllTransactions(invoices);

    for (const cn of creditNotes) {
      maybePostCreditNote(cn);
    }

    seedPayablesDemoData(
      (voucherNumber) => loadVouchers().find((v) => v.voucherNumber === voucherNumber)?.id,
    );

    seedReceivablesDemoData(
      (voucherNumber) => loadVouchers().find((v) => v.voucherNumber === voucherNumber)?.id,
      (invoiceNo) => invoices.find((i) => i.invoiceNo === invoiceNo)?.id,
    );
    assignDemoOpeningBalances();
    seedInventoryLedgersFromBatchRegister();
    seedDemoAccountingVouchers();
    seedBankingDemoData(true);
    seedAccountsDemoBankReconciliation(true);

    localStorage.setItem(VERSION_KEY, ACCOUNTS_DEMO_SEED_VERSION);
  } catch (err) {
    console.error("[accounts] demo seed failed:", err);
  }
}

export function resetAccountsDemoData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(VERSION_KEY);
  seedAccountsDemoData(true);
}
