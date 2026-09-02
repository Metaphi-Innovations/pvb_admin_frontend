"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
import {
  billWiseStatusToBadge,
  formatAgeingDays,
  formatOutstandingReportDate,
  mapPayableSettlementToDisplay,
} from "@/lib/accounts/bill-wise-outstanding-display";
import { formatMoney } from "@/lib/accounts/money-format";
import { BillWiseOutstandingService } from "@/services/bill-wise-outstanding.service";
import { PayablesService } from "@/services/payables.service";
import type {
  OutstandingBillDisplayRow,
  OutstandingBillSettlementDisplay,
} from "@/types/bill-wise-outstanding.types";

export function BillOutstandingDetailsSheet({
  open,
  onOpenChange,
  row,
  mode,
  asOfDate,
  financialYearId,
  docLabel = "Invoice",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: OutstandingBillDisplayRow | null;
  /** receivables = Bill-wise Outstanding API; payables = Payables settlements API */
  mode: "receivables" | "payables";
  asOfDate?: string;
  financialYearId?: string;
  docLabel?: string;
}) {
  const [settlements, setSettlements] = useState<
    OutstandingBillSettlementDisplay[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row?.openItemId) {
      setSettlements([]);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (mode === "receivables") {
          const detail = await BillWiseOutstandingService.getDetail(
            row.openItemId,
            { asOfDate, financialYearId },
          );
          if (cancelled) return;
          setSettlements(
            detail.settlements.map((s) => ({
              settlementId: s.settlementId,
              settlementDate: s.settlementDate,
              settlementType: s.settlementType,
              settlementAmount: s.settlementAmount,
              voucherNumber: s.voucherNumber,
              referenceNumber: s.referenceNumber,
              status: s.status,
              narration: s.narration,
            })),
          );
        } else {
          const rows = await PayablesService.getBillSettlements(row.openItemId);
          if (cancelled) return;
          setSettlements(rows.map(mapPayableSettlementToDisplay));
        }
      } catch (e) {
        if (!cancelled) {
          setSettlements([]);
          setError(
            e instanceof Error ? e.message : "Failed to load settlement history.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, row?.openItemId, mode, asOfDate, financialYearId]);

  const badge = row ? billWiseStatusToBadge(row.displayStatus) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Bill Outstanding Details</SheetTitle>
          <SheetDescription>
            {row
              ? `${docLabel} ${row.documentNumber}`
              : "Settlement history from accounting"}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {row ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs rounded-lg border border-border/60 bg-muted/10 p-3">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    {docLabel} Date
                  </p>
                  <p className="font-medium mt-0.5">
                    {formatOutstandingReportDate(row.invoiceDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Due Date
                  </p>
                  <p className="font-medium mt-0.5">
                    {formatOutstandingReportDate(row.dueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Original
                  </p>
                  <p className="font-medium mt-0.5 tabular-nums">
                    {formatMoney(row.originalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Adjusted
                  </p>
                  <p className="font-medium mt-0.5 tabular-nums">
                    {formatMoney(row.adjustedAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Outstanding
                  </p>
                  <p className="font-semibold mt-0.5 tabular-nums text-brand-700">
                    {formatMoney(row.outstandingAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Ageing
                  </p>
                  <p className="font-medium mt-0.5">
                    {formatAgeingDays(row.ageingDays)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">
                    Status
                  </p>
                  {badge ? (
                    <StatusBadge
                      status={badge.status}
                      label={badge.label}
                      size="sm"
                      showDot
                    />
                  ) : null}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Settlement History
                </p>
                <AccountsTableScroll>
                  <AccountsTable minWidth={520}>
                    <AccountsTableHead>
                      <AccountsTableHeadRow>
                        <AccountsTableHeadCell>Date</AccountsTableHeadCell>
                        <AccountsTableHeadCell>Type</AccountsTableHeadCell>
                        <AccountsTableHeadCell align="right">
                          Amount
                        </AccountsTableHeadCell>
                        <AccountsTableHeadCell>Voucher</AccountsTableHeadCell>
                        <AccountsTableHeadCell>Status</AccountsTableHeadCell>
                      </AccountsTableHeadRow>
                    </AccountsTableHead>
                    <AccountsTableBody>
                      {loading ? (
                        <AccountsTableRow>
                          <AccountsTableCell
                            colSpan={5}
                            className="accounts-table-empty"
                          >
                            Loading settlements…
                          </AccountsTableCell>
                        </AccountsTableRow>
                      ) : error ? (
                        <AccountsTableRow>
                          <AccountsTableCell
                            colSpan={5}
                            className="accounts-table-empty text-red-600"
                          >
                            {error}
                          </AccountsTableCell>
                        </AccountsTableRow>
                      ) : settlements.length === 0 ? (
                        <AccountsTableRow>
                          <AccountsTableCell
                            colSpan={5}
                            className="accounts-table-empty"
                          >
                            No settlements recorded against this bill.
                          </AccountsTableCell>
                        </AccountsTableRow>
                      ) : (
                        settlements.map((s) => (
                          <AccountsTableRow key={s.settlementId}>
                            <AccountsTableCell>
                              {formatOutstandingReportDate(s.settlementDate)}
                            </AccountsTableCell>
                            <AccountsTableCell>
                              {s.settlementType.replace(/_/g, " ")}
                            </AccountsTableCell>
                            <AccountsTableCell align="right" money>
                              {formatMoney(s.settlementAmount)}
                            </AccountsTableCell>
                            <AccountsTableCell>
                              <span className="font-mono text-xs">
                                {s.voucherNumber || "—"}
                              </span>
                            </AccountsTableCell>
                            <AccountsTableCell>
                              {s.status === "REVERSED" ? "Reversed" : "Active"}
                            </AccountsTableCell>
                          </AccountsTableRow>
                        ))
                      )}
                    </AccountsTableBody>
                  </AccountsTable>
                </AccountsTableScroll>
              </div>
            </>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
