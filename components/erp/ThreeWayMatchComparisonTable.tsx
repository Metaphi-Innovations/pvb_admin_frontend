import { ThreeWayMatchStatusBadge } from "@/components/erp/ThreeWayMatchStatusBadge";
import type { ThreeWayMatchResult } from "@/lib/erp/three-way-match";

function formatAmt(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

export function ThreeWayMatchComparisonTable({ match }: { match: ThreeWayMatchResult }) {
  const headers = [
    "Product",
    "PO Qty",
    "PO Rate",
    "PO Amount",
    "Invoice Qty",
    "Invoice Rate",
    "Invoice Amount",
    "GRN Received",
    "QC Accepted",
    "QC Rejected",
    "Status",
  ];

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs min-w-[960px]">
        <thead className="bg-muted/40 border-b">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-2 py-1.5 text-left text-[10px] uppercase text-muted-foreground font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {match.lines.map((l) => (
            <tr key={l.productCode} className="border-b border-border/40">
              <td className="px-2 py-1.5 font-medium">{l.productName}</td>
              <td className="px-2 py-1.5 tabular-nums">{l.poQty}</td>
              <td className="px-2 py-1.5 tabular-nums">{formatAmt(l.poRate)}</td>
              <td className="px-2 py-1.5 tabular-nums">{formatAmt(l.poAmount)}</td>
              <td className="px-2 py-1.5 tabular-nums">{l.invoiceQty}</td>
              <td className="px-2 py-1.5 tabular-nums">{formatAmt(l.invoiceRate)}</td>
              <td className="px-2 py-1.5 tabular-nums">{formatAmt(l.invoiceAmount)}</td>
              <td className="px-2 py-1.5 tabular-nums">{l.grnQty}</td>
              <td className="px-2 py-1.5 tabular-nums text-emerald-700">{l.qcAcceptedQty}</td>
              <td className="px-2 py-1.5 tabular-nums text-red-700">{l.qcRejectedQty}</td>
              <td className="px-2 py-1.5">
                <ThreeWayMatchStatusBadge status={l.lineStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
