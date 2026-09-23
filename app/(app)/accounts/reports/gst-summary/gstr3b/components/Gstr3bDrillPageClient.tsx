"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsReportBody } from "@/components/accounts/AccountsReportLayout";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  buildGstReportHref,
  GST_REPORT_BASE_PATH,
} from "@/lib/accounts/gst-report-filters";
import { useGstSummaryApiFilters } from "../../useGstSummaryApiFilters";
import { GstReportFilterBar } from "../../components/GstReportFilterBar";
import { GstReportNavTabs } from "../../components/GstReportNavTabs";
import {
  GSTR3B_DRILL_LABELS,
  isValidGstr3bDrillKey,
  type Gstr3bDrillKey,
} from "../gstr3b-report-types";

/**
 * GSTR-3B V1 does not ship document drill-down from the working report.
 * Demo local loaders are intentionally not used.
 */
export default function Gstr3bDrillPageClient() {
  const params = useParams();
  const bucket = typeof params.bucket === "string" ? params.bucket : "";
  const drillKey: Gstr3bDrillKey = isValidGstr3bDrillKey(bucket)
    ? bucket
    : "outward_taxable";

  const filterState = useGstSummaryApiFilters();
  const { mounted, filters } = filterState;
  const backHref = buildGstReportHref(`${GST_REPORT_BASE_PATH}/gstr3b`, filters);
  const title = GSTR3B_DRILL_LABELS[drillKey];

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "GSTR-3B")}
      title={title}
      description="GSTR-3B section detail"
      hideDescription
      layout="split"
      className="h-full min-h-0"
      filters={
        <GstReportFilterBar
          filterState={filterState}
          mounted={mounted}
          end={
            <span className="text-[11px] text-muted-foreground">
              Export unavailable
            </span>
          }
        />
      }
      subHeader={<GstReportNavTabs filters={filters} />}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AccountsReportBody className="space-y-3 pb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="h-7 px-2">
              <Link href={backHref}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back to GSTR-3B
              </Link>
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-muted/10 px-3 py-4 space-y-2">
            <p className="text-xs font-medium text-foreground">
              Section detail drill-down is not available in GSTR-3B V1
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              The production GSTR-3B working report is summary-only. Use GSTR-1
              for outward documents and GSTR-2B reconciliation for ITC workflow.
              Local demo invoice loaders are no longer used on this route.
            </p>
          </div>
        </AccountsReportBody>
      </div>
    </AccountsPageShell>
  );
}
