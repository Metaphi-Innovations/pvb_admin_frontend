"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountsSundryDebtorCustomerFormClient from "./AccountsSundryDebtorCustomerFormClient";

/**
 * Direct route fallback. Prefer opening from Chart of Accounts (keeps sidebar).
 */
export default function AccountsSundryDebtorNewPage() {
  const router = useRouter();
  const [parentGroupId, setParentGroupId] = useState<number | null>(null);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("parent");
    const id = raw ? Number(raw) : NaN;
    setParentGroupId(Number.isFinite(id) ? id : null);
  }, []);

  if (parentGroupId == null) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <AccountsSundryDebtorCustomerFormClient
        parentGroupId={parentGroupId}
        onClose={() =>
          router.push(`/accounts/masters/chart-of-accounts?node=${parentGroupId}`)
        }
        onSaved={(_ledgerId, parentId) => {
          router.push(
            `/accounts/masters/chart-of-accounts?node=${parentId ?? parentGroupId}`,
          );
        }}
      />
    </div>
  );
}
