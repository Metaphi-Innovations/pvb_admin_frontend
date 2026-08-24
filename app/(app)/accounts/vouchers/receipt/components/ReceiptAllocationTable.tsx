"use client";

import { formatMoney } from "@/lib/accounts/money-format";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ReceiptUiAllocation } from "../receipt-voucher-utils";
import { toMoneyNumber } from "../receipt-voucher-utils";

const AMOUNT_TH =
  "px-2 py-2 text-right text-xs font-semibold text-foreground whitespace-nowrap w-[108px]";
const AMOUNT_TD = "px-2 py-2 text-right text-xs tabular-nums whitespace-nowrap";
const AMOUNT_INPUT =
  "h-8 text-xs w-[108px] ml-auto text-right tabular-nums";

export function ReceiptAllocationTable({
  rows,
  readOnly,
  emptyMessage,
  onToggle,
  onChangeAmount,
}: {
  rows: ReceiptUiAllocation[];
  readOnly?: boolean;
  emptyMessage?: string;
  onToggle: (openItemId: string, selected: boolean) => void;
  onChangeAmount: (
    openItemId: string,
    patch: Partial<
      Pick<ReceiptUiAllocation, "allocated_amount" | "tds_amount" | "discount_amount">
    >,
  ) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          {emptyMessage || "No eligible open items."}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden w-full">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="px-2 py-2 text-left text-xs font-semibold w-8" />
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap min-w-[140px]">
                Document No.
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap min-w-[120px]">
                Type
              </th>
              <th className="px-2 py-2 text-left text-xs font-semibold whitespace-nowrap w-[100px]">
                Date
              </th>
              <th className={AMOUNT_TH}>Original</th>
              <th className={AMOUNT_TH}>Settled</th>
              <th className={AMOUNT_TH}>Outstanding</th>
              <th className={AMOUNT_TH}>Allocation</th>
              <th className={AMOUNT_TH}>TDS</th>
              <th className={AMOUNT_TH}>Discount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const over =
                row.selected &&
                toMoneyNumber(row.allocated_amount) > row.outstanding_amount + 0.0001;
              return (
                <tr
                  key={row.open_item_id}
                  className={cn(
                    "border-b border-border/60",
                    row.selected && "bg-brand-50/40",
                  )}
                >
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-brand-600"
                      checked={row.selected}
                      disabled={readOnly}
                      onChange={(e) => onToggle(row.open_item_id, e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2 text-xs font-mono font-semibold text-brand-700">
                    {row.document_number}
                  </td>
                  <td className="px-3 py-2 text-xs">{row.open_item_type}</td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap">
                    {row.document_date || "—"}
                  </td>
                  <td className={AMOUNT_TD}>{formatMoney(row.original_amount)}</td>
                  <td className={AMOUNT_TD}>{formatMoney(row.settled_amount)}</td>
                  <td className={cn(AMOUNT_TD, "font-medium")}>
                    {formatMoney(row.outstanding_amount)}
                  </td>
                  <td className={AMOUNT_TD}>
                    {readOnly ? (
                      formatMoney(toMoneyNumber(row.allocated_amount))
                    ) : (
                      <Input
                        className={cn(AMOUNT_INPUT, over && "border-red-400")}
                        value={row.allocated_amount}
                        disabled={!row.selected}
                        onChange={(e) =>
                          onChangeAmount(row.open_item_id, {
                            allocated_amount: e.target.value,
                          })
                        }
                        placeholder="0.00"
                      />
                    )}
                  </td>
                  <td className={AMOUNT_TD}>
                    {readOnly ? (
                      formatMoney(toMoneyNumber(row.tds_amount))
                    ) : (
                      <Input
                        className={AMOUNT_INPUT}
                        value={row.tds_amount}
                        disabled={!row.selected}
                        onChange={(e) =>
                          onChangeAmount(row.open_item_id, {
                            tds_amount: e.target.value,
                          })
                        }
                        placeholder="0"
                      />
                    )}
                  </td>
                  <td className={AMOUNT_TD}>
                    {readOnly ? (
                      formatMoney(toMoneyNumber(row.discount_amount))
                    ) : (
                      <Input
                        className={AMOUNT_INPUT}
                        value={row.discount_amount}
                        disabled={!row.selected}
                        onChange={(e) =>
                          onChangeAmount(row.open_item_id, {
                            discount_amount: e.target.value,
                          })
                        }
                        placeholder="0"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
