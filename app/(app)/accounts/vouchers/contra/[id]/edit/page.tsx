"use client";

import { useParams, useRouter } from "next/navigation";
import { ContraVoucherApiForm } from "../../ContraVoucherApiForm";
import { contraViewPath } from "../../contra-voucher-utils";

export default function ContraVoucherEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <ContraVoucherApiForm
      voucherId={id}
      onDone={() => router.push(contraViewPath(id))}
    />
  );
}
