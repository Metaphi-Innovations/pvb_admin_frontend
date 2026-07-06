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
import { buildCreditNotesSeed } from "@/app/(app)/accounts/credit-notes/credit-notes-seed";
import { saveDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { buildDebitNotesSeed } from "@/app/(app)/accounts/debit-notes/debit-notes-seed";
import { getExpensesSeedData, saveExpenses } from "@/app/(app)/accounts/expenses/expense-data";
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
import { resolveDefaultDemoBankLedger } from "@/lib/accounts/bank-ledger-resolver";
import { ensureFinancialYearsCurrent } from "@/app/(app)/accounts/masters/masters-data";
import type { CreditNoteRecord } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { findErpPartyLink } from "@/lib/accounts/erp-party-links";
import { COA_DEMO_LEDGER_SEEDS } from "@/app/(app)/accounts/masters/coa-demo-ledgers";
import {
  applyRelativeInvoiceDates,
  applyRelativePurchaseDates,
  demoDateAt,
  demoDocNo,
  demoFinancialYearStart,
  demoTimestamp,
} from "@/lib/accounts/demo-date-utils";

export const ACCOUNTS_DEMO_SEED_VERSION = "relative-dates-v4";
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

const DEMO_SALES_INVOICES_RAW: DemoSalesInvoiceSpec[] = [
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

function getDemoSalesInvoices(): DemoSalesInvoiceSpec[] {
  return applyRelativeInvoiceDates(DEMO_SALES_INVOICES_RAW, 0, "INV", new Date(), 3);
}

/** Purchase invoices linked to the demo GRNs (GRN-001 to GRN-005) */
const DEMO_PURCHASE_INVOICES_RAW: Array<{
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

function getDemoPurchaseInvoices() {
  return applyRelativePurchaseDates(DEMO_PURCHASE_INVOICES_RAW, 12, new Date(), 3);
}

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

function batchEnsureCoaDemoLedgers(): void {
  const records = loadChartOfAccounts();
  const existingNames = new Set(
    records
      .filter((r) => r.nodeLevel === "ledger")
      .map((r) => r.accountName.trim().toLowerCase()),
  );
  const subGroupByName = new Map(
    records
      .filter((r) => r.nodeLevel === "account_group")
      .map((r) => [r.accountName.trim().toLowerCase(), r]),
  );

  const ledgerIds = records.filter((r) => r.nodeLevel === "ledger").map((r) => r.id);
  let nextLedgerId = ledgerIds.length ? Math.max(...ledgerIds) + 1 : 101;

  const codeNums = records
    .filter((r) => r.nodeLevel === "ledger")
    .map((r) => {
      const m = r.accountCode.match(/LED-(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  let nextCodeNum = codeNums.length ? Math.max(...codeNums) + 1 : 1;

  const additions: ChartOfAccount[] = [];

  for (const entry of COA_DEMO_LEDGER_SEEDS) {
    const ledgerKey = entry.name.trim().toLowerCase();
    if (existingNames.has(ledgerKey)) continue;

    const parent = subGroupByName.get(entry.subGroup.trim().toLowerCase());
    if (!parent) continue;

    const balanceType =
      entry.accountType === "Liability" || entry.accountType === "Income" ? "Credit" : "Debit";

    additions.push({
      id: nextLedgerId++,
      accountCode: `LED-${String(nextCodeNum++).padStart(3, "0")}`,
      accountName: entry.name,
      alias: "",
      accountType: entry.accountType,
      nodeLevel: "ledger",
      parentAccountId: parent.id,
      parentAccount: parent.accountName,
      description: "",
      status: "active",
      usedIn: [],
      isSystem: false,
      openingBalance: 0,
      balanceType,
      gstApplicable: false,
      tdsApplicable: false,
      costCenterApplicable: false,
      bankAccountFlag: false,
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
    });
    existingNames.add(ledgerKey);
  }

  if (additions.length > 0) {
    saveChartOfAccounts([...records, ...additions]);
  }
}

function batchSetCustomerOpeningBalances(
  specs: Array<{ ledgerId: number; amount: number }>,
): void {
  if (specs.length === 0) return;
  const records = loadChartOfAccounts();
  const byId = new Map(specs.map((s) => [s.ledgerId, s.amount]));
  let changed = false;
  const next = records.map((r) => {
    const amount = byId.get(r.id);
    if (amount == null || amount <= 0) return r;
    changed = true;
    return { ...r, openingBalance: amount, balanceType: "Debit" as const };
  });
  if (changed) saveChartOfAccounts(next);
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

  batchEnsureCoaDemoLedgers();

  const customerOpeningBalances: Array<{ ledgerId: number; amount: number }> = [];
  for (const spec of DEMO_CUSTOMERS) {
    const customer = loadCustomers().find((c) => c.id === spec.id);
    if (!customer) continue;
    const ledger = syncCustomerLedger(customer);
    if (ledger && spec.openingBalance > 0) {
      customerOpeningBalances.push({ ledgerId: ledger.id, amount: spec.openingBalance });
    }
  }
  batchSetCustomerOpeningBalances(customerOpeningBalances);
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
  spec: ReturnType<typeof getDemoPurchaseInvoices>[number],
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
  return resolveDefaultDemoBankLedger();
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

  const receiptSpecs = [
    { customer: "ABC Agro Distributor", amount: 80000, invoiceId: 1, ref: "NEFT-ABC-001", rvSeq: 1 },
    { customer: "ABC Agro Distributor", amount: 45000, invoiceId: 2, ref: "NEFT-ABC-002", rvSeq: 2 },
    { customer: "Krishna Retail Store", amount: 118000, invoiceId: 6, ref: "NEFT-KRS-001", rvSeq: 3 },
    { customer: "Green Harvest Agro", amount: 90000, invoiceId: 4, ref: "NEFT-GHA-001", rvSeq: 4 },
    { customer: "Yavatmal Cotton FPO", amount: 50000, invoiceId: 8, ref: "NEFT-YCF-001", rvSeq: 5 },
    { customer: "Vidarbha Agro Mart", amount: 60000, invoiceId: 11, ref: "NEFT-VAM-001", rvSeq: 6 },
  ];
  for (const spec of receiptSpecs) {
    const inv = invoices.find((i) => i.id === spec.invoiceId);
    if (!inv) continue;
    seedCustomerReceipt(
      spec.customer,
      spec.amount,
      inv.invoiceDate,
      spec.ref,
      inv.invoiceNo,
      demoDocNo("RV", spec.rvSeq),
    );
  }
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

const CORE_SEED_KEY = "ds_accounts_core_seed";
const CORE_SEED_VERSION = "relative-dates-v4";
const COA_SECTION_KEY = "ds_accounts_coa_section_seed";
const TX_SECTION_KEY = "ds_accounts_transactions_section_seed";
const REPORTS_SECTION_KEY = "ds_accounts_reports_section_seed";

/** Shared masters, FY, and COA demo ledgers — idempotent across sections. */
export function ensureAccountsCoreDemoData(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(CORE_SEED_KEY) === CORE_SEED_VERSION) return;
  try {
    ensureFinancialYearsCurrent();
    ensureAutoPostingEnabled();
    seedDemoMasters();
    localStorage.setItem(CORE_SEED_KEY, CORE_SEED_VERSION);
  } catch (err) {
    console.error("[accounts] core demo seed failed:", err);
  }
}

/** Chart of Accounts section — masters and FY only (COA tree loads in CoaNavigationProvider). */
export function seedCoaSectionDemoData(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(COA_SECTION_KEY) === ACCOUNTS_DEMO_SEED_VERSION) return;
  try {
    ensureAccountsCoreDemoData();
    localStorage.setItem(COA_SECTION_KEY, ACCOUNTS_DEMO_SEED_VERSION);
  } catch (err) {
    console.error("[accounts] COA section seed failed:", err);
  }
}

function seedTransactionsDemoRecords(): InvoiceRecord[] {
  ensureAccountsCoreDemoData();

  const customers = loadCustomers();
  const allDemoInvoiceSpecs: DemoSalesInvoiceSpec[] = [
    ...getDemoSalesInvoices(),
    ...CREDIT_LIMIT_DEMO_INVOICE_SPECS,
  ];
  const demoInvoiceIds = new Set<number>(allDemoInvoiceSpecs.map((spec) => spec.id));
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
  const creditNotes = buildCreditNotesSeed();
  saveCreditNotes(creditNotes);
  saveDebitNotes(buildDebitNotesSeed());
  saveExpenses(getExpensesSeedData());

  postAllTransactions(invoices);

  for (const cn of creditNotes) {
    maybePostCreditNote(cn);
  }

  return invoices;
}

/** Transactions section — sales/purchase docs, credit/debit notes, expenses, vouchers. */
export function seedTransactionsSectionDemoData(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(TX_SECTION_KEY) === ACCOUNTS_DEMO_SEED_VERSION) return;
  try {
    seedTransactionsDemoRecords();
    localStorage.setItem(TX_SECTION_KEY, ACCOUNTS_DEMO_SEED_VERSION);
  } catch (err) {
    console.error("[accounts] transactions section seed failed:", err);
  }
}

/** Reports section — opening balances, inventory ledgers, demo accounting vouchers. */
export function seedReportsSectionDemoData(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(REPORTS_SECTION_KEY) === ACCOUNTS_DEMO_SEED_VERSION) return;
  try {
    ensureAccountsCoreDemoData();
    assignDemoOpeningBalances();
    seedInventoryLedgersFromBatchRegister();
    seedDemoAccountingVouchers();
    localStorage.setItem(REPORTS_SECTION_KEY, ACCOUNTS_DEMO_SEED_VERSION);
  } catch (err) {
    console.error("[accounts] reports section seed failed:", err);
  }
}

export function isAccountsDemoSeedCurrent(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(VERSION_KEY) === ACCOUNTS_DEMO_SEED_VERSION;
}

/** Full demo bootstrap — used by reset and cross-module callers (e.g. Sales Order form). */
export function seedAccountsDemoData(force = false): void {
  if (typeof window === "undefined") return;
  if (!force && localStorage.getItem(VERSION_KEY) === ACCOUNTS_DEMO_SEED_VERSION) return;

  try {
    const invoices = seedTransactionsDemoRecords();

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
    localStorage.setItem(COA_SECTION_KEY, ACCOUNTS_DEMO_SEED_VERSION);
    localStorage.setItem(TX_SECTION_KEY, ACCOUNTS_DEMO_SEED_VERSION);
    localStorage.setItem(REPORTS_SECTION_KEY, ACCOUNTS_DEMO_SEED_VERSION);
  } catch (err) {
    console.error("[accounts] demo seed failed:", err);
  }
}

export function resetAccountsDemoData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(VERSION_KEY);
  localStorage.removeItem(CORE_SEED_KEY);
  localStorage.removeItem(COA_SECTION_KEY);
  localStorage.removeItem(TX_SECTION_KEY);
  localStorage.removeItem(REPORTS_SECTION_KEY);
  void import("./accounts-section-seed").then((m) => m.resetAccountsSectionBootstrapCache());
  seedAccountsDemoData(true);
}
