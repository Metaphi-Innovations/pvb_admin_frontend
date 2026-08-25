"use client";

import { useRouter } from "next/navigation";
import { ContraVoucherForm } from "../../components/ContraVoucherForm";
import { CONTRA_LIST_PATH } from "../contra-voucher-utils";

export default function NewContraVoucherPage() {
  const router = useRouter();

  return (
    <ContraVoucherForm onDone={() => router.push(CONTRA_LIST_PATH)} />
  );
}
