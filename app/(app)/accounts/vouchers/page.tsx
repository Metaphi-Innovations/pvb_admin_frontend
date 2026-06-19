import { Suspense } from "react";
import VouchersHubPageClient from "@/app/(app)/accounts/vouchers/VouchersHubPageClient";

export default function VouchersHubPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <VouchersHubPageClient />
    </Suspense>
  );
}
