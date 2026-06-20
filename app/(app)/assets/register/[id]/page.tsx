"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Building2 } from "lucide-react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Button } from "@/components/ui/button";
import { ensureAssetRegisterFromCoa, findAssetById } from "@/lib/accounts/asset-register-data";
import { coaHrefForLedger } from "@/lib/accounts/coa-master-link";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { formatMoney } from "@/lib/accounts/money-format";

export default function AssetRegisterDetailPage() {
  const params = useParams();
  const assetId = Number(params.id);

  useEffect(() => {
    ensureAssetRegisterFromCoa();
  }, []);

  const asset = findAssetById(assetId);
  const ledger = asset
    ? loadChartOfAccounts().find((r) => r.id === asset.coaLedgerId)
    : undefined;
  const balance = ledger ? computeLedgerCurrentBalance(ledger) : null;

  if (!asset) {
    return (
      <ListingContainer title="Asset not found" titleIcon={Building2}>
        <p className="p-6 text-sm text-muted-foreground">
          <Link href="/assets/register" className="text-primary hover:underline">
            Back to Asset Register
          </Link>
        </p>
      </ListingContainer>
    );
  }

  return (
    <ListingContainer
      title={asset.assetName}
      titleIcon={Building2}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/assets/register">Back to Register</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={coaHrefForLedger(asset.coaLedgerId)}>View COA Ledger</Link>
          </Button>
        </div>
      }
    >
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl text-sm">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-medium">Asset Code</p>
          <p className="font-mono">{asset.assetCode}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-medium">Category</p>
          <p>{asset.category}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-medium">Acquisition Date</p>
          <p>{asset.acquisitionDate}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-medium">Status</p>
          <p className="capitalize">{asset.status}</p>
        </div>
        {ledger && balance && (
          <>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Book Value (COA)</p>
              <p className="font-semibold tabular-nums">
                {formatMoney(balance.amount)} {balance.balanceType}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">COA Ledger</p>
              <p>{ledger.accountName}</p>
            </div>
          </>
        )}
      </div>
      <p className="px-6 pb-6 text-xs text-muted-foreground max-w-2xl">
        Operational asset details are maintained here. Accounting balances and depreciation postings remain in Chart of Accounts.
      </p>
    </ListingContainer>
  );
}
