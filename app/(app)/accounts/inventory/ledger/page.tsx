import { Suspense } from "react";
import InventoryLedgerPageClient from "./InventoryLedgerPageClient";

export default function InventoryLedgerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <InventoryLedgerPageClient />
    </Suspense>
  );
}
