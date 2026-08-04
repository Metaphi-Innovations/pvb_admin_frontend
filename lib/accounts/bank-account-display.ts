/**
 * Standard display label: Account Name (fullAccountNumber)
 * e.g. HDFC Current A/c (50200012345678)
 * Do not mask account numbers on the frontend.
 */
export function formatBankAccountLabel(accountName: string, accountNumber: string): string {
  const name = accountName.trim();
  const number = (accountNumber ?? "").trim();
  if (!name) return number || "—";
  if (!number) return name;
  return `${name} (${number})`;
}

export function formatBankAccountMaster(
  master: { accountNickname: string; accountNumber: string },
): string {
  return formatBankAccountLabel(master.accountNickname, master.accountNumber);
}

export function formatReconciliationBankOption(acc: {
  name: string;
  accountNumber: string;
}): string {
  return formatBankAccountLabel(acc.name, acc.accountNumber);
}

/** @deprecated Prefer full accountNumber display — kept for call-site migration only. */
export function maskBankAccountLast4(accountNumber: string): string {
  const digits = (accountNumber ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits;
}
