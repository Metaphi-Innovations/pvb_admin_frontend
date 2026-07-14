import { redirect } from "next/navigation";

/** Legacy Stock Ledger → Stock Register (Batch Wise). */
export default function StockLedgerRedirectPage({
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
  // Preserve product/warehouse/date/fy/batch params; force Batch Wise tab.
  qs.set("tab", "batch-wise");
  const suffix = qs.toString();
  redirect(
    suffix
      ? `/accounts/reports/stock-register?${suffix}`
      : "/accounts/reports/stock-register?tab=batch-wise",
  );
}
