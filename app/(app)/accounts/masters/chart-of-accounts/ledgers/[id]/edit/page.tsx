"use client";

import { useParams } from "next/navigation";
import AccountsGenericLedgerFormClient from "../../AccountsGenericLedgerFormClient";

export default function EditGenericLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const ledgerId = Number(id);

  if (!Number.isFinite(ledgerId)) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Invalid ledger.</p>
      </div>
    );
  }

  return <AccountsGenericLedgerFormClient mode="edit" ledgerId={ledgerId} />;
}
