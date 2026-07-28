/**
 * Persist / hydrate Accounting-tab fields on the linked party ledger (API).
 * Customer/Supplier masters own profile data; opening balance + bill-wise live on AccountLedger.
 */

import { LedgerService, type LedgerDetailDto } from "@/services/ledger.service";

export type PartyAccountingFormSlice = {
  openingBalance: string;
  balanceType: "Debit" | "Credit";
  openingBalanceDate: string;
  billWiseAccounting: boolean;
  accountingDescription: string;
};

function toApiBalanceType(side: "Debit" | "Credit"): "DEBIT" | "CREDIT" {
  return side === "Credit" ? "CREDIT" : "DEBIT";
}

function fromApiBalanceType(raw: string | null | undefined): "Debit" | "Credit" {
  const v = String(raw ?? "DEBIT").toUpperCase();
  return v === "CREDIT" || v === "CR" ? "Credit" : "Debit";
}

function normalizeAmount(raw: string): string {
  const n = Number(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return "0.00";
  return n.toFixed(2);
}

function effectiveDateIso(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function accountingFieldsFromLedger(
  ledger: LedgerDetailDto | null | undefined,
): Partial<PartyAccountingFormSlice> {
  if (!ledger) return {};
  const opening = ledger.openingBalance ?? ledger.openingBalances?.[0] ?? null;
  return {
    billWiseAccounting: Boolean(ledger.billWiseOutstanding),
    accountingDescription: ledger.description ?? "",
    openingBalance: opening?.amount != null ? String(opening.amount) : "0",
    balanceType: fromApiBalanceType(opening?.balanceType),
    openingBalanceDate: opening?.effectiveDate
      ? effectiveDateIso(String(opening.effectiveDate))
      : "",
  };
}

async function upsertOpeningBalance(
  ledgerId: string,
  ledger: LedgerDetailDto,
  accounting: PartyAccountingFormSlice,
  financialYearId: string,
): Promise<void> {
  const amount = normalizeAmount(accounting.openingBalance);
  const balanceType = toApiBalanceType(accounting.balanceType);
  const effectiveDate = effectiveDateIso(accounting.openingBalanceDate);
  const narration = accounting.accountingDescription.trim() || null;
  const existing =
    ledger.openingBalance ??
    ledger.openingBalances?.find((ob) => ob.financialYearId === financialYearId) ??
    ledger.openingBalances?.[0] ??
    null;

  if (existing?.openingBalanceId) {
    await LedgerService.updateOpeningBalance(ledgerId, existing.openingBalanceId, {
      amount,
      balanceType,
      effectiveDate,
      narration,
    });
    return;
  }

  // Skip create when amount is zero and nothing was entered before.
  if (Number(amount) <= 0 && !accounting.openingBalanceDate.trim()) return;

  await LedgerService.createOpeningBalance(ledgerId, {
    financialYearId,
    amount,
    balanceType,
    effectiveDate,
    narration,
  });
}

/** After customer/supplier master save — sync ERP ledger link then write Accounting tab. */
export async function persistPartyMasterAccounting(params: {
  kind: "customer" | "supplier";
  partyId: string;
  accounting: PartyAccountingFormSlice;
}): Promise<string | null> {
  const { kind, partyId, accounting } = params;
  if (!partyId) return null;

  const sync =
    kind === "customer"
      ? await LedgerService.syncCustomerLedger(partyId)
      : await LedgerService.syncSupplierLedger(partyId);

  const ledgerId = sync.ledgerId;
  if (!ledgerId) return null;

  await LedgerService.update(ledgerId, {
    billWiseOutstanding: accounting.billWiseAccounting !== false,
    description: accounting.accountingDescription.trim() || null,
  });

  const fy = await LedgerService.getCurrentFinancialYear();
  const financialYearId = fy?.financialYearId;
  if (financialYearId) {
    const latest = await LedgerService.view(ledgerId);
    await upsertOpeningBalance(ledgerId, latest, accounting, financialYearId);
  }

  return ledgerId;
}

/** Load Accounting tab values for an existing party master. */
export async function loadPartyMasterAccounting(params: {
  kind: "customer" | "supplier";
  partyId: string;
}): Promise<Partial<PartyAccountingFormSlice>> {
  const { kind, partyId } = params;
  if (!partyId) return {};
  try {
    const sync =
      kind === "customer"
        ? await LedgerService.syncCustomerLedger(partyId)
        : await LedgerService.syncSupplierLedger(partyId);
    if (!sync.ledgerId) return {};
    const ledger = await LedgerService.view(sync.ledgerId);
    return accountingFieldsFromLedger(ledger);
  } catch {
    return {};
  }
}
