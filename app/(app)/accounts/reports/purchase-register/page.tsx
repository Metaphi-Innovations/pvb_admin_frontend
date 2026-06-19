"use client";

import { useMemo, useState } from "react";
import { FileText, IndianRupee, Receipt } from "lucide-react";
import {
  AccountsReportShell,
  ReportFilterBar,
} from "@/components/accounts/AccountsReportShell";
import { PURCHASE_REGISTER_SEED } from "@/lib/accounts/accounts-mock-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function PurchaseRegisterPage() {
  const [dateFrom, setDateFrom] = useState("2026-04-01");
  const [dateTo, setDateTo] = useState("2026-06-30");
  const [branch, setBranch] = useState("");

  const rows = useMemo(
    () =>
      PURCHASE_REGISTER_SEED.map((r) => ({
        docNo: r.docNo,
        date: r.date,
        party: r.party,
        taxable: formatMoney(r.taxable),
        tax: formatMoney(r.tax),
        total: formatMoney(r.total),
        status: r.status,
      })),
    [],
  );

  return (
    <AccountsReportShell
      title="Purchase Register"
      description="Register of purchase invoices with input tax details."
      kpis={[
        { label: "Documents", value: String(rows.length), icon: FileText, accent: true },
        { label: "Total Purchase", value: formatMoney(PURCHASE_REGISTER_SEED.reduce((s, r) => s + r.total, 0)), icon: IndianRupee },
        { label: "Input Tax", value: formatMoney(PURCHASE_REGISTER_SEED.reduce((s, r) => s + r.tax, 0)), icon: Receipt },
      ]}
      filters={
        <ReportFilterBar
          dateFrom={dateFrom}
          dateTo={dateTo}
          branch={branch}
          onDateFrom={setDateFrom}
          onDateTo={setDateTo}
          onBranch={setBranch}
        />
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
