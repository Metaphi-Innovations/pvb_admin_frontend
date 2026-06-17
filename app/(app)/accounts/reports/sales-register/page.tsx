"use client";

import { useMemo, useState } from "react";
import { FileText, IndianRupee, Receipt } from "lucide-react";
import {
  AccountsReportShell,
  ReportFilterBar,
} from "@/components/accounts/AccountsReportShell";
import { SALES_REGISTER_SEED } from "@/lib/accounts/accounts-mock-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function SalesRegisterPage() {
  const [dateFrom, setDateFrom] = useState("2026-04-01");
  const [dateTo, setDateTo] = useState("2026-06-30");
  const [branch, setBranch] = useState("");

  const rows = useMemo(
    () =>
      SALES_REGISTER_SEED.map((r) => ({
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

  const totalSales = SALES_REGISTER_SEED.reduce((s, r) => s + r.total, 0);

  return (
    <AccountsReportShell
      title="Sales Register"
      description="Register of sales invoices with taxable value and tax breakup."
      kpis={[
        { label: "Documents", value: String(rows.length), icon: FileText, accent: true },
        { label: "Total Sales", value: formatMoney(totalSales), icon: IndianRupee },
        { label: "Total Tax", value: formatMoney(SALES_REGISTER_SEED.reduce((s, r) => s + r.tax, 0)), icon: Receipt },
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
        { key: "docNo", label: "Invoice No.", mono: true },
        { key: "date", label: "Date" },
        { key: "party", label: "Customer" },
        { key: "taxable", label: "Taxable", align: "right", money: true },
        { key: "tax", label: "Tax", align: "right", money: true },
        { key: "total", label: "Total", align: "right", money: true },
        { key: "status", label: "Status" },
      ]}
      rows={rows}
    />
  );
}
