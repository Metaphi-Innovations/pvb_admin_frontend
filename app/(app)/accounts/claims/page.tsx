import { Suspense } from "react";
import HrClaimsAccountsClient from "../purchases/hr-claims/HrClaimsAccountsClient";

export default function ClaimsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading claims…</div>}>
      <HrClaimsAccountsClient />
    </Suspense>
  );
}
