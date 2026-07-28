import { redirect } from "next/navigation";

export default function B2cLegacyRedirectPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") qs.set(key, value);
  }
  const query = qs.toString();
  redirect(`/accounts/reports/gst-summary/gstr1/b2c-small${query ? `?${query}` : ""}`);
}
