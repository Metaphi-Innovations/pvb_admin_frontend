import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";

export const TDS_PARTY_WISE_REPORT_HREF = "/accounts/reports/tds-party-wise";

const TDS_SECTION_RE = /\b(19[0-9]{1}[A-Z]?)\b/i;

/** Parse TDS section code (e.g. 194C) from a ledger or group name */
export function parseTdsSectionCode(name: string): string | null {
  const m = name.match(TDS_SECTION_RE);
  return m ? m[1].toUpperCase() : null;
}

export function isTdsPayableGroup(node: ChartOfAccount): boolean {
  return node.nodeLevel === "account_group" && node.accountName === "TDS Payable";
}

export function isTdsCoaNode(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (isTdsPayableGroup(node)) return true;
  if (node.nodeLevel !== "ledger") return false;

  const path = getAncestorPath(records, node.id);
  const underTdsPayable = path.some((p) => p.accountName === "TDS Payable");
  const name = node.accountName.toLowerCase();
  const underDutiesWithTds =
    path.some((p) => p.accountName === "Duties & Taxes Payable") && name.includes("tds");

  return underTdsPayable || underDutiesWithTds || name.includes("tds payable");
}

export function buildTdsPartyWiseReportHref(
  node: ChartOfAccount,
  records?: ChartOfAccount[],
): string {
  const params = new URLSearchParams();
  const section = parseTdsSectionCode(node.accountName);
  if (section) params.set("section", section);
  if (node.nodeLevel === "ledger") params.set("ledger", String(node.id));
  if (records && node.nodeLevel === "account_group" && isTdsPayableGroup(node)) {
    params.set("group", String(node.id));
  }
  const qs = params.toString();
  return qs ? `${TDS_PARTY_WISE_REPORT_HREF}?${qs}` : TDS_PARTY_WISE_REPORT_HREF;
}
