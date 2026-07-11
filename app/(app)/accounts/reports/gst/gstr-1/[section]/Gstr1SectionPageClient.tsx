"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import {
  buildGstDashboard,
  filterGstTransactionsBySection,
  GSTR1_SECTION_LABELS,
  parseGstDashboardFiltersFromSearch,
  resolveBranchFilterLabel,
  resolveFinancialYearLabel,
  resolveWarehouseFilterLabel,
  type Gstr1SectionId,
  type GstDashboardFilters,
} from "../../gst-summary-data";

const PLACEHOLDER_DATE = "2025-04-01";

function defaultFyDateRange(): { from: string; to: string; fyId: string } {
  ensureFinancialYearsCurrent();
  const activeFyId = getActiveFinancialYearId();
  const fy = loadFinancialYears().find((f) => f.id === activeFyId);
  const today = new Date().toISOString().slice(0, 10);
  if (!fy) return { from: PLACEHOLDER_DATE, to: today, fyId: "all" };
  return {
    from: fy.startDate,
    to: today < fy.endDate ? today : fy.endDate,
    fyId: String(fy.id),
  };
}

const VALID_SECTIONS = new Set<string>(Object.keys(GSTR1_SECTION_LABELS));

function docTypeLabel(docType: string): string {
  if (docType === "sales_invoice") return "Sales Invoice";
  if (docType === "credit_note") return "Credit Note";
  if (docType === "debit_note") return "Debit Note";
  return docType;
}

const CN_DN_REDIRECT_SECTIONS = new Set([
  "credit-notes-registered",
  "credit-notes-unregistered",
  "debit-notes-registered",
  "debit-notes-unregistered",
]);

const DEDICATED_SECTION_REDIRECTS: Record<string, string> = {
  b2b: "/accounts/reports/gst/gstr-1/b2b",
  b2c: "/accounts/reports/gst/gstr-1/b2c",
  "nil-rated-exempt": "/accounts/reports/gst/gstr-1/nil-rated-exempt",
  "hsn-summary": "/accounts/reports/gst/gstr-1/hsn-summary",
  "documents-summary": "/accounts/reports/gst/gstr-1/documents-summary",
};

export default function Gstr1SectionPageClient() {
  const mounted = useClientMounted();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const sectionParam = String(params.section ?? "");
  const sectionId = (VALID_SECTIONS.has(sectionParam) ? sectionParam : "b2b") as Gstr1SectionId;

  useEffect(() => {
    if (CN_DN_REDIRECT_SECTIONS.has(sectionId)) {
      const qs = searchParams.toString();
      const next = new URLSearchParams(qs);
      next.set("subsection", sectionId);
      const query = next.toString();
      router.replace(
        `/accounts/reports/gst/gstr-1/credit-debit-notes${query ? `?${query}` : ""}`,
      );
      return;
    }
    const dedicated = DEDICATED_SECTION_REDIRECTS[sectionId];
    if (dedicated) {
      const qs = searchParams.toString();
      router.replace(`${dedicated}${qs ? `?${qs}` : ""}`);
    }
  }, [sectionId, searchParams, router]);

  const [defaults, setDefaults] = useState<GstDashboardFilters>({
    financialYearId: "all",
    dateFrom: PLACEHOLDER_DATE,
    dateTo: PLACEHOLDER_DATE,
    branch: [],
    warehouse: [],
  });
  const [datesReady, setDatesReady] = useState(false);

  useEffect(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setDefaults({
      financialYearId: fyId,
      dateFrom: from,
      dateTo: to,
      branch: [],
      warehouse: [],
    });
    setDatesReady(true);
  }, []);

  const filters = useMemo(() => {
    if (!datesReady) return defaults;
    return parseGstDashboardFiltersFromSearch(searchParams.toString(), defaults);
  }, [searchParams, defaults, datesReady]);

  const dashboard = useMemo(() => {
    if (!mounted || !datesReady) {
      return { transactions: [], hasData: false };
    }
    return buildGstDashboard(filters);
  }, [mounted, datesReady, filters]);

  const sectionTransactions = useMemo(
    () => filterGstTransactionsBySection(dashboard.transactions, sectionId),
    [dashboard.transactions, sectionId],
  );

  const sectionLabel = GSTR1_SECTION_LABELS[sectionId];
  const backHref = `/accounts/reports/gst?${searchParams.toString()}`;

  const filterSummary = [
    resolveFinancialYearLabel(filters.financialYearId),
    `${filters.dateFrom} to ${filters.dateTo}`,
    resolveBranchFilterLabel(filters.branch),
    resolveWarehouseFilterLabel(filters.warehouse),
  ].join(" · ");

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", sectionLabel)}
      title={sectionLabel}
      description={filterSummary}
      hideDescription={false}
      layout="split"
      className="h-full min-h-0"
      actions={
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
          <Link href={backHref}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </Button>
      }
    >
      <AccountsListingTableCard className="flex-1 min-h-0">
        {!mounted || !datesReady ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            Loading section details…
          </div>
        ) : sectionTransactions.length === 0 ? (
          <div className="accounts-table-empty py-4 text-center text-sm text-muted-foreground">
            No transactions in this section for the selected filters.
          </div>
        ) : (
          <AccountsTableScroll>
            <AccountsTable minWidth={1000}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <AccountsTableHeadCell className="text-xs font-semibold">Document No.</AccountsTableHeadCell>
                  <AccountsTableHeadCell className="text-xs font-semibold">Date</AccountsTableHeadCell>
                  <AccountsTableHeadCell className="text-xs font-semibold">Type</AccountsTableHeadCell>
                  <AccountsTableHeadCell className="text-xs font-semibold">Party</AccountsTableHeadCell>
                  <AccountsTableHeadCell className="text-xs font-semibold">GSTIN</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right" className="text-xs font-semibold">Taxable Value</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right" className="text-xs font-semibold">CGST</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right" className="text-xs font-semibold">SGST</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right" className="text-xs font-semibold">IGST</AccountsTableHeadCell>
                  {sectionId === "exceptions" && (
                    <AccountsTableHeadCell className="text-xs font-semibold">Issues</AccountsTableHeadCell>
                  )}
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {sectionTransactions.map((tx) => (
                  <AccountsTableRow
                    key={tx.id}
                    className={cn(tx.exceptions.length > 0 && "bg-amber-50/20")}
                  >
                    <AccountsTableCell className="text-xs font-mono font-semibold text-brand-700">
                      {tx.documentNo}
                    </AccountsTableCell>
                    <AccountsTableCell className="text-xs">{tx.documentDate}</AccountsTableCell>
                    <AccountsTableCell className="text-xs">{docTypeLabel(tx.docType)}</AccountsTableCell>
                    <AccountsTableCell className="text-xs">{tx.partyName}</AccountsTableCell>
                    <AccountsTableCell className="text-xs font-mono">{tx.gstin}</AccountsTableCell>
                    <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                      {formatMoney(tx.taxableValue)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                      {formatMoney(tx.cgst)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                      {formatMoney(tx.sgst)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                      {formatMoney(tx.igst)}
                    </AccountsTableCell>
                    {sectionId === "exceptions" && (
                      <AccountsTableCell className="text-xs">
                        <div className="flex flex-col gap-0.5">
                          {tx.exceptions.map((ex, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-amber-700">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              {ex.message}
                            </span>
                          ))}
                        </div>
                      </AccountsTableCell>
                    )}
                  </AccountsTableRow>
                ))}
              </AccountsTableBody>
            </AccountsTable>
          </AccountsTableScroll>
        )}
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}
