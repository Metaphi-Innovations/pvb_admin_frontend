import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { collectLedgerTransactions } from "@/lib/accounts/ledger-detail-utils";

function collectDescendantLedgers(records: ChartOfAccount[], nodeId: number): ChartOfAccount[] {
  const ids = new Set<number>();
  const queue = [nodeId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const c of records.filter((r) => r.parentAccountId === id)) {
      if (c.nodeLevel === "ledger") {
        if (!c.bankGroupFlag) ids.add(c.id);
      } else {
        queue.push(c.id);
      }
    }
  }
  return records.filter((r) => ids.has(r.id));
}

export interface CoaNodeStats {
  linkedLedgerCount: number;
  openingBalance: number;
  currentBalance: number;
  totalDebit: number;
  totalCredit: number;
  lastTransactionDate: string;
}

export function computeCoaNodeStats(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): CoaNodeStats {
  const ledgers =
    node.nodeLevel === "ledger"
      ? node.bankGroupFlag
        ? []
        : [node]
      : collectDescendantLedgers(records, node.id);

  let openingBalance = 0;
  let currentBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  let lastTransactionDate = "—";

  for (const ledger of ledgers) {
    openingBalance += ledger.openingBalance;
    const bal = computeLedgerCurrentBalance(ledger);
    currentBalance += bal.amount;
    const rows = collectLedgerTransactions(ledger.id);
    for (const row of rows) {
      totalDebit += row.debit;
      totalCredit += row.credit;
      if (row.date && row.date > lastTransactionDate) lastTransactionDate = row.date;
    }
  }

  if (lastTransactionDate === "—" && ledgers.length === 0) {
    lastTransactionDate = "—";
  }

  return {
    linkedLedgerCount: ledgers.length,
    openingBalance,
    currentBalance,
    totalDebit,
    totalCredit,
    lastTransactionDate,
  };
}
