/**
 * Central posting orchestrator for manual Receipt, Payment, Contra, and Journal vouchers.
 * Single entry point: validate → persist → post → allocate → audit.
 *
 * Posted vouchers in localStorage are the source of truth for GL, TB, bank/cash books,
 * receivables/payables, and all Accounts-module reports.
 */

import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import {
  createVoucher,
  updateVoucher,
  getVoucherById,
  validateContraVoucherForPost,
  validatePaymentVoucherForPost,
  validateReceiptVoucherForPost,
  validateVoucherForPost,
  VOUCHER_TYPE_LABELS,
  calcLineTotals,
  type AccountingVoucher,
  type CreateVoucherInput,
  type SimpleCashVoucherInput,
  type SimpleContraVoucherInput,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { postVoucher, type PostingResult } from "@/lib/accounts/posting-engine";
import {
  applyPaymentAllocation,
  getBillOutstanding,
} from "@/lib/accounts/payables-data";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import {
  applyReceiptAllocation,
  getInvoiceOutstanding,
} from "@/lib/accounts/receivables-data";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { appendAuditTrailEntry } from "@/lib/accounts/audit-trail-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { notifyVoucherPosted } from "@/lib/accounts/voucher-posting-notify";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";

export interface VoucherAllocationLine {
  invoiceId?: number;
  billId?: number;
  amount: number;
  documentNo?: string;
}

export interface ManualVoucherPostInput {
  voucherType: VoucherTypeCode;
  /** When editing an existing draft voucher */
  voucherId?: number | null;
  payload: CreateVoucherInput;
  /** Receipt / payment simple-form validation */
  simpleCashInput?: SimpleCashVoucherInput;
  /** Contra simple-form validation */
  simpleContraInput?: SimpleContraVoucherInput;
  /** Invoice / bill allocations applied immediately after posting */
  allocations?: VoucherAllocationLine[];
}

const VOUCHER_MODULE_LABEL: Partial<Record<VoucherTypeCode, string>> = {
  receipt: "Receipt Voucher",
  payment: "Payment Voucher",
  contra: "Contra Voucher",
  journal: "Journal Voucher",
};

function validateReceiptAllocations(
  receiptAmount: number,
  allocations: VoucherAllocationLine[],
): string | null {
  if (!allocations.length) return null;
  const total = roundMoney(allocations.reduce((s, a) => s + a.amount, 0));
  if (total > receiptAmount + 0.009) {
    return `Total allocation (${formatMoney(total)}) cannot exceed receipt amount (${formatMoney(receiptAmount)}).`;
  }
  const invoices = loadInvoices();
  const bills = loadPurchaseInvoices();
  for (const alloc of allocations) {
    if (alloc.amount <= 0) continue;
    if (alloc.invoiceId != null) {
      const inv = invoices.find((i) => i.id === alloc.invoiceId);
      if (!inv) return "Invalid sales invoice selected for allocation.";
      const outstanding = getInvoiceOutstanding(inv);
      if (alloc.amount > outstanding + 0.009) {
        return `Allocation for ${inv.invoiceNo} exceeds outstanding (${formatMoney(outstanding)}).`;
      }
      continue;
    }
    if (alloc.billId != null) {
      const bill = bills.find((b) => b.id === alloc.billId);
      if (!bill) return "Invalid purchase invoice selected for allocation.";
      const outstanding = getBillOutstanding(bill);
      if (alloc.amount > outstanding + 0.009) {
        return `Allocation for ${bill.invoiceNo} exceeds outstanding (${formatMoney(outstanding)}).`;
      }
    }
  }
  return null;
}

function validatePaymentAllocations(
  paymentAmount: number,
  allocations: VoucherAllocationLine[],
): string | null {
  if (!allocations.length) return null;
  const total = roundMoney(allocations.reduce((s, a) => s + a.amount, 0));
  if (total > paymentAmount + 0.009) {
    return `Total allocation (${formatMoney(total)}) cannot exceed payment amount (${formatMoney(paymentAmount)}).`;
  }
  const bills = loadPurchaseInvoices();
  for (const alloc of allocations) {
    if (!alloc.billId || alloc.amount <= 0) continue;
    const bill = bills.find((b) => b.id === alloc.billId);
    if (!bill) return "Invalid purchase invoice selected for allocation.";
    const outstanding = getBillOutstanding(bill);
    if (alloc.amount > outstanding + 0.009) {
      return `Allocation for ${bill.invoiceNo} exceeds outstanding (${formatMoney(outstanding)}).`;
    }
  }
  return null;
}

function validateTypeSpecific(
  input: ManualVoucherPostInput,
): string | null {
  const { voucherType, simpleCashInput, simpleContraInput, payload } = input;

  if (voucherType === "receipt" && simpleCashInput) {
    return validateReceiptVoucherForPost(simpleCashInput);
  }
  if (voucherType === "payment" && simpleCashInput) {
    return validatePaymentVoucherForPost(simpleCashInput);
  }
  if (voucherType === "contra" && simpleContraInput) {
    return validateContraVoucherForPost(simpleContraInput);
  }

  return validateVoucherForPost({
    date: payload.date,
    narration: payload.narration,
    lines: payload.lines,
    financialYearId: payload.financialYearId,
  });
}

function validateAllocations(input: ManualVoucherPostInput): string | null {
  const { voucherType, allocations, simpleCashInput, payload } = input;
  if (!allocations?.length) return null;

  const bankAmount =
    simpleCashInput?.bankAmount ??
    simpleCashInput?.amount ??
    calcLineTotals(payload.lines).totalDebit;

  if (voucherType === "receipt") {
    return validateReceiptAllocations(bankAmount, allocations);
  }
  if (voucherType === "payment") {
    return validatePaymentAllocations(bankAmount, allocations);
  }
  return null;
}

export function recordVoucherPostingAudit(
  voucher: AccountingVoucher,
  _allocations?: VoucherAllocationLine[],
): void {
  const now = new Date();
  const typeLabel = VOUCHER_MODULE_LABEL[voucher.voucherType] ?? voucher.voucherType;

  appendAuditTrailEntry({
    dateTime: now.toISOString(),
    voucherType: typeLabel,
    voucherTypeCode: voucher.voucherType,
    voucherNo: voucher.voucherNumber,
    user: ACCOUNTS_CURRENT_USER,
    action: "Modified",
    particular: "Status",
    beforeAlteration: "Draft",
    afterAlteration: "Posted",
    status: "Posted",
  });
}

function applyAllocations(
  voucher: AccountingVoucher,
  allocations?: VoucherAllocationLine[],
): string | null {
  if (!allocations?.length) return null;

  const invoiceLines = allocations
    .filter((a) => a.invoiceId != null && a.amount > 0)
    .map((a) => ({ invoiceId: a.invoiceId!, amount: roundMoney(a.amount) }));
  const billLines = allocations
    .filter((a) => a.billId != null && a.amount > 0)
    .map((a) => ({ billId: a.billId!, amount: roundMoney(a.amount) }));

  // Receipt may allocate sales invoices (customer) or purchase bills (vendor refund).
  if (voucher.voucherType === "receipt") {
    if (invoiceLines.length) {
      const err = applyReceiptAllocation(voucher.id, invoiceLines);
      if (err) return err;
    }
    if (billLines.length) {
      const err = applyPaymentAllocation(voucher.id, billLines);
      if (err) return err;
    }
    return null;
  }

  if (voucher.voucherType === "payment") {
    if (!billLines.length) return null;
    return applyPaymentAllocation(voucher.id, billLines);
  }

  return null;
}

/**
 * Validate, save as draft, post through posting-engine, apply allocations, write audit trail.
 */
export function executeManualVoucherPost(input: ManualVoucherPostInput): PostingResult {
  const typeErr = validateTypeSpecific(input);
  if (typeErr) return { success: false, error: typeErr };

  const allocErr = validateAllocations(input);
  if (allocErr) return { success: false, error: allocErr };

  const postPayload: CreateVoucherInput = {
    ...input.payload,
    status: "draft",
  };

  let voucher: AccountingVoucher;
  try {
    if (input.voucherId != null) {
      voucher = updateVoucher(input.voucherId, postPayload);
    } else {
      voucher = createVoucher(input.voucherType, postPayload);
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to save voucher." };
  }

  const postResult = postVoucher(voucher.id);
  if (!postResult.success) {
    return postResult;
  }

  const postedVoucher = getVoucherById(voucher.id) ?? voucher;

  const allocationErr = applyAllocations(postedVoucher, input.allocations);
  if (allocationErr) {
    return {
      success: false,
      error: allocationErr,
      voucherId: voucher.id,
      voucherNumber: voucher.voucherNumber,
    };
  }

  recordVoucherPostingAudit(postedVoucher, input.allocations);
  notifyVoucherPosted(postedVoucher);

  return {
    success: true,
    voucherId: postedVoucher.id,
    voucherNumber: postResult.voucherNumber ?? postedVoucher.voucherNumber,
  };
}

export { VOUCHER_TYPE_LABELS };
