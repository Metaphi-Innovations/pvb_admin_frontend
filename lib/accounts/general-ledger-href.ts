import type { GeneralLedgerDrillDownParams } from "@/lib/accounts/general-ledger-types";

export const GENERAL_LEDGER_HREF = "/accounts/reports/general-ledger";

export const GENERAL_LEDGER_LEGACY_HREF = "/accounts/reports/ledger";

/**
 * URL builder for the General Ledger report.
 * Ledger and group ids are written as strings so UUIDs are never coerced with Number().
 */
export function buildGeneralLedgerHref(
  params: number | string | GeneralLedgerDrillDownParams,
): string {
  const p: GeneralLedgerDrillDownParams =
    typeof params === "number" || typeof params === "string"
      ? { ledgerId: params }
      : params;

  const search = new URLSearchParams();

  if (p.ledgerId != null && String(p.ledgerId).length > 0) {
    search.set("ledgerId", String(p.ledgerId));
  }
  if (p.groupId != null && String(p.groupId).length > 0 && !search.has("ledgerId")) {
    search.set("groupId", String(p.groupId));
  }
  if (p.fromDate) search.set("fromDate", p.fromDate);
  if (p.toDate) search.set("toDate", p.toDate);
  if (p.source) search.set("source", p.source);
  if (p.groupName) search.set("groupName", p.groupName);
  if (p.branch && p.branch !== "all") search.set("branch", p.branch);
  if (p.warehouse && p.warehouse !== "all") search.set("warehouse", p.warehouse);
  if (p.company && p.company !== "all") search.set("company", p.company);
  if (p.partyId && p.partyId !== "all") search.set("party", p.partyId);
  if (p.ledgerType && p.ledgerType !== "all") search.set("ledgerType", p.ledgerType);
  if (p.financialYearId && p.financialYearId !== "all") {
    search.set("fy", p.financialYearId);
  }

  if (p.ledgerId != null && String(p.ledgerId).length > 0 && !search.has("ledger")) {
    search.set("ledger", String(p.ledgerId));
  }
  if (p.fromDate && !search.has("from")) search.set("from", p.fromDate);
  if (p.toDate && !search.has("to")) search.set("to", p.toDate);

  const qs = search.toString();
  return qs ? `${GENERAL_LEDGER_HREF}?${qs}` : GENERAL_LEDGER_HREF;
}
