"use client";
import CreditNoteFormPageClient from "./CreditNoteFormPageClient";
export default function CreditNoteEditPageClient({ creditNoteId }: { creditNoteId: number }) {
  return <CreditNoteFormPageClient creditNoteId={creditNoteId} />;
}
