import { redirect } from "next/navigation";

/** Legacy Customer Ledger bookmarks → General Ledger (Customer type filter). */
export default function CustomerLedgerRedirectPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value == null) continue;
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else qs.set(key, value);
  }
  if (!qs.has("ledgerType")) qs.set("ledgerType", "Customer");
  const suffix = qs.toString();
  redirect(
    suffix
      ? `/accounts/reports/general-ledger?${suffix}`
      : "/accounts/reports/general-ledger?ledgerType=Customer",
  );
}
