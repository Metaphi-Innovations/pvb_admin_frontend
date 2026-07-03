/**
 * Payables demo seed — agro/fertilizer vendors, purchase bills, payments,
 * debit notes, vendor credit notes, and payment allocations.
 */

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  loadVendors,
  saveVendors,
  emptyAddress,
  VENDOR_TYPE_GOODS,
  type Vendor,
} from "@/app/(app)/masters/vendors/vendor-data";
import {
  savePurchaseInvoices,
  type PurchaseInvoiceRecord,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { saveDebitNotes, type DebitNoteRecord } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { loadVouchers, saveVouchers, createVoucher } from "@/app/(app)/accounts/vouchers/voucher-data";
import { syncVendorLedger } from "@/lib/accounts/erp-accounting-mapping";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { maybePostPurchaseInvoice, maybePostDebitNote } from "@/lib/accounts/document-posting-bridge";
import {
  seedPaymentAllocations,
  seedVendorCreditNotes,
  saveVendorPayablesMeta,
  type PayablesVendorMeta,
  type VendorCreditNoteRecord,
} from "@/lib/accounts/payables-data";
import { resolveMappingLedger } from "@/lib/accounts/ledger-mappings";
import {
  applyRelativeInvoiceDates,
  demoDateAt,
  demoDocNo,
  demoFinancialYearStart,
  demoTimestamp,
} from "@/lib/accounts/demo-date-utils";

// ── Demo vendor specs ────────────────────────────────────────────────────────

export const PAYABLES_DEMO_VENDORS: Array<{
  id: number;
  vendorCode: string;
  vendorName: string;
  mobile: string;
  email: string;
  gstin: string;
  address: string;
  openingBalance: number;
  creditDays: number;
  territory: string;
  branch: string;
  purchaseManager: string;
}> = [
  {
    id: 1,
    vendorCode: "VEN-RAL-001",
    vendorName: "Rallis India Ltd",
    mobile: "9876501001",
    email: "accounts@rallis.in",
    gstin: "27AAACR5055K1Z8",
    address: "Rallis House, 156 MG Road, Pune, Maharashtra 411001",
    openingBalance: 0,
    creditDays: 30,
    territory: "Western Maharashtra",
    branch: "Pune HO",
    purchaseManager: "Rajesh Sharma",
  },
  {
    id: 2,
    vendorCode: "VEN-COR-002",
    vendorName: "Coromandel International",
    mobile: "9876501002",
    email: "ap@coromandel.biz",
    gstin: "33AAACC4146G1ZP",
    address: "Coromandel Tower, Chennai, Tamil Nadu 600006",
    openingBalance: 0,
    creditDays: 45,
    territory: "South India",
    branch: "Chennai",
    purchaseManager: "Priya Singh",
  },
  {
    id: 3,
    vendorCode: "VEN-UPL-003",
    vendorName: "UPL Limited",
    mobile: "9876501003",
    email: "vendor.billing@upl-ltd.com",
    gstin: "27AAACU0564G1Z5",
    address: "UPL House, Bandra Kurla Complex, Mumbai, Maharashtra 400051",
    openingBalance: 0,
    creditDays: 30,
    territory: "Mumbai Region",
    branch: "Mumbai",
    purchaseManager: "Amit Verma",
  },
  {
    id: 4,
    vendorCode: "VEN-BAY-004",
    vendorName: "Bayer CropScience",
    mobile: "9876501004",
    email: "accounts.india@bayer.com",
    gstin: "29AABCB1518L1Z6",
    address: "Bayer House, HSR Layout, Bengaluru, Karnataka 560102",
    openingBalance: 0,
    creditDays: 30,
    territory: "Karnataka",
    branch: "Bengaluru",
    purchaseManager: "Neha Patel",
  },
  {
    id: 5,
    vendorCode: "VEN-IFF-005",
    vendorName: "IFFCO",
    mobile: "9876501005",
    email: "accounts@iffco.in",
    gstin: "07AAACI1685G1ZN",
    address: "IFFCO Sadan, C-1 District Centre, New Delhi 110024",
    openingBalance: 0,
    creditDays: 60,
    territory: "North India",
    branch: "Delhi",
    purchaseManager: "Suresh Kumar",
  },
  {
    id: 6,
    vendorCode: "VEN-CHA-006",
    vendorName: "Chambal Fertilisers",
    mobile: "9876501006",
    email: "billing@chambalfert.com",
    gstin: "08AAACC1206D1Z7",
    address: "Chambal Bhawan, Kota, Rajasthan 324007",
    openingBalance: 0,
    creditDays: 30,
    territory: "Rajasthan",
    branch: "Kota",
    purchaseManager: "Rajesh Sharma",
  },
  {
    id: 7,
    vendorCode: "VEN-DEE-007",
    vendorName: "Deepak Fertilisers",
    mobile: "9876501007",
    email: "ap@deepakfert.com",
    gstin: "27AAACD1234E1Z3",
    address: "Deepak House, Pune, Maharashtra 411005",
    openingBalance: 0,
    creditDays: 30,
    territory: "Western Maharashtra",
    branch: "Pune",
    purchaseManager: "Priya Singh",
  },
  {
    id: 8,
    vendorCode: "VEN-SYN-008",
    vendorName: "Syngenta India",
    mobile: "9876501008",
    email: "finance@syngenta.com",
    gstin: "27AABCS1234F1Z9",
    address: "Syngenta House, Hinjewadi, Pune, Maharashtra 411057",
    openingBalance: 0,
    creditDays: 30,
    territory: "Western Maharashtra",
    branch: "Pune",
    purchaseManager: "Amit Verma",
  },
];

/** 25 purchase bills — mix of paid, pending, partial, and overdue */
export const PAYABLES_DEMO_BILLS_RAW: Array<{
  id: number;
  invoiceNo: string;
  vendorId: number;
  invoiceDate: string;
  dueDate: string;
  grandTotal: number;
  amountPaid: number;
  amountDebited: number;
  vendorInvoiceNo: string;
  productName: string;
}> = [
  // Rallis — Partially Paid, ₹4.5L purchase, ₹2L paid, ₹2.5L outstanding, ₹75k overdue
  {
    id: 101,
    invoiceNo: "PUR-2026-101",
    vendorId: 1,
    invoiceDate: "2026-03-15",
    dueDate: "2026-04-14",
    grandTotal: 250000,
    amountPaid: 175000,
    amountDebited: 0,
    vendorInvoiceNo: "RAL/26/INV-401",
    productName: "Rallis Herbicide 500ml",
  },
  {
    id: 102,
    invoiceNo: "PUR-2026-102",
    vendorId: 1,
    invoiceDate: "2026-05-25",
    dueDate: "2026-06-24",
    grandTotal: 200000,
    amountPaid: 25000,
    amountDebited: 0,
    vendorInvoiceNo: "RAL/26/INV-512",
    productName: "Rallis Fungicide WP",
  },
  // Coromandel — Unpaid ₹2.8L
  {
    id: 103,
    invoiceNo: "PUR-2026-103",
    vendorId: 2,
    invoiceDate: "2026-05-18",
    dueDate: "2026-07-02",
    grandTotal: 280000,
    amountPaid: 0,
    amountDebited: 0,
    vendorInvoiceNo: "COR/INV/2026/088",
    productName: "Gromor NPK 12:32:16",
  },
  // UPL — Paid ₹3.1L
  {
    id: 104,
    invoiceNo: "PUR-2026-104",
    vendorId: 3,
    invoiceDate: "2026-04-08",
    dueDate: "2026-05-08",
    grandTotal: 310000,
    amountPaid: 310000,
    amountDebited: 0,
    vendorInvoiceNo: "UPL/26/INV-2201",
    productName: "UPL Saaf Fungicide",
  },
  // Bayer — Unpaid
  {
    id: 105,
    invoiceNo: "PUR-2026-105",
    vendorId: 4,
    invoiceDate: "2026-05-22",
    dueDate: "2026-06-21",
    grandTotal: 185000,
    amountPaid: 0,
    amountDebited: 0,
    vendorInvoiceNo: "BAY/INV/26/334",
    productName: "Bayer Confidor",
  },
  // IFFCO — Partially Paid ₹5.2L purchase, ₹1.5L paid, ₹3.7L outstanding
  {
    id: 106,
    invoiceNo: "PUR-2026-106",
    vendorId: 5,
    invoiceDate: "2026-02-20",
    dueDate: "2026-04-20",
    grandTotal: 320000,
    amountPaid: 100000,
    amountDebited: 15000,
    vendorInvoiceNo: "IFFCO/26/INV-901",
    productName: "IFFCO DAP 50kg",
  },
  {
    id: 107,
    invoiceNo: "PUR-2026-107",
    vendorId: 5,
    invoiceDate: "2026-04-25",
    dueDate: "2026-06-24",
    grandTotal: 200000,
    amountPaid: 50000,
    amountDebited: 0,
    vendorInvoiceNo: "IFFCO/26/INV-945",
    productName: "IFFCO Urea 45kg",
  },
  // Chambal — Partially Paid
  {
    id: 108,
    invoiceNo: "PUR-2026-108",
    vendorId: 6,
    invoiceDate: "2026-05-05",
    dueDate: "2026-06-04",
    grandTotal: 165000,
    amountPaid: 65000,
    amountDebited: 0,
    vendorInvoiceNo: "CHF/26/INV-112",
    productName: "Chambal Urea 50kg",
  },
  // Deepak — Paid
  {
    id: 109,
    invoiceNo: "PUR-2026-109",
    vendorId: 7,
    invoiceDate: "2026-04-15",
    dueDate: "2026-05-15",
    grandTotal: 142000,
    amountPaid: 142000,
    amountDebited: 0,
    vendorInvoiceNo: "DFP/26/INV-077",
    productName: "Deepak NPK 15:15:15",
  },
  // Syngenta — Overdue Unpaid
  {
    id: 110,
    invoiceNo: "PUR-2026-110",
    vendorId: 8,
    invoiceDate: "2026-03-28",
    dueDate: "2026-04-27",
    grandTotal: 198000,
    amountPaid: 0,
    amountDebited: 0,
    vendorInvoiceNo: "SYN/26/INV-201",
    productName: "Syngenta Polo Insecticide",
  },
  // Additional bills for mix
  {
    id: 111,
    invoiceNo: "PUR-2026-111",
    vendorId: 4,
    invoiceDate: "2026-03-10",
    dueDate: "2026-04-09",
    grandTotal: 95000,
    amountPaid: 0,
    amountDebited: 0,
    vendorInvoiceNo: "BAY/INV/26/201",
    productName: "Bayer Nativo",
  },
  {
    id: 112,
    invoiceNo: "PUR-2026-112",
    vendorId: 6,
    invoiceDate: "2026-02-15",
    dueDate: "2026-03-17",
    grandTotal: 120000,
    amountPaid: 40000,
    amountDebited: 10000,
    vendorInvoiceNo: "CHF/26/INV-089",
    productName: "Chambal MOP 50kg",
  },
  // Rallis — additional overdue bill
  {
    id: 113,
    invoiceNo: "PUR-2026-113",
    vendorId: 1,
    invoiceDate: "2026-01-20",
    dueDate: "2026-02-19",
    grandTotal: 85000,
    amountPaid: 0,
    amountDebited: 0,
    vendorInvoiceNo: "RAL/26/INV-298",
    productName: "Rallis Pesticide Combo",
  },
  // Coromandel — partial
  {
    id: 114,
    invoiceNo: "PUR-2026-114",
    vendorId: 2,
    invoiceDate: "2026-04-10",
    dueDate: "2026-05-25",
    grandTotal: 195000,
    amountPaid: 95000,
    amountDebited: 0,
    vendorInvoiceNo: "COR/INV/2026/102",
    productName: "Gromor SSP 50kg",
  },
  // UPL — partial overdue
  {
    id: 115,
    invoiceNo: "PUR-2026-115",
    vendorId: 3,
    invoiceDate: "2026-03-05",
    dueDate: "2026-04-04",
    grandTotal: 168000,
    amountPaid: 68000,
    amountDebited: 0,
    vendorInvoiceNo: "UPL/26/INV-2188",
    productName: "UPL Zeba Soil Conditioner",
  },
  // Bayer — partial
  {
    id: 116,
    invoiceNo: "PUR-2026-116",
    vendorId: 4,
    invoiceDate: "2026-04-18",
    dueDate: "2026-05-18",
    grandTotal: 142500,
    amountPaid: 42500,
    amountDebited: 0,
    vendorInvoiceNo: "BAY/INV/26/378",
    productName: "Bayer Luna Experience",
  },
  // IFFCO — unpaid
  {
    id: 117,
    invoiceNo: "PUR-2026-117",
    vendorId: 5,
    invoiceDate: "2026-05-12",
    dueDate: "2026-07-11",
    grandTotal: 245000,
    amountPaid: 0,
    amountDebited: 0,
    vendorInvoiceNo: "IFFCO/26/INV-978",
    productName: "IFFCO NPK 20:20:0",
  },
  // Chambal — overdue unpaid
  {
    id: 118,
    invoiceNo: "PUR-2026-118",
    vendorId: 6,
    invoiceDate: "2026-01-28",
    dueDate: "2026-02-27",
    grandTotal: 98000,
    amountPaid: 0,
    amountDebited: 0,
    vendorInvoiceNo: "CHF/26/INV-065",
    productName: "Chambal DAP 50kg",
  },
  // Deepak — partial
  {
    id: 119,
    invoiceNo: "PUR-2026-119",
    vendorId: 7,
    invoiceDate: "2026-05-08",
    dueDate: "2026-06-07",
    grandTotal: 132000,
    amountPaid: 52000,
    amountDebited: 0,
    vendorInvoiceNo: "DFP/26/INV-091",
    productName: "Deepak CAN 25kg",
  },
  // Syngenta — partial overdue
  {
    id: 120,
    invoiceNo: "PUR-2026-120",
    vendorId: 8,
    invoiceDate: "2026-02-08",
    dueDate: "2026-03-10",
    grandTotal: 176000,
    amountPaid: 56000,
    amountDebited: 0,
    vendorInvoiceNo: "SYN/26/INV-178",
    productName: "Syngenta Ampligo",
  },
  // Rallis — pending
  {
    id: 121,
    invoiceNo: "PUR-2026-121",
    vendorId: 1,
    invoiceDate: "2026-06-01",
    dueDate: "2026-07-01",
    grandTotal: 112000,
    amountPaid: 0,
    amountDebited: 0,
    vendorInvoiceNo: "RAL/26/INV-601",
    productName: "Rallis Bio Fertilizer",
  },
  // Coromandel — overdue
  {
    id: 122,
    invoiceNo: "PUR-2026-122",
    vendorId: 2,
    invoiceDate: "2026-02-25",
    dueDate: "2026-04-11",
    grandTotal: 158000,
    amountPaid: 0,
    amountDebited: 0,
    vendorInvoiceNo: "COR/INV/2026/055",
    productName: "Gromor Zinc Sulphate",
  },
  // UPL — paid
  {
    id: 123,
    invoiceNo: "PUR-2026-123",
    vendorId: 3,
    invoiceDate: "2026-05-15",
    dueDate: "2026-06-14",
    grandTotal: 89000,
    amountPaid: 89000,
    amountDebited: 0,
    vendorInvoiceNo: "UPL/26/INV-2290",
    productName: "UPL Proclaim",
  },
  // Bayer — overdue
  {
    id: 124,
    invoiceNo: "PUR-2026-124",
    vendorId: 4,
    invoiceDate: "2026-01-15",
    dueDate: "2026-02-14",
    grandTotal: 128000,
    amountPaid: 28000,
    amountDebited: 0,
    vendorInvoiceNo: "BAY/INV/26/155",
    productName: "Bayer Alion Herbicide",
  },
  // IFFCO — partial long overdue
  {
    id: 125,
    invoiceNo: "PUR-2026-125",
    vendorId: 5,
    invoiceDate: "2025-12-10",
    dueDate: "2026-02-08",
    grandTotal: 215000,
    amountPaid: 65000,
    amountDebited: 0,
    vendorInvoiceNo: "IFFCO/25/INV-812",
    productName: "IFFCO Muriate of Potash",
  },
];

function getPayablesDemoBills() {
  return applyRelativeInvoiceDates(PAYABLES_DEMO_BILLS_RAW, 5, "PUR", new Date(), 3);
}

function vendorTemplate(): Vendor {
  return {
    id: 1,
    vendorCode: "VEN-001",
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
    billingAddress: emptyAddress(),
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
    createdDate: demoFinancialYearStart(),
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedDate: demoFinancialYearStart(),
  };
}

function patchPayablesVendor(base: Vendor, spec: (typeof PAYABLES_DEMO_VENDORS)[number]): Vendor {
  const parts = spec.address.split(",");
  const city = parts[parts.length - 2]?.trim() || "Pune";
  const statePin = parts[parts.length - 1]?.trim() || "Maharashtra 411001";
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
    paymentTerms: `net-${spec.creditDays}`,
    creditPeriodValue: String(spec.creditDays),
    creditPeriodUnit: "days",
    billingAddress: {
      line1: parts[0]?.trim() || spec.address,
      line2: parts.slice(1, -2).join(", ").trim(),
      city,
      state: state || "Maharashtra",
      country: "India",
      pincode: pincode || "411001",
    },
    status: "active",
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedDate: new Date().toISOString().slice(0, 10),
  };
}

function buildPurchaseBill(
  spec: ReturnType<typeof getPayablesDemoBills>[number],
  vendorName: string,
  vendorGst: string,
): PurchaseInvoiceRecord {
  const taxable = round2(spec.grandTotal / 1.18);
  const taxAmount = round2(spec.grandTotal - taxable);
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
    grnId: `demo-grn-${spec.id}`,
    grnNo: `GRN-${String(spec.id).slice(-3)}`,
    source: "po_invoice",
    lineItems: [
      {
        id: `pur-line-${spec.id}`,
        productId: null,
        productName: spec.productName,
        description: `Demo purchase — ${spec.productName}`,
        invoiceQty: 100,
        unit: "BAG",
        unitPrice: round2(taxable / 100),
        taxPct: 18,
        lineAmount: taxable,
        taxAmount,
        debitedQty: 0,
        debitedAmount: spec.amountDebited,
      },
    ],
    additionalCharges: [],
    productAmount: taxable,
    subtotal: taxable,
    taxAmount,
    grandTotal: spec.grandTotal,
    amountPaid: spec.amountPaid,
    amountDebited: spec.amountDebited,
    balanceDebitAllowed: round2(spec.grandTotal - spec.amountDebited),
    debitStatus: spec.amountDebited > 0 ? "partially_debited" : "no_debit",
    poAdjustmentStatus: "open",
    remarks: `Posted purchase bill — ${spec.invoiceNo}`,
    attachment: null,
    activity: [
      {
        date: spec.invoiceDate,
        action: "Invoice Posted",
        by: ACCOUNTS_CURRENT_USER,
        remarks: spec.vendorInvoiceNo,
      },
    ],
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: `${spec.invoiceDate}T09:00:00.000Z`,
    updatedAt: `${spec.invoiceDate}T09:00:00.000Z`,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function findBankLedger() {
  const records = loadChartOfAccounts();
  return (
    records.find((r) => r.bankAccountFlag && r.accountName.includes("HDFC")) ??
    records.find((r) => r.bankAccountFlag) ??
    resolveMappingLedger("bank_ledger", "HDFC Bank", { createIfMissing: true })
  );
}

function seedVendorPayment(
  vendorName: string,
  amount: number,
  date: string,
  referenceNo: string,
  billNo: string,
  voucherNumber: string,
): number {
  if (amount <= 0) return 0;
  const vendor = resolveMappingLedger("purchase_payable", vendorName, { createIfMissing: true });
  const bank = findBankLedger();
  if (!vendor?.id || !bank?.id) return 0;
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
  const list = loadVouchers();
  const idx = list.findIndex((v) => v.id === voucher.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], voucherNumber };
    saveVouchers(list);
  }
  return voucher.id;
}

function buildDebitNotes(ref = new Date()): DebitNoteRecord[] {
  const bills = getPayablesDemoBills();
  const bill106 = bills.find((b) => b.id === 106);
  const bill112 = bills.find((b) => b.id === 112);
  const dnDate1 = demoDateAt(12, ref);
  const dnDate2 = demoDateAt(35, ref);
  return [
    {
      id: 101,
      debitNoteNo: demoDocNo("DN", 101, ref, 3),
      debitNoteDate: dnDate1,
      againstType: "purchase_invoice",
      sourceInvoiceId: 106,
      sourceInvoiceNo: bill106?.invoiceNo ?? demoDocNo("PUR", 106, ref, 3),
      sourcePoId: null,
      sourcePoNo: "",
      sourceGrnNo: "GRN-106",
      sourceQcNo: "",
      vendorId: 5,
      vendorName: "IFFCO",
      originalAmount: 320000,
      alreadyAdjustedAmount: 0,
      taxableAmount: 12712,
      gstAmount: 2288,
      cgstAmount: 1144,
      sgstAmount: 1144,
      igstAmount: 0,
      source: "purchase_return",
      sourceReturnNo: "PRET-DEMO-106",
      currentDebitAmount: 15000,
      balanceAfterAdjustment: 305000,
      standaloneDebitAmount: 0,
      lineItems: [],
      reason: "Short Supply",
      remarks: `Short delivery on IFFCO DAP — debit note against ${bill106?.invoiceNo ?? "PUR-106"}`,
      attachments: [],
      status: "approved",
      activity: [
        {
          at: demoTimestamp(dnDate1, "10:00:00"),
          action: "approved",
          by: ACCOUNTS_CURRENT_USER,
          detail: "Debit note posted — reduces vendor payable",
        },
      ],
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
      approvedBy: ACCOUNTS_CURRENT_USER,
      approvedAt: demoTimestamp(dnDate1, "10:00:00"),
      createdAt: demoTimestamp(dnDate1, "09:00:00"),
      updatedAt: demoTimestamp(dnDate1, "10:00:00"),
    },
    {
      id: 102,
      debitNoteNo: demoDocNo("DN", 102, ref, 3),
      debitNoteDate: dnDate2,
      againstType: "purchase_invoice",
      sourceInvoiceId: 112,
      sourceInvoiceNo: bill112?.invoiceNo ?? demoDocNo("PUR", 112, ref, 3),
      sourcePoId: null,
      sourcePoNo: "",
      sourceGrnNo: "GRN-112",
      sourceQcNo: "",
      vendorId: 6,
      vendorName: "Chambal Fertilisers",
      originalAmount: 120000,
      alreadyAdjustedAmount: 0,
      taxableAmount: 8475,
      gstAmount: 1525,
      cgstAmount: 762.5,
      sgstAmount: 762.5,
      igstAmount: 0,
      source: "purchase_return",
      sourceReturnNo: "PRET-DEMO-112",
      currentDebitAmount: 10000,
      balanceAfterAdjustment: 110000,
      standaloneDebitAmount: 0,
      lineItems: [],
      reason: "Damaged Goods",
      remarks: "Damaged bags on Chambal MOP delivery",
      attachments: [],
      status: "approved",
      activity: [
        {
          at: demoTimestamp(dnDate2, "10:00:00"),
          action: "approved",
          by: ACCOUNTS_CURRENT_USER,
          detail: "Debit note posted",
        },
      ],
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
      approvedBy: ACCOUNTS_CURRENT_USER,
      approvedAt: demoTimestamp(dnDate2, "10:00:00"),
      createdAt: demoTimestamp(dnDate2, "09:00:00"),
      updatedAt: demoTimestamp(dnDate2, "10:00:00"),
    },
  ];
}

function buildVendorCreditNotes(ref = new Date()): VendorCreditNoteRecord[] {
  const bills = getPayablesDemoBills();
  const bill103 = bills.find((b) => b.id === 103);
  return [
    {
      id: 1,
      creditNoteNo: demoDocNo("VCN", 1, ref, 3),
      creditNoteDate: demoDateAt(4, ref),
      vendorId: 2,
      vendorName: "Coromandel International",
      sourceBillId: 103,
      sourceBillNo: bill103?.invoiceNo ?? demoDocNo("PUR", 103, ref, 3),
      amount: 12000,
      reason: "Freight surcharge",
      status: "approved",
    },
    {
      id: 2,
      creditNoteNo: demoDocNo("VCN", 2, ref, 3),
      creditNoteDate: demoDateAt(1, ref),
      vendorId: 4,
      vendorName: "Bayer CropScience",
      sourceBillId: null,
      sourceBillNo: "",
      amount: 8500,
      reason: "Rate revision — additional billing",
      status: "approved",
    },
  ];
}

const PAYABLES_PAYMENT_SPECS = [
  { vendorName: "Rallis India Ltd", amount: 175000, dateIndex: 9, refNo: "NEFT-RAL-001", billId: 101, pvSeq: 1, allocAmount: 175000 },
  { vendorName: "Rallis India Ltd", amount: 25000, dateIndex: 4, refNo: "NEFT-RAL-002", billId: 102, pvSeq: 2, allocAmount: 25000 },
  { vendorName: "UPL Limited", amount: 310000, dateIndex: 8, refNo: "NEFT-UPL-001", billId: 104, pvSeq: 3, allocAmount: 310000 },
  { vendorName: "IFFCO", amount: 100000, dateIndex: 6, refNo: "NEFT-IFF-001", billId: 106, pvSeq: 4, allocAmount: 100000 },
  { vendorName: "IFFCO", amount: 50000, dateIndex: 4, refNo: "NEFT-IFF-002", billId: 107, pvSeq: 5, allocAmount: 30000 },
  { vendorName: "Coromandel International", amount: 95000, dateIndex: 2, refNo: "NEFT-COR-001", billId: 103, pvSeq: 6 },
  { vendorName: "Chambal Fertilisers", amount: 65000, dateIndex: 5, refNo: "NEFT-CHF-001", billId: 108, pvSeq: 7, allocAmount: 65000 },
  { vendorName: "Coromandel International", amount: 95000, dateIndex: 1, refNo: "NEFT-COR-002", billId: 114, pvSeq: 8, allocAmount: 45000 },
] as const;

function seedPayablesPaymentVouchers(
  ref = new Date(),
  resolveVoucherId?: (voucherNumber: string) => number | undefined,
): void {
  const bills = getPayablesDemoBills();
  const billNo = (id: number) => bills.find((b) => b.id === id)?.invoiceNo ?? demoDocNo("PUR", id, ref, 3);
  const paymentIds: Record<string, number> = {};

  for (const spec of PAYABLES_PAYMENT_SPECS) {
    const pvNo = demoDocNo("PV", spec.pvSeq, ref, 3);
    const date = demoDateAt(spec.dateIndex, ref);
    paymentIds[pvNo] = seedVendorPayment(
      spec.vendorName,
      spec.amount,
      date,
      spec.refNo,
      billNo(spec.billId),
      pvNo,
    );
  }

  const vid = resolveVoucherId ?? ((no: string) => loadVouchers().find((v) => v.voucherNumber === no)?.id);

  seedPaymentAllocations(
    PAYABLES_PAYMENT_SPECS.filter((s) => "allocAmount" in s && s.allocAmount != null).map((spec) => {
      const pvNo = demoDocNo("PV", spec.pvSeq, ref, 3);
      return {
        voucherId: vid(pvNo) ?? paymentIds[pvNo],
        lines: [{ billId: spec.billId, billNo: billNo(spec.billId), amount: spec.allocAmount! }],
      };
    }),
  );
}

function postVendorCreditNoteVoucher(note: VendorCreditNoteRecord): void {
  const vendor = resolveMappingLedger("purchase_payable", note.vendorName, { createIfMissing: true });
  const purchase = resolveMappingLedger("purchase_inventory", "Fertilizer Purchase", {
    createIfMissing: true,
  });
  if (!vendor?.id || !purchase?.id) return;
  createVoucher("journal", {
    date: note.creditNoteDate,
    referenceNo: note.creditNoteNo,
    narration: `Supplier credit note — ${note.vendorName} (${note.reason})`,
    status: "posted",
    lines: [
      {
        id: 1,
        ledgerId: purchase.id,
        ledgerName: purchase.accountName,
        debit: note.amount,
        credit: 0,
        remarks: note.reason,
      },
      {
        id: 2,
        ledgerId: vendor.id,
        ledgerName: vendor.accountName,
        debit: 0,
        credit: note.amount,
        remarks: note.creditNoteNo,
      },
    ],
  });
}

/**
 * Seed payables demo data — vendors, bills, payments, debit/credit notes, allocations.
 * Called from accounts-demo-seed after base masters are ready.
 */
export function seedPayablesDemoData(
  resolveVoucherId?: (voucherNumber: string) => number | undefined,
): void {
  if (typeof window === "undefined") return;

  const vTemplate = loadVendors()[0] ?? vendorTemplate();
  const demoVendorIds = new Set(PAYABLES_DEMO_VENDORS.map((v) => v.id));
  const existing = loadVendors();
  const patched = PAYABLES_DEMO_VENDORS.map((spec) => {
    const base = existing.find((v) => v.id === spec.id) ?? { ...vTemplate, id: spec.id };
    return patchPayablesVendor(base, spec);
  });
  const others = existing.filter((v) => !demoVendorIds.has(v.id));
  saveVendors([...patched, ...others]);

  const meta: Record<number, PayablesVendorMeta> = {};
  for (const spec of PAYABLES_DEMO_VENDORS) {
    meta[spec.id] = {
      territory: spec.territory,
      branch: spec.branch,
      purchaseManager: spec.purchaseManager,
    };
    const vendor = loadVendors().find((v) => v.id === spec.id);
    if (vendor) syncVendorLedger(vendor);
  }
  saveVendorPayablesMeta(meta);

  const vendors = loadVendors();
  const purchases = getPayablesDemoBills().map((spec) => {
    const vendor = vendors.find((v) => v.id === spec.vendorId);
    return buildPurchaseBill(spec, vendor?.vendorName ?? "Supplier", vendor?.gstNumber ?? "");
  });
  savePurchaseInvoices(purchases);

  for (const pur of purchases) {
    maybePostPurchaseInvoice(pur);
  }

  const ref = new Date();
  const debitNotes = buildDebitNotes(ref);
  saveDebitNotes(debitNotes);
  for (const dn of debitNotes) {
    maybePostDebitNote(dn);
  }

  const vendorCreditNotes = buildVendorCreditNotes(ref);
  seedVendorCreditNotes(vendorCreditNotes);
  for (const vcn of vendorCreditNotes) {
    postVendorCreditNoteVoucher(vcn);
  }

  seedPayablesPaymentVouchers(ref, resolveVoucherId);
}

const PAYABLES_PAGE_SEED_VERSION = "relative-dates-v3";
const PAYABLES_PAGE_SEED_KEY = "ds_payables_page_seed_version";

/** Re-seed payables demo when page data version changes (payables module only). */
export function ensurePayablesDemoOnPageLoad(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(PAYABLES_PAGE_SEED_KEY) === PAYABLES_PAGE_SEED_VERSION) return;
  seedPayablesDemoData();
  localStorage.setItem(PAYABLES_PAGE_SEED_KEY, PAYABLES_PAGE_SEED_VERSION);
}
