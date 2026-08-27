"use client";

import { useParams, useRouter } from "next/navigation";
import { JournalVoucherApiForm } from "../JournalVoucherApiForm";
import { journalEditPath } from "../journal-voucher-utils";

export default function JournalVoucherViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <JournalVoucherApiForm
      voucherId={id}
      readOnly
      onDone={() => router.push("/accounts/vouchers?tab=journal")}
      onEdit={() => router.push(journalEditPath(id))}
    />
  );
}
