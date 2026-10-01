"use client";
import DebitNoteFormPageClient from "./DebitNoteFormPageClient";
export default function DebitNoteEditPageClient({ debitNoteId }: { debitNoteId: number }) {
  return <DebitNoteFormPageClient debitNoteId={debitNoteId} />;
}
