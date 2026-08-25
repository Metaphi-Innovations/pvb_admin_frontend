"use client";

import { useParams, useRouter } from "next/navigation";
import { ContraVoucherApiForm } from "../ContraVoucherApiForm";
import { contraEditPath } from "../contra-voucher-utils";

export default function ContraVoucherViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <ContraVoucherApiForm
      voucherId={id}
      readOnly
      onDone={() => router.push("/accounts/vouchers?tab=contra")}
      onEdit={() => router.push(contraEditPath(id))}
    />
  );
}
