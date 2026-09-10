"use client";

import Link from "next/link";
import { formatApiAgeingBucketLabel } from "@/lib/accounts/ageing-breakpoints";
import { formatMoneyNumber, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import { AccountsTableScroll } from "@/components/accounts/AccountsTable";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import { cn } from "@/lib/utils";

export type AgeingPartySummaryRow = {
  partyId: string;
  partyName: string;
  partyCode?: string;
  buckets: Record<string, number>;
  /** Includes not-due + overdue buckets. */
  totalOutstanding: number;
  notDueAmount?: number;
};

function formatDrCr(
  value: number,
  side: "Dr" | "Cr",
): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const label = n < 0 ? (side === "Dr" ? "Cr" : "Dr") : side;
  return `${formatMoneyNumber(abs)} ${label}`;
}

/**
 * Classic party-level outstanding ageing (Broker / Party × buckets × Total × %).
 * Used under Ageing View → Customer/Vendor Outstanding.
 */
export function AgeingPartySummaryTable({
  rows,
  bucketKeys,
  partyColumnLabel = "Party",
  balanceSide = "Dr",
  partyHref,
  totalRecords,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  error,
  emptyMessage = "No outstanding parties found for the selected filters.",
}: {
  rows: AgeingPartySummaryRow[];
  bucketKeys: string[];
  partyColumnLabel?: string;
  /** Receivables default Dr; Payables default Cr. */
  balanceSide?: "Dr" | "Cr";
  partyHref?: (row: AgeingPartySummaryRow) => string;
  totalRecords: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  error?: string | null;
  emptyMessage?: string;
}) {
  const minWidth = 620 + bucketKeys.length * 110;

  const pageTotal = rows.reduce((sum, r) => sum + (r.totalOutstanding || 0), 0);
  const pageNotDueTotal = rows.reduce(
    (sum, r) => sum + (Number(r.notDueAmount) || 0),
    0,
  );
  const pageBucketTotals = bucketKeys.map((key) =>
    rows.reduce((sum, r) => sum + (Number(r.buckets?.[key]) || 0), 0),
  );

  const formatBucketHeader = (key: string) => {
    if (key.endsWith("+")) {
      const start = Number(key.slice(0, -1));
      if (Number.isFinite(start) && start > 0) return `> ${start - 1}`;
      return `> ${key.slice(0, -1)}`;
    }
    const [startRaw, endRaw] = key.split("-");
    const start = Number(startRaw);
    const end = Number(endRaw);
    if (start === 0 && Number.isFinite(end)) return `<=${end}`;
    if (Number.isFinite(start) && Number.isFinite(end)) return `${start} - ${end}`;
    return formatApiAgeingBucketLabel(key);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        {loading && rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading outstanding data…
          </div>
        ) : error && rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs" style={{ minWidth }}>
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">
                    {partyColumnLabel}
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold text-foreground whitespace-nowrap min-w-[110px]">
                    Not Due
                  </th>
                  {bucketKeys.map((key) => (
                    <th
                      key={key}
                      className="px-3 py-2.5 text-right font-semibold text-foreground whitespace-nowrap min-w-[110px]"
                    >
                      {formatBucketHeader(key)}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-semibold text-foreground whitespace-nowrap">
                    Total
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold text-foreground whitespace-nowrap w-16">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const pct =
                    pageTotal > 0
                      ? Math.round((row.totalOutstanding / pageTotal) * 100)
                      : 0;
                  const href = partyHref?.(row);
                  const nameCell = (
                    <span className="font-medium text-foreground">
                      {row.partyName || "—"}
                      {row.partyCode ? (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          {row.partyCode}
                        </span>
                      ) : null}
                    </span>
                  );
                  return (
                    <tr
                      key={row.partyId}
                      className="border-b border-border/60 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        {href ? (
                          <Link
                            href={href}
                            className="text-brand-700 hover:underline"
                          >
                            {nameCell}
                          </Link>
                        ) : (
                          nameCell
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right whitespace-nowrap tabular-nums",
                          MONEY_CELL_CLASS,
                        )}
                      >
                        {formatDrCr(row.notDueAmount ?? 0, balanceSide)}
                      </td>
                      {bucketKeys.map((key) => (
                        <td
                          key={key}
                          className={cn(
                            "px-3 py-2 text-right whitespace-nowrap tabular-nums",
                            MONEY_CELL_CLASS,
                          )}
                        >
                          {formatDrCr(row.buckets?.[key] ?? 0, balanceSide)}
                        </td>
                      ))}
                      <td
                        className={cn(
                          "px-3 py-2 text-right whitespace-nowrap tabular-nums font-semibold",
                          MONEY_CELL_CLASS,
                        )}
                      >
                        {formatDrCr(row.totalOutstanding, balanceSide)}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums text-muted-foreground">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-brand-50/50 border-t border-border">
                  <td className="px-3 py-2.5 font-bold text-foreground whitespace-nowrap">
                    Net Total
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right whitespace-nowrap tabular-nums font-bold",
                      MONEY_CELL_CLASS,
                    )}
                  >
                    {formatDrCr(pageNotDueTotal, balanceSide)}
                  </td>
                  {pageBucketTotals.map((amt, i) => (
                    <td
                      key={bucketKeys[i]}
                      className={cn(
                        "px-3 py-2.5 text-right whitespace-nowrap tabular-nums font-bold",
                        MONEY_CELL_CLASS,
                      )}
                    >
                      {formatDrCr(amt, balanceSide)}
                    </td>
                  ))}
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right whitespace-nowrap tabular-nums font-bold",
                      MONEY_CELL_CLASS,
                    )}
                  >
                    {formatDrCr(pageTotal, balanceSide)}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums font-bold text-muted-foreground">
                    {pageTotal > 0 ? "100%" : "0%"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </AccountsTableScroll>
      <AccountsTablePagination
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
