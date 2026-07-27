"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  buildBalanceSheetLedgerHref,
  buildBalanceSheetPartyHref,
  collectBalanceSheetGroupIds,
  isBalanceSheetGroupHeading,
  splitBalanceSheetHorizontal,
  zipBalanceSheetHorizontalRows,
  type BalanceSheetDrillDownFilters,
  type BalanceSheetLineItem,
  type BalanceSheetStatement,
} from "./balance-sheet-data";

const CHEVRON_COL_PX = 20;
const DEPTH_INDENT_PX = 16;
const BASE_INDENT_PX = 8;

function formatBsAmount(amount: number | null): string {
  if (amount == null) return "";
  return formatMoney(amount);
}

function indentPx(depth: number): number {
  return BASE_INDENT_PX + depth * DEPTH_INDENT_PX;
}

function ParticularCell({
  item,
  depth,
  hasChildren,
  expandedIds,
  onToggle,
  drillDownFilters,
}: {
  item: BalanceSheetLineItem;
  depth: number;
  hasChildren: boolean;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  drillDownFilters: BalanceSheetDrillDownFilters;
}) {
  const isGroupHeading = isBalanceSheetGroupHeading(item);
  const isLedger = Boolean(item.ledgerId);
  const isPartyLedger = Boolean(item.partyId && item.partyKind);
  const isExpanded = expandedIds.has(item.id);

  const labelClass = cn(
    "text-xs truncate min-w-0",
    isGroupHeading ? "font-bold text-foreground" : "font-normal text-foreground/90",
    isLedger &&
      !item.isPlBalance &&
      "text-brand-700 hover:text-brand-800 hover:underline cursor-pointer",
    item.isPlBalance && "font-semibold text-emerald-800",
  );

  let labelContent: React.ReactNode;
  if (isLedger && item.ledgerId) {
    labelContent = (
      <Link
        href={buildBalanceSheetLedgerHref(item.ledgerId, drillDownFilters)}
        className={labelClass}
        title={`View ${item.particular} ledger`}
      >
        {item.particular}
      </Link>
    );
  } else if (isPartyLedger && item.partyId && item.partyKind) {
    labelContent = (
      <Link
        href={buildBalanceSheetPartyHref(item.partyId, item.partyKind)}
        className={labelClass}
        title={`View ${item.particular} outstanding`}
      >
        {item.particular}
      </Link>
    );
  } else {
    labelContent = (
      <span className={labelClass} title={item.particular}>
        {item.particular}
      </span>
    );
  }

  const showChevron = hasChildren;

  return (
    <div
      className="flex items-center gap-0 min-w-0"
      style={{ paddingLeft: indentPx(depth) }}
    >
      <span className="flex-shrink-0" style={{ width: CHEVRON_COL_PX }}>
        {showChevron ? (
          <button
            type="button"
            onClick={() => onToggle(item.id)}
            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
            )}
          </button>
        ) : null}
      </span>
      {labelContent}
    </div>
  );
}

function SideAmountCell({
  item,
}: {
  item: BalanceSheetLineItem | null;
}) {
  if (!item) return null;
  const isGroupHeading = isBalanceSheetGroupHeading(item);
  return (
    <span
      className={cn(
        "tabular-nums",
        MONEY_AMOUNT_CLASS,
        isGroupHeading ? "font-bold" : "",
        item.isPlBalance && "font-semibold text-emerald-700",
      )}
    >
      {formatBsAmount(item.amount)}
    </span>
  );
}

export const BalanceSheetHorizontalView = memo(function BalanceSheetHorizontalView({
  statement,
  drillDownFilters,
}: {
  statement: BalanceSheetStatement;
  drillDownFilters: BalanceSheetDrillDownFilters;
}) {
  const { liabilities, assets } = useMemo(
    () => splitBalanceSheetHorizontal(statement),
    [statement],
  );

  const expandSeed = useMemo(() => {
    const ids = [
      ...collectBalanceSheetGroupIds(liabilities.tree),
      ...collectBalanceSheetGroupIds(assets.tree),
    ];
    return ids.slice().sort().join("|");
  }, [liabilities.tree, assets.tree]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpandedIds(
      new Set([
        ...collectBalanceSheetGroupIds(liabilities.tree),
        ...collectBalanceSheetGroupIds(assets.tree),
      ]),
    );
  }, [expandSeed, liabilities.tree, assets.tree]);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const zippedRows = useMemo(
    () => zipBalanceSheetHorizontalRows(statement, expandedIds),
    [statement, expandedIds],
  );

  return (
    <div className="flex flex-col w-full">
      <AccountsTable minWidth={720}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <AccountsTableHeadCell className="min-w-[200px] border-r border-border font-bold">
              {liabilities.sectionTitle}
            </AccountsTableHeadCell>
            <AccountsTableHeadCell
              align="right"
              className="min-w-[120px] border-r-2 border-border font-bold"
            >
              {liabilities.amountColumnLabel}
            </AccountsTableHeadCell>
            <AccountsTableHeadCell className="min-w-[200px] border-r border-border font-bold">
              {assets.sectionTitle}
            </AccountsTableHeadCell>
            <AccountsTableHeadCell align="right" className="min-w-[120px] font-bold">
              {assets.amountColumnLabel}
            </AccountsTableHeadCell>
          </AccountsTableHeadRow>
        </AccountsTableHead>

        <AccountsTableBody>
          {zippedRows.length === 0 ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                No entries
              </AccountsTableCell>
            </AccountsTableRow>
          ) : (
            zippedRows.map((pair, index) => (
              <AccountsTableRow
                key={`bs-row-${pair.liability?.item.id ?? "l"}-${pair.asset?.item.id ?? "a"}-${index}`}
                className={cn(
                  "hover:bg-muted/20 transition-colors",
                  (pair.liability && isBalanceSheetGroupHeading(pair.liability.item)) ||
                    (pair.asset && isBalanceSheetGroupHeading(pair.asset.item))
                    ? "bg-muted/10"
                    : undefined,
                )}
              >
                <AccountsTableCell className="border-r border-border/60 align-top py-1.5">
                  {pair.liability ? (
                    <ParticularCell
                      item={pair.liability.item}
                      depth={pair.liability.depth}
                      hasChildren={pair.liability.hasChildren}
                      expandedIds={expandedIds}
                      onToggle={toggle}
                      drillDownFilters={drillDownFilters}
                    />
                  ) : null}
                </AccountsTableCell>
                <AccountsTableCell
                  align="right"
                  money
                  className="border-r-2 border-border align-top py-1.5"
                >
                  <SideAmountCell item={pair.liability?.item ?? null} />
                </AccountsTableCell>
                <AccountsTableCell className="border-r border-border/60 align-top py-1.5">
                  {pair.asset ? (
                    <ParticularCell
                      item={pair.asset.item}
                      depth={pair.asset.depth}
                      hasChildren={pair.asset.hasChildren}
                      expandedIds={expandedIds}
                      onToggle={toggle}
                      drillDownFilters={drillDownFilters}
                    />
                  ) : null}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="align-top py-1.5">
                  <SideAmountCell item={pair.asset?.item ?? null} />
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>

        <AccountsTableFoot>
          <AccountsTableRow className="border-t-2 border-brand-600 bg-brand-50/60">
            <AccountsTableCell className="border-r border-border/60 font-bold text-xs text-brand-800 py-2.5">
              {liabilities.grandTotalLabel}
            </AccountsTableCell>
            <AccountsTableCell
              align="right"
              money
              className="border-r-2 border-border font-bold text-xs text-brand-800 py-2.5"
            >
              {formatBsAmount(liabilities.grandTotal)}
            </AccountsTableCell>
            <AccountsTableCell className="border-r border-border/60 font-bold text-xs text-brand-800 py-2.5">
              {assets.grandTotalLabel}
            </AccountsTableCell>
            <AccountsTableCell
              align="right"
              money
              className="font-bold text-xs text-brand-800 py-2.5"
            >
              {formatBsAmount(assets.grandTotal)}
            </AccountsTableCell>
          </AccountsTableRow>
        </AccountsTableFoot>
      </AccountsTable>

      <div
        className={cn(
          "flex-shrink-0 mt-3 px-3 py-2 rounded-lg border text-center text-xs",
          statement.isBalanced
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-red-50 border-red-200 text-red-700",
        )}
      >
        {statement.isBalanced ? (
          <p className="font-medium">
            Total Liabilities ₹ {formatMoney(statement.totalLiabilities)} = Total Assets ₹{" "}
            {formatMoney(statement.totalAssets)}
          </p>
        ) : (
          <>
            <p className="font-bold">
              Difference : ₹ {formatMoney(Math.abs(statement.difference))}
            </p>
            <p className="font-bold mt-0.5">Balance Sheet does not tally.</p>
          </>
        )}
        {statement.unpostedVoucherCount > 0 && (
          <span className="block mt-1 text-[11px] font-medium text-amber-700">
            {statement.unpostedVoucherCount} unposted voucher
            {statement.unpostedVoucherCount === 1 ? "" : "s"} found as on this date — balances may
            change after posting.
          </span>
        )}
        {Math.abs(statement.netProfit) > 0 && (
          <span className="block mt-1 text-[11px] font-medium text-muted-foreground">
            Current period {statement.netProfit >= 0 ? "Net Profit" : "Net Loss"}: ₹{" "}
            {formatMoney(Math.abs(statement.netProfit))} included under Liabilities
          </span>
        )}
      </div>
    </div>
  );
});
