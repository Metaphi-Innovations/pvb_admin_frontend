/**
 * Central posting engine — validates, posts, and reverses accounting vouchers.
 * Integrates with ERP modules via ledger mappings.
 */

import type { RecordStatus } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts, nextId } from "@/app/(app)/accounts/data";
import {
  createVoucher,
  getVoucherById,
  loadVouchers,
  saveVouchers,
  validateVoucherForPost,
  type AccountingVoucher,
  type VoucherLine,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { requireAccountsPermission, ACCOUNTS_PERMISSIONS } from "@/lib/accounts/permissions";
import {
  resolveMappingLedger,
  type LedgerMappingKey,
} from "@/lib/accounts/ledger-mappings";
import { loadAccountingSettings } from "@/lib/accounts/accounting-settings-data";

export type ErpSourceModule =
  | "procurement"
  | "sales"
  | "hr"
  | "warehouse"
  | "manual";

export interface PostingLineInput {
  mappingKey?: LedgerMappingKey;
  ledgerId?: number;
  partyName?: string;
  debit: number;
  credit: number;
  remarks?: string;
}

export interface ErpPostingRequest {
  sourceModule: ErpSourceModule;
  sourceDocumentId: number | string;
  sourceDocumentNo: string;
  voucherType: VoucherTypeCode;
  date: string;
  narration: string;
  lines: PostingLineInput[];
  referenceNo?: string;
}

export interface PostingResult {
  success: boolean;
  voucherId?: number;
  voucherNumber?: string;
  error?: string;
}

function resolveLineToLedgerId(line: PostingLineInput): number | null {
  if (line.ledgerId) return line.ledgerId;
  if (line.mappingKey) {
    const ledger = resolveMappingLedger(
      line.mappingKey,
      line.partyName ?? "General",
      { createIfMissing: true },
    );
    return ledger?.id ?? null;
  }
  return null;
}

function buildVoucherLines(inputs: PostingLineInput[]): VoucherLine[] {
  return inputs.map((line, i) => {
    const ledgerId = resolveLineToLedgerId(line);
    const records = loadChartOfAccounts();
    const account = ledgerId ? records.find((r) => r.id === ledgerId) : null;
    return {
      id: Date.now() + i,
      ledgerId,
      ledgerName: account?.accountName ?? "",
      debit: line.debit,
      credit: line.credit,
      remarks: line.remarks ?? "",
    };
  });
}

/** Post a balanced voucher after validation */
export function postVoucher(voucherId: number): PostingResult {
  const perm = requireAccountsPermission(ACCOUNTS_PERMISSIONS.VOUCHER_POST);
  if (!perm.allowed) return { success: false, error: perm.message };

  const list = loadVouchers();
  const voucher = list.find((v) => v.id === voucherId);
  if (!voucher) return { success: false, error: "Voucher not found." };
  if (voucher.status === "posted") return { success: false, error: "Voucher is already posted." };

  const settings = loadAccountingSettings();
  if (settings.requireVoucherApproval && voucher.status !== "approved") {
    return { success: false, error: "Voucher must be approved before posting." };
  }

  const err = validateVoucherForPost(voucher);
  if (err) return { success: false, error: err };

  const updated = list.map((v) =>
    v.id === voucherId
      ? { ...v, status: "posted" as RecordStatus, updatedBy: ACCOUNTS_CURRENT_USER }
      : v,
  );
  saveVouchers(updated);
  return {
    success: true,
    voucherId: voucher.id,
    voucherNumber: voucher.voucherNumber,
  };
}

export function approveVoucher(voucherId: number): PostingResult {
  const perm = requireAccountsPermission(ACCOUNTS_PERMISSIONS.VOUCHER_APPROVE);
  if (!perm.allowed) return { success: false, error: perm.message };

  const list = loadVouchers();
  const voucher = list.find((v) => v.id === voucherId);
  if (!voucher) return { success: false, error: "Voucher not found." };
  if (voucher.status !== "draft") {
    return { success: false, error: "Only draft vouchers can be approved." };
  }

  const updated = list.map((v) =>
    v.id === voucherId
      ? { ...v, status: "approved" as RecordStatus, updatedBy: ACCOUNTS_CURRENT_USER }
      : v,
  );
  saveVouchers(updated);

  const settings = loadAccountingSettings();
  if (!settings.requireVoucherApproval) {
    return postVoucher(voucherId);
  }
  return { success: true, voucherId, voucherNumber: voucher.voucherNumber };
}

/** Auto-post from ERP source document */
export function postFromErpSource(req: ErpPostingRequest): PostingResult {
  const settings = loadAccountingSettings();
  const autoPost =
    (req.sourceModule === "sales" && settings.autoPostSales) ||
    (req.sourceModule === "procurement" && settings.autoPostPurchase) ||
    (req.sourceModule === "hr" && settings.autoPostHrClaims) ||
    (req.sourceModule === "warehouse" && settings.autoPostStockAdj) ||
    req.sourceModule === "manual";

  if (!autoPost) {
    return { success: false, error: `Auto-posting disabled for ${req.sourceModule}.` };
  }

  const existing = loadVouchers().find(
    (v) =>
      v.referenceNo === req.sourceDocumentNo &&
      v.voucherType === req.voucherType &&
      v.status === "posted",
  );
  if (existing) {
    return {
      success: true,
      voucherId: existing.id,
      voucherNumber: existing.voucherNumber,
      error: "Already posted.",
    };
  }

  const lines = buildVoucherLines(req.lines);
  const err = validateVoucherForPost({ date: req.date, narration: req.narration, lines });
  if (err) return { success: false, error: err };

  const voucher = createVoucher(req.voucherType, {
    date: req.date,
    referenceNo: req.referenceNo ?? req.sourceDocumentNo,
    narration: req.narration,
    lines,
    status: "posted",
  });

  return {
    success: true,
    voucherId: voucher.id,
    voucherNumber: voucher.voucherNumber,
  };
}

/** Procurement: Purchase Invoice approved → accounting entries */
export function postPurchaseInvoice(input: {
  invoiceId: number;
  invoiceNo: string;
  vendorName: string;
  date: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
}): PostingResult {
  const lines: PostingLineInput[] = [
    {
      mappingKey: "purchase_inventory",
      debit: input.taxableAmount,
      credit: 0,
      remarks: `Inventory — ${input.invoiceNo}`,
    },
    {
      mappingKey: "purchase_payable",
      partyName: input.vendorName,
      debit: 0,
      credit: input.taxableAmount + input.cgst + input.sgst + input.igst,
      remarks: `Payable — ${input.vendorName}`,
    },
  ];
  if (input.cgst > 0) {
    lines.push({ mappingKey: "purchase_cgst", debit: input.cgst, credit: 0 });
  }
  if (input.sgst > 0) {
    lines.push({ mappingKey: "purchase_sgst", debit: input.sgst, credit: 0 });
  }
  if (input.igst > 0) {
    lines.push({ mappingKey: "purchase_igst", debit: input.igst, credit: 0 });
  }

  return postFromErpSource({
    sourceModule: "procurement",
    sourceDocumentId: input.invoiceId,
    sourceDocumentNo: input.invoiceNo,
    voucherType: "purchase",
    date: input.date,
    narration: `Purchase Invoice ${input.invoiceNo} — ${input.vendorName}`,
    lines,
  });
}

/** Sales: Sales Invoice → accounting entries */
export function postSalesInvoice(input: {
  invoiceId: number;
  invoiceNo: string;
  customerName: string;
  date: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
}): PostingResult {
  const total = input.taxableAmount + input.cgst + input.sgst + input.igst;
  const lines: PostingLineInput[] = [
    {
      mappingKey: "sales_receivable",
      partyName: input.customerName,
      debit: total,
      credit: 0,
      remarks: `Receivable — ${input.customerName}`,
    },
    {
      mappingKey: "sales_revenue",
      debit: 0,
      credit: input.taxableAmount,
      remarks: `Revenue — ${input.invoiceNo}`,
    },
  ];
  if (input.cgst > 0) {
    lines.push({ mappingKey: "sales_cgst", debit: 0, credit: input.cgst });
  }
  if (input.sgst > 0) {
    lines.push({ mappingKey: "sales_sgst", debit: 0, credit: input.sgst });
  }
  if (input.igst > 0) {
    lines.push({ mappingKey: "sales_igst", debit: 0, credit: input.igst });
  }

  return postFromErpSource({
    sourceModule: "sales",
    sourceDocumentId: input.invoiceId,
    sourceDocumentNo: input.invoiceNo,
    voucherType: "sales",
    date: input.date,
    narration: `Sales Invoice ${input.invoiceNo} — ${input.customerName}`,
    lines,
  });
}

/** HR: Approved employee claim → payable entry */
export function postEmployeeClaim(input: {
  claimId: number;
  claimNo: string;
  employeeName: string;
  date: string;
  amount: number;
}): PostingResult {
  return postFromErpSource({
    sourceModule: "hr",
    sourceDocumentId: input.claimId,
    sourceDocumentNo: input.claimNo,
    voucherType: "journal",
    date: input.date,
    narration: `Employee Claim ${input.claimNo} — ${input.employeeName}`,
    lines: [
      {
        mappingKey: "hr_claim_expense",
        debit: input.amount,
        credit: 0,
        remarks: input.employeeName,
      },
      {
        mappingKey: "hr_claim_payable",
        partyName: input.employeeName,
        debit: 0,
        credit: input.amount,
        remarks: input.employeeName,
      },
    ],
  });
}

/** Warehouse: Stock adjustment → inventory accounting */
export function postStockAdjustment(input: {
  adjustmentId: number;
  adjustmentNo: string;
  date: string;
  amount: number;
  isIncrease: boolean;
}): PostingResult {
  const abs = Math.abs(input.amount);
  const lines: PostingLineInput[] = input.isIncrease
    ? [
        { mappingKey: "stock_inventory", debit: abs, credit: 0 },
        { mappingKey: "stock_adjustment", debit: 0, credit: abs },
      ]
    : [
        { mappingKey: "stock_adjustment", debit: abs, credit: 0 },
        { mappingKey: "stock_inventory", debit: 0, credit: abs },
      ];

  return postFromErpSource({
    sourceModule: "warehouse",
    sourceDocumentId: input.adjustmentId,
    sourceDocumentNo: input.adjustmentNo,
    voucherType: "journal",
    date: input.date,
    narration: `Stock Adjustment ${input.adjustmentNo}`,
    lines,
  });
}

export function getVoucherPostingSummary(voucherId: number) {
  const v = getVoucherById(voucherId);
  if (!v) return null;
  return {
    id: v.id,
    number: v.voucherNumber,
    type: v.voucherType,
    status: v.status,
    totalDebit: v.totalDebit,
    totalCredit: v.totalCredit,
    lineCount: v.lines.length,
    isBalanced: Math.abs(v.totalDebit - v.totalCredit) < 0.01,
  };
}
