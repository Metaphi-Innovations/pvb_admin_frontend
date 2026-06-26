"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { listPendingVendorBills } from "@/lib/accounts/purchases-workflow-data";

export default function PendingVendorBillsClient() {
  const pending = useMemo(() => listPendingVendorBills(), []);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Purchases", "Pending Supplier Bills")}
      title="Pending Supplier Bills"
      description="GRN-completed receipts → create purchase invoice → posts to supplier ledger."
      actions={
        <Button asChild size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1">
          <Link href="/accounts/transactions/purchase/new">
            <Plus className="w-3.5 h-3.5" /> Create Purchase Invoice
          </Link>
        </Button>
      }
      layout="split"
    >
      <div className="flex-1 overflow-auto min-h-0">
        {pending.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No GRN-completed receipts pending supplier bill.</div>
        ) : (
          <table className="w-full text-table min-w-[800px]">
            <thead className="bg-muted/20 border-b sticky top-0">
              <tr>
                {["GRN No.", "PO Number", "Supplier", "GRN Date", "Items", "Status", ""].map((h) => (
                  <th key={h || "act"} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.grnNo} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-xs font-mono">{r.grnNo}</td>
                  <td className="px-4 py-2.5 text-xs font-mono">{r.poNumber}</td>
                  <td className="px-4 py-2.5 text-xs">{r.vendorName}</td>
                  <td className="px-4 py-2.5 text-xs">{r.grnDate}</td>
                  <td className="px-4 py-2.5 text-xs text-center">{r.itemCount}</td>
                  <td className="px-4 py-2.5 text-xs capitalize">{r.status.replace("_", " ")}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                      <Link href={`/accounts/transactions/purchase/new?grn=${encodeURIComponent(r.grnNo)}`}>
                        Create Bill
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AccountsPageShell>
  );
}
