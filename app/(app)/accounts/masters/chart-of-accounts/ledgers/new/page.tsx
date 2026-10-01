"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountsGenericLedgerFormClient from "../AccountsGenericLedgerFormClient";
import { resolveCoaPartyMasterKindById } from "@/lib/accounts/coa-party-master-routes";
import { resolveCoaLedgerBehaviorById } from "@/lib/accounts/coa-ledger-behavior";
import {
  isAddLedgerBlocked,
  STATUTORY_NO_MANUAL_LEDGER_REASON,
} from "@/lib/accounts/coa-add-ledger-policy";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";

export default function NewGenericLedgerPage() {
  const router = useRouter();
  const [parentGroupId, setParentGroupId] = useState<number | null | undefined>(undefined);
  const [redirecting, setRedirecting] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

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
    const parent = records.find((r) => r.id === id);
    const partyKind = resolveCoaPartyMasterKindById(id, records);
    const behaviorKind = resolveCoaLedgerBehaviorById(id, records).kind;
    // Party + Bank Accounts must never use Generic Ledger — reopen via COA Add host.
    if (partyKind || behaviorKind === "bank") {
      setRedirecting(true);
      router.replace(`${CHART_OF_ACCOUNTS_HREF}?node=${id}&addLedger=${id}`);
      return;
    }
    // Statutory / system-controlled parents: never open Generic Ledger create.
    if (parent && isAddLedgerBlocked(parent, records)) {
      setRedirecting(true);
      setBlockedReason(STATUTORY_NO_MANUAL_LEDGER_REASON);
      router.replace(`${CHART_OF_ACCOUNTS_HREF}?node=${id}`);
      return;
    }
    setParentGroupId(id);
  }, [router]);

  if (parentGroupId === undefined || redirecting) {
    return (
      <div className="py-16 text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          {blockedReason ?? "Loading…"}
        </p>
      </div>
    );
  }

  return (
    <AccountsGenericLedgerFormClient mode="add" parentGroupId={parentGroupId} />
  );
}
