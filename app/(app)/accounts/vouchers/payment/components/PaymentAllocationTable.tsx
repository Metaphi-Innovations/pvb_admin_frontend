"use client";

import { formatMoney } from "@/lib/accounts/money-format";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatTdsSectionSnapshotLabel,
} from "@/services/tds-list.service";
import type { PaymentUiAllocation } from "../payment-voucher-utils";
import { sanitizeNonNegativeMoneyInput, toMoneyNumber } from "../payment-voucher-utils";
import {
  PaymentSearchableSelect,
  type PaymentSearchableOption,
} from "./PaymentSearchableSelect";

const AMOUNT_TH =
  "px-2 py-2 text-right text-xs font-semibold text-foreground whitespace-nowrap w-[108px]";
const AMOUNT_TD = "px-2 py-2 text-right text-xs tabular-nums whitespace-nowrap";
const AMOUNT_INPUT = "h-8 text-xs w-[108px] ml-auto text-right tabular-nums";
const SECTION_TH =
  "px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap min-w-[160px]";
const SECTION_TD = "px-2 py-2 text-left text-xs align-middle min-w-[160px]";

export function PaymentAllocationTable({
  rows,
  readOnly,
  emptyMessage,
  showTdsDiscount = true,
  tdsSectionOptions = [],
  onToggle,
  onChangeAmount,
}: {
  rows: PaymentUiAllocation[];
  readOnly?: boolean;
  emptyMessage?: string;
  showTdsDiscount?: boolean;
  tdsSectionOptions?: PaymentSearchableOption[];
  onToggle: (openItemId: string, selected: boolean) => void;
  onChangeAmount: (
    openItemId: string,
    patch: Partial<
      Pick<
        PaymentUiAllocation,
        "allocated_amount" | "tds_amount" | "tds_section_id" | "discount_amount"
      >
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
        <table className="w-full min-w-[1120px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="px-2 py-2 text-left text-xs font-semibold w-8" />
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap min-w-[140px]">
                Document / Reference
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap min-w-[120px]">
                Type
              </th>
              <th className="px-2 py-2 text-left text-xs font-semibold whitespace-nowrap w-[100px]">
                Date
              </th>
              <th className={AMOUNT_TH}>Original</th>
              <th className={AMOUNT_TH}>Outstanding</th>
              <th className={AMOUNT_TH}>Settlement</th>
              {showTdsDiscount ? (
                <>
                  <th className={AMOUNT_TH}>TDS</th>
                  <th className={SECTION_TH}>TDS Section</th>
                  <th className={AMOUNT_TH}>Discount Received</th>
                  <th className={AMOUNT_TH}>Net Bank Impact</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const over =
                row.selected &&
                toMoneyNumber(row.allocated_amount) > row.outstanding_amount + 0.0001;
              const netImpact = roundNet(row);
              const tdsAmt = toMoneyNumber(row.tds_amount);
              const sectionRequired = row.selected && tdsAmt > 0;
              const sectionMissing = sectionRequired && !row.tds_section_id.trim();
              const sectionOptions = mergeSectionOption(
                tdsSectionOptions,
                row.tds_section_id,
                row.tds_section_snapshot,
              );
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
                  <td className="px-3 py-2 text-xs">{labelOpenItemType(row.open_item_type)}</td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap">
                    {row.document_date || "—"}
                  </td>
                  <td className={AMOUNT_TD}>{formatMoney(row.original_amount)}</td>
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
                            allocated_amount: sanitizeNonNegativeMoneyInput(e.target.value),
                          })
                        }
                        placeholder="0.00"
                      />
                    )}
                  </td>
                  {showTdsDiscount ? (
                    <>
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
                                tds_amount: sanitizeNonNegativeMoneyInput(e.target.value),
                              })
                            }
                            placeholder="0"
                          />
                        )}
                      </td>
                      <td className={SECTION_TD}>
                        {readOnly || !row.selected ? (
                          <SectionReadOnly
                            tdsAmount={tdsAmt}
                            sectionId={row.tds_section_id}
                            options={sectionOptions}
                            snapshot={row.tds_section_snapshot}
                          />
                        ) : (
                          <div className="space-y-1 min-w-[148px]">
                            <PaymentSearchableSelect
                              value={row.tds_section_id}
                              options={sectionOptions}
                              placeholder={
                                tdsAmt > 0 ? "Select TDS Section…" : "—"
                              }
                              disabled={tdsAmt <= 0}
                              triggerClassName={cn(
                                "h-8 text-xs",
                                sectionMissing && "border-red-400",
                              )}
                              onChange={(tds_section_id) =>
                                onChangeAmount(row.open_item_id, { tds_section_id })
                              }
                            />
                            {sectionMissing ? (
                              <p className="text-[11px] text-red-500 leading-tight">
                                Select TDS Section for this TDS amount.
                              </p>
                            ) : null}
                          </div>
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
                                discount_amount: sanitizeNonNegativeMoneyInput(
                                  e.target.value,
                                ),
                              })
                            }
                            placeholder="0"
                          />
                        )}
                      </td>
                      <td className={cn(AMOUNT_TD, "font-medium")}>
                        {formatMoney(netImpact)}
                      </td>
                    </>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionReadOnly({
  tdsAmount,
  sectionId,
  options,
  snapshot,
}: {
  tdsAmount: number;
  sectionId: string;
  options: PaymentSearchableOption[];
  snapshot: PaymentUiAllocation["tds_section_snapshot"];
}) {
  if (tdsAmount <= 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const fromOptions = options.find((o) => o.value === sectionId)?.label;
  if (fromOptions) return <span className="font-medium">{fromOptions}</span>;
  const fromSnap = formatTdsSectionSnapshotLabel(snapshot);
  return <span className="font-medium">{fromSnap}</span>;
}

function mergeSectionOption(
  options: PaymentSearchableOption[],
  sectionId: string,
  snapshot: PaymentUiAllocation["tds_section_snapshot"],
): PaymentSearchableOption[] {
  if (!sectionId || options.some((o) => o.value === sectionId)) return options;
  const label = formatTdsSectionSnapshotLabel(snapshot);
  if (label === "—") {
    return [...options, { value: sectionId, label: "Previously selected section" }];
  }
  return [...options, { value: sectionId, label }];
}

function roundNet(row: PaymentUiAllocation): number {
  return (
    toMoneyNumber(row.allocated_amount) -
    toMoneyNumber(row.tds_amount) -
    toMoneyNumber(row.discount_amount)
  );
}

function labelOpenItemType(type: string): string {
  switch (type) {
    case "PURCHASE_PAYABLE":
      return "Purchase Invoice";
    case "OPENING_PAYABLE":
      return "Opening Payable";
    case "CUSTOMER_ADVANCE":
      return "Customer Advance";
    case "CREDIT_NOTE":
      return "Credit Note";
    default:
      return type.replace(/_/g, " ");
  }
}
