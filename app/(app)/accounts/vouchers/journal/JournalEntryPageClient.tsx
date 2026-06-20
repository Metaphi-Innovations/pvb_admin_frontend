"use client";

import { useRouter } from "next/navigation";
import { ZohoVoucherEntryForm } from "@/components/accounts/ZohoVoucherEntryForm";
import { JOURNAL_VOUCHER_HREF } from "@/lib/accounts/accounts-nav";

export default function JournalEntryPageClient() {
  const router = useRouter();

  return (
    <ZohoVoucherEntryForm
      voucherType="journal"
      cancelHref={JOURNAL_VOUCHER_HREF}
      onDone={() => router.push(JOURNAL_VOUCHER_HREF)}
      showFinancialYear
      breadcrumbSection="Transactions"
    />
  );
}
