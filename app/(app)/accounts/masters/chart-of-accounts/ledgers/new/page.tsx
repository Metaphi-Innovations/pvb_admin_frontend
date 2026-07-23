"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountsGenericLedgerFormClient from "../AccountsGenericLedgerFormClient";
import { coaPartyMasterCreateHref } from "@/lib/accounts/coa-party-master-routes";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";

export default function NewGenericLedgerPage() {
  const router = useRouter();
  const [parentGroupId, setParentGroupId] = useState<number | null | undefined>(undefined);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("parent");
    if (!raw) {
      setParentGroupId(null);
      return;
    }
    const id = Number(raw);
    if (!Number.isFinite(id)) {
      setParentGroupId(null);
      return;
    }

    const records = loadChartOfAccounts();
    const partyHref = coaPartyMasterCreateHref(id, records);
    if (partyHref) {
      setRedirecting(true);
      router.replace(partyHref);
      return;
    }
    setParentGroupId(id);
  }, [router]);

  if (parentGroupId === undefined || redirecting) {
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
