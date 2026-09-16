import CreditNotesListClient from "./CreditNotesListClient";

import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense>
      <CreditNotesListClient />
    </Suspense>
  );
}
