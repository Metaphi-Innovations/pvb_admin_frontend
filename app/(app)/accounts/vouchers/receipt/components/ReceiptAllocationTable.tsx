"use client";

import { formatMoney } from "@/lib/accounts/money-format";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ReceiptUiAllocation } from "../receipt-voucher-utils";
import { sanitizeMoneyInput, toMoneyNumber } from "../receipt-voucher-utils";

const AMOUNT_TH =
  "px-2 py-2 text-right text-xs font-semibold text-foreground whitespace-nowrap";
const AMOUNT_TD = "px-2 py-2 text-right text-xs tabular-nums align-middle";
const TEXT_TH =
  "px-3 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap";
const TEXT_TD = "px-3 py-2 text-left text-xs align-middle";

function MoneyCellInput({
  value,
  disabled,
  invalid,
  placeholder = "0",
  onChange,
}: {
  value: string;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex justify-end w-full min-w-[96px]">
      <Input
        className={cn(
          "h-8 w-full max-w-[108px] text-xs text-right tabular-nums px-2",
          invalid && "border-red-400",
        )}
        inputMode="decimal"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(sanitizeMoneyInput(e.target.value))}
        onFocus={(e) => {
          if (e.target.value === "0") {
            onChange("");
          }
        }}
      />
    </div>
  );
}

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
        <table className="w-full min-w-[1040px] table-fixed">
          <colgroup>
            <col className="w-10" />
            <col className="w-[160px]" />
            <col className="w-[140px]" />
            <col className="w-[108px]" />
            <col className="w-[108px]" />
            <col className="w-[108px]" />
            <col className="w-[108px]" />
            <col className="w-[116px]" />
            <col className="w-[116px]" />
            <col className="w-[116px]" />
          </colgroup>
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="px-2 py-2 text-left text-xs font-semibold" />
              <th className={TEXT_TH}>Document No.</th>
              <th className={TEXT_TH}>Type</th>
              <th className={cn(TEXT_TH, "px-2")}>Date</th>
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
                  <td className="px-2 py-2 align-middle">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-brand-600"
                      checked={row.selected}
                      disabled={readOnly}
                      onChange={(e) => onToggle(row.open_item_id, e.target.checked)}
                    />
                  </td>
                  <td className={cn(TEXT_TD, "font-mono font-semibold text-brand-700")}>
                    {row.document_number}
                  </td>
                  <td className={TEXT_TD}>{row.open_item_type}</td>
                  <td className={cn(TEXT_TD, "px-2 whitespace-nowrap")}>
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
                      <MoneyCellInput
                        value={row.allocated_amount}
                        disabled={!row.selected}
                        invalid={over}
                        placeholder="0.00"
                        onChange={(allocated_amount) =>
                          onChangeAmount(row.open_item_id, { allocated_amount })
                        }
                      />
                    )}
                  </td>
                  <td className={AMOUNT_TD}>
                    {readOnly ? (
                      formatMoney(toMoneyNumber(row.tds_amount))
                    ) : (
                      <MoneyCellInput
                        value={row.tds_amount}
                        disabled={!row.selected}
                        onChange={(tds_amount) =>
                          onChangeAmount(row.open_item_id, { tds_amount })
                        }
                      />
                    )}
                  </td>
                  <td className={AMOUNT_TD}>
                    {readOnly ? (
                      formatMoney(toMoneyNumber(row.discount_amount))
                    ) : (
                      <MoneyCellInput
                        value={row.discount_amount}
                        disabled={!row.selected}
                        onChange={(discount_amount) =>
                          onChangeAmount(row.open_item_id, { discount_amount })
                        }
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
