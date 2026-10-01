/**
 * General Ledger report — thin adapter over shared compute + row enrichment.
 */

import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getActivePostingLedgers } from "@/lib/accounts/coa-hierarchy";
import { VOUCHER_TYPE_LABELS, type VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import { collectLedgerRawCoaTransactions } from "@/lib/accounts/coa-accounting-view";
import {
  buildGeneralLedgerGroupDrillDown as buildGroupDrillDownCore,
  buildGeneralLedgerStatementFromLedger,
  formatGeneralLedgerDate,
} from "@/lib/accounts/general-ledger-compute";
import {
  parentGroupLabel,
  resolveLedgerType,
} from "@/lib/accounts/ledger-detail-utils";
import { loadLedgerMeta } from "@/lib/accounts/ledger-metadata";
import { isLedgerMovementVoucherStatus } from "@/lib/accounts/running-balance";
import {
  emptyGeneralLedgerEnrichedFields,
  enrichGeneralLedgerTransactionRow,
  GL_EMPTY,
} from "./general-ledger-row-enrichment";

export type {
  GeneralLedgerDisplayRow,
  GeneralLedgerFilters,
  GeneralLedgerGroupChildRow,
  GeneralLedgerGroupDrillDown,
  GeneralLedgerLedgerOption,
  GeneralLedgerLedgerType,
  GeneralLedgerListingFilters,
  GeneralLedgerListingRow,
  GeneralLedgerRowKind,
  GeneralLedgerStatement,
  GeneralLedgerSummary,
} from "@/lib/accounts/general-ledger-types";

export {
  formatGeneralLedgerDate,
} from "@/lib/accounts/general-ledger-compute";

import type {
  GeneralLedgerFilters,
  GeneralLedgerLedgerOption,
  GeneralLedgerLedgerType,
  GeneralLedgerListingFilters,
  GeneralLedgerListingRow,
} from "@/lib/accounts/general-ledger-types";
import {
  computeClosingFromPeriodOpening,
  computePeriodOpeningBalance,
  ledgerMovementMapForRange,
} from "@/lib/accounts/ledger-transaction-date-filter";
import type { LedgerTypeLabel } from "@/lib/accounts/ledger-detail-utils";

function mapLedgerType(label: LedgerTypeLabel): GeneralLedgerLedgerType {
  if (label === "Customer") return "Customer";
  if (label === "Vendor") return "Vendor";
  if (label === "Bank") return "Bank";
  if (label === "Cash") return "Cash";
  if (label === "Sales") return "Sales";
  if (label === "Purchase") return "Purchase";
  if (label === "GST") return "GST";
  if (label === "Inventory") return "Inventory";
  if (label === "Expense") return "Expense";
  if (label === "Income") return "Income";
  if (label === "Employee Payable") return "Employee";
  return "General";
}

export function formatGeneralLedgerTypeLabel(type: GeneralLedgerLedgerType): string {
  return type;
}

export const GENERAL_LEDGER_TYPE_OPTIONS: { value: string; label: GeneralLedgerLedgerType | "All Types" }[] = [
  { value: "all", label: "All Types" },
  { value: "Customer", label: "Customer" },
  { value: "Vendor", label: "Vendor" },
  { value: "Bank", label: "Bank" },
  { value: "Cash", label: "Cash" },
  { value: "Sales", label: "Sales" },
  { value: "Purchase", label: "Purchase" },
  { value: "GST", label: "GST" },
  { value: "Expense", label: "Expense" },
  { value: "Income", label: "Income" },
  { value: "Inventory", label: "Inventory" },
  { value: "Employee", label: "Employee" },
  { value: "General", label: "General" },
];

function voucherMap() {
  return new Map(
    loadVouchers()
      .filter((v) => isLedgerMovementVoucherStatus(v.status))
      .map((v) => [v.id, v]),
  );
}

function resolveLedgerTaxFields(ledgerId: number): { gstin: string; pan: string } {
  const meta = loadLedgerMeta(ledgerId);
  return {
    gstin: meta.gstin?.trim() || GL_EMPTY,
    pan: meta.pan?.trim() || GL_EMPTY,
  };
}

export function filterGeneralLedgerLedgers(
  ledgers: GeneralLedgerLedgerOption[],
  query: string,
): GeneralLedgerLedgerOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return ledgers;
  return ledgers.filter((ledger) => {
    const typeLabel = formatGeneralLedgerTypeLabel(ledger.ledgerType);
    return [ledger.name, ledger.code, ledger.ledgerType, typeLabel, ledger.parentGroup].some((value) =>
      value.toLowerCase().includes(q),
    );
  });
}

export function getGeneralLedgerLedgers(): GeneralLedgerLedgerOption[] {
  const records = loadChartOfAccounts();
  return getActivePostingLedgers(records)
    .map((ledger) => ({
      id: String(ledger.id),
      code: ledger.accountCode,
      name: ledger.accountName,
      ledgerType: mapLedgerType(resolveLedgerType(ledger, records)),
      parentGroup: parentGroupLabel(records, ledger),
      openingBalance: ledger.openingBalance,
      openingBalanceType: ledger.balanceType,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getGeneralLedgerLedgerById(id: string): GeneralLedgerLedgerOption | null {
  return getGeneralLedgerLedgers().find((l) => l.id === id) ?? null;
}

export function getGeneralLedgerVoucherTypeOptions(): { value: string; label: string }[] {
  return [
    { value: "all", label: "All types" },
    ...(Object.entries(VOUCHER_TYPE_LABELS) as [VoucherTypeCode, string][]).map(([value, label]) => ({
      value,
      label,
    })),
  ];
}

export function getGeneralLedgerParentGroupOptions(): { value: string; label: string }[] {
  const records = loadChartOfAccounts();
  const groups = new Set<string>();
  for (const ledger of getActivePostingLedgers(records)) {
    const group = parentGroupLabel(records, ledger);
    if (group && group !== GL_EMPTY) groups.add(group);
  }
  return [
    { value: "all", label: "All groups" },
    ...Array.from(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((g) => ({ value: g, label: g })),
  ];
}

export function buildGeneralLedgerStatement(ledgerId: string, filters: GeneralLedgerFilters) {
  const vouchers = voucherMap();
  const stmt = buildGeneralLedgerStatementFromLedger(ledgerId, filters, (t, ledger) => {
    const voucher = t.voucherId ? vouchers.get(t.voucherId) : undefined;
    const enriched = enrichGeneralLedgerTransactionRow(
      {
        date: t.date,
        voucherNo: t.voucherNo,
        voucherType: t.voucherType,
        referenceNo: t.referenceNo,
        narration: t.narration,
        debit: t.debit,
        credit: t.credit,
        voucherId: t.voucherId,
        lineOrder: t.lineOrder,
        viewHref: t.viewHref,
        viewLabel: t.viewLabel,
      },
      t.particular,
      voucher,
    );
    return {
      partyName: enriched.partyName,
      gstin: enriched.gstin,
      pan: enriched.pan,
      expenseHead: enriched.expenseHead,
      particularsNarration: enriched.particularsNarration || t.particularsNarration,
      bankCash: enriched.bankCash,
      tdsSection: enriched.tdsSection,
      tdsAmount: enriched.tdsAmount,
      gstAmount: enriched.gstAmount,
      referenceNo: enriched.referenceNo,
    };
  });

  if (!stmt) return null;

  const ledger = loadChartOfAccounts().find((r) => r.id === Number(ledgerId));
  const tax = ledger ? resolveLedgerTaxFields(ledger.id) : { gstin: GL_EMPTY, pan: GL_EMPTY };

  return {
    ...stmt,
    summary: {
      ...stmt.summary,
      gstin: tax.gstin,
      pan: tax.pan,
    },
  };
}

export function buildGeneralLedgerGroupDrillDown(
  groupId: string,
  filters: GeneralLedgerFilters,
) {
  const id = Number(groupId);
  if (!Number.isFinite(id)) return null;
  return buildGroupDrillDownCore(id, filters);
}

function matchesListingSearch(row: GeneralLedgerListingRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.ledgerCode, row.ledgerName, row.ledgerType, row.parentGroup, row.gstin, row.pan].some(
    (v) => v.toLowerCase().includes(q),
  );
}

export function buildGeneralLedgerListing(
  filters: GeneralLedgerListingFilters,
): GeneralLedgerListingRow[] {
  const records = loadChartOfAccounts();
  const movementMap = ledgerMovementMapForRange(filters.dateFrom, filters.dateTo);

  const rows = getActivePostingLedgers(records).map((ledger) => {
    const ledgerType = mapLedgerType(resolveLedgerType(ledger, records));
    const group = parentGroupLabel(records, ledger);
    const tax = resolveLedgerTaxFields(ledger.id);
    const raw = collectLedgerRawCoaTransactions(ledger);
    const periodOpening = computePeriodOpeningBalance(ledger, raw, filters.dateFrom);
    const movement = movementMap.get(ledger.id) ?? { totalDebit: 0, totalCredit: 0 };
    const closing = computeClosingFromPeriodOpening(
      periodOpening,
      movement.totalDebit,
      movement.totalCredit,
    );

    return {
      ledgerId: String(ledger.id),
      ledgerCode: ledger.accountCode,
      ledgerName: ledger.accountName,
      ledgerType,
      parentGroup: group,
      gstin: tax.gstin,
      pan: tax.pan,
      openingBalance: periodOpening.amount,
      openingBalanceType: periodOpening.balanceType,
      totalDebit: movement.totalDebit,
      totalCredit: movement.totalCredit,
      closingBalance: closing.amount,
      closingBalanceType: closing.balanceType,
      lastTransactionDate: null,
    };
  });

  return rows
    .filter((row) => {
      if (filters.ledgerType !== "all" && row.ledgerType !== filters.ledgerType) return false;
      if (filters.parentGroup !== "all" && row.parentGroup !== filters.parentGroup) return false;
      return matchesListingSearch(row, filters.search);
    })
    .sort((a, b) => a.ledgerName.localeCompare(b.ledgerName));
}

export { emptyGeneralLedgerEnrichedFields, GL_EMPTY };
