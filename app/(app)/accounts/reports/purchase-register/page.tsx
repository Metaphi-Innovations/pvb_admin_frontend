"use client";

import { useMemo, useState } from "react";
import { AccountsReportShell } from "@/components/accounts/AccountsReportShell";
import { buildPurchaseRegisterRows } from "@/lib/accounts/register-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportBranchFilter,
  ReportVendorFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";

export default function PurchaseRegisterPage() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange();
  const [branch, setBranch] = useState("all");
  const [vendorId, setVendorId] = useState("all");

  const vendors = useMemo(() => loadVendors(), []);

  const source = useMemo(() => {
    let rows = buildPurchaseRegisterRows(dateFrom, dateTo);
    if (vendorId !== "all") {
      const vendor = vendors.find((v) => String(v.id) === vendorId);
      if (vendor) rows = rows.filter((r) => r.party === vendor.vendorName);
    }
    return rows;
  }, [dateFrom, dateTo, vendorId, vendors, branch]);

  const rows = useMemo(
    () =>
      source.map((r) => ({
        docNo: r.docNo,
        date: r.date,
        party: r.party,
        taxable: formatMoney(r.taxable),
        tax: formatMoney(r.tax),
        total: formatMoney(r.total),
        status: r.status,
      })),
    [source],
  );

  return (
    <AccountsReportShell
      section="Purchases"
      title="Purchase Register"
      description="Register of purchase invoices with input tax details."
      filters={
        <ReportFilterRow>
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <ReportVendorFilter value={vendorId} onChange={setVendorId} vendors={vendors} />
          <ReportBranchFilter value={branch} onChange={setBranch} />
        </ReportFilterRow>
      }
      columns={[
        { key: "docNo", label: "Bill No.", mono: true },
        { key: "date", label: "Date" },
        { key: "party", label: "Vendor" },
        { key: "taxable", label: "Taxable", align: "right", money: true },
        { key: "tax", label: "Tax", align: "right", money: true },
        { key: "total", label: "Total", align: "right", money: true },
        { key: "status", label: "Status" },
      ]}
      rows={rows}
    />
  );
}
