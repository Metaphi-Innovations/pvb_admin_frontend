"use client";

import { useParams } from "next/navigation";
import { VoucherViewClient } from "../../components/VoucherViewClient";

export default function VoucherViewPage() {
  const { id } = useParams<{ id: string }>();
  return <VoucherViewClient voucherId={Number(id)} />;
}
