"use client";
import { useParams } from "next/navigation";
import { createLazyClientPage } from "@/lib/createLazyClientPage";
const Lazy = createLazyClientPage(() => import("../../../../credit-notes/CreditNoteEditPageClient"));
export default function Route() {
  const params = useParams();
  return <Lazy creditNoteId={Number(params.id)} />;
}
