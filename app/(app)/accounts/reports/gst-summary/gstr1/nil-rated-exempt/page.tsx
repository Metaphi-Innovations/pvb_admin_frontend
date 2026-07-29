import { redirect } from "next/navigation";

export default function NilRatedLegacyRedirectPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") qs.set(key, value);
  }
  const query = qs.toString();
  redirect(`/accounts/reports/gst-summary/gstr1/nil-exempt-non-gst${query ? `?${query}` : ""}`);
}
