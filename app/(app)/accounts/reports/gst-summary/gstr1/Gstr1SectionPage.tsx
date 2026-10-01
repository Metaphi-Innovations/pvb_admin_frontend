"use client";

import { Gstr1SectionInvoicesPageClient } from "./components/Gstr1SectionInvoicesPageClient";
import type { Gstr1ReportSectionId } from "./gstr1-report-types";

type TransactionalSection = Exclude<
  Gstr1ReportSectionId,
  "hsn-summary" | "documents-summary" | "grand-total"
>;

export function Gstr1SectionPage({ sectionId }: { sectionId: TransactionalSection }) {
  return <Gstr1SectionInvoicesPageClient sectionId={sectionId} />;
}
