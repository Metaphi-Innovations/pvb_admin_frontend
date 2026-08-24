"use client";

import { useRouter } from "next/navigation";
import { JournalVoucherForm } from "./JournalVoucherForm";
import { JOURNAL_LIST_PATH } from "./journal-voucher-utils";

export default function JournalEntryPageClient() {
  const router = useRouter();

  return (
    <JournalVoucherForm
      onDone={() => router.push(JOURNAL_LIST_PATH)}
    />
  );
}
