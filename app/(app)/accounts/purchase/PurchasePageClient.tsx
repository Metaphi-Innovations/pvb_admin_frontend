"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, MoreVertical, Pencil, Plus } from "lucide-react";
import {
  filterPurchaseInvoices,
  loadPurchaseInvoices,
  PURCHASE_SOURCE_LABELS,
  type PurchaseInvoiceRecord,
} from "../purchase-invoices/purchase-invoices-data";
import { ThreeWayMatchStatusBadge } from "@/components/erp/ThreeWayMatchStatusBadge";
import { getThreeWayMatchForPurchase } from "@/lib/erp/three-way-match";
import {
  formatINR,
  getPurchasePaymentStatus,
  PURCHASE_BREADCRUMB,
  PURCHASE_LIST_PATH,
  PURCHASE_PAYMENT_STATUS_LABELS,
} from "./purchase-utils";

export default function PurchasePageClient() {
  const [records, setRecords] = useState<PurchaseInvoiceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [vendor, setVendor] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const refresh = useCallback(() => setRecords(loadPurchaseInvoices()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const vendorNames = useMemo(
    () => [...new Set(records.map((r) => r.vendorName).filter(Boolean))].sort(),
    [records],
  );

  const visible = useMemo(
    () => filterPurchaseInvoices(records, { search, source, vendor, dateFrom, dateTo }),
    [records, search, source, vendor, dateFrom, dateTo],
  );

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto space-y-3">
        <PageHeader
          title="Purchase"
          description="Supplier invoices from PO uploads and manual entries for accounts payable."
          breadcrumbs={PURCHASE_BREADCRUMB}
          actions={
            <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5" asChild>
              <Link href={`${PURCHASE_LIST_PATH}/new`}>
                <Plus className="w-3.5 h-3.5" />
                Manual Purchase Entry
              </Link>
            </Button>
          }
        />

        <p className="text-[11px] text-muted-foreground px-1">
          Most purchases are created when you upload a supplier invoice on a Purchase Order in Procurement.
        </p>

        <ModuleFiltersBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Purchase no., supplier invoice no., supplier, PO…"
        >
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="h-8 w-[130px] text-xs bg-white">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All sources</SelectItem>
              <SelectItem value="po_invoice" className="text-xs">PO Invoice</SelectItem>
              <SelectItem value="manual_entry" className="text-xs">Manual Entry</SelectItem>
            </SelectContent>
          </Select>
          <Select value={vendor} onValueChange={setVendor}>
            <SelectTrigger className="h-8 w-[140px] text-xs bg-white">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All suppliers</SelectItem>
              {vendorNames.map((v) => (
                <SelectItem key={v} value={v} className="text-xs">
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" className="h-8 w-[130px] text-xs bg-white" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" className="h-8 w-[130px] text-xs bg-white" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </ModuleFiltersBar>

        <div className="page-shell overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
            <table className="accounts-table w-full text-table min-w-[1200px]">
              <thead className="border-b">
                <tr>
                  {[
                    "Purchase No.",
                    "Supplier Inv. No.",
                    "Date",
                    "Supplier",
                    "PO No.",
                    "Source",
                    "3-Way Match",
                    "Purchase Status",
                    "Total",
                    "",
                  ].map((h) => (
                    <th
                      key={h || "a"}
                      className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-xs text-muted-foreground">
                      No purchase records. Upload a supplier invoice on a Purchase Order in Procurement, or add a manual entry.
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => {
                    const match = getThreeWayMatchForPurchase(r);
                    const payStatus = getPurchasePaymentStatus(r.amountPaid, r.grandTotal);
                    return (
                    <tr key={r.id} className="border-b hover:bg-brand-50/25">
                      <td className="px-2.5 py-2 text-xs font-mono font-medium">{r.invoiceNo}</td>
                      <td className="px-2.5 py-2 text-xs font-mono">{r.vendorInvoiceNo || "—"}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.invoiceDate}</td>
                      <td className="px-2.5 py-2 text-xs">{r.vendorName}</td>
                      <td className="px-2.5 py-2 text-xs font-mono">{r.poNumber || "—"}</td>
                      <td className="px-2.5 py-2 text-xs">{PURCHASE_SOURCE_LABELS[r.source]}</td>
                      <td className="px-2.5 py-2">
                        {r.poId && match ? (
                          <ThreeWayMatchStatusBadge status={match.status} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2.5 py-2 text-xs">{PURCHASE_PAYMENT_STATUS_LABELS[payStatus]}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">{formatINR(r.grandTotal)}</td>
                      <td className="px-2.5 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem asChild>
                              <Link href={`${PURCHASE_LIST_PATH}/${r.id}`} className="text-xs gap-2">
                                <Eye className="w-3.5 h-3.5" /> View
                              </Link>
                            </DropdownMenuItem>
                            {r.source === "manual_entry" && (
                              <DropdownMenuItem asChild>
                                <Link href={`${PURCHASE_LIST_PATH}/${r.id}/edit`} className="text-xs gap-2">
                                  <Pencil className="w-3.5 h-3.5" /> Edit
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
