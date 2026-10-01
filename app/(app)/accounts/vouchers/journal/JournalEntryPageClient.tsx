"use client";

import { useRouter } from "next/navigation";
import { StandardVoucherForm } from "@/components/accounts/voucher-form/StandardVoucherForm";
import { JOURNAL_VOUCHER_HREF } from "@/lib/accounts/accounts-nav";

export default function JournalEntryPageClient() {
  const router = useRouter();

  return (
    <StandardVoucherForm
      voucherType="journal"
      cancelHref={JOURNAL_VOUCHER_HREF}
      onDone={() => router.push(JOURNAL_VOUCHER_HREF)}
    />
  );
}
