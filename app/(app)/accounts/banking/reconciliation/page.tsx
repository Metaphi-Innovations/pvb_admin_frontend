"use client";

import { Suspense } from "react";
import ManualBankReconciliationPageClient from "@/app/(app)/accounts/bank-reconciliation/ManualBankReconciliationPageClient";

function ReconciliationWrapper() {
  return <ManualBankReconciliationPageClient />;
}

export default function BankReconciliationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <ReconciliationWrapper />
    </Suspense>
  );
}
