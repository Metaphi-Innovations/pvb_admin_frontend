"use client";

import { useEffect, useState } from "react";
import AccountsGenericLedgerFormClient from "../AccountsGenericLedgerFormClient";

export default function NewGenericLedgerPage() {
  const [parentGroupId, setParentGroupId] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("parent");
    if (!raw) {
      setParentGroupId(null);
      return;
    }
    const id = Number(raw);
    setParentGroupId(Number.isFinite(id) ? id : null);
  }, []);

  if (parentGroupId === undefined) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <AccountsGenericLedgerFormClient mode="add" parentGroupId={parentGroupId} />
  );
}
