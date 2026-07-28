"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

const LEGACY_REDIRECTS: Record<string, string> = {
  b2b: "/accounts/reports/gst-summary/gstr1/b2b",
  b2c: "/accounts/reports/gst-summary/gstr1/b2c-small",
  "b2c-large": "/accounts/reports/gst-summary/gstr1/b2c-large",
  "b2c-small": "/accounts/reports/gst-summary/gstr1/b2c-small",
  "export-sez": "/accounts/reports/gst-summary/gstr1/export-sez",
  "cn-dn-registered": "/accounts/reports/gst-summary/gstr1/cn-dn-registered",
  "cn-dn-unregistered": "/accounts/reports/gst-summary/gstr1/cn-dn-unregistered",
  "credit-notes-registered": "/accounts/reports/gst-summary/gstr1/cn-dn-registered",
  "credit-notes-unregistered": "/accounts/reports/gst-summary/gstr1/cn-dn-unregistered",
  "debit-notes-registered": "/accounts/reports/gst-summary/gstr1/cn-dn-registered",
  "debit-notes-unregistered": "/accounts/reports/gst-summary/gstr1/cn-dn-unregistered",
  "nil-rated-exempt": "/accounts/reports/gst-summary/gstr1/nil-exempt-non-gst",
  "nil-exempt-non-gst": "/accounts/reports/gst-summary/gstr1/nil-exempt-non-gst",
  "hsn-summary": "/accounts/reports/gst-summary/gstr1/hsn-summary",
  "documents-summary": "/accounts/reports/gst-summary/gstr1/documents-summary",
};

export default function Gstr1SectionPageClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const sectionParam = String(params.section ?? "b2b");
  const target = LEGACY_REDIRECTS[sectionParam] ?? LEGACY_REDIRECTS.b2b;

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`${target}${qs ? `?${qs}` : ""}`);
  }, [target, searchParams, router]);

  return (
    <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
      Redirecting…
    </div>
  );
}
