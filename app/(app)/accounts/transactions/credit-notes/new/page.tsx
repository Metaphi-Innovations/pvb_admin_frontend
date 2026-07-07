import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const CreditNoteFormPageClient = lazyAccountsPage(() => import("../../../credit-notes/CreditNoteFormPageClient"));

import { Suspense } from "react";

type FormMode = "fresh" | "return" | "scheme";

export default function NewCreditNotePage({
  searchParams,
}: {
  searchParams?: { returnId?: string; schemeKey?: string; mode?: string; invoiceId?: string };
}) {
  const modeParam = searchParams?.mode;
  let mode: FormMode | undefined;
  if (modeParam === "fresh") mode = "fresh";
  else if (modeParam === "scheme") mode = "scheme";
  else if (searchParams?.returnId) mode = "return";
  else if (searchParams?.schemeKey) mode = "scheme";

  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading credit note form…</div>}>
      <CreditNoteFormPageClient
        returnId={searchParams?.returnId}
        schemeKey={searchParams?.schemeKey}
        invoiceId={searchParams?.invoiceId}
        mode={mode}
      />
    </Suspense>
  );
}
