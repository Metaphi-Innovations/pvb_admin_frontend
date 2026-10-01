"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Building2, ExternalLink } from "lucide-react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { ensureAssetRegisterFromCoa, loadAssetRegister } from "@/lib/accounts/asset-register-data";
import { coaHrefForLedger } from "@/lib/accounts/coa-master-link";

export default function AssetRegisterPage() {
  useEffect(() => {
    ensureAssetRegisterFromCoa();
  }, []);

  const assets = useMemo(() => loadAssetRegister(), []);

  return (
    <ListingContainer title="Asset Register" titleIcon={Building2}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/20 text-muted-foreground text-left">
              <th className="px-4 py-2 font-medium">Asset Code</th>
              <th className="px-4 py-2 font-medium">Asset Name</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">COA Ledger</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-b border-border/40 hover:bg-muted/10">
                <td className="px-4 py-2 font-mono">{a.assetCode}</td>
                <td className="px-4 py-2">
                  <Link href={`/assets/register/${a.id}`} className="text-primary hover:underline font-medium">
                    {a.assetName}
                  </Link>
                </td>
                <td className="px-4 py-2">{a.category}</td>
                <td className="px-4 py-2 capitalize">{a.status}</td>
                <td className="px-4 py-2">
                  <Link
                    href={coaHrefForLedger(a.coaLedgerId)}
                    className="text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                  >
                    View in COA <ExternalLink className="w-3 h-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ListingContainer>
  );
}
