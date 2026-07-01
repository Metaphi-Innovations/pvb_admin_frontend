"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { listPendingTaxInvoices } from "@/lib/accounts/sales-workflow-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NEAR_EXPIRY_SETTLEMENT_TOOLTIP } from "@/app/(app)/warehouse/dispatch/near-expiry-dispatch";

function buildGenerateInvoiceHref(row: ReturnType<typeof listPendingTaxInvoices>[number]) {
  const params = new URLSearchParams();
  params.set("dispatchId", row.dispatchId);
  if (row.salesOrderId) params.set("so", String(row.salesOrderId));
  params.set("dispatch", row.dispatchNo);
  return `/accounts/transactions/invoices/new?${params.toString()}`;
}

export default function PendingTaxInvoicesClient() {
  const pending = useMemo(() => listPendingTaxInvoices(), []);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", "Pending Invoices")}
      title="Pending Invoices"
      description="Dispatch-completed orders from Warehouse — generate tax invoice and post to ledger."
      layout="split"
    >
      <div className="flex-1 overflow-auto min-h-0">
        {pending.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No dispatch-ready orders pending invoice generation.
          </div>
        ) : (
          <TooltipProvider>
            <table className="accounts-table w-full text-table min-w-[1060px]">
              <thead className="border-b">
                <tr>
                  {[
                    "Sales Order No",
                    "Dispatch No",
                    "Customer",
                    "Dispatch Date",
                    "Taxable Value",
                    "GST Amount",
                    "Invoice Value",
                    "Status",
                    "Scheme",
                    "Settlement",
                    "",
                  ].map((h) => (
                    <th
                      key={h || "act"}
                      className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.dispatchId} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-xs font-mono font-medium text-brand-700">{r.soNumber}</td>
                    <td className="px-4 py-2.5 text-xs font-mono">{r.dispatchNo}</td>
                    <td className="px-4 py-2.5 text-xs">{r.customerName}</td>
                    <td className="px-4 py-2.5 text-xs">{r.dispatchDate}</td>
                    <td className="px-4 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.taxableValue)}</td>
                    <td className="px-4 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.gstAmount)}</td>
                    <td className="px-4 py-2.5 text-xs text-right tabular-nums font-semibold">
                      {formatMoney(r.invoiceValue)}
                    </td>
                    <td className="px-4 py-2.5 text-xs">{r.status}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {r.schemeLabel ? (
                        <Badge
                          variant="outline"
                          className="h-5 px-1.5 text-[10px] font-semibold border-orange-200 bg-orange-50 text-orange-800 whitespace-nowrap"
                        >
                          {r.schemeLabel}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {r.settlementLabel ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="h-5 px-1.5 text-[10px] font-semibold border-amber-200 bg-amber-50 text-amber-800 whitespace-nowrap cursor-help"
                            >
                              {r.settlementLabel}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            {NEAR_EXPIRY_SETTLEMENT_TOOLTIP}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button asChild size="sm" className="h-7 text-[11px] bg-brand-600 hover:bg-brand-700 text-white gap-1">
                        <Link href={buildGenerateInvoiceHref(r)}>
                          <FileText className="w-3 h-3" />
                          Generate Invoice
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TooltipProvider>
        )}
      </div>
    </AccountsPageShell>
  );
}
