"use client";

import { useParams, useRouter } from "next/navigation";
import { VoucherEditClient } from "../../components/VoucherEditClient";

export default function VoucherEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const voucherId = Number(id);

  return (
    <VoucherEditClient
      voucherId={voucherId}
      onDone={() => router.push(`/accounts/vouchers/view/${voucherId}`)}
    />
  );
}
