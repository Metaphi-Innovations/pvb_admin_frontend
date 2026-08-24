"use client";

import { useParams, useRouter } from "next/navigation";
import { JournalVoucherApiForm } from "../../JournalVoucherApiForm";
import { journalViewPath } from "../../journal-voucher-utils";

export default function JournalVoucherEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <JournalVoucherApiForm
      voucherId={id}
      onDone={() => router.push(journalViewPath(id))}
    />
  );
}
