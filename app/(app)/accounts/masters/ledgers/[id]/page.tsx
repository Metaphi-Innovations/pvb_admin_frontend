"use client";

import { useParams } from "next/navigation";
import LedgerDetailClient from "./LedgerDetailClient";

export default function LedgerViewPage() {
  const { id } = useParams<{ id: string }>();
  return <LedgerDetailClient ledgerId={Number(id)} />;
}
