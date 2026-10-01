import { formatCurrency } from "@/lib/procurement/utils";
import type { PurchaseOrder } from "./po-data";
import { getPOFollowUpExportFields } from "./po-followup-data";
import {
  getPOListingInvoiceStatus,
  getPOListingThreeWayMatchStatus,
  getPOTotalItems,
} from "./po-listing-utils";
import { THREE_WAY_MATCH_LABELS } from "@/lib/erp/three-way-match";

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportPOListingCsv(records: PurchaseOrder[]): void {
  const headers = [
    "PO No.",
    "PO Date",
    "Supplier",
    "PR No.",
    "Total Items",
    "PO Amount",
    "Invoice Status",
    "3-Way Match Status",
    "PO Status",
    "Total Follow-ups",
    "Last Follow-up Date",
    "Follow-up Status",
  ];

  const rows = records.map((po) => {
    const fu = getPOFollowUpExportFields(po.id);
    return [
      po.poNumber,
      po.poDate,
      po.supplierName,
      po.sourcePrNumber || "—",
      getPOTotalItems(po),
      formatCurrency(po.summary.grandTotal),
      getPOListingInvoiceStatus(po),
      THREE_WAY_MATCH_LABELS[getPOListingThreeWayMatchStatus(po)],
      po.status,
      fu.totalFollowUps,
      fu.lastFollowUpDate,
      fu.followUpStatus,
    ].map(escapeCsv).join(",");
  });

  const csv = [headers.map(escapeCsv).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
