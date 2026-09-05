"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatApiAgeingBucketLabel } from "@/lib/accounts/ageing-breakpoints";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { formatMoneyNumber, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import type { ApiCustomerAgeingGroup } from "@/types/receivables.types";
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

function sumFromInvoices(
  group: ApiCustomerAgeingGroup,
  field: "originalAmount" | "settledAmount",
): number {
  return group.invoices.reduce((sum, inv) => sum + (inv[field] ?? 0), 0);
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
  groups: ApiCustomerAgeingGroup[];
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
            No outstanding invoices found for the selected filters.
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
                    Received
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
                  const billTotal = sumFromInvoices(group, "originalAmount");
                  const receivedTotal = sumFromInvoices(group, "settledAmount");
                  const lastBucketIndex = bucketKeys.length - 1;

                  return (
                    <PartyGroup key={group.customerId}>
                      <tr className="bg-brand-50/70 border-b border-brand-100">
                        <td colSpan={colCount} className="px-3 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-700 shrink-0">
                              Party:
                            </span>
                            <Link
                              href={`/accounts/receivables/outstanding/${group.customerId}`}
                              className="text-sm font-semibold text-navy-700 hover:text-brand-700 hover:underline truncate"
                            >
                              {group.customerName}
                            </Link>
                            {group.customerCode ? (
                              <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                                {group.customerCode}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>

                      {group.invoices.map((inv) => {
                        const oldestBucketAmount =
                          lastBucketIndex >= 0
                            ? inv.buckets[bucketKeys[lastBucketIndex]!] ?? 0
                            : 0;
                        const lateBucketAmount =
                          lastBucketIndex >= 1
                            ? inv.buckets[bucketKeys[lastBucketIndex - 1]!] ?? 0
                            : 0;

                        return (
                          <tr
                            key={inv.openItemId}
                            className="border-b border-border/60 hover:bg-muted/20 transition-colors cursor-pointer"
                            onClick={() =>
                              router.push(
                                `/accounts/receivables/outstanding/invoice/${inv.openItemId}?from=ageing`,
                              )
                            }
                          >
                            <td className="px-3 py-2 whitespace-nowrap text-foreground">
                              {formatDisplayDate(inv.invoiceDate)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <button
                                type="button"
                                className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/accounts/receivables/outstanding/invoice/${inv.openItemId}?from=ageing`,
                                  );
                                }}
                              >
                                {inv.invoiceNumber || "—"}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <AmountCell amount={inv.originalAmount} />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <AmountCell amount={inv.settledAmount} />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <AmountCell amount={inv.notDueAmount} />
                            </td>
                            {bucketKeys.map((key, index) => {
                              const amount = inv.buckets[key] ?? 0;
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
                                amount={inv.outstandingAmount}
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
                          {group.invoices.length} bill
                          {group.invoices.length === 1 ? "" : "s"}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <AmountCell amount={billTotal} className="font-semibold" />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <AmountCell amount={receivedTotal} className="font-semibold" />
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
