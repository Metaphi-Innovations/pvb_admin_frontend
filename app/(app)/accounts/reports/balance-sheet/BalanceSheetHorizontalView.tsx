"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoneyString, formatMoneyStringOrDash, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
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
  balanceSheetRowHref,
  collectExpandableIds,
  shouldShowUnpostedVoucherCount,
  type BalanceSheetDrillScope,
  type BalanceSheetScreenModel,
  type BalanceSheetScreenRow,
} from "./balance-sheet-api-display";

const CHEVRON_COL_PX = 20;
const DEPTH_INDENT_PX = 16;
const BASE_INDENT_PX = 8;

interface VisibleRow {
  row: BalanceSheetScreenRow;
  depth: number;
  hasChildren: boolean;
}

function indentPx(depth: number): number {
  return BASE_INDENT_PX + depth * DEPTH_INDENT_PX;
}

function visibleRows(
  nodes: BalanceSheetScreenRow[],
  expanded: Set<string>,
  depth = 0,
): VisibleRow[] {
  const out: VisibleRow[] = [];
  for (const row of nodes) {
    const hasChildren = row.children.length > 0;
    out.push({ row, depth, hasChildren });
    if (hasChildren && expanded.has(row.id)) {
      out.push(...visibleRows(row.children, expanded, depth + 1));
    }
  }
  return out;
}

function ParticularCell({
  row,
  depth,
  hasChildren,
  expanded,
  onToggle,
  scope,
}: {
  row: BalanceSheetScreenRow;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: (id: string) => void;
  scope: BalanceSheetDrillScope;
}) {
  const href = balanceSheetRowHref(row, scope);
  const isHeading = row.nodeType === "GROUP" || row.nodeType === "SUB_GROUP";
  const isReporting = row.nodeType === "REPORTING_ROW";
  const labelClass = cn(
    "text-xs truncate min-w-0",
    isHeading ? "font-bold text-foreground" : "font-normal text-foreground/90",
    href && "text-brand-700 hover:text-brand-800 hover:underline cursor-pointer",
    isReporting && "font-semibold text-emerald-800",
  );
  const title = row.isAbnormal
    ? `${row.name} — abnormal ${row.balanceSide.toLowerCase()} balance`
    : href
      ? `View ${row.name} in General Ledger`
      : row.name;

  const label = href ? (
    <Link href={href} className={labelClass} title={title}>
      {row.name}
    </Link>
  ) : (
    <span className={labelClass} title={title}>
      {row.name}
    </span>
  );

  return (
    <div className="flex items-center gap-0 min-w-0" style={{ paddingLeft: indentPx(depth) }}>
      <span className="flex-shrink-0" style={{ width: CHEVRON_COL_PX }}>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(row.id)}
            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
            )}
          </button>
        ) : null}
      </span>
      {label}
    </div>
  );
}

function SideAmount({ row }: { row: BalanceSheetScreenRow | null }) {
  if (!row) return null;
  const heading = row.nodeType === "GROUP" || row.nodeType === "SUB_GROUP";
  return (
    <span
      className={cn(
        "tabular-nums",
        MONEY_AMOUNT_CLASS,
        heading && "font-bold",
        row.nodeType === "REPORTING_ROW" && "font-semibold text-emerald-700",
      )}
      title={row.isAbnormal ? `Abnormal ${row.balanceSide} balance` : undefined}
    >
      {formatMoneyStringOrDash(row.amount)}
    </span>
  );
}

export const BalanceSheetHorizontalView = memo(function BalanceSheetHorizontalView({
  model,
  drillDown,
}: {
  model: BalanceSheetScreenModel;
  drillDown: BalanceSheetDrillScope;
}) {
  const expandSeed = useMemo(
    () =>
      [...collectExpandableIds(model.liabilities), ...collectExpandableIds(model.assets)]
        .slice()
        .sort()
        .join("|"),
    [model.liabilities, model.assets],
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpandedIds(
      new Set([
        ...collectExpandableIds(model.liabilities),
        ...collectExpandableIds(model.assets),
      ]),
    );
  }, [expandSeed, model.liabilities, model.assets]);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const zipped = useMemo(() => {
    const left = visibleRows(model.liabilities, expandedIds);
    const right = visibleRows(model.assets, expandedIds);
    const length = Math.max(left.length, right.length);
    return Array.from({ length }, (_, index) => ({
      liability: left[index] ?? null,
      asset: right[index] ?? null,
    }));
  }, [model.liabilities, model.assets, expandedIds]);

  const unposted = model.unpostedVoucherCount;

  return (
    <div className="flex flex-col w-full">
      <AccountsTable minWidth={720}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <AccountsTableHeadCell className="min-w-[200px] border-r border-border font-bold">
              Liabilities / Equity
            </AccountsTableHeadCell>
            <AccountsTableHeadCell
              align="right"
              className="min-w-[120px] border-r-2 border-border font-bold"
            >
              Amount
            </AccountsTableHeadCell>
            <AccountsTableHeadCell className="min-w-[200px] border-r border-border font-bold">
              Assets
            </AccountsTableHeadCell>
            <AccountsTableHeadCell align="right" className="min-w-[120px] font-bold">
              Amount
            </AccountsTableHeadCell>
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {zipped.length === 0 ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                No hierarchy rows. Official totals below are the backend totals and are not summed from visible rows.
              </AccountsTableCell>
            </AccountsTableRow>
          ) : (
            zipped.map((pair, index) => (
              <AccountsTableRow
                key={`bs-row-${pair.liability?.row.id ?? "l"}-${pair.asset?.row.id ?? "a"}-${index}`}
                className="hover:bg-muted/20 transition-colors"
              >
                <AccountsTableCell className="border-r border-border/60 align-top py-1.5">
                  {pair.liability ? (
                    <ParticularCell
                      row={pair.liability.row}
                      depth={pair.liability.depth}
                      hasChildren={pair.liability.hasChildren}
                      expanded={expandedIds.has(pair.liability.row.id)}
                      onToggle={toggle}
                      scope={drillDown}
                    />
                  ) : null}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="border-r-2 border-border align-top py-1.5">
                  <SideAmount row={pair.liability?.row ?? null} />
                </AccountsTableCell>
                <AccountsTableCell className="border-r border-border/60 align-top py-1.5">
                  {pair.asset ? (
                    <ParticularCell
                      row={pair.asset.row}
                      depth={pair.asset.depth}
                      hasChildren={pair.asset.hasChildren}
                      expanded={expandedIds.has(pair.asset.row.id)}
                      onToggle={toggle}
                      scope={drillDown}
                    />
                  ) : null}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="align-top py-1.5">
                  <SideAmount row={pair.asset?.row ?? null} />
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
        <AccountsTableFoot>
          <AccountsTableRow className="border-t-2 border-brand-600 bg-brand-50/60">
            <AccountsTableCell className="border-r border-border/60 font-bold text-xs text-brand-800 py-2.5">
              Total Liabilities &amp; Equity
            </AccountsTableCell>
            <AccountsTableCell
              align="right"
              money
              className="border-r-2 border-border font-bold text-xs text-brand-800 py-2.5"
            >
              {formatMoneyString(model.totalLiabilitiesAndEquity)}
            </AccountsTableCell>
            <AccountsTableCell className="border-r border-border/60 font-bold text-xs text-brand-800 py-2.5">
              Total Assets
            </AccountsTableCell>
            <AccountsTableCell align="right" money className="font-bold text-xs text-brand-800 py-2.5">
              {formatMoneyString(model.totalAssets)}
            </AccountsTableCell>
          </AccountsTableRow>
        </AccountsTableFoot>
      </AccountsTable>

      <div
        className={cn(
          "flex-shrink-0 mt-3 px-3 py-2 rounded-lg border text-center text-xs",
          model.isBalanced
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-red-50 border-red-200 text-red-700",
        )}
      >
        {model.isBalanced ? (
          <p className="font-medium">Balance Sheet tallies.</p>
        ) : (
          <>
            <p className="font-bold">Difference: {formatMoneyString(model.difference)}</p>
            <p className="font-bold mt-0.5">Balance Sheet does not tally.</p>
          </>
        )}
        {shouldShowUnpostedVoucherCount(unposted) && (
          <span className="block mt-1 text-[11px] font-medium text-amber-700">
            {unposted} unposted voucher{unposted === 1 ? "" : "s"} found as on this date — balances
            may change after posting.
          </span>
        )}
      </div>
    </div>
  );
});
