"use client";

import { Suspense } from "react";
import ReconciliationPageClient from "@/app/(app)/accounts/bank-reconciliation/ReconciliationPageClient";

function ReconciliationWrapper() {
  return <ReconciliationPageClient embedded />;
}

export default function BankReconciliationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <ReconciliationWrapper />
    </Suspense>
  );
}
