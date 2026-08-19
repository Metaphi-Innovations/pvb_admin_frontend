"use client";

import CreditNoteFormPageClient from "./CreditNoteFormPageClient";

/** Edit wrapper — Credit Note identity is a UUID in the URL; the form reads it from the pathname. */
export default function CreditNoteEditPageClient() {
  return <CreditNoteFormPageClient />;
}
