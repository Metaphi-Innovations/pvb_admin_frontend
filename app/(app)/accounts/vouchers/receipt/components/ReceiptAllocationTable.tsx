"use client";

import { formatMoney } from "@/lib/accounts/money-format";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatTdsSectionSnapshotLabel } from "@/services/tds-list.service";
import type { ReceiptUiAllocation } from "../receipt-voucher-utils";
import { sanitizeMoneyInput, toMoneyNumber } from "../receipt-voucher-utils";
import {
  ReceiptSearchableSelect,
  type ReceiptSearchableOption,
} from "./ReceiptSearchableSelect";

const AMOUNT_TH =
  "px-2 py-2 text-right text-xs font-semibold text-foreground whitespace-nowrap";
const AMOUNT_TD = "px-2 py-2 text-right text-xs tabular-nums align-middle";
const TEXT_TH =
  "px-3 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap";
const TEXT_TD = "px-3 py-2 text-left text-xs align-middle";
const SECTION_TH =
  "px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap";
const SECTION_TD = "px-2 py-2 text-left text-xs align-middle";

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
  /** When false, hides TDS amount column (Receipt create/edit UI simplification). */
  showTds = false,
  showTdsSection = false,
  showDiscount = false,
  showSelectColumn = true,
  settlementAmountLabel = "Settlement",
  tdsSectionOptions = [],
  onToggle,
  onChangeAmount,
}: {
  rows: ReceiptUiAllocation[];
  readOnly?: boolean;
  emptyMessage?: string;
  /** Hide TDS amount column from allocation UI; payload/architecture unchanged. */
  showTds?: boolean;
  /** Customer receipts historically showed TDS Section; default off for simplified UI. */
  showTdsSection?: boolean;
  showDiscount?: boolean;
  /** When false, selection is controlled outside (e.g. multi-select). */
  showSelectColumn?: boolean;
  settlementAmountLabel?: string;
  tdsSectionOptions?: ReceiptSearchableOption[];
  onToggle: (openItemId: string, selected: boolean) => void;
  onChangeAmount: (
    openItemId: string,
    patch: Partial<
      Pick<
        ReceiptUiAllocation,
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
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {showSelectColumn ? (
                <th className="px-2 py-2 text-left text-xs font-semibold w-10" />
              ) : null}
              <th className={TEXT_TH}>Invoice No.</th>
              <th className={cn(TEXT_TH, "px-2")}>Invoice Date</th>
              <th className={AMOUNT_TH}>Outstanding</th>
              <th className={AMOUNT_TH}>{settlementAmountLabel}</th>
              {showTds ? <th className={AMOUNT_TH}>TDS</th> : null}
              {showTds && showTdsSection ? (
                <th className={SECTION_TH}>TDS Section</th>
              ) : null}
              {showDiscount ? <th className={AMOUNT_TH}>Discount</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const over =
                row.selected &&
                toMoneyNumber(row.allocated_amount) > row.outstanding_amount + 0.0001;
              const tdsAmt = toMoneyNumber(row.tds_amount);
              const sectionRequired =
                showTds && showTdsSection && row.selected && tdsAmt > 0;
              const sectionMissing = sectionRequired && !row.tds_section_id.trim();
              const sectionOptions = mergeSectionOption(
                tdsSectionOptions,
                row.tds_section_id,
                row.tds_section_snapshot,
              );
              const amountEditable = row.selected || !showSelectColumn;
              return (
                <tr
                  key={row.open_item_id}
                  className={cn(
                    "border-b border-border/60",
                    row.selected && "bg-brand-50/40",
                  )}
                >
                  {showSelectColumn ? (
                    <td className="px-2 py-2 align-middle">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-brand-600"
                        checked={row.selected}
                        disabled={readOnly}
                        onChange={(e) => onToggle(row.open_item_id, e.target.checked)}
                      />
                    </td>
                  ) : null}
                  <td className={cn(TEXT_TD, "font-mono font-semibold text-brand-700")}>
                    {row.document_number}
                  </td>
                  <td className={cn(TEXT_TD, "px-2 whitespace-nowrap")}>
                    {formatDisplayDate(row.document_date)}
                  </td>
                  <td className={cn(AMOUNT_TD, "font-medium")}>
                    {formatMoney(row.outstanding_amount)}
                  </td>
                  <td className={AMOUNT_TD}>
                    {readOnly ? (
                      formatMoney(toMoneyNumber(row.allocated_amount))
                    ) : (
                      <MoneyCellInput
                        value={row.allocated_amount}
                        disabled={!amountEditable}
                        invalid={over}
                        placeholder="0.00"
                        onChange={(allocated_amount) =>
                          onChangeAmount(row.open_item_id, { allocated_amount })
                        }
                      />
                    )}
                  </td>
                  {showTds ? (
                    <td className={AMOUNT_TD}>
                      {readOnly ? (
                        formatMoney(toMoneyNumber(row.tds_amount))
                      ) : (
                        <MoneyCellInput
                          value={row.tds_amount}
                          disabled={!amountEditable}
                          onChange={(tds_amount) =>
                            onChangeAmount(row.open_item_id, { tds_amount })
                          }
                        />
                      )}
                    </td>
                  ) : null}
                  {showTds && showTdsSection ? (
                    <td className={SECTION_TD}>
                      {readOnly || !amountEditable ? (
                        <SectionReadOnly
                          tdsAmount={tdsAmt}
                          sectionId={row.tds_section_id}
                          options={sectionOptions}
                          snapshot={row.tds_section_snapshot}
                        />
                      ) : (
                        <div className="space-y-1 min-w-[148px]">
                          <ReceiptSearchableSelect
                            value={row.tds_section_id}
                            options={sectionOptions}
                            placeholder={tdsAmt > 0 ? "Select TDS Section…" : "—"}
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
                              Required when TDS &gt; 0
                            </p>
                          ) : null}
                        </div>
                      )}
                    </td>
                  ) : null}
                  {showDiscount ? (
                    <td className={AMOUNT_TD}>
                      {readOnly ? (
                        formatMoney(toMoneyNumber(row.discount_amount))
                      ) : (
                        <MoneyCellInput
                          value={row.discount_amount}
                          disabled={!amountEditable}
                          onChange={(discount_amount) =>
                            onChangeAmount(row.open_item_id, { discount_amount })
                          }
                        />
                      )}
                    </td>
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
  options: ReceiptSearchableOption[];
  snapshot: ReceiptUiAllocation["tds_section_snapshot"];
}) {
  if (tdsAmount <= 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const fromOptions = options.find((o) => o.value === sectionId)?.label;
  if (fromOptions) return <span className="font-medium">{fromOptions}</span>;
  return (
    <span className="font-medium">{formatTdsSectionSnapshotLabel(snapshot)}</span>
  );
}

function mergeSectionOption(
  options: ReceiptSearchableOption[],
  sectionId: string,
  snapshot: ReceiptUiAllocation["tds_section_snapshot"],
): ReceiptSearchableOption[] {
  if (!sectionId || options.some((o) => o.value === sectionId)) return options;
  const label = formatTdsSectionSnapshotLabel(snapshot);
  if (label === "—") {
    return [...options, { value: sectionId, label: "Previously selected section" }];
  }
  return [...options, { value: sectionId, label }];
}
