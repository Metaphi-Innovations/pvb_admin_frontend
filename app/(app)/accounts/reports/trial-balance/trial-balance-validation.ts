import type {
  TrialBalanceDetailedFlatRow,
  TrialBalanceDetailedLedgerRow,
} from "./trial-balance-data";
import type {
  TrialBalanceNormalLedgerRow,
  TrialBalanceNormalPrimaryHeadRow,
} from "./trial-balance-display";

/** Particular / ledger name must be a non-empty string to render in Trial Balance. */
export function isValidTrialBalanceParticular(
  name: string | null | undefined,
): name is string {
  return typeof name === "string" && name.trim().length > 0;
}

const loggedInvalidKeys = new Set<string>();

/** Dev-only warning when invalid records are excluded from Trial Balance output. */
export function warnInvalidTrialBalanceRecord(
  context: string,
  details: Record<string, unknown>,
): void {
  const key = `${context}|${JSON.stringify(details)}`;
  if (loggedInvalidKeys.has(key)) return;
  loggedInvalidKeys.add(key);
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[Trial Balance] Invalid record skipped (${context})`, details);
  }
}

export function isValidTrialBalanceLedgerRow(
  ledger: Pick<TrialBalanceDetailedLedgerRow, "ledgerId" | "ledgerCode" | "ledgerName">,
): boolean {
  if (!isValidTrialBalanceParticular(ledger.ledgerName)) {
    warnInvalidTrialBalanceRecord("ledger", {
      ledgerId: ledger.ledgerId,
      ledgerCode: ledger.ledgerCode,
      ledgerName: ledger.ledgerName,
    });
    return false;
  }
  return true;
}

export function filterValidTrialBalanceLedgerRows<
  T extends Pick<TrialBalanceDetailedLedgerRow, "ledgerId" | "ledgerCode" | "ledgerName">,
>(rows: T[]): T[] {
  return rows.filter(isValidTrialBalanceLedgerRow);
}

export function isRenderableTrialBalanceNormalRow(
  row: TrialBalanceNormalLedgerRow | TrialBalanceNormalPrimaryHeadRow,
): boolean {
  if (row.type === "primary") {
    return isValidTrialBalanceParticular(row.primaryHead);
  }
  return isValidTrialBalanceLedgerRow(row.ledger);
}

export function isRenderableTrialBalanceDetailedRow(
  row: TrialBalanceDetailedFlatRow,
): boolean {
  switch (row.type) {
    case "primary":
      if (!isValidTrialBalanceParticular(row.primaryHead)) {
        warnInvalidTrialBalanceRecord("primary", { primaryHeadId: row.primaryHeadId });
        return false;
      }
      return true;
    case "group":
      if (!isValidTrialBalanceParticular(row.groupName)) {
        warnInvalidTrialBalanceRecord("group", { groupKey: row.groupKey });
        return false;
      }
      return true;
    case "subgroup":
      if (!isValidTrialBalanceParticular(row.subgroupName)) {
        warnInvalidTrialBalanceRecord("subgroup", { subgroupKey: row.subgroupKey });
        return false;
      }
      return true;
    case "ledger":
      return isValidTrialBalanceLedgerRow(row.ledger);
    case "voucher":
      if (!isValidTrialBalanceParticular(row.voucher.voucherNo)) {
        warnInvalidTrialBalanceRecord("voucher", {
          voucherId: row.voucher.voucherId,
          ledgerId: row.ledgerId,
        });
        return false;
      }
      return true;
    default:
      return false;
  }
}
