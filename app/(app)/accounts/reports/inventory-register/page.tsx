import { redirect } from "next/navigation";

/** Legacy Inventory Register → Stock Register (Summary). */
export default function InventoryRegisterRedirectPage({
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
  if (!qs.has("tab")) qs.set("tab", "summary");
  const suffix = qs.toString();
  redirect(suffix ? `/accounts/reports/stock-register?${suffix}` : "/accounts/reports/stock-register?tab=summary");
}
