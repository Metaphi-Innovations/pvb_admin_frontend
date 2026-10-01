import type { CoaLedgerDetailRow } from "./coa-demo-accounting";

/** Filter ledger statement rows by toolbar search (selected ledger only). */
export function filterLedgerStatementRows(
  rows: CoaLedgerDetailRow[],
  query: string,
): CoaLedgerDetailRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => {
    const hay = [
      r.date,
      r.voucherNo,
      r.voucherType,
      r.narration,
      r.partyName,
      r.referenceNo,
      String(r.debit),
      String(r.credit),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
