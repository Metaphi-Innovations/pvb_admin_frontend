"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { AccountsListingChrome } from "@/components/accounts/ui";
import { AccountsFilterBar } from "@/components/accounts/AccountsFilterBar";
import { AccountsListingDateFilter } from "@/components/accounts/AccountsListingFilter";
import { Button } from "@/components/ui/button";
import {
  AccountsEditAction,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { ReportMultiSelect } from "@/components/accounts/ReportMultiSelect";
import { Plus } from "lucide-react";
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
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { cn } from "@/lib/utils";

export default function PurchasePageClient() {
  const [records, setRecords] = useState<PurchaseInvoiceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
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

  const sourceOptions = useMemo(
    () =>
      (Object.entries(PURCHASE_SOURCE_LABELS) as [string, string][]).map(
        ([value, label]) => ({ value, label }),
      ),
    [],
  );

  const vendorOptions = useMemo(
    () => vendorNames.map((v) => ({ value: v, label: v })),
    [vendorNames],
  );

  const visible = useMemo(
    () =>
      filterPurchaseInvoices(records, {
        search,
        source: sources,
        vendor: vendors,
        dateFrom,
        dateTo,
      }),
    [records, search, sources, vendors, dateFrom, dateTo],
  );

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto space-y-3">
        <AccountsListingChrome
          title="Purchase"
          description="Supplier invoices from PO uploads and manual entries for accounts payable."
          breadcrumbs={PURCHASE_BREADCRUMB}
          actions={
            <Button size="sm" className="h-8 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1.5" asChild>
              <Link href={`${PURCHASE_LIST_PATH}/new`}>
                <Plus className="w-3.5 h-3.5" />
                Manual Purchase Entry
              </Link>
            </Button>
          }
        />

        <p className="text-xs text-muted-foreground px-1">
          Most purchases are created when you upload a supplier invoice on a Purchase Order in Procurement.
        </p>

        <AccountsFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Purchase no., supplier invoice no., supplier, PO…"
        >
          <ReportMultiSelect
            label="Source"
            values={sources}
            onChange={setSources}
            options={sourceOptions}
            entityName="Source"
            allLabel="All sources"
            minWidthClass="min-w-[130px]"
          />
          <ReportMultiSelect
            label="Supplier"
            values={vendors}
            onChange={setVendors}
            options={vendorOptions}
            entityName="Supplier"
            allLabel="All suppliers"
            minWidthClass="min-w-[140px]"
          />
          <AccountsListingDateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
        </AccountsFilterBar>

        <div className="page-shell overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
            <table className="accounts-table w-full min-w-[1200px]">
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
                      className="px-2.5 py-2 text-left text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="accounts-table-empty">
                      No purchase records. Upload a supplier invoice on a Purchase Order in Procurement, or add a manual entry.
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => {
                    const match = getThreeWayMatchForPurchase(r);
                    const payStatus = getPurchasePaymentStatus(r.amountPaid, r.grandTotal);
                    return (
                    <tr key={r.id} className="accounts-table-row group">
                      <td className="px-2.5 py-2 text-xs font-mono font-medium">{r.invoiceNo}</td>
                      <td className="px-2.5 py-2 text-xs font-mono">{r.vendorInvoiceNo || "—"}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{formatDisplayDate(r.invoiceDate)}</td>
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
                      <td className={cn("px-2.5 py-2", accountsActionColClass("multi"))}>
                        <AccountsTableActionCell>
                          <AccountsViewAction href={`${PURCHASE_LIST_PATH}/${r.id}`} />
                          {r.source === "manual_entry" && (
                            <AccountsEditAction href={`${PURCHASE_LIST_PATH}/${r.id}/edit`} />
                          )}
                        </AccountsTableActionCell>
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
