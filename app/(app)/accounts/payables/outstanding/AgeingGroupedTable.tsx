"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatApiAgeingBucketLabel } from "@/lib/accounts/ageing-breakpoints";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { formatMoneyNumber, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import type { ApiVendorAgeingGroup } from "@/types/payables.types";
import { AccountsTableScroll } from "@/components/accounts/AccountsTable";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import { cn } from "@/lib/utils";

function AmountCell({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={cn("inline-block whitespace-nowrap tabular-nums", MONEY_CELL_CLASS, className)}>
      ₹{formatMoneyNumber(amount)}
    </span>
  );
}

function sumFromBills(
  group: ApiVendorAgeingGroup,
  field: "originalAmount" | "settledAmount",
): number {
  return group.bills.reduce((sum, bill) => sum + (bill[field] ?? 0), 0);
}

export function AgeingGroupedTable({
  groups,
  bucketKeys,
  totalRecords,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  error,
}: {
  groups: ApiVendorAgeingGroup[];
  bucketKeys: string[];
  totalRecords: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  error?: string | null;
}) {
  const router = useRouter();
  const colCount = 5 + bucketKeys.length + 1;
  const minWidth = 900 + bucketKeys.length * 110;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        {loading && groups.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading ageing data…
          </div>
        ) : error && groups.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-red-600">{error}</div>
        ) : groups.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No outstanding bills found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs" style={{ minWidth }}>
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">
                    Bill No
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold text-foreground whitespace-nowrap">
                    Bill Amount
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold text-foreground whitespace-nowrap">
                    Paid
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold text-foreground whitespace-nowrap">
                    Not Due
                  </th>
                  {bucketKeys.map((key) => (
                    <th
                      key={key}
                      className="px-3 py-2.5 text-right font-semibold text-foreground whitespace-nowrap min-w-[110px]"
                    >
                      {formatApiAgeingBucketLabel(key)}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-semibold text-foreground whitespace-nowrap">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const billTotal = sumFromBills(group, "originalAmount");
                  const paidTotal = sumFromBills(group, "settledAmount");
                  const lastBucketIndex = bucketKeys.length - 1;

                  return (
                    <PartyGroup key={group.vendorId}>
                      <tr className="bg-brand-50/70 border-b border-brand-100">
                        <td colSpan={colCount} className="px-3 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-700 shrink-0">
                              Party:
                            </span>
                            <Link
                              href={`/accounts/payables/outstanding/${group.vendorId}`}
                              className="text-sm font-semibold text-navy-700 hover:text-brand-700 hover:underline truncate"
                            >
                              {group.vendorName}
                            </Link>
                            {group.vendorCode ? (
                              <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                                {group.vendorCode}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>

                      {group.bills.map((bill) => {
                        const oldestBucketAmount =
                          lastBucketIndex >= 0
                            ? bill.buckets[bucketKeys[lastBucketIndex]!] ?? 0
                            : 0;
                        const lateBucketAmount =
                          lastBucketIndex >= 1
                            ? bill.buckets[bucketKeys[lastBucketIndex - 1]!] ?? 0
                            : 0;
                        const drillId = bill.billId ?? bill.openItemId;
                        const detailHref = `/accounts/payables/outstanding/${group.vendorId}?billId=${encodeURIComponent(drillId)}`;

                        return (
                          <tr
                            key={bill.openItemId}
                            className="border-b border-border/60 hover:bg-muted/20 transition-colors cursor-pointer"
                            onClick={() => router.push(detailHref)}
                          >
                            <td className="px-3 py-2 whitespace-nowrap text-foreground">
                              {formatDisplayDate(bill.billDate)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <button
                                type="button"
                                className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(detailHref);
                                }}
                              >
                                {bill.billNumber || "—"}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <AmountCell amount={bill.originalAmount} />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <AmountCell amount={bill.settledAmount} />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <AmountCell amount={bill.notDueAmount} />
                            </td>
                            {bucketKeys.map((key, index) => {
                              const amount = bill.buckets[key] ?? 0;
                              return (
                                <td key={key} className="px-3 py-2 text-right">
                                  <AmountCell
                                    amount={amount}
                                    className={cn(
                                      amount > 0 &&
                                        index === lastBucketIndex &&
                                        "font-semibold text-red-600",
                                      amount > 0 &&
                                        index === lastBucketIndex - 1 &&
                                        "font-semibold text-brand-700",
                                    )}
                                  />
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-right">
                              <AmountCell
                                amount={bill.outstandingAmount}
                                className={cn(
                                  "font-semibold",
                                  oldestBucketAmount > 0 && "text-red-600",
                                  oldestBucketAmount <= 0 &&
                                    lateBucketAmount > 0 &&
                                    "text-brand-700",
                                )}
                              />
                            </td>
                          </tr>
                        );
                      })}

                      <tr className="bg-muted/30 border-b-2 border-border">
                        <td className="px-3 py-2.5 font-bold text-foreground uppercase tracking-wide text-[10px]">
                          Party Total
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {group.bills.length} bill
                          {group.bills.length === 1 ? "" : "s"}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <AmountCell amount={billTotal} className="font-semibold" />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <AmountCell amount={paidTotal} className="font-semibold" />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <AmountCell
                            amount={group.totals.notDueAmount}
                            className="font-semibold"
                          />
                        </td>
                        {bucketKeys.map((key, index) => {
                          const amount = group.totals.buckets[key] ?? 0;
                          return (
                            <td key={key} className="px-3 py-2.5 text-right">
                              <AmountCell
                                amount={amount}
                                className={cn(
                                  "font-semibold",
                                  amount > 0 &&
                                    index === lastBucketIndex &&
                                    "text-red-600",
                                  amount > 0 &&
                                    index === lastBucketIndex - 1 &&
                                    "text-brand-700",
                                )}
                              />
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5 text-right">
                          <AmountCell
                            amount={group.totals.totalOutstanding}
                            className="font-bold text-sm"
                          />
                        </td>
                      </tr>
                    </PartyGroup>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AccountsTableScroll>
      {totalRecords > 0 && (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

function PartyGroup({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
