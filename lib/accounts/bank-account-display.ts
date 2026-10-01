/** Mask account number as xxxx4499 (last 4 digits visible). */
export function maskBankAccountLast4(accountNumber: string): string {
  const digits = (accountNumber ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "xxxx";
  return `xxxx${digits.slice(-4)}`;
}

/**
 * Standard display label: Account Name (xxxx4499)
 * e.g. HDFC Current A/c (xxxx4499)
 */
export function formatBankAccountLabel(accountName: string, accountNumber: string): string {
  const name = accountName.trim();
  const masked = maskBankAccountLast4(accountNumber);
  if (!name) return masked;
  if (!accountNumber.trim()) return name;
  return `${name} (${masked})`;
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
