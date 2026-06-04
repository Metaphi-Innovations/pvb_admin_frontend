"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";

export default function AccountsReportsPage() {
  return (
    <AppLayout>
      <div className="max-w-[900px] mx-auto space-y-3">
        <h1 className="text-lg font-semibold">Reports</h1>
        <div className="bg-white border border-border/60 rounded-lg p-3 space-y-1">
          <Link className="h-9 px-3 rounded-md hover:bg-muted/30 text-sm flex items-center justify-between" href="/accounts/reports/trial-balance">Trial Balance <span>›</span></Link>
          <Link className="h-9 px-3 rounded-md hover:bg-muted/30 text-sm flex items-center justify-between" href="/accounts/reports/pl">P&amp;L <span>›</span></Link>
          <Link className="h-9 px-3 rounded-md hover:bg-muted/30 text-sm flex items-center justify-between" href="/accounts/reports/balance-sheet">Balance Sheet <span>›</span></Link>
        </div>
      </div>
    </AppLayout>
  );
}
