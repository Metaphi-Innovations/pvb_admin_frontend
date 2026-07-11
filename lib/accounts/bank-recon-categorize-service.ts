/**
 * Bank reconciliation Step 5 — categorize unmatched transactions and post vouchers.
 */

import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import type { BankReconActivityEvent } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import {
  buildContraVoucherLines,
  buildPaymentVoucherLines,
  buildReceiptVoucherLines,
  type SimpleCashVoucherInput,
  type SimpleContraVoucherInput,
  type VoucherLine,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  listUnpaidPurchaseInvoicesForVendor,
  listUnpaidSalesInvoicesForCustomer,
} from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-data";
import { resolveCoaLedgerForV2BankAccount } from "@/lib/accounts/bank-recon-account-bridge";
import {
  buildCategorizeAccountingPreview,
  previewIsBalanced,
} from "@/lib/accounts/bank-recon-categorize-preview";
import type {
  BankReconCategorizeFormInput,
  CategorizeAuditEntry,
  CategorizeResult,
} from "@/lib/accounts/bank-recon-categorize-types";
import {
  categorizeCategoryLabel,
  isDepositCategory,
} from "@/lib/accounts/bank-recon-categorize-types";
import {
  getBankReconTransactionById,
  loadBankReconTransactions,
  notifyRegisterUpdated,
  upsertBankReconTransaction,
  type BankReconTransactionRecord,
} from "@/lib/accounts/bank-recon-register";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";
import {
  resolveCustomerReceivableLedger,
  resolveVendorPayableLedger,
} from "@/lib/accounts/party-ledger-statement";
import {
  executeManualVoucherPost,
  type VoucherAllocationLine,
} from "@/lib/accounts/voucher-posting-flow";
import { seedBankingDemoData } from "@/lib/accounts/banking-demo-seed";

const AUDIT_KEY = "dharitri_bank_recon_categorize_audit_v2";
const CURRENT_USER = ACCOUNTS_CURRENT_USER;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readAudit(): CategorizeAuditEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? (JSON.parse(raw) as CategorizeAuditEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAudit(entries: CategorizeAuditEntry[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(AUDIT_KEY, JSON.stringify(entries.slice(-500)));
}

export function appendCategorizeAudit(entry: Omit<CategorizeAuditEntry, "id" | "timestamp">): void {
  const rows = readAudit();
  rows.push({
    ...entry,
    id: `cat-audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  });
  writeAudit(rows);
}

export function loadCategorizeAudit(bankAccountId?: string): CategorizeAuditEntry[] {
  const rows = readAudit();
  if (!bankAccountId) return rows;
  return rows.filter((r) => r.bankAccountId === bankAccountId);
}

function activity(label: string, detail: string, tone: BankReconActivityEvent["tone"] = "emerald"): BankReconActivityEvent {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    detail,
    actor: CURRENT_USER,
    timestamp: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    tone,
  };
}

export function canCategorizeTransaction(record: BankReconTransactionRecord): boolean {
  if (record.matchStatus === "Matched" || record.matchStatus === "Excluded") return false;
  if (record.postedVoucherId) return false;
  if (record.manualEntryStatus === "Cancelled" || record.manualEntryStatus === "Draft") return false;
  return true;
}

function resolvePartyLedger(input: BankReconCategorizeFormInput): { id: number; name: string } | null {
  const { category, customerId, vendorId, ledgerId } = input;

  if (customerId != null && (category === "customer_receipt" || category === "customer_advance" || category === "customer_refund")) {
    const customer = loadCustomers().find((c) => c.id === customerId);
    if (!customer) return null;
    const ledger = resolveCustomerReceivableLedger(customer);
    return ledger ? { id: ledger.id, name: ledger.accountName } : null;
  }

  if (vendorId != null && (category === "vendor_payment" || category === "vendor_refund")) {
    const vendor = loadVendors().find((v) => v.id === vendorId);
    if (!vendor) return null;
    const ledger = resolveVendorPayableLedger(vendor);
    return ledger ? { id: ledger.id, name: ledger.accountName } : null;
  }

  if (ledgerId) {
    const coa = loadChartOfAccounts().find((l) => l.id === ledgerId);
    return coa ? { id: coa.id, name: coa.accountName } : null;
  }

  return null;
}

function findGstLedger(component: string): number | null {
  const records = loadChartOfAccounts();
  const hints: Record<string, string[]> = {
    CGST: ["CGST Payable", "Output CGST"],
    SGST: ["SGST Payable", "Output SGST"],
    IGST: ["IGST Payable", "Output IGST"],
    CESS: ["CESS Payable", "CESS"],
  };
  for (const hint of hints[component] ?? []) {
    const found = records.find((l) => l.accountName.toLowerCase().includes(hint.toLowerCase()));
    if (found) return found.id;
  }
  return null;
}

function findTdsPayableLedger(): number | null {
  const records = loadChartOfAccounts();
  const found = records.find((l) => l.accountName.toLowerCase().includes("tds payable"));
  return found?.id ?? null;
}

function resolveCategoryLedger(input: BankReconCategorizeFormInput): { id: number; name: string } | null {
  const party = resolvePartyLedger(input);
  if (party) return party;

  if (input.category === "gst_payment" && input.gstComponent) {
    const id = findGstLedger(input.gstComponent);
    if (id) {
      const name = loadChartOfAccounts().find((l) => l.id === id)?.accountName ?? input.gstComponent;
      return { id, name };
    }
  }

  if (input.category === "tds_payment") {
    if (input.tdsLedgerId) {
      const name = loadChartOfAccounts().find((l) => l.id === input.tdsLedgerId)?.accountName ?? "TDS Payable";
      return { id: input.tdsLedgerId, name };
    }
    const id = findTdsPayableLedger();
    if (id) {
      const name = loadChartOfAccounts().find((l) => l.id === id)?.accountName ?? "TDS Payable";
      return { id, name };
    }
  }

  if (input.ledgerId) {
    const coa = loadChartOfAccounts().find((l) => l.id === input.ledgerId);
    return coa ? { id: coa.id, name: coa.accountName } : null;
  }

  return null;
}

function resolveVoucherType(category: BankReconCategorizeFormInput["category"]): VoucherTypeCode {
  if (category === "bank_transfer") return "contra";
  if (
    category === "interest_expense" ||
    category === "gst_payment" ||
    category === "tds_payment" ||
    category === "bank_charges"
  ) {
    return "payment";
  }
  return isDepositCategory(category) ? "receipt" : "payment";
}

function buildCustomReceiptLines(
  bankLedger: { id: number; name: string },
  party: { id: number; name: string },
  bankNet: number,
  gross: number,
  charges: number,
  chargesLedger: { id: number; name: string } | null,
  referenceNo: string,
): VoucherLine[] {
  const lines: VoucherLine[] = [];
  let seq = 0;
  const nextId = () => Date.now() + seq++;

  lines.push({
    id: nextId(),
    ledgerId: bankLedger.id,
    ledgerName: bankLedger.name,
    debit: roundMoney(bankNet),
    credit: 0,
    remarks: referenceNo,
  });

  if (charges > 0 && chargesLedger) {
    lines.push({
      id: nextId(),
      ledgerId: chargesLedger.id,
      ledgerName: chargesLedger.name,
      debit: roundMoney(charges),
      credit: 0,
      remarks: "Bank charges",
    });
  }

  lines.push({
    id: nextId(),
    ledgerId: party.id,
    ledgerName: party.name,
    debit: 0,
    credit: roundMoney(gross),
    remarks: referenceNo,
  });

  return lines;
}

function validateCategorizeInput(input: BankReconCategorizeFormInput, stmt: BankReconTransactionRecord): string | null {
  if (!input.category) return "Category is required.";
  if (!input.transactionDate) return "Date is required.";
  if (!(input.bankAmount > 0)) return "Bank amount must be greater than zero.";
  if (!(input.accountAmount > 0)) return "Account amount must be greater than zero.";

  const isDeposit = stmt.deposit > 0;
  if (isDeposit && !isDepositCategory(input.category)) return "Selected category is not valid for a deposit.";
  if (!isDeposit && isDepositCategory(input.category)) return "Selected category is not valid for a withdrawal.";

  const charges = roundMoney(input.bankChargesAmount ?? 0);
  if (charges > 0) {
    if (!input.bankChargesLedgerId) return "Select a bank charges ledger.";
    if (roundMoney(input.bankAmount + charges) !== roundMoney(input.accountAmount)) {
      return `Bank amount (${formatMoney(input.bankAmount)}) + charges (${formatMoney(charges)}) must equal received amount (${formatMoney(input.accountAmount)}).`;
    }
  }

  const allocTotal = roundMoney((input.allocations ?? []).reduce((s, a) => s + a.amount, 0));
  if (allocTotal > input.accountAmount + 0.009) {
    return "Applied amount cannot exceed received/payment amount.";
  }

  for (const alloc of input.allocations ?? []) {
    if (!(alloc.amount > 0)) return "Each invoice allocation must be greater than zero.";
  }

  if (input.category === "customer_receipt" && input.customerId) {
    const invoices = listUnpaidSalesInvoicesForCustomer(Number(input.customerId));
    for (const alloc of input.allocations ?? []) {
      if (!alloc.invoiceId) continue;
      const inv = invoices.find((i) => i.id === alloc.invoiceId);
      if (inv && alloc.amount > inv.balance + 0.009) {
        return `Applied amount for ${inv.label} cannot exceed outstanding ${formatMoney(inv.balance)}.`;
      }
    }
  }

  if (input.category === "vendor_payment" && input.vendorId) {
    const bills = listUnpaidPurchaseInvoicesForVendor(Number(input.vendorId));
    for (const alloc of input.allocations ?? []) {
      if (!alloc.billId) continue;
      const bill = bills.find((b) => b.id === alloc.billId);
      if (bill && alloc.amount > bill.balance + 0.009) {
        return `Applied amount for ${bill.label} cannot exceed outstanding ${formatMoney(bill.balance)}.`;
      }
    }
  }

  if (input.category === "customer_receipt" || input.category === "customer_advance" || input.category === "customer_refund") {
    if (!input.customerId) return "Customer is required.";
  }
  if (input.category === "vendor_payment" || input.category === "vendor_refund") {
    if (!input.vendorId) return "Vendor is required.";
  }

  if (input.category === "bank_transfer") {
    if (!input.toBankLedgerId) return "Transfer destination bank is required.";
    const bankLedger = resolveCoaLedgerForV2BankAccount(input.bankAccountId);
    if (bankLedger && input.toBankLedgerId === bankLedger.id) return "Cannot transfer to the same bank account.";
  }

  const party = resolveCategoryLedger(input);
  if (!party && input.category !== "bank_transfer") {
    return "Party or ledger is required for this category.";
  }

  const preview = buildCategorizeAccountingPreview(input, party?.name ?? "Ledger");
  if (!previewIsBalanced(preview)) return "Accounting preview is not balanced.";

  return null;
}

export function categorizeBankTransaction(input: BankReconCategorizeFormInput): CategorizeResult {
  seedBankingDemoData();

  const stmt = getBankReconTransactionById(input.statementTransactionId);
  if (!stmt) return { ok: false, error: "Statement transaction not found." };
  if (stmt.bankAccountId !== input.bankAccountId) return { ok: false, error: "Bank account mismatch." };
  if (!canCategorizeTransaction(stmt)) return { ok: false, error: "This transaction cannot be categorized." };
  if (stmt.postedVoucherId) return { ok: false, error: "A voucher was already created for this transaction." };

  const validationErr = validateCategorizeInput(input, stmt);
  if (validationErr) return { ok: false, error: validationErr };

  const bankLedger = resolveCoaLedgerForV2BankAccount(input.bankAccountId);
  if (!bankLedger) return { ok: false, error: "Could not resolve bank ledger for this account." };

  const party = resolveCategoryLedger(input);
  const voucherType = resolveVoucherType(input.category);
  const referenceNo = input.referenceNo?.trim() || stmt.reference || stmt.utrNumber || "";
  const narration = input.narration?.trim() || stmt.narration || categorizeCategoryLabel(input.category);
  const bankNet = roundMoney(input.bankAmount);
  const gross = roundMoney(input.accountAmount);
  const charges = roundMoney(input.bankChargesAmount ?? 0);
  const tds = roundMoney(input.tdsAmount ?? 0);

  appendCategorizeAudit({
    user: CURRENT_USER,
    bankAccountId: input.bankAccountId,
    statementTransactionId: input.statementTransactionId,
    action: "Category Selected",
    category: input.category,
    details: categorizeCategoryLabel(input.category),
  });

  let lines: VoucherLine[] = [];
  let simpleCashInput: SimpleCashVoucherInput | undefined;
  let simpleContraInput: SimpleContraVoucherInput | undefined;

  if (input.category === "bank_transfer" && input.toBankLedgerId) {
    const toLedger = loadChartOfAccounts().find((l) => l.id === input.toBankLedgerId);
    if (!toLedger) return { ok: false, error: "Invalid transfer destination." };
    simpleContraInput = {
      fromLedgerId: bankLedger.id,
      fromLedgerName: bankLedger.accountName,
      toLedgerId: toLedger.id,
      toLedgerName: toLedger.accountName,
      amount: bankNet,
      referenceNo,
    };
    lines = buildContraVoucherLines(simpleContraInput);
  } else if (
    isDepositCategory(input.category) &&
    input.category === "customer_receipt" &&
    charges > 0 &&
    party
  ) {
    const chargesLedger = input.bankChargesLedgerId
      ? loadChartOfAccounts().find((l) => l.id === input.bankChargesLedgerId)
      : null;
    if (!chargesLedger) return { ok: false, error: "Bank charges ledger is required." };
    lines = buildCustomReceiptLines(
      { id: bankLedger.id, name: bankLedger.accountName },
      party,
      bankNet,
      gross,
      charges,
      { id: chargesLedger.id, name: chargesLedger.accountName },
      referenceNo,
    );
  } else if (isDepositCategory(input.category) && party) {
    simpleCashInput = {
      partyLedgerId: party.id,
      partyLedgerName: party.name,
      bankCashLedgerId: bankLedger.id,
      bankCashLedgerName: bankLedger.accountName,
      amount: bankNet,
      bankAmount: bankNet,
      accountAmount: roundMoney(gross + tds),
      referenceNo,
      tdsAmount: tds > 0 ? tds : undefined,
      tdsLedgerId: input.tdsLedgerId ?? undefined,
      tdsSectionMasterId: input.tdsSectionMasterId ?? undefined,
    };
    lines = buildReceiptVoucherLines(simpleCashInput);
  } else if (party) {
    const isExpense = input.category === "expense" || input.category === "bank_charges";
    simpleCashInput = {
      partyLedgerId: isExpense ? null : party.id,
      partyLedgerName: isExpense ? "" : party.name,
      bankCashLedgerId: bankLedger.id,
      bankCashLedgerName: bankLedger.accountName,
      amount: bankNet,
      bankAmount: bankNet,
      accountAmount: roundMoney(gross),
      referenceNo,
      expenseHeadLedgerId: isExpense ? party.id : undefined,
      expenseHeadLedgerName: isExpense ? party.name : undefined,
      tdsAmount: tds > 0 ? tds : undefined,
      tdsLedgerId: input.tdsLedgerId ?? undefined,
      tdsSectionMasterId: input.tdsSectionMasterId ?? undefined,
    };
    lines = buildPaymentVoucherLines(simpleCashInput);
  }

  const allocations: VoucherAllocationLine[] = (input.allocations ?? [])
    .filter((a) => a.amount > 0.009)
    .map((a) => ({
      invoiceId: a.invoiceId,
      billId: a.billId,
      amount: roundMoney(a.amount),
      documentNo: a.documentNo,
    }));

  appendCategorizeAudit({
    user: CURRENT_USER,
    bankAccountId: input.bankAccountId,
    statementTransactionId: input.statementTransactionId,
    action: allocations.length ? "Invoice Allocation Prepared" : "Voucher Creation Started",
    category: input.category,
    details: allocations.map((a) => `${a.documentNo ?? a.invoiceId ?? a.billId}: ${formatMoney(a.amount)}`).join("; "),
  });

  const postResult = executeManualVoucherPost({
    voucherType,
    simpleCashInput,
    simpleContraInput,
    allocations: allocations.length ? allocations : undefined,
    payload: {
      date: input.transactionDate,
      financialYearId: null,
      financialYearName: "",
      referenceNo,
      narration,
      paymentMode: stmt.transactionMode ?? "NEFT/RTGS",
      lines,
      status: "draft",
      entryMode: simpleCashInput || simpleContraInput ? "simple" : "double",
    },
  });

  if (!postResult.success || !postResult.voucherId) {
    return { ok: false, error: postResult.error ?? "Failed to create voucher." };
  }

  const allocSummary = allocations.length
    ? allocations.map((a) => `${a.documentNo ?? ""} ${formatMoney(a.amount)}`).join(", ")
    : input.advanceHandling === "keep_advance"
      ? "Balance kept as customer advance"
      : "On-account";

  const preservedBookDate = stmt.bookDate ?? input.transactionDate;

  const updated: BankReconTransactionRecord = {
    ...stmt,
    bookDate: preservedBookDate,
    matchStatus: "Matched",
    purposeCategory: categorizeCategoryLabel(input.category),
    postedVoucherId: postResult.voucherId,
    categorizationCategory: input.category,
    categorizationPayload: JSON.stringify({
      allocations: input.allocations ?? [],
      advanceHandling: input.advanceHandling,
      bankChargesAmount: charges,
      remarks: input.remarks,
    }),
    relatedRecord: {
      voucherType: voucherType === "receipt" ? "Receipt Voucher" : voucherType === "payment" ? "Payment Voucher" : voucherType === "contra" ? "Contra Voucher" : "Journal Voucher",
      voucherNumber: postResult.voucherNumber ?? "",
      customer: party?.name ?? stmt.partyLedger,
      invoiceReference: allocations.map((a) => a.documentNo).filter(Boolean).join(", "),
      matchConfidence: "Categorized",
      matchMethod: "Categorized",
      matchedBy: CURRENT_USER,
      matchedOn: new Date().toISOString(),
      bookDate: preservedBookDate,
      partyLedger: party?.name ?? stmt.partyLedger,
      reference: referenceNo,
    },
    internalRemarks: input.remarks ?? stmt.internalRemarks,
    costCentre: input.costCentre ?? stmt.costCentre,
    activity: [
      ...stmt.activity,
      activity("Transaction categorized", `${categorizeCategoryLabel(input.category)} → ${postResult.voucherNumber}`, "emerald"),
      activity("Voucher created", `${postResult.voucherNumber} posted to GL`, "purple"),
      ...(allocations.length
        ? [activity("Invoice allocation", allocSummary, "blue")]
        : []),
      ...(charges > 0 ? [activity("Bank charges added", formatMoney(charges), "amber")] : []),
    ],
  };

  upsertBankReconTransaction(updated);

  appendCategorizeAudit({
    user: CURRENT_USER,
    bankAccountId: input.bankAccountId,
    statementTransactionId: input.statementTransactionId,
    action: "Voucher Created",
    category: input.category,
    voucherNumber: postResult.voucherNumber,
    details: `${postResult.voucherNumber} — ${allocSummary}`,
  });

  notifyRegisterUpdated();
  return {
    ok: true,
    voucherId: postResult.voucherId,
    voucherNumber: postResult.voucherNumber,
    voucherType,
  };
}

export function listUncategorizedTransactions(bankAccountId: string): BankReconTransactionRecord[] {
  return loadBankReconTransactions(bankAccountId).filter(canCategorizeTransaction);
}
