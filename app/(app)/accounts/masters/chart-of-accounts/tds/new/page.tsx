import { AppLayout } from "@/components/layout/AppLayout";
import AccountsTdsLedgerFormClient from "./AccountsTdsLedgerFormClient";

export default function TdsLedgerNewPage({
  searchParams,
}: {
  searchParams: { parent?: string };
}) {
  const parentId = Number(searchParams.parent);
  const parentGroupId = Number.isFinite(parentId) ? parentId : 0;

  return (
    <AppLayout>
      {parentGroupId > 0 ? (
        <AccountsTdsLedgerFormClient
          parentGroupId={parentGroupId}
          onClose={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/accounts/masters/chart-of-accounts";
            }
          }}
        />
      ) : (
        <div className="max-w-[1200px] mx-auto py-8 px-5">
          <p className="text-sm text-muted-foreground">
            Missing parent group. Open Chart of Accounts and add a TDS ledger from a TDS group.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
