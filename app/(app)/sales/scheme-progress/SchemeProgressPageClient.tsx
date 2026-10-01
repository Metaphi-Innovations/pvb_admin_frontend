"use client";

/**
 * Sales → Scheme Progress listing.
 * Operational dashboard only — no Credit Note actions.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Eye, Search, Target } from "lucide-react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  exportSchemeProgressCsv,
  formatProgressMoney,
  listSchemeProgressFilterOptions,
  loadSchemeProgressRows,
} from "./scheme-progress-data";
import type { SchemeProgressRow, SchemeProgressStatus } from "./scheme-progress-types";
import "./scheme-progress-compact.css";

const STATUS_STYLE: Record<SchemeProgressStatus, string> = {
  Running: "bg-sky-50 text-sky-700 border-sky-200",
  "Target Achieved": "bg-emerald-50 text-emerald-700 border-emerald-200",
  Settled: "bg-teal-50 text-teal-700 border-teal-200",
  Expired: "bg-slate-100 text-slate-600 border-slate-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
};

function StatusPill({ status }: { status: SchemeProgressStatus }) {
  return (
    <span
      className={cn(
        "sp-badge border",
        STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600",
      )}
    >
      {status}
    </span>
  );
}

export default function SchemeProgressPageClient() {
  const router = useRouter();
  const allRows = useMemo(() => loadSchemeProgressRows(), []);
  const opts = useMemo(() => listSchemeProgressFilterOptions(allRows), [allRows]);

  const [search, setSearch] = useState("");
  const [fy, setFy] = useState("");
  const [scheme, setScheme] = useState("");
  const [customer, setCustomer] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [territory, setTerritory] = useState("");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("");
  const [customerType, setCustomerType] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (fy && r.financialYear !== fy) return false;
      if (scheme && r.schemeName !== scheme) return false;
      if (customer && r.customerName !== customer) return false;
      if (salesperson && r.salesperson !== salesperson) return false;
      if (territory && r.territory !== territory) return false;
      if (region && r.region !== region) return false;
      if (status && r.status !== status) return false;
      if (customerType && r.customerType !== customerType) return false;
      if (!q) return true;
      return (
        r.customerName.toLowerCase().includes(q) ||
        r.customerCode.toLowerCase().includes(q) ||
        r.schemeName.toLowerCase().includes(q) ||
        r.schemeCode.toLowerCase().includes(q) ||
        r.salesperson.toLowerCase().includes(q)
      );
    });
  }, [
    allRows,
    search,
    fy,
    scheme,
    customer,
    salesperson,
    territory,
    region,
    status,
    customerType,
  ]);

  const handleExport = () => {
    const csv = exportSchemeProgressCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scheme-progress-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ListingContainer
      title="Scheme Progress"
      titleIcon={Target}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleExport}
        >
          <Download className="w-3.5 h-3.5" /> Export Excel
        </Button>
      }
    >
      <div className="sp-page">
        <p className="text-[11px] text-muted-foreground -mt-1">
          Live customer-wise scheme eligibility during the scheme period. Credit
          Notes are generated only from Accounts → Pending Scheme Claims.
        </p>
        <div className="sp-kpi">
          <div className="sp-kpi__item">
            <p className="sp-kpi__label">Active Progress Rows</p>
            <p className="sp-kpi__value">{filtered.length}</p>
          </div>
          <div className="sp-kpi__item">
            <p className="sp-kpi__label">Running</p>
            <p className="sp-kpi__value">
              {filtered.filter((r) => r.status === "Running").length}
            </p>
          </div>
          <div className="sp-kpi__item">
            <p className="sp-kpi__label">Target Achieved</p>
            <p className="sp-kpi__value">
              {filtered.filter((r) => r.status === "Target Achieved").length}
            </p>
          </div>
          <div className="sp-kpi__item">
            <p className="sp-kpi__label">Projected CN (visible)</p>
            <p className="sp-kpi__value">
              {formatProgressMoney(
                filtered.reduce((s, r) => s + r.projectedCreditNote, 0),
              )}
            </p>
          </div>
        </div>

        <div className="sp-filters">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search customer, scheme…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={fy} onChange={(e) => setFy(e.target.value)} aria-label="Financial Year">
            <option value="">FY: All</option>
            {opts.financialYears.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select value={scheme} onChange={(e) => setScheme(e.target.value)} aria-label="Scheme">
            <option value="">Scheme: All</option>
            {opts.schemes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            aria-label="Customer"
          >
            <option value="">Customer: All</option>
            {opts.customers.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={salesperson}
            onChange={(e) => setSalesperson(e.target.value)}
            aria-label="Salesperson"
          >
            <option value="">Salesperson: All</option>
            {opts.salespersons.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={territory}
            onChange={(e) => setTerritory(e.target.value)}
            aria-label="Territory"
          >
            <option value="">Territory: All</option>
            {opts.territories.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
            <option value="">Region: All</option>
            {opts.regions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Status: All</option>
            {opts.statuses.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value)}
            aria-label="Customer Type"
          >
            <option value="">Customer Type: All</option>
            {opts.customerTypes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Customer Code</th>
                <th>Scheme Name</th>
                <th>Scheme Type</th>
                <th>Scheme Period</th>
                <th className="text-right">Invoice Count</th>
                <th className="text-right">Current Turnover</th>
                <th className="text-right">Excluded Turnover</th>
                <th className="text-right">Eligible Turnover</th>
                <th>Current Slab</th>
                <th>Next Slab</th>
                <th className="text-right">Gap to Next Slab</th>
                <th className="text-right">Projected Credit Note</th>
                <th>Status</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-10 text-center text-muted-foreground">
                    <Target className="w-5 h-5 mx-auto mb-1 opacity-40" />
                    No scheme progress rows match the filters.
                  </td>
                </tr>
              ) : (
                filtered.map((row: SchemeProgressRow) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.customerName}</td>
                    <td className="font-mono text-[11px] text-brand-700">
                      {row.customerCode}
                    </td>
                    <td>
                      <p className="font-medium leading-tight">{row.schemeName}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {row.schemeCode}
                      </p>
                    </td>
                    <td className="text-[11px]">{row.schemeType}</td>
                    <td className="whitespace-nowrap text-[11px]">
                      {row.periodReference}
                    </td>
                    <td className="sp-num">{row.invoiceCount}</td>
                    <td className="sp-num">{formatProgressMoney(row.currentTurnover)}</td>
                    <td className="sp-num">{formatProgressMoney(row.excludedTurnover)}</td>
                    <td className="sp-num font-semibold">
                      {formatProgressMoney(row.eligibleTurnover)}
                    </td>
                    <td className="text-[11px] max-w-[120px]">{row.currentSlabLabel}</td>
                    <td className="text-[11px] max-w-[120px]">{row.nextSlabLabel}</td>
                    <td className="sp-num">{formatProgressMoney(row.gapToNextSlab)}</td>
                    <td className="sp-num font-semibold text-navy-700">
                      {formatProgressMoney(row.projectedCreditNote)}
                    </td>
                    <td>
                      <StatusPill status={row.status} />
                      {row.settlementHint === "pending_settlement" ? (
                        <p className="text-[10px] text-amber-700 mt-0.5">Pending Settlement</p>
                      ) : null}
                      {row.settlementHint === "settlement_generated" ? (
                        <p className="text-[10px] text-teal-700 mt-0.5">
                          Settlement Generated
                        </p>
                      ) : null}
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() =>
                          router.push(`/sales/scheme-progress/${encodeURIComponent(row.id)}`)
                        }
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground px-0.5">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
          <span className="font-medium text-foreground">{allRows.length}</span> scheme ×
          customer rows.{" "}
          <Link
            href="/accounts/transactions/credit-notes"
            className="text-brand-700 hover:underline"
          >
            Scheme Credit Notes
          </Link>{" "}
          are handled only in Accounts Pending Scheme Claims.
        </p>
      </div>
    </ListingContainer>
  );
}
