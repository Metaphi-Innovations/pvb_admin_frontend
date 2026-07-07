"use client";

import { createLazyClientPage } from "@/lib/createLazyClientPage";

const LedgerDetailClient = createLazyClientPage(() => import("./LedgerDetailClient"));

import { useParams } from "next/navigation";

export default function LedgerViewPage() {
  const { id } = useParams<{ id: string }>();
  return <LedgerDetailClient ledgerId={Number(id)} />;
}
