"use client";

import { useParams } from "next/navigation";
import AccountsGenericLedgerFormClient from "../../AccountsGenericLedgerFormClient";

export default function EditGenericLedgerPage() {
  const { id } = useParams<{ id: string }>();
  if (!id?.trim()) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Invalid ledger.</p>
      </div>
    );
  }

  const ledgerId = /^\d+$/.test(id) ? Number(id) : id;
  return <AccountsGenericLedgerFormClient mode="edit" ledgerId={ledgerId} />;
}
