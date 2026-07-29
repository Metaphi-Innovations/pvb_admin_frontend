"use client";

import { createLazyClientPage } from "@/lib/createLazyClientPage";

const JournalListPageClient = createLazyClientPage(() => import("./JournalListPageClient"));

export default function JournalVoucherPage() {
  return <JournalListPageClient />;
}
