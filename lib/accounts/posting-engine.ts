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
import { ensureInventoryAccountingLedgers, getCostPriceBySku, resolveSku } from "@/lib/accounts/inventory-accounting-data";
import {
  ensureGstAccountingLedgers,
  expandGstPostingLines,
  isGstMappingKey,
  resolveGstLedger,
  type GstRateBreakdown,
} from "@/lib/accounts/gst-accounting";
import { formatGstPostingLedgerDisplayName } from "@/lib/accounts/gst-coa-sync";
import { ensureTdsAccountingLedgers, resolveTdsPayableLedger } from "@/lib/accounts/tds-accounting";
import { roundMoney } from "@/lib/accounts/money-format";
import { notifyVoucherPosted } from "@/lib/accounts/voucher-posting-notify";

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
  /** Total GST rate (e.g. 18) for rate-specific GST ledger resolution */
  gstRatePct?: number;
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
  return resolveLineToLedger(line).ledgerId;
}

function resolveLineToLedger(line: PostingLineInput): { ledgerId: number | null; error?: string } {
  ensureGstAccountingLedgers();
  if (line.ledgerId) return { ledgerId: line.ledgerId };

  if (line.mappingKey) {
    if (
      isGstMappingKey(line.mappingKey) &&
      line.gstRatePct != null &&
      line.gstRatePct > 0 &&
      (line.debit > 0 || line.credit > 0)
    ) {
      const ledger = resolveGstLedger(line.mappingKey, line.gstRatePct);
      if (!ledger) {
        const label = formatGstPostingLedgerDisplayName(line.mappingKey, line.gstRatePct);
        return { ledgerId: null, error: `${label} posting ledger is not configured.` };
      }
      return { ledgerId: ledger.id };
    }

    const ledger = resolveMappingLedger(line.mappingKey, line.partyName ?? "General", {
      createIfMissing: true,
      gstRatePct: line.gstRatePct,
    });
    return { ledgerId: ledger?.id ?? null };
  }

  return { ledgerId: null };
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
  const posted = updated.find((v) => v.id === voucherId)!;
  notifyVoucherPosted(posted);
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

  for (const line of req.lines) {
    const resolved = resolveLineToLedger(line);
    if (resolved.error) return { success: false, error: resolved.error };
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

/** Procurement: GRN QC passed → Dr Inventory, Cr GRN Clearing */
export function postGrnAccepted(input: {
  grnId: string;
  grnNo: string;
  date: string;
  lines: { productName: string; sku?: string; qty: number }[];
}): PostingResult {
  ensureInventoryAccountingLedgers();
  let inventoryValue = 0;
  for (const line of input.lines) {
    const sku = line.sku ?? resolveSku(line.productName);
    inventoryValue += line.qty * getCostPriceBySku(sku);
  }
  if (inventoryValue <= 0) return { success: false, error: "No inventory value to post" };

  return postFromErpSource({
    sourceModule: "warehouse",
    sourceDocumentId: input.grnId,
    sourceDocumentNo: input.grnNo,
    voucherType: "journal",
    date: input.date,
    narration: `GRN Accepted ${input.grnNo} — inventory accrual`,
    lines: [
      {
        mappingKey: "purchase_inventory",
        partyName: "Inventory / Stock-in-Hand",
        debit: inventoryValue,
        credit: 0,
        remarks: `Stock-in — ${input.grnNo}`,
      },
      {
        mappingKey: "grn_clearing",
        partyName: "GRN Clearing / Purchase Accrual",
        debit: 0,
        credit: inventoryValue,
        remarks: `GRN clearing — ${input.grnNo}`,
      },
    ],
  });
}

/** Procurement: Purchase Invoice approved → clear GRN accrual & credit vendor */
export function postPurchaseInvoice(input: {
  invoiceId: number;
  invoiceNo: string;
  vendorName: string;
  date: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstBreakdowns?: GstRateBreakdown[];
  gstRatePct?: number;
  tdsAmount?: number;
  tdsMasterId?: number | null;
}): PostingResult {
  ensureGstAccountingLedgers();
  ensureTdsAccountingLedgers();
  ensureInventoryAccountingLedgers();
  const tds = roundMoney(input.tdsAmount ?? 0);
  const total = input.taxableAmount + input.cgst + input.sgst + input.igst;
  const payableTotal = roundMoney(total - tds);
  const lines: PostingLineInput[] = [
    {
      mappingKey: "purchase_inventory",
      partyName: "Inventory / Stock-in-Hand",
      debit: input.taxableAmount,
      credit: 0,
      remarks: `Purchase — ${input.invoiceNo}`,
    },
    {
      mappingKey: "purchase_payable",
      partyName: input.vendorName,
      debit: 0,
      credit: payableTotal,
      remarks: `Payable — ${input.vendorName}`,
    },
  ];

  if (input.gstBreakdowns?.length) {
    lines.push(...expandGstPostingLines(input.gstBreakdowns, "purchase"));
  } else {
    const rate = input.gstRatePct;
    if (input.cgst > 0) {
      lines.push({
        mappingKey: "purchase_cgst",
        debit: input.cgst,
        credit: 0,
        gstRatePct: rate,
        remarks: "Input CGST (ITC)",
      });
    }
    if (input.sgst > 0) {
      lines.push({
        mappingKey: "purchase_sgst",
        debit: input.sgst,
        credit: 0,
        gstRatePct: rate,
        remarks: "Input SGST (ITC)",
      });
    }
    if (input.igst > 0) {
      lines.push({
        mappingKey: "purchase_igst",
        debit: input.igst,
        credit: 0,
        gstRatePct: rate,
        remarks: "Input IGST (ITC)",
      });
    }
  }

  if (tds > 0 && input.tdsMasterId != null) {
    const tdsLedger = resolveTdsPayableLedger(input.tdsMasterId);
    if (tdsLedger) {
      lines.push({
        ledgerId: tdsLedger.id,
        debit: 0,
        credit: tds,
        remarks: `TDS Payable — ${input.invoiceNo}`,
      });
    }
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

/** Accounts: Direct Purchase Invoice → expense/asset ledgers + GST + vendor payable */
export function postDirectPurchaseInvoice(input: {
  invoiceId: number;
  invoiceNo: string;
  vendorName: string;
  date: string;
  expenseLines: Array<{
    ledgerId: number;
    ledgerName: string;
    amount: number;
    description: string;
  }>;
  cgst: number;
  sgst: number;
  igst: number;
  gstBreakdowns?: GstRateBreakdown[];
  tdsAmount?: number;
  tdsMasterId?: number | null;
  tdsLedgerId?: number | null;
  roundOff?: number;
}): PostingResult {
  ensureGstAccountingLedgers();
  ensureTdsAccountingLedgers();
  const tds = roundMoney(input.tdsAmount ?? 0);
  const roundOff = roundMoney(input.roundOff ?? 0);
  const expenseTotal = roundMoney(
    input.expenseLines.reduce((s, l) => s + l.amount, 0),
  );
  const gstTotal = roundMoney(input.cgst + input.sgst + input.igst);
  const payableTotal = roundMoney(expenseTotal + gstTotal - tds + roundOff);

  const lines: PostingLineInput[] = input.expenseLines.map((el) => ({
    ledgerId: el.ledgerId,
    partyName: el.ledgerName,
    debit: el.amount,
    credit: 0,
    remarks: el.description,
  }));

  if (input.gstBreakdowns?.length) {
    lines.push(...expandGstPostingLines(input.gstBreakdowns, "purchase"));
  } else {
    if (input.cgst > 0) {
      lines.push({
        mappingKey: "purchase_cgst",
        debit: input.cgst,
        credit: 0,
        remarks: "Input CGST (ITC)",
      });
    }
    if (input.sgst > 0) {
      lines.push({
        mappingKey: "purchase_sgst",
        debit: input.sgst,
        credit: 0,
        remarks: "Input SGST (ITC)",
      });
    }
    if (input.igst > 0) {
      lines.push({
        mappingKey: "purchase_igst",
        debit: input.igst,
        credit: 0,
        remarks: "Input IGST (ITC)",
      });
    }
  }

  if (tds > 0) {
    const tdsLedger =
      input.tdsLedgerId ??
      (input.tdsMasterId != null ? resolveTdsPayableLedger(input.tdsMasterId)?.id : null);
    if (tdsLedger) {
      lines.push({
        ledgerId: tdsLedger,
        debit: 0,
        credit: tds,
        remarks: `TDS Payable — ${input.invoiceNo}`,
      });
    }
  }

  if (roundOff !== 0) {
    const settings = loadAccountingSettings();
    if (settings.roundOffLedgerId) {
      lines.push({
        ledgerId: settings.roundOffLedgerId,
        debit: roundOff > 0 ? roundOff : 0,
        credit: roundOff < 0 ? Math.abs(roundOff) : 0,
        remarks: "Round off",
      });
    }
  }

  lines.push({
    mappingKey: "purchase_payable",
    partyName: input.vendorName,
    debit: 0,
    credit: payableTotal,
    remarks: `Payable — ${input.vendorName}`,
  });

  return postFromErpSource({
    sourceModule: "procurement",
    sourceDocumentId: input.invoiceId,
    sourceDocumentNo: input.invoiceNo,
    voucherType: "purchase",
    date: input.date,
    narration: `Direct Purchase ${input.invoiceNo} — ${input.vendorName}`,
    lines,
  });
}

/** Sales: Sales Invoice → accounting entries */
export function postSalesInvoice(input: {
  invoiceId: number;
  invoiceNo: string;
  customerName: string;
  date: string;
  grandTotal?: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstBreakdowns?: GstRateBreakdown[];
  gstRatePct?: number;
}): PostingResult {
  ensureGstAccountingLedgers();
  const taxTotal = roundMoney(input.cgst + input.sgst + input.igst);
  const total =
    input.grandTotal != null && input.grandTotal > 0
      ? roundMoney(input.grandTotal)
      : roundMoney(input.taxableAmount + taxTotal);
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

  if (input.gstBreakdowns?.length) {
    lines.push(...expandGstPostingLines(input.gstBreakdowns, "sales"));
  } else {
    const rate = input.gstRatePct;
    if (input.cgst > 0) {
      lines.push({ mappingKey: "sales_cgst", debit: 0, credit: input.cgst, gstRatePct: rate });
    }
    if (input.sgst > 0) {
      lines.push({ mappingKey: "sales_sgst", debit: 0, credit: input.sgst, gstRatePct: rate });
    }
    if (input.igst > 0) {
      lines.push({ mappingKey: "sales_igst", debit: 0, credit: input.igst, gstRatePct: rate });
    }
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

/** Sales: COGS at cost price — Dr COGS, Cr Inventory */
export function postSalesInvoiceCogs(input: {
  invoiceId: number;
  invoiceNo: string;
  date: string;
  lines: { productName: string; sku?: string; qty: number }[];
}): PostingResult {
  ensureInventoryAccountingLedgers();
  let cogsTotal = 0;
  for (const line of input.lines) {
    if (line.qty <= 0) continue;
    const sku = line.sku ?? resolveSku(line.productName);
    cogsTotal += line.qty * getCostPriceBySku(sku);
  }
  if (cogsTotal <= 0) return { success: true, voucherId: undefined };

  return postFromErpSource({
    sourceModule: "sales",
    sourceDocumentId: `${input.invoiceId}-cogs`,
    sourceDocumentNo: `${input.invoiceNo}-COGS`,
    voucherType: "journal",
    date: input.date,
    narration: `COGS — ${input.invoiceNo}`,
    lines: [
      {
        mappingKey: "sales_cogs",
        partyName: "Cost of Goods Sold — Inventory",
        debit: cogsTotal,
        credit: 0,
        remarks: `COGS at CP — ${input.invoiceNo}`,
      },
      {
        mappingKey: "stock_inventory",
        partyName: "Inventory / Stock-in-Hand",
        debit: 0,
        credit: cogsTotal,
        remarks: `Inventory reduction — ${input.invoiceNo}`,
      },
    ],
  });
}

/** Sales: Credit Note approved → reverse revenue & reduce receivable */
export function postCreditNote(input: {
  creditNoteId: number;
  creditNoteNo: string;
  customerName: string;
  date: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstBreakdowns?: GstRateBreakdown[];
  gstRatePct?: number;
}): PostingResult {
  ensureGstAccountingLedgers();
  const total = input.taxableAmount + input.cgst + input.sgst + input.igst;
  const lines: PostingLineInput[] = [
    {
      mappingKey: "sales_revenue",
      debit: input.taxableAmount,
      credit: 0,
      remarks: `Sales return — ${input.creditNoteNo}`,
    },
    {
      mappingKey: "sales_receivable",
      partyName: input.customerName,
      debit: 0,
      credit: total,
      remarks: `Reduce outstanding — ${input.customerName}`,
    },
  ];

  if (input.gstBreakdowns?.length) {
    lines.push(...expandGstPostingLines(input.gstBreakdowns, "credit_note"));
  } else {
    const rate = input.gstRatePct;
    if (input.cgst > 0) {
      lines.push({ mappingKey: "sales_cgst", debit: input.cgst, credit: 0, gstRatePct: rate });
    }
    if (input.sgst > 0) {
      lines.push({ mappingKey: "sales_sgst", debit: input.sgst, credit: 0, gstRatePct: rate });
    }
    if (input.igst > 0) {
      lines.push({ mappingKey: "sales_igst", debit: input.igst, credit: 0, gstRatePct: rate });
    }
  }

  return postFromErpSource({
    sourceModule: "sales",
    sourceDocumentId: input.creditNoteId,
    sourceDocumentNo: input.creditNoteNo,
    voucherType: "credit_note",
    date: input.date,
    narration: `Credit Note ${input.creditNoteNo} — ${input.customerName}`,
    lines,
  });
}

/** Procurement: Debit Note posted → reduce vendor payable */
export function postDebitNote(input: {
  debitNoteId: number;
  debitNoteNo: string;
  vendorName: string;
  date: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstBreakdowns?: GstRateBreakdown[];
  gstRatePct?: number;
  tdsAmount?: number;
  tdsMasterId?: number | null;
  adjustmentLedgerId?: number | null;
  creditMappingKey?: LedgerMappingKey;
}): PostingResult {
  ensureGstAccountingLedgers();
  ensureTdsAccountingLedgers();
  const tds = roundMoney(input.tdsAmount ?? 0);
  const total = input.taxableAmount + input.cgst + input.sgst + input.igst;
  const payableDebit = roundMoney(total - tds);
  const creditLine: PostingLineInput = input.adjustmentLedgerId
    ? {
        ledgerId: input.adjustmentLedgerId,
        debit: 0,
        credit: input.taxableAmount,
        remarks: `Supplier adjustment — ${input.debitNoteNo}`,
      }
    : {
        mappingKey: input.creditMappingKey ?? "purchase_inventory",
        debit: 0,
        credit: input.taxableAmount,
        remarks: `Purchase return — ${input.debitNoteNo}`,
      };

  const lines: PostingLineInput[] = [
    {
      mappingKey: "purchase_payable",
      partyName: input.vendorName,
      debit: payableDebit,
      credit: 0,
      remarks: `Supplier Dr — ${input.vendorName}`,
    },
    creditLine,
  ];

  if (input.gstBreakdowns?.length) {
    lines.push(...expandGstPostingLines(input.gstBreakdowns, "debit_note"));
  } else {
    const rate = input.gstRatePct;
    if (input.cgst > 0) {
      lines.push({ mappingKey: "purchase_cgst", debit: 0, credit: input.cgst, gstRatePct: rate });
    }
    if (input.sgst > 0) {
      lines.push({ mappingKey: "purchase_sgst", debit: 0, credit: input.sgst, gstRatePct: rate });
    }
    if (input.igst > 0) {
      lines.push({ mappingKey: "purchase_igst", debit: 0, credit: input.igst, gstRatePct: rate });
    }
  }

  if (tds > 0 && input.tdsMasterId != null) {
    const tdsLedger = resolveTdsPayableLedger(input.tdsMasterId);
    if (tdsLedger) {
      lines.push({
        ledgerId: tdsLedger.id,
        debit: tds,
        credit: 0,
        remarks: `TDS Payable reversal — ${input.debitNoteNo}`,
      });
    }
  }

  return postFromErpSource({
    sourceModule: "procurement",
    sourceDocumentId: input.debitNoteId,
    sourceDocumentNo: input.debitNoteNo,
    voucherType: "debit_note",
    date: input.date,
    narration: `Debit Note ${input.debitNoteNo} — ${input.vendorName}`,
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

/** Warehouse: Stock reconciliation → inventory gain/loss */
export function postStockReconciliation(input: {
  reconciliationId: string;
  reconciliationNo: string;
  date: string;
  amount: number;
  isIncrease: boolean;
  narration?: string;
}): PostingResult {
  ensureInventoryAccountingLedgers();
  const abs = Math.abs(input.amount);
  const lines: PostingLineInput[] = input.isIncrease
    ? [
        {
          mappingKey: "stock_inventory",
          partyName: "Inventory / Stock-in-Hand",
          debit: abs,
          credit: 0,
        },
        {
          mappingKey: "stock_adjustment_gain",
          partyName: "Stock Adjustment Gain / Other Income",
          debit: 0,
          credit: abs,
          remarks: input.narration,
        },
      ]
    : [
        {
          mappingKey: "stock_loss_expense",
          partyName: "Inventory Loss / Stock Adjustment Expense",
          debit: abs,
          credit: 0,
          remarks: input.narration,
        },
        {
          mappingKey: "stock_inventory",
          partyName: "Inventory / Stock-in-Hand",
          debit: 0,
          credit: abs,
        },
      ];

  return postFromErpSource({
    sourceModule: "warehouse",
    sourceDocumentId: input.reconciliationId,
    sourceDocumentNo: input.reconciliationNo,
    voucherType: "journal",
    date: input.date,
    narration: `Stock Reconciliation ${input.reconciliationNo}`,
    lines,
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
