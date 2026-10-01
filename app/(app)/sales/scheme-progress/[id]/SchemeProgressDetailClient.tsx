"use client";

/**
 * Sales → Scheme Progress detail (read-only).
 * Not Scheme Review / Credit Note settlement.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatProgressMoney,
  getSchemeProgressById,
} from "../scheme-progress-data";
import type { SchemeProgressStatus } from "../scheme-progress-types";
import "../scheme-progress-compact.css";

const STATUS_STYLE: Record<SchemeProgressStatus, string> = {
  Running: "bg-sky-50 text-sky-700 border-sky-200",
  "Target Achieved": "bg-emerald-50 text-emerald-700 border-emerald-200",
  Settled: "bg-teal-50 text-teal-700 border-teal-200",
  Expired: "bg-slate-100 text-slate-600 border-slate-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
};

export default function SchemeProgressDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const row = useMemo(() => getSchemeProgressById(id), [id]);
  const [invSearch, setInvSearch] = useState("");
  const [eligibleFilter, setEligibleFilter] = useState<"all" | "eligible" | "excluded">(
    "all",
  );
  const [colInvoiceNo, setColInvoiceNo] = useState("");
  const [colReason, setColReason] = useState("");
  const [colStatus, setColStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  if (!row) {
    return (
      <RecordDetailPage
        listHref="/sales/scheme-progress"
        listLabel="Scheme Progress"
        recordName="Not found"
        recordCode=""
        statusLabel="—"
        statusVariant="neutral"
      >
        <p className="text-sm text-muted-foreground">Scheme progress row not found.</p>
      </RecordDetailPage>
    );
  }

  const invoices = row.invoices.filter((inv) => {
    if (eligibleFilter === "eligible" && !inv.eligible) return false;
    if (eligibleFilter === "excluded" && !inv.excluded) return false;
    if (
      colInvoiceNo &&
      !inv.invoiceNo.toLowerCase().includes(colInvoiceNo.toLowerCase())
    ) {
      return false;
    }
    if (colReason && !inv.reason.toLowerCase().includes(colReason.toLowerCase())) {
      return false;
    }
    if (colStatus && !inv.status.toLowerCase().includes(colStatus.toLowerCase())) {
      return false;
    }
    if (!invSearch.trim()) return true;
    const q = invSearch.toLowerCase();
    return (
      inv.invoiceNo.toLowerCase().includes(q) ||
      inv.reason.toLowerCase().includes(q) ||
      inv.schemeApplied.toLowerCase().includes(q)
    );
  });
  const pageCount = Math.max(1, Math.ceil(invoices.length / pageSize));
  const pageRows = invoices.slice((page - 1) * pageSize, page * pageSize);

  const exportInvoices = () => {
    const headers = [
      "Invoice No",
      "Invoice Date",
      "Invoice Amount",
      "Taxable Value",
      "Sales Return",
      "Eligible",
      "Excluded",
      "Reason",
      "Scheme Applied",
      "Status",
    ];
    const lines = [
      headers.join(","),
      ...invoices.map((i) =>
        [
          i.invoiceNo,
          i.invoiceDate,
          i.invoiceAmount,
          i.taxableValue,
          i.salesReturnAmount,
          i.eligible ? "Yes" : "No",
          i.excluded ? "Yes" : "No",
          i.reason,
          i.schemeApplied,
          i.status,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scheme-progress-${row.schemeCode}-${row.customerCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentSlab = row.slabs.find((s) => s.state === "current");
  const progressPct =
    currentSlab && currentSlab.toTurnover != null && currentSlab.toTurnover > 0
      ? Math.min(
          100,
          Math.round(
            ((currentSlab.progressAmount ?? row.eligibleTurnover) /
              currentSlab.toTurnover) *
              100,
          ),
        )
      : row.achievementPct;

  return (
    <RecordDetailPage
      listHref="/sales/scheme-progress"
      listLabel="Scheme Progress"
      recordName={row.customerName}
      recordCode={row.schemeCode}
      statusLabel={row.status}
      statusVariant={
        row.status === "Running"
          ? "neutral"
          : row.status === "Target Achieved" || row.status === "Settled"
            ? "active"
            : row.status === "Cancelled"
              ? "blocked"
              : "inactive"
      }
      headerActions={
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={exportInvoices}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => window.print()}
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      }
    >
      <div className="sp-page print:gap-2">
        {/* Header meta */}
        <div className="sp-section">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 p-2.5 text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
                Customer
              </p>
              <p className="font-medium">{row.customerName}</p>
              <p className="font-mono text-[10px] text-brand-700">{row.customerCode}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
                Scheme
              </p>
              <p className="font-medium">{row.schemeName}</p>
              <p className="text-[10px] text-muted-foreground">{row.schemeType}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
                Period
              </p>
              <p className="font-medium">{row.periodReference}</p>
              <p className="text-[10px] text-muted-foreground">
                {row.periodStart} – {row.periodEnd}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
                Salesperson
              </p>
              <p className="font-medium">{row.salesperson || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
                Region
              </p>
              <p className="font-medium">{row.region || "—"}</p>
              <p className="text-[10px] text-muted-foreground">{row.territory || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
                Status
              </p>
              <span
                className={cn(
                  "sp-badge border mt-0.5",
                  STATUS_STYLE[row.status],
                )}
              >
                {row.status}
              </span>
              {row.settlementHint === "pending_settlement" ? (
                <p className="text-[10px] text-amber-700 mt-1">Pending Settlement</p>
              ) : null}
              {row.settlementHint === "settlement_generated" ? (
                <p className="text-[10px] text-teal-700 mt-1">Settlement Generated</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="sp-kpi" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
          {(
            [
              ["Current Turnover", row.currentTurnover],
              ["Eligible Turnover", row.eligibleTurnover],
              ["Excluded Turnover", row.excludedTurnover],
              ["Sales Returns", row.salesReturnAmount],
              ["Projected Credit Note", row.projectedCreditNote],
            ] as const
          ).map(([label, val]) => (
            <div key={label} className="sp-kpi__item">
              <p className="sp-kpi__label">{label}</p>
              <p className="sp-kpi__value">{formatProgressMoney(val)}</p>
            </div>
          ))}
        </div>
        <div className="sp-kpi" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
          <div className="sp-kpi__item">
            <p className="sp-kpi__label">Invoice Count</p>
            <p className="sp-kpi__value">{row.invoiceCount}</p>
          </div>
          <div className="sp-kpi__item">
            <p className="sp-kpi__label">Current Slab</p>
            <p className="sp-kpi__value text-sm">{row.currentSlabLabel}</p>
          </div>
          <div className="sp-kpi__item">
            <p className="sp-kpi__label">Next Slab</p>
            <p className="sp-kpi__value text-sm">{row.nextSlabLabel}</p>
          </div>
          <div className="sp-kpi__item">
            <p className="sp-kpi__label">Gap to Next Slab</p>
            <p className="sp-kpi__value">{formatProgressMoney(row.gapToNextSlab)}</p>
          </div>
          <div className="sp-kpi__item">
            <p className="sp-kpi__label">Achievement %</p>
            <p className="sp-kpi__value">{row.achievementPct}%</p>
          </div>
        </div>

        {/* Slab progress */}
        <section className="sp-section">
          <div className="sp-section__head">
            <h2 className="sp-section__title">Slab Progress</h2>
          </div>
          <div className="sp-slab">
            {row.slabs.map((slab) => (
              <div
                key={slab.label}
                className={cn(
                  "sp-slab__row",
                  slab.state === "current" && "is-current",
                  slab.state === "completed" && "is-completed",
                )}
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {slab.state}
                  </p>
                  <p className="text-xs font-semibold">{slab.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Rate {slab.benefitPercent}%
                  </p>
                </div>
                <div className="min-w-0">
                  {slab.state === "current" ? (
                    <>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span>
                          Progress{" "}
                          {formatProgressMoney(
                            slab.progressAmount ?? row.eligibleTurnover,
                          )}
                        </span>
                        {slab.needAmount != null ? (
                          <span>Need {formatProgressMoney(slab.needAmount)}</span>
                        ) : null}
                      </div>
                      <div className="sp-slab__bar">
                        <span style={{ width: `${progressPct}%` }} />
                      </div>
                    </>
                  ) : slab.state === "upcoming" ? (
                    <p className="text-[11px] text-muted-foreground">
                      Projected Rate {slab.benefitPercent}%
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-700 font-medium">Completed</p>
                  )}
                </div>
                <div className="text-right text-[11px] font-semibold tabular-nums">
                  {slab.benefitPercent}%
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Projected benefit + reconciliation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <section className="sp-section">
            <div className="sp-section__head">
              <h2 className="sp-section__title">
                Projected Benefit — if scheme closed today
              </h2>
            </div>
            <div className="p-2.5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Eligible Turnover</span>
                <span className="font-medium tabular-nums">
                  {formatProgressMoney(row.eligibleTurnover)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Rate</span>
                <span className="font-medium">{row.currentRate}%</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-1.5 mt-1">
                <span className="font-semibold text-navy-700">Projected Benefit</span>
                <span className="font-bold tabular-nums text-navy-700">
                  {formatProgressMoney(row.projectedCreditNote)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground pt-1">
                Informational only. Does not create a Credit Note.
              </p>
            </div>
          </section>

          <section className="sp-section">
            <div className="sp-section__head">
              <h2 className="sp-section__title">Projected Calculation</h2>
            </div>
            <table className="sp-recon">
              <tbody>
                <tr>
                  <td>Current Turnover</td>
                  <td className="sp-amt">{formatProgressMoney(row.currentTurnover)}</td>
                </tr>
                <tr className="sp-less">
                  <td>Less: Returns</td>
                  <td className="sp-amt">{formatProgressMoney(row.salesReturnAmount)}</td>
                </tr>
                <tr className="sp-less">
                  <td>Less: Exclusions</td>
                  <td className="sp-amt">{formatProgressMoney(row.excludedTurnover)}</td>
                </tr>
                <tr>
                  <td className="font-semibold">Eligible Turnover</td>
                  <td className="sp-amt font-semibold">
                    {formatProgressMoney(row.eligibleTurnover)}
                  </td>
                </tr>
                <tr>
                  <td>Current Slab</td>
                  <td className="sp-amt">{row.currentSlabLabel}</td>
                </tr>
                <tr className="sp-emph">
                  <td>Projected Credit Note</td>
                  <td className="sp-amt">{formatProgressMoney(row.projectedCreditNote)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        {/* Invoice breakdown */}
        <section className="sp-section">
          <div className="sp-section__head">
            <h2 className="sp-section__title">Invoice Breakdown</h2>
            <div className="flex items-center gap-1.5">
              <input
                className="h-7 text-[11px] border border-border rounded-md px-2"
                placeholder="Filter invoices…"
                value={invSearch}
                onChange={(e) => {
                  setInvSearch(e.target.value);
                  setPage(1);
                }}
              />
              <select
                className="h-7 text-[11px] border border-border rounded-md px-1.5"
                value={eligibleFilter}
                onChange={(e) => {
                  setEligibleFilter(e.target.value as typeof eligibleFilter);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="eligible">Eligible</option>
                <option value="excluded">Excluded</option>
              </select>
            </div>
          </div>
          <div className="sp-table-wrap border-0 rounded-none">
            <table className="sp-table min-w-[960px]">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Invoice Date</th>
                  <th className="text-right">Invoice Amount</th>
                  <th className="text-right">Taxable Value</th>
                  <th className="text-right">Sales Return</th>
                  <th>Eligible</th>
                  <th>Excluded</th>
                  <th>Reason</th>
                  <th>Scheme Applied</th>
                  <th>Status</th>
                </tr>
                <tr className="sp-col-filters">
                  <th>
                    <input
                      value={colInvoiceNo}
                      onChange={(e) => {
                        setColInvoiceNo(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Filter…"
                      aria-label="Filter invoice no"
                    />
                  </th>
                  <th />
                  <th />
                  <th />
                  <th />
                  <th />
                  <th />
                  <th>
                    <input
                      value={colReason}
                      onChange={(e) => {
                        setColReason(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Filter…"
                      aria-label="Filter reason"
                    />
                  </th>
                  <th />
                  <th>
                    <input
                      value={colStatus}
                      onChange={(e) => {
                        setColStatus(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Filter…"
                      aria-label="Filter status"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-muted-foreground">
                      No invoices in this view.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((inv) => (
                    <tr key={`${inv.invoiceNo}-${inv.invoiceId}`}>
                      <td className="font-mono text-[11px] font-semibold">{inv.invoiceNo}</td>
                      <td className="tabular-nums whitespace-nowrap">{inv.invoiceDate}</td>
                      <td className="sp-num">{formatProgressMoney(inv.invoiceAmount)}</td>
                      <td className="sp-num">{formatProgressMoney(inv.taxableValue)}</td>
                      <td className="sp-num">{formatProgressMoney(inv.salesReturnAmount)}</td>
                      <td>{inv.eligible ? "Yes" : "No"}</td>
                      <td>{inv.excluded ? "Yes" : "No"}</td>
                      <td className="text-[11px] text-muted-foreground max-w-[200px] whitespace-normal">
                        {inv.reason || "—"}
                      </td>
                      <td className="text-[11px]">{inv.schemeApplied}</td>
                      <td className="capitalize text-[11px]">{inv.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-border/60 text-[11px]">
            <span className="text-muted-foreground">
              Page {page} of {pageCount} · {invoices.length} invoices
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </section>

        {/* Returns */}
        <section className="sp-section">
          <div className="sp-section__head">
            <h2 className="sp-section__title">Sales Returns</h2>
          </div>
          <div className="sp-table-wrap border-0 rounded-none">
            <table className="sp-table min-w-[640px]">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Returned Qty</th>
                  <th className="text-right">Return Amount</th>
                  <th>Return Date</th>
                  <th className="text-right">Adjusted Turnover</th>
                </tr>
              </thead>
              <tbody>
                {row.returns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No sales returns in this period.
                    </td>
                  </tr>
                ) : (
                  row.returns.map((r) => (
                    <tr key={r.returnId}>
                      <td className="font-mono text-[11px]">{r.invoiceNo}</td>
                      <td>{r.returnedQty}</td>
                      <td className="sp-num">{formatProgressMoney(r.returnAmount)}</td>
                      <td className="tabular-nums">{r.returnDate}</td>
                      <td className="sp-num">{formatProgressMoney(r.adjustedTurnover)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Exclusions */}
        <section className="sp-section">
          <div className="sp-section__head">
            <h2 className="sp-section__title">Exclusions</h2>
          </div>
          <div className="sp-table-wrap border-0 rounded-none">
            <table className="sp-table min-w-[560px]">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Reason</th>
                  <th className="text-right">Excluded Amount</th>
                </tr>
              </thead>
              <tbody>
                {row.exclusions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted-foreground">
                      No exclusions.
                    </td>
                  </tr>
                ) : (
                  row.exclusions.map((ex, i) => (
                    <tr key={`${ex.invoiceNo}-${i}`}>
                      <td className="font-mono text-[11px]">{ex.invoiceNo}</td>
                      <td className="text-[11px]">{ex.reason}</td>
                      <td className="sp-num">{formatProgressMoney(ex.excludedAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-[11px] text-muted-foreground">
          This screen does not Approve, Reject, Generate, or Post Credit Notes. Final
          settlement continues in Accounts → Credit Notes → Pending Scheme Claims.
        </p>
        <div className="print:hidden">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => router.push("/sales/scheme-progress")}
          >
            Back to Scheme Progress
          </Button>
        </div>
      </div>
    </RecordDetailPage>
  );
}
