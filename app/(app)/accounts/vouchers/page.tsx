import VouchersHubPageClient from "@/app/(app)/accounts/vouchers/VouchersHubPageClient";

import { Suspense } from "react";

export default function VouchersHubPage() {
  return (
    <Suspense fallback={null}>
      <VouchersHubPageClient />
    </Suspense>
  );
}
