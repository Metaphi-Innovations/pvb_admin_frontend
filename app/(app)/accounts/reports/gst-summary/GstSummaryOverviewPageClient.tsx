"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  IndianRupee,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsReportBody,
  AccountsReportKpiCard,
  AccountsReportKpiGrid,
} from "@/components/accounts/AccountsReportLayout";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoneyString } from "@/lib/accounts/money-format";
import {
  GstSummaryApiError,
  GstSummaryApiService,
} from "@/services/gst-summary.service";
import type { GstSummaryOverviewResult } from "@/types/gst-summary.types";
import { useGstSummaryApiFilters } from "./useGstSummaryApiFilters";
import { GstReportFilterBar } from "./components/GstReportFilterBar";
import { GstReportNavTabs } from "./components/GstReportNavTabs";
import { GstOverviewMonthlyTable } from "./components/GstOverviewMonthlyTable";

const UNAVAILABLE = "—";

export default function GstSummaryOverviewPageClient() {
  const filterState = useGstSummaryApiFilters();
  const {
    mounted,
    datesReady,
    filters,
    queryParams,
    filtersLoading,
    filtersError,
  } = filterState;

  const [overview, setOverview] = useState<GstSummaryOverviewResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!queryParams) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void GstSummaryApiService.getOverview(queryParams, controller.signal)
      .then((result) => {
        setOverview(result);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof GstSummaryApiError
            ? err.message
            : "Failed to load GST Summary overview.";
        setError(message);
        setOverview(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [queryParams]);

  const kpiCards = useMemo(() => {
    if (!overview) return [];
    const s = overview.summary;
    return [
      {
        label: "Taxable Sales",
        value: formatMoneyString(s.taxable_sales),
        icon: ArrowUpRight,
        accent: true,
      },
      {
        label: "Taxable Purchases",
        value: formatMoneyString(s.taxable_purchases),
        icon: ArrowDownLeft,
      },
      {
        label: "Output GST",
        value: formatMoneyString(s.output_gst),
        icon: Scale,
      },
      {
        label: "Input GST",
        value: formatMoneyString(s.input_gst),
        icon: IndianRupee,
      },
      {
        label: "Eligible ITC",
        value: s.eligible_itc_available
          ? formatMoneyString(s.eligible_itc)
          : UNAVAILABLE,
        icon: ShieldCheck,
      },
      {
        label: "Books GST Working Difference",
        value: formatMoneyString(s.books_gst_working_difference),
        icon: Calculator,
        accent: true,
      },
      {
        label: "Pending Reconciliation",
        value: s.pending_reconciliation_available
          ? String(s.pending_reconciliation ?? 0)
          : UNAVAILABLE,
        icon: AlertTriangle,
        warning: false,
        isCount: true,
      },
    ];
  }, [overview]);

  const showLoading =
    !mounted || filtersLoading || !datesReady || (loading && !overview);
  const healthWarnings = overview?.health?.warnings ?? [];

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary")}
      title="GST Summary"
      description="Consolidated GST overview across outward and inward supplies."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      filters={
        <GstReportFilterBar
          filterState={filterState}
          mounted={mounted}
          end={
            <span
              className="text-[11px] text-muted-foreground max-w-[14rem] leading-snug"
              title="Backend export is not available for GST Overview yet."
            >
              Export unavailable
            </span>
          }
        />
      }
      subHeader={<GstReportNavTabs filters={filters} />}
    >
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <AccountsReportBody>
          {filtersError || error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-4 text-xs text-red-700">
              {filtersError || error}
            </div>
          ) : showLoading ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading GST Summary…
            </div>
          ) : overview ? (
            <>
              {(healthWarnings.length > 0 ||
                overview.notes?.eligible_itc ||
                overview.notes?.net_payable) && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 space-y-1">
                  {healthWarnings.map((w) => (
                    <p key={w} className="text-[11px] text-amber-800">
                      {w}
                    </p>
                  ))}
                  {!overview.summary.eligible_itc_available && (
                    <p className="text-[11px] text-amber-800">
                      Eligible ITC:{" "}
                      {overview.notes.eligible_itc || "Not available yet."}
                    </p>
                  )}
                  {!overview.summary.net_gst_payable_available && (
                    <p className="text-[11px] text-amber-800">
                      Statutory Net GST Payable:{" "}
                      {overview.notes.net_payable ||
                        "Not available. Showing Books GST Working Difference only."}
                    </p>
                  )}
                  {!overview.summary.pending_reconciliation_available && (
                    <p className="text-[11px] text-amber-800">
                      Pending Reconciliation:{" "}
                      {overview.notes.reconciliation || "Not available yet."}
                    </p>
                  )}
                </div>
              )}

              <AccountsReportKpiGrid>
                {kpiCards.map((card) => (
                  <AccountsReportKpiCard key={card.label} {...card} />
                ))}
              </AccountsReportKpiGrid>

              <GstOverviewMonthlyTable rows={overview.monthly_summary} />
            </>
          ) : (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              No GST overview data for the selected filters.
            </div>
          )}
        </AccountsReportBody>
      </div>
    </AccountsPageShell>
  );
}
