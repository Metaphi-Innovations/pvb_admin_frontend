import DebitNotesListClient from "./DebitNotesListClient";

import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense>
      <DebitNotesListClient />
    </Suspense>
  );
}
