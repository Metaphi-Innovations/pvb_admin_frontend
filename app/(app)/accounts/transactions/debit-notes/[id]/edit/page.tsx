"use client";
import { useParams } from "next/navigation";
import { createLazyClientPage } from "@/lib/createLazyClientPage";
const Lazy = createLazyClientPage(() => import("../../../../debit-notes/DebitNoteEditPageClient"));
export default function Route() { const params = useParams(); return <Lazy debitNoteId={Number(params.id)} />; }
