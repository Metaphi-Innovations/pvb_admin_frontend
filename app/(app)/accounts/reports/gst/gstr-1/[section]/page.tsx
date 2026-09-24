import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ section: string }> | { section: string };
};

/** Legacy localStorage GSTR-1 section → API-backed GST Summary hub/section. */
export default async function LegacyGstr1SectionRedirectPage({ params }: PageProps) {
  const resolved = await Promise.resolve(params);
  const section = String(resolved.section || "").trim();
  const dedicated: Record<string, string> = {
    b2b: "/accounts/reports/gst-summary/gstr1/b2b",
    b2c: "/accounts/reports/gst-summary/gstr1/b2c",
    "nil-rated-exempt": "/accounts/reports/gst-summary/gstr1/nil-rated-exempt",
    "hsn-summary": "/accounts/reports/gst-summary/gstr1/hsn-summary",
    "documents-summary": "/accounts/reports/gst-summary/gstr1/documents-summary",
    "credit-debit-notes": "/accounts/reports/gst-summary/gstr1/credit-debit-notes",
  };
  redirect(dedicated[section] || "/accounts/reports/gst-summary/gstr1");
}
