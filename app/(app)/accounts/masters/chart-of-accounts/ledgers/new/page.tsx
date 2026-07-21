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
    // #region agent log
    fetch('http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9961b5'},body:JSON.stringify({sessionId:'9961b5',runId:'post-fix',hypothesisId:'H-URL',location:'ledgers/new/page.tsx',message:'Generic ledger new direct-URL guard',data:{parentGroupId:id,partyHref},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
