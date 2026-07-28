"use client";

import { createLazyClientPage } from "@/lib/createLazyClientPage";

const JournalEntryPageClient = createLazyClientPage(() => import("../JournalEntryPageClient"));

export default function NewJournalVoucherPage() {
  return <JournalEntryPageClient />;
}
