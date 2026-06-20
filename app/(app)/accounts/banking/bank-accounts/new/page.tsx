import { Suspense } from "react";
import BankAccountFormClient from "../BankAccountFormClient";

export default function NewBankAccountPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <BankAccountFormClient />
    </Suspense>
  );
}
