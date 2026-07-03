/**
 * Party ledger statement — builds transaction lists from linked COA receivable/payable ledgers
 * (posted voucher lines + bundled demo movements), shared by Customer & Supplier Ledger reports.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import type { Vendor } from "@/app/(app)/masters/vendors/vendor-data";
import {
  getBundledDemoTransactions,
  isBundledDemoLedger,
  type CoaDemoTransactionSeed,
} from "@/app/(app)/accounts/masters/chart-of-accounts/coa-demo-transactions";
import { collectLedgerRawCoaTransactions } from "@/lib/accounts/coa-accounting-view";
import { syncCustomerLedger, syncVendorLedger } from "@/lib/accounts/erp-accounting-mapping";
import { findErpPartyLink } from "@/lib/accounts/erp-party-links";
import { sortChronological } from "@/lib/accounts/running-balance";
import type { BalanceSide } from "@/lib/accounts/money-format";

export interface PartyLedgerRawMovement {
  date: string;
  voucherNo: string;
  voucherType: string;
  particular: string;
  narration: string;
  debit: number;
  credit: number;
  viewHref?: string | null;
}

function mergeLedgerMovements(ledger: ChartOfAccount): PartyLedgerRawMovement[] {
  const voucherRows = collectLedgerRawCoaTransactions(ledger).map((row) => ({
    date: row.date,
    voucherNo: row.voucherNo,
    voucherType: row.voucherType,
    particular: row.referenceNo !== "—" ? row.referenceNo : row.voucherType,
    narration: row.narration,
    debit: row.debit,
    credit: row.credit,
    viewHref: row.viewHref ?? null,
  }));

  const demoRows = getBundledDemoTransactions(ledger.id).map((seed: CoaDemoTransactionSeed) => ({
    date: seed.date,
    voucherNo: seed.voucherNo,
    voucherType: seed.voucherType,
    particular: seed.partyName || seed.particulars,
    narration: seed.particulars,
    debit: seed.debit,
    credit: seed.credit,
    viewHref: null,
  }));

  if (voucherRows.length === 0) {
    return sortChronological(demoRows);
  }

  if (!isBundledDemoLedger(ledger)) {
    return sortChronological(voucherRows);
  }

  const voucherNos = new Set(voucherRows.map((r) => r.voucherNo));
  const supplemental = demoRows.filter((r) => !voucherNos.has(r.voucherNo));
  return sortChronological([...voucherRows, ...supplemental]);
}

export function resolveCustomerReceivableLedger(customer: Customer): ChartOfAccount | null {
  const link = findErpPartyLink("customer_master", customer.id);
  if (link?.ledgerId) {
    const existing = loadChartOfAccounts().find((r) => r.id === link.ledgerId);
    if (existing) return existing;
  }
  return syncCustomerLedger(customer);
}

export function resolveVendorPayableLedger(vendor: Vendor): ChartOfAccount | null {
  const link = findErpPartyLink("vendor_master", vendor.id);
  if (link?.ledgerId) {
    const existing = loadChartOfAccounts().find((r) => r.id === link.ledgerId);
    if (existing) return existing;
  }
  return syncVendorLedger(vendor);
}

export function ledgerOpeningBalance(ledger: ChartOfAccount | null): {
  amount: number;
  balanceType: BalanceSide;
} {
  if (!ledger) return { amount: 0, balanceType: "Debit" };
  return {
    amount: ledger.openingBalance,
    balanceType: ledger.balanceType as BalanceSide,
  };
}

export function buildPartyLedgerMovements(ledger: ChartOfAccount | null): PartyLedgerRawMovement[] {
  if (!ledger) return [];
  return mergeLedgerMovements(ledger);
}
