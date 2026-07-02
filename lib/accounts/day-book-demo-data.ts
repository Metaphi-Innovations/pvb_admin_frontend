/**
 * Self-contained Day Book demo entries — local to this report only.
 * Covers all eight voucher types with realistic agri-ERP transactions (Apr–Jun 2026).
 */

import type { DayBookEntry } from "@/lib/accounts/day-book-data";

const DEMO_FY_ID = 1;
const DEMO_FY_NAME = "FY 2025-26";

function row(
  id: string,
  date: string,
  voucherNo: string,
  voucherType: DayBookEntry["voucherType"],
  voucherTypeLabel: string,
  partyLedger: string,
  narration: string,
  debit: number,
  credit: number,
): DayBookEntry {
  return {
    id,
    sourceId: 0,
    date,
    time: "09:30",
    voucherNo,
    voucherType,
    voucherTypeLabel,
    partyLedger,
    narration,
    debit,
    credit,
    createdBy: "Admin",
    status: "posted",
    branch: "Head Office",
    financialYearId: DEMO_FY_ID,
    financialYearName: DEMO_FY_NAME,
    viewHref: "",
    createdAt: `${date}T09:30:00.000Z`,
  };
}

/** 23 posted vouchers across Apr–Jun 2026 for client review. */
export const DAY_BOOK_DEMO_ENTRIES: DayBookEntry[] = [
  row("db-1", "2026-04-01", "SI-0001", "sales_invoice", "Sales Invoice", "ABC Traders", "Sales of agro products", 25000, 0),
  row("db-2", "2026-04-01", "RV-0001", "receipt", "Receipt Voucher", "HDFC Bank", "Receipt from ABC Traders", 0, 10000),
  row("db-3", "2026-04-02", "PI-0001", "purchase_invoice", "Purchase Invoice", "Green Agro Suppliers", "Purchase of inventory", 42000, 0),
  row("db-4", "2026-04-03", "PV-0001", "payment", "Payment Voucher", "HDFC Bank", "Vendor payment", 0, 20000),
  row("db-5", "2026-04-04", "JV-0001", "journal", "Journal Voucher", "Salary Payable", "Salary provision", 55000, 55000),
  row("db-6", "2026-04-05", "CN-0001", "credit_note", "Credit Note", "ABC Traders", "Sales return", 0, 3500),
  row("db-7", "2026-04-06", "DN-0001", "debit_note", "Debit Note", "Green Agro Suppliers", "Purchase return", 2500, 0),
  row("db-8", "2026-04-07", "CV-0001", "contra", "Contra Voucher", "Cash to Bank", "Cash deposited into bank", 15000, 15000),
  row("db-9", "2026-04-08", "SI-0002", "sales_invoice", "Sales Invoice", "Krishna Retail Store", "Sales of seeds and micronutrients", 38500, 0),
  row("db-10", "2026-04-09", "RV-0002", "receipt", "Receipt Voucher", "HDFC Bank", "NEFT receipt from Krishna Retail Store", 0, 38500),
  row("db-11", "2026-04-10", "PI-0002", "purchase_invoice", "Purchase Invoice", "Bharat Seeds", "Purchase of pesticides", 67800, 0),
  row("db-12", "2026-04-11", "PV-0002", "payment", "Payment Voucher", "HDFC Bank", "Payment to Bharat Seeds", 0, 45000),
  row("db-13", "2026-04-12", "JV-0002", "journal", "Journal Voucher", "GST Payable", "GST adjustment entry", 12500, 12500),
  row("db-14", "2026-04-15", "SI-0003", "sales_invoice", "Sales Invoice", "Sunrise Agro", "Bulk fertilizer sale", 92000, 0),
  row("db-15", "2026-04-16", "CN-0002", "credit_note", "Credit Note", "Sunrise Agro", "Short supply credit note", 0, 8200),
  row("db-16", "2026-04-17", "DN-0002", "debit_note", "Debit Note", "Pioneer Agro", "Purchase rate difference", 4100, 0),
  row("db-17", "2026-04-18", "PV-0003", "payment", "Payment Voucher", "ICICI Bank", "Freight charges payment", 0, 15600),
  row("db-18", "2026-04-20", "RV-0003", "receipt", "Receipt Voucher", "ICICI Bank", "Collection from Mahadev Traders", 0, 52000),
  row("db-19", "2026-04-22", "JV-0003", "journal", "Journal Voucher", "Rent Expense", "Office rent provision", 28000, 28000),
  row("db-20", "2026-04-25", "CV-0002", "contra", "Contra Voucher", "Bank to Cash", "Cash withdrawal for petty expenses", 8000, 8000),
  row("db-21", "2026-05-02", "SI-0004", "sales_invoice", "Sales Invoice", "Konkan Fertilizer Depot", "Monsoon preparation sale", 156000, 0),
  row("db-22", "2026-05-05", "PI-0003", "purchase_invoice", "Purchase Invoice", "Shree Traders", "Urea procurement", 89000, 0),
  row("db-23", "2026-05-08", "PV-0004", "payment", "Payment Voucher", "HDFC Bank", "Vendor settlement — Shree Traders", 0, 32000),
];
